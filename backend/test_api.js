const http = require('http');

function post(path, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const req = http.request({ hostname: 'localhost', port: 5000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': body.length } }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(d); } });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function get(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:5000${path}`, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(d); } });
        }).on('error', reject);
    });
}

async function runTests() {
    console.log("=== 1. Login as Client ===");
    const login1 = await post('/api/auth/login', { email: 'test@demo.io', role: 'client' });
    console.log(login1.success ? "✓ Client login OK" : "✗ FAIL", login1);

    console.log("\n=== 2. Plan Project ===");
    const plan = await post('/api/project/plan', { goal: 'Build a chat app', totalFunds: 2000 });
    console.log(plan.success ? `✓ Plan OK (${plan.milestones?.length} milestones)` : "✗ FAIL", plan.error || '');

    console.log("\n=== 3. Get Project ===");
    const proj = await get('/api/project');
    console.log(proj.milestones?.length > 0 ? `✓ Project OK (${proj.milestones.length} milestones, vault: $${proj.vault})` : "✗ FAIL");

    console.log("\n=== 4. Submit Milestone ===");
    if (proj.milestones?.length > 0) {
        const sub = await post('/api/milestone/submit', { milestoneId: proj.milestones[0].id, submission: 'Implemented the REST API with proper error handling and documentation.' });
        console.log(sub.success ? `✓ Submit OK (pass: ${sub.evaluation.pass}, PFI: ${sub.newPfiScore})` : "✗ FAIL", sub.error || '');
    }

    console.log("\n=== 5. Notifications ===");
    const notifs = await get('/api/notifications/client');
    console.log(`✓ ${notifs.notifications?.length || 0} notifications`);

    console.log("\n=== 6. Transactions ===");
    const txns = await get('/api/transactions');
    console.log(`✓ ${txns.transactions?.length || 0} transactions`);

    console.log("\n=== ALL TESTS COMPLETE ===");
}

runTests().catch(console.error);
