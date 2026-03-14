require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');
const { generateMilestones, evaluateSubmission } = require('./ai');
const { calculateNewPFI } = require('./pfi');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 5000;

// File upload config
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: uploadDir, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

let escrowVault = 0;
let currentProject = null;

// ─── AUTH ──────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
    const { email, role } = req.body;
    if (role === 'client') {
        db.get("SELECT * FROM clients WHERE email = ?", [email], (err, user) => {
            if (!user) {
                db.run("INSERT INTO clients (name, email) VALUES (?, ?)", [email.split('@')[0], email], function () {
                    res.json({ success: true, user: { id: this.lastID, name: email.split('@')[0], email, role } });
                });
            } else {
                res.json({ success: true, user: { ...user, role } });
            }
        });
    } else {
        db.get("SELECT * FROM freelancers WHERE email = ?", [email], (err, user) => {
            if (!user) {
                db.run("INSERT INTO freelancers (name, email, pfiScore) VALUES (?, ?, 100)", [email.split('@')[0], email], function () {
                    res.json({ success: true, user: { id: this.lastID, name: email.split('@')[0], email, pfiScore: 100, role } });
                });
            } else {
                res.json({ success: true, user: { ...user, role } });
            }
        });
    }
});

// ─── PROJECT PLANNING ──────────────────────────────────
app.post('/api/project/plan', async (req, res) => {
    const { goal, totalFunds, clientName, clientEmail } = req.body;
    escrowVault = totalFunds;

    const milestones = await generateMilestones(goal, totalFunds);
    if (milestones.length === 0) return res.status(500).json({ error: "Failed to generate milestones." });

    const fundPerMilestone = totalFunds / milestones.length;
    const priorities = ['high', 'high', 'medium', 'medium', 'low'];

    db.run("DELETE FROM milestones");
    db.run("DELETE FROM transactions");
    db.run("DELETE FROM notifications");
    db.run("DELETE FROM projects");

    db.run("INSERT INTO projects (goal, totalFunds, clientName, clientEmail) VALUES (?, ?, ?, ?)",
        [goal, totalFunds, clientName || 'Client', clientEmail || 'client@bitbybit.io']);

    currentProject = { goal, totalFunds, clientName: clientName || 'Client', clientEmail: clientEmail || 'client@bitbybit.io' };

    const stmt = db.prepare("INSERT INTO milestones (title, description, subtasks, acceptanceCriteria, deliverables, fundAmount, priority, estimatedDays) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    milestones.forEach((m, i) => {
        stmt.run(m.title, m.description, JSON.stringify(m.subtasks || []), m.acceptanceCriteria || '', m.deliverables || '', fundPerMilestone, priorities[i] || 'medium', Math.floor(Math.random() * 5) + 2);
    });
    stmt.finalize();

    db.run("INSERT INTO notifications (role, message, type) VALUES (?, ?, ?)",
        ['freelancer', `New project: "${goal}" — ${milestones.length} milestones, $${totalFunds} vault.`, 'success']);

    db.all("SELECT * FROM milestones", (err, dbMilestones) => {
        const parsed = dbMilestones.map(m => ({ ...m, subtasks: JSON.parse(m.subtasks || '[]') }));
        res.json({ success: true, milestones: parsed, vault: escrowVault, project: currentProject });
    });
});

// ─── GET PROJECT STATE ─────────────────────────────────
app.get('/api/project', (req, res) => {
    db.all("SELECT * FROM milestones", (err, milestones) => {
        db.get("SELECT * FROM freelancers LIMIT 1", (err, freelancer) => {
            db.all("SELECT * FROM transactions ORDER BY timestamp DESC", (err, transactions) => {
                db.get("SELECT * FROM projects ORDER BY id DESC LIMIT 1", (err, project) => {
                    const parsed = (milestones || []).map(m => ({ ...m, subtasks: JSON.parse(m.subtasks || '[]') }));
                    res.json({ milestones: parsed, vault: escrowVault, freelancer, transactions: transactions || [], project: project || currentProject });
                });
            });
        });
    });
});

// ─── NOTIFICATIONS ─────────────────────────────────────
app.get('/api/notifications/:role', (req, res) => {
    db.all("SELECT * FROM notifications WHERE role = ? ORDER BY timestamp DESC LIMIT 20", [req.params.role], (err, rows) => {
        res.json({ notifications: rows || [] });
    });
});
app.post('/api/notifications/read', (req, res) => {
    db.run("UPDATE notifications SET read = 1 WHERE role = ?", [req.body.role]);
    res.json({ success: true });
});

// ════════════════════════════════════════════════════════
//  BULK FILE UPLOAD & AUTO-EVALUATION
//  Upload one file → evaluate against ALL pending milestones
// ════════════════════════════════════════════════════════
app.post('/api/submission/bulk-upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Read uploaded file
    let fileContent = '';
    try {
        fileContent = fs.readFileSync(req.file.path, 'utf-8');
    } catch (e) {
        fileContent = `[Binary file: ${req.file.originalname}, size: ${req.file.size} bytes]`;
    }

    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    // Clean up the temp file
    try { fs.unlinkSync(req.file.path); } catch (e) { }

    // Get all pending milestones
    db.all("SELECT * FROM milestones WHERE status != 'Verified'", async (err, pendingMilestones) => {
        if (!pendingMilestones || pendingMilestones.length === 0) {
            return res.json({ success: false, error: "No pending milestones to evaluate.", results: [] });
        }

        // Get freelancer
        db.get("SELECT * FROM freelancers LIMIT 1", async (err, freelancer) => {
            const results = [];
            let currentPfi = freelancer.pfiScore;
            let totalPayout = 0;

            // Evaluate the submission against each pending milestone
            for (const milestone of pendingMilestones) {
                const msWithParsed = { ...milestone, subtasks: JSON.parse(milestone.subtasks || '[]') };

                // Build a rich submission context that includes the file info
                const submissionContext = `File: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)\n\n${fileContent.substring(0, 3000)}`;

                const evaluation = await evaluateSubmission(msWithParsed, submissionContext);

                const oldPfi = currentPfi;
                const newPfi = calculateNewPFI(oldPfi, evaluation.pass);
                const pfiDelta = newPfi - oldPfi;
                currentPfi = newPfi;

                if (evaluation.pass) {
                    escrowVault -= milestone.fundAmount;
                    totalPayout += milestone.fundAmount;

                    db.run("UPDATE milestones SET status = 'Verified' WHERE id = ?", [milestone.id]);
                    db.run("INSERT INTO transactions (milestoneId, milestoneTitle, amount, type, pfiDelta) VALUES (?, ?, ?, ?, ?)",
                        [milestone.id, milestone.title, milestone.fundAmount, 'payout', pfiDelta]);
                    db.run("INSERT INTO notifications (role, message, type) VALUES (?, ?, ?)",
                        ['client', `Milestone "${milestone.title}" PASSED AQA via file upload "${fileName}". $${milestone.fundAmount.toFixed(2)} released.`, 'success']);
                } else {
                    db.run("INSERT INTO notifications (role, message, type) VALUES (?, ?, ?)",
                        ['client', `Milestone "${milestone.title}" FAILED AQA on file "${fileName}". Funds retained.`, 'error']);
                }

                results.push({
                    milestoneId: milestone.id,
                    milestoneTitle: milestone.title,
                    fundAmount: milestone.fundAmount,
                    pass: evaluation.pass,
                    feedback: evaluation.feedback,
                    pfiDelta
                });
            }

            // Update freelancer PFI
            db.run("UPDATE freelancers SET pfiScore = ? WHERE id = ?", [currentPfi, freelancer.id]);

            res.json({
                success: true,
                fileName,
                fileSize,
                results,
                summary: {
                    total: results.length,
                    passed: results.filter(r => r.pass).length,
                    failed: results.filter(r => !r.pass).length,
                    totalPayout,
                    vaultRemaining: escrowVault,
                    newPfiScore: currentPfi
                }
            });
        });
    });
});

// ─── SINGLE MILESTONE SUBMIT (kept for backward compat) ──
app.post('/api/milestone/submit', async (req, res) => {
    const { milestoneId, submission } = req.body;
    db.get("SELECT * FROM milestones WHERE id = ?", [milestoneId], async (err, milestone) => {
        if (!milestone || milestone.status === 'Verified') return res.status(400).json({ error: "Invalid milestone" });
        const msWithParsed = { ...milestone, subtasks: JSON.parse(milestone.subtasks || '[]') };
        const evaluation = await evaluateSubmission(msWithParsed, submission);
        db.get("SELECT * FROM freelancers LIMIT 1", (err, authFreelancer) => {
            const oldScore = authFreelancer.pfiScore;
            const newScore = calculateNewPFI(oldScore, evaluation.pass);
            const pfiDelta = newScore - oldScore;
            db.run("UPDATE freelancers SET pfiScore = ? WHERE id = ?", [newScore, authFreelancer.id]);
            if (evaluation.pass) {
                escrowVault -= milestone.fundAmount;
                db.run("UPDATE milestones SET status = 'Verified' WHERE id = ?", [milestoneId]);
                db.run("INSERT INTO transactions (milestoneId, milestoneTitle, amount, type, pfiDelta) VALUES (?, ?, ?, ?, ?)",
                    [milestoneId, milestone.title, milestone.fundAmount, 'payout', pfiDelta]);
                db.run("INSERT INTO notifications (role, message, type) VALUES (?, ?, ?)",
                    ['client', `Milestone "${milestone.title}" PASSED AQA. $${milestone.fundAmount.toFixed(2)} released.`, 'success']);
            } else {
                db.run("INSERT INTO notifications (role, message, type) VALUES (?, ?, ?)",
                    ['client', `Milestone "${milestone.title}" FAILED AQA. Funds retained.`, 'error']);
            }
            res.json({ success: true, evaluation, newPfiScore: newScore, pfiDelta, vaultRemaining: escrowVault, statusUpdate: evaluation.pass ? 'Verified' : 'Failed', payout: evaluation.pass ? milestone.fundAmount : 0 });
        });
    });
});

app.get('/api/transactions', (req, res) => {
    db.all("SELECT * FROM transactions ORDER BY timestamp DESC", (err, rows) => { res.json({ transactions: rows || [] }); });
});

app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) { res.sendFile(path.join(__dirname, 'public', 'index.html')); }
    else { next(); }
});

app.listen(PORT, () => { console.log(`Autonomous Boss API running on http://localhost:${PORT}`); });
