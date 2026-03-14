// ═══════════════════════════════════════════════
//  AUTONOMOUS BOSS — Frontend Logic v4
//  (File Upload + Bulk Evaluation)
// ═══════════════════════════════════════════════

let state = { milestones: [], transactions: [], role: null, user: null, notifInterval: null, project: null };
let expandedMilestone = {};
let selectedFile = null;

lucide.createIcons();

// ─── VIEW ──────────────────────────────────────
function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('view-active'));
    document.getElementById(id).classList.add('view-active');
    lucide.createIcons();
}

// ─── ROLE SELECTION ────────────────────────────
let selectedRole = null;
function selectRole(role) {
    selectedRole = role;
    document.getElementById('roleClient').className = role === 'client'
        ? 'border border-accent rounded-xl py-3 text-sm font-semibold text-accent bg-accent/10 flex items-center justify-center gap-2'
        : 'border border-dark-500 rounded-xl py-3 text-sm font-semibold text-gray-300 hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2';
    document.getElementById('roleFreelancer').className = role === 'freelancer'
        ? 'border border-purple rounded-xl py-3 text-sm font-semibold text-purple bg-purple/10 flex items-center justify-center gap-2'
        : 'border border-dark-500 rounded-xl py-3 text-sm font-semibold text-gray-300 hover:border-purple hover:text-purple transition-all flex items-center justify-center gap-2';
    const btn = document.getElementById('loginBtn');
    btn.disabled = false;
    btn.className = role === 'client'
        ? 'w-full bg-gradient-to-r from-accent to-accent-muted text-dark-900 font-bold py-3.5 rounded-xl btn-glow transition-all flex items-center justify-center gap-2'
        : 'w-full bg-gradient-to-r from-purple to-purple-muted text-white font-bold py-3.5 rounded-xl btn-glow btn-glow-purple transition-all flex items-center justify-center gap-2';
}

// ─── AUTH ───────────────────────────────────────
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    if (!email || !selectedRole) return;
    try {
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role: selectedRole }) });
        const data = await res.json();
        if (data.success) {
            state.user = data.user;
            state.role = selectedRole;
            await loadProject();
            if (selectedRole === 'client') { document.getElementById('clientUserName').innerText = state.user.name || email; showView('view-client'); }
            else { document.getElementById('freelancerUserName').innerText = state.user.name || email; showView('view-freelancer'); }
            renderAll();
            startNotificationPolling();
        }
    } catch (e) { console.error("Login error:", e); }
}

function handleLogout() {
    if (state.notifInterval) clearInterval(state.notifInterval);
    state = { milestones: [], transactions: [], role: null, user: null, notifInterval: null, project: null };
    selectedRole = null;
    expandedMilestone = {};
    selectedFile = null;
    showView('view-login');
}

// ─── DATA ──────────────────────────────────────
async function loadProject() {
    try {
        const res = await fetch('/api/project');
        const data = await res.json();
        state.milestones = data.milestones || [];
        state.transactions = data.transactions || [];
        state.project = data.project || null;
        if (data.vault !== undefined) updateVault(data.vault);
        if (data.freelancer) updatePFI(data.freelancer.pfiScore);
    } catch (e) { console.error("Load error:", e); }
}

// ─── NOTIFICATIONS ─────────────────────────────
function startNotificationPolling() { fetchNotifications(); state.notifInterval = setInterval(fetchNotifications, 5000); }

async function fetchNotifications() {
    if (!state.role) return;
    try {
        const res = await fetch(`/api/notifications/${state.role}`);
        const data = await res.json();
        const unread = (data.notifications || []).filter(n => !n.read);
        const badgeId = state.role === 'client' ? 'clientNotifBadge' : 'freelancerNotifBadge';
        const badge = document.getElementById(badgeId);
        if (unread.length > 0) { badge.classList.remove('hidden'); badge.innerText = unread.length; }
        else { badge.classList.add('hidden'); }
        const listId = state.role === 'client' ? 'clientNotifList' : 'freelancerNotifList';
        const list = document.getElementById(listId);
        list.innerHTML = '';
        (data.notifications || []).forEach(n => {
            const color = n.type === 'success' ? 'text-emerald' : n.type === 'error' ? 'text-red-400' : 'text-gray-300';
            list.innerHTML += `<div class="p-2 rounded-lg bg-dark-900 ${color} ${n.read ? 'opacity-50' : ''}"><p>${n.message}</p><p class="text-[9px] text-gray-600 mt-1">${new Date(n.timestamp).toLocaleString()}</p></div>`;
        });
    } catch (e) { }
}

function toggleNotifications(role) {
    const panel = document.getElementById(role === 'client' ? 'clientNotifPanel' : 'freelancerNotifPanel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
        document.getElementById(role === 'client' ? 'clientNotifBadge' : 'freelancerNotifBadge').classList.add('hidden');
    }
}

// ─── TERMINAL ──────────────────────────────────
function log(msg, type = 'info') {
    const el = document.getElementById('terminalLogs');
    const colors = { error: 'text-red-400', success: 'text-emerald', system: 'text-accent/70', info: 'text-gray-400' };
    const prefix = { error: '✗', success: '✓', system: '⚡', info: '›' };
    const t = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const div = document.createElement('div');
    div.className = `${colors[type]} flex gap-2 items-start slide-in`;
    div.innerHTML = `<span class="opacity-30 select-none text-[10px]">${t}</span><span class="font-bold select-none">${prefix[type]}</span><span class="break-words">${msg}</span>`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}

// ─── UI HELPERS ────────────────────────────────
function updateVault(amount) { document.getElementById('vaultAmount').innerText = `$${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function updatePFI(score) {
    const el = document.getElementById('pfiScore');
    el.innerText = Math.round(score);
    el.className = `text-sm font-mono font-bold leading-none ${score >= 80 ? 'text-emerald' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`;
}

function pulseVault() {
    const c = document.getElementById('vaultCircle');
    c.style.animation = 'none'; void c.offsetWidth; c.style.animation = 'glowPulse 1.5s ease-out';
    const icon = document.getElementById('vaultIcon');
    icon.classList.replace('text-gray-600', 'text-accent');
    setTimeout(() => icon.classList.replace('text-accent', 'text-gray-600'), 2000);
}

function fireConfetti() {
    const container = document.getElementById('confettiContainer');
    const colors = ['#00e5ff', '#a78bfa', '#34d399', '#facc15', '#f472b6', '#fb923c'];
    for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + 'vw';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 1.5 + 's';
        piece.style.animationDuration = (2 + Math.random() * 2) + 's';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.width = (6 + Math.random() * 8) + 'px';
        piece.style.height = (6 + Math.random() * 8) + 'px';
        container.appendChild(piece);
    }
    setTimeout(() => { container.innerHTML = ''; }, 5000);
}

function toggleExpand(id) { expandedMilestone[id] = !expandedMilestone[id]; renderAll(); }

// ─── FILE UPLOAD ───────────────────────────────
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    setFileSelected(file);
}

function setFileSelected(file) {
    selectedFile = file;
    document.getElementById('dropContent').classList.add('hidden');
    document.getElementById('fileSelected').classList.remove('hidden');
    document.getElementById('selectedFileName').innerText = file.name;
    document.getElementById('selectedFileSize').innerText = formatFileSize(file.size);
    document.getElementById('uploadBtn').disabled = false;
    lucide.createIcons();
}

function clearFile() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('dropContent').classList.remove('hidden');
    document.getElementById('fileSelected').classList.add('hidden');
    document.getElementById('uploadBtn').disabled = true;
    lucide.createIcons();
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Drag & Drop
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;

    ['dragenter', 'dragover'].forEach(e => dropZone.addEventListener(e, evt => {
        evt.preventDefault(); evt.stopPropagation();
        dropZone.classList.add('border-purple', 'bg-purple/10');
        dropZone.classList.remove('border-dark-500');
    }));
    ['dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, evt => {
        evt.preventDefault(); evt.stopPropagation();
        dropZone.classList.remove('border-purple', 'bg-purple/10');
        dropZone.classList.add('border-dark-500');
    }));
    dropZone.addEventListener('drop', evt => {
        const file = evt.dataTransfer.files[0];
        if (file) setFileSelected(file);
    });
});

// ─── BULK UPLOAD & EVALUATE ────────────────────
async function handleBulkUpload() {
    if (!selectedFile) return;

    const pendingCount = state.milestones.filter(m => m.status !== 'Verified').length;
    if (pendingCount === 0) { alert('No pending milestones to evaluate.'); return; }

    setUploadLoading(true);
    log(`Uploading "${selectedFile.name}" (${formatFileSize(selectedFile.size)})...`, 'system');
    log(`Evaluating against ${pendingCount} pending milestones...`, 'system');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        const res = await fetch('/api/submission/bulk-upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            const { results, summary } = data;

            // Log results
            log(`File "${data.fileName}" processed.`, 'success');
            results.forEach(r => {
                log(`${r.pass ? '✓' : '✗'} ${r.milestoneTitle}: ${r.pass ? 'PASSED' : 'FAILED'}`, r.pass ? 'success' : 'error');
                log(`  → ${r.feedback}`, 'info');
            });
            log(`Summary: ${summary.passed}/${summary.total} passed, $${summary.totalPayout.toFixed(2)} released`, 'system');

            // Update PFI
            updatePFI(summary.newPfiScore);
            updateVault(summary.vaultRemaining);

            if (summary.passed > 0) { fireConfetti(); pulseVault(); }

            // Show results panel
            renderResults(data);

            // Reload project state
            await loadProject();
            renderAll();

            // Clear file
            clearFile();
        } else {
            log(`Upload failed: ${data.error}`, 'error');
        }
    } catch (e) {
        log(`Network error: ${e.message}`, 'error');
    }

    setUploadLoading(false);
}

function setUploadLoading(on) {
    document.getElementById('uploadBtnText').innerHTML = on ? 'Evaluating...' : '<i data-lucide="cpu" class="w-4 h-4 inline mr-1"></i> Upload & Evaluate All Milestones';
    document.getElementById('uploadSpinner').classList.toggle('hidden', !on);
    document.getElementById('uploadThinking').classList.toggle('hidden', !on);
    document.getElementById('uploadBtn').disabled = on;
    document.getElementById('uploadBtn').style.opacity = on ? '0.7' : '1';
    if (!on) lucide.createIcons();
}

function renderResults(data) {
    const panel = document.getElementById('resultsPanel');
    panel.classList.remove('hidden');
    document.getElementById('resultsFileName').innerText = data.fileName;
    document.getElementById('resultsPassed').innerText = data.summary.passed;
    document.getElementById('resultsFailed').innerText = data.summary.failed;
    document.getElementById('resultsPayout').innerText = `$${data.summary.totalPayout.toFixed(0)}`;

    const list = document.getElementById('resultsList');
    list.innerHTML = '';
    data.results.forEach((r, i) => {
        const statusClass = r.pass ? 'border-emerald/30 bg-emerald/5' : 'border-red-400/30 bg-red-400/5';
        const icon = r.pass ? 'check-circle' : 'x-circle';
        const iconColor = r.pass ? 'text-emerald' : 'text-red-400';
        list.innerHTML += `
        <div class="rounded-xl border ${statusClass} p-4 slide-in" style="animation-delay:${i * 0.1}s">
            <div class="flex items-center gap-3 mb-2">
                <i data-lucide="${icon}" class="w-5 h-5 ${iconColor} flex-none"></i>
                <div class="flex-1">
                    <h4 class="text-sm font-bold ${r.pass ? 'text-emerald' : 'text-red-400'}">${r.milestoneTitle}</h4>
                    <div class="flex gap-2 mt-1">
                        <span class="text-[9px] font-mono ${r.pass ? 'text-emerald bg-emerald/10' : 'text-red-400 bg-red-400/10'} px-2 py-0.5 rounded font-bold">${r.pass ? 'PASSED' : 'FAILED'}</span>
                        ${r.pass ? `<span class="text-[9px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">+$${parseFloat(r.fundAmount).toFixed(0)}</span>` : ''}
                        <span class="text-[9px] font-mono ${r.pfiDelta >= 0 ? 'text-emerald' : 'text-red-400'} bg-dark-600 px-2 py-0.5 rounded">PFI ${r.pfiDelta >= 0 ? '+' : ''}${r.pfiDelta.toFixed(1)}</span>
                    </div>
                </div>
            </div>
            <p class="text-[11px] text-gray-400 leading-relaxed pl-8">${r.feedback}</p>
        </div>`;
    });
    lucide.createIcons();
}

// ─── RENDERING ─────────────────────────────────
function renderAll() { renderClientRoadmap(); renderFreelancerView(); renderTransactions(); }

function renderClientRoadmap() {
    const el = document.getElementById('roadmapClient');
    const verified = state.milestones.filter(m => m.status === 'Verified').length;
    const total = state.milestones.length;

    if (total > 0) {
        document.getElementById('clientStatsBar').classList.remove('hidden');
        document.getElementById('statTotal').innerText = total;
        document.getElementById('statDone').innerText = verified;
        document.getElementById('statRemaining').innerText = total - verified;
        const spent = state.transactions.reduce((s, t) => s + (t.amount || 0), 0);
        document.getElementById('statSpent').innerText = `$${spent.toFixed(0)}`;
        document.getElementById('progressBar').style.width = `${(verified / total * 100)}%`;
    } else {
        document.getElementById('clientStatsBar').classList.add('hidden');
    }

    if (total === 0) { el.innerHTML = '<p class="text-gray-600 text-sm text-center mt-8 font-light">Deploy an agent to generate your project roadmap.</p>'; return; }
    el.innerHTML = '';

    state.milestones.forEach((m, i) => {
        const isV = m.status === 'Verified';
        const isOpen = expandedMilestone[m.id];
        const priorityColors = { high: 'text-red-400 bg-red-400/10', medium: 'text-yellow-400 bg-yellow-400/10', low: 'text-emerald bg-emerald/10' };
        const pc = priorityColors[m.priority] || priorityColors.medium;
        const subtasks = Array.isArray(m.subtasks) ? m.subtasks : [];

        el.innerHTML += `<div class="mb-5 fade-up" style="animation-delay:${i * 0.06}s">
            <div class="flex gap-4">
                <div class="flex flex-col items-center flex-none">
                    <div class="w-8 h-8 rounded-full ${isV ? 'bg-emerald/10 border-emerald/30' : 'bg-dark-600 border-dark-500'} border flex items-center justify-center">
                        <i data-lucide="${isV ? 'check-circle' : 'circle-dot'}" class="w-4 h-4 ${isV ? 'text-emerald' : 'text-accent/50'}"></i>
                    </div>
                    ${i < total - 1 ? '<div class="w-px flex-1 bg-dark-500 mt-2"></div>' : ''}
                </div>
                <div class="flex-1 bg-dark-900/50 rounded-xl border border-dark-500 ${isV ? 'opacity-60' : ''} overflow-hidden">
                    <div class="p-4 cursor-pointer hover:bg-dark-800/30 transition-colors" onclick="toggleExpand(${m.id})">
                        <div class="flex items-center justify-between mb-1.5">
                            <h4 class="font-bold text-sm ${isV ? 'text-emerald line-through' : 'text-white'}">${m.title}</h4>
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-mono text-gray-500">$${parseFloat(m.fundAmount).toFixed(0)}</span>
                                <i data-lucide="${isOpen ? 'chevron-up' : 'chevron-down'}" class="w-4 h-4 text-gray-500"></i>
                            </div>
                        </div>
                        <p class="text-[11px] text-gray-500 leading-relaxed">${m.description}</p>
                        <div class="flex gap-2 mt-3 flex-wrap">
                            <span class="text-[9px] font-bold px-2 py-0.5 rounded uppercase ${pc}">${m.priority || 'medium'}</span>
                            <span class="text-[9px] font-mono px-2 py-0.5 rounded bg-dark-600 text-gray-400">~${m.estimatedDays || 3}d</span>
                            ${isV ? '<span class="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald/10 text-emerald">✓ VERIFIED</span>' : '<span class="text-[9px] px-2 py-0.5 rounded bg-accent/10 text-accent">PENDING</span>'}
                        </div>
                    </div>
                    <div class="milestone-expand ${isOpen ? 'open' : ''} px-4 pb-4 border-t border-dark-500/50">
                        ${subtasks.length > 0 ? `<div class="mb-4"><p class="text-[9px] text-accent font-bold uppercase tracking-wider mb-2">Subtasks (${subtasks.length})</p><div class="space-y-1.5">${subtasks.map(s => `<div class="flex items-start gap-2 text-[11px]"><i data-lucide="${isV ? 'check-square' : 'square'}" class="w-3.5 h-3.5 ${isV ? 'text-emerald' : 'text-gray-600'} flex-none mt-0.5"></i><span class="${isV ? 'text-gray-500 line-through' : 'text-gray-300'}">${s}</span></div>`).join('')}</div></div>` : ''}
                        ${m.acceptanceCriteria ? `<div class="mb-4"><p class="text-[9px] text-purple font-bold uppercase tracking-wider mb-1.5">Acceptance Criteria</p><p class="text-[11px] text-gray-400 leading-relaxed bg-dark-800/50 p-3 rounded-lg border border-dark-500">${m.acceptanceCriteria}</p></div>` : ''}
                        ${m.deliverables ? `<div><p class="text-[9px] text-yellow-400 font-bold uppercase tracking-wider mb-1.5">Expected Deliverables</p><p class="text-[11px] text-gray-400 leading-relaxed">${m.deliverables}</p></div>` : ''}
                    </div>
                </div>
            </div>
        </div>`;
    });
    lucide.createIcons();
}

function renderFreelancerView() {
    const el = document.getElementById('roadmapFreelancer');
    const verified = state.milestones.filter(m => m.status === 'Verified').length;
    const total = state.milestones.length;
    document.getElementById('freelancerMilestoneCount').innerText = `${verified}/${total}`;

    const infoCard = document.getElementById('projectInfoCard');
    if (state.project && total > 0) {
        infoCard.classList.remove('hidden');
        document.getElementById('projectGoal').innerText = state.project.goal || 'Untitled Project';
        document.getElementById('projectBudget').innerText = `Budget: $${parseFloat(state.project.totalFunds || 0).toLocaleString()}`;
        document.getElementById('projectMilestoneCount').innerText = `${total} milestones`;
        document.getElementById('clientInfoName').innerText = state.project.clientName || 'Client';
        document.getElementById('clientInfoEmail').innerText = state.project.clientEmail || 'client@bitbybit.io';
        const pct = total > 0 ? Math.round(verified / total * 100) : 0;
        document.getElementById('freelancerProgressPct').innerText = `${pct}%`;
        document.getElementById('freelancerProgressBar').style.width = `${pct}%`;
    } else { infoCard.classList.add('hidden'); }

    if (total === 0) { el.innerHTML = '<p class="text-gray-600 text-sm text-center mt-8 font-light">Waiting for client to deploy an agent...</p>'; return; }
    el.innerHTML = '';

    state.milestones.forEach((m, i) => {
        const isV = m.status === 'Verified';
        const isOpen = expandedMilestone[m.id];
        const priorityColors = { high: 'text-red-400 bg-red-400/10', medium: 'text-yellow-400 bg-yellow-400/10', low: 'text-emerald bg-emerald/10' };
        const pc = priorityColors[m.priority] || priorityColors.medium;
        const subtasks = Array.isArray(m.subtasks) ? m.subtasks : [];

        el.innerHTML += `
        <div class="rounded-xl border mb-4 transition-all fade-up overflow-hidden ${isV ? 'border-emerald/20 bg-emerald/5 opacity-60' : 'border-dark-500 bg-dark-900/30'}" style="animation-delay:${i * 0.06}s">
            <div class="p-4 cursor-pointer hover:bg-dark-800/20 transition-colors" onclick="toggleExpand(${m.id})">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2 flex-1">
                        <i data-lucide="${isV ? 'check-circle' : 'circle'}" class="w-4 h-4 ${isV ? 'text-emerald' : 'text-gray-600'}"></i>
                        <h4 class="font-bold text-sm ${isV ? 'text-emerald line-through' : 'text-white'}">${m.title}</h4>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-emerald font-mono text-xs bg-emerald/10 px-2 py-0.5 rounded">$${parseFloat(m.fundAmount).toFixed(0)}</span>
                        <i data-lucide="${isOpen ? 'chevron-up' : 'chevron-down'}" class="w-4 h-4 text-gray-500"></i>
                    </div>
                </div>
                <p class="text-[11px] text-gray-500 pl-6">${m.description.substring(0, 120)}...</p>
                <div class="flex gap-2 pl-6 mt-2 flex-wrap">
                    <span class="text-[9px] font-bold px-2 py-0.5 rounded uppercase ${pc}">${m.priority || 'medium'}</span>
                    <span class="text-[9px] font-mono px-2 py-0.5 rounded bg-dark-600 text-gray-400">~${m.estimatedDays || 3}d</span>
                    ${isV ? '<span class="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald/10 text-emerald">✓ VERIFIED</span>' : '<span class="text-[9px] px-2 py-0.5 rounded bg-purple/10 text-purple">PENDING</span>'}
                </div>
            </div>
            <div class="milestone-expand ${isOpen ? 'open' : ''} px-4 pb-4 border-t border-dark-500/50">
                ${subtasks.length > 0 ? `<div class="mb-4"><p class="text-[9px] text-purple font-bold uppercase tracking-wider mb-2">Subtask Checklist (${subtasks.length})</p><div class="space-y-1.5">${subtasks.map(s => `<div class="flex items-start gap-2 text-[11px]"><i data-lucide="${isV ? 'check-square' : 'square'}" class="w-3.5 h-3.5 ${isV ? 'text-emerald' : 'text-gray-600'} flex-none mt-0.5"></i><span class="${isV ? 'text-gray-500 line-through' : 'text-gray-300'}">${s}</span></div>`).join('')}</div></div>` : ''}
                ${m.acceptanceCriteria ? `<div class="mb-4"><p class="text-[9px] text-accent font-bold uppercase tracking-wider mb-1.5">Acceptance Criteria</p><p class="text-[11px] text-gray-400 leading-relaxed bg-dark-800/50 p-3 rounded-lg border border-dark-500">${m.acceptanceCriteria}</p></div>` : ''}
                ${m.deliverables ? `<div><p class="text-[9px] text-yellow-400 font-bold uppercase tracking-wider mb-1.5">Deliverables</p><p class="text-[11px] text-gray-400 leading-relaxed">${m.deliverables}</p></div>` : ''}
            </div>
        </div>`;
    });
    lucide.createIcons();
}

function renderTransactions() {
    if (state.transactions.length === 0) { document.getElementById('transactionsPanel').classList.add('hidden'); document.getElementById('earningsPanel').classList.add('hidden'); return; }
    document.getElementById('transactionsPanel').classList.remove('hidden');
    const tl = document.getElementById('transactionsList');
    tl.innerHTML = '';
    state.transactions.forEach(t => {
        tl.innerHTML += `<div class="receipt-card bg-dark-900 p-3 rounded-lg slide-in"><div class="flex justify-between items-center"><div><p class="text-sm font-semibold text-white">${t.milestoneTitle}</p><p class="text-[10px] text-gray-500 mt-0.5">${new Date(t.timestamp).toLocaleString()}</p></div><div class="text-right"><p class="text-emerald font-mono font-bold">-$${parseFloat(t.amount).toFixed(2)}</p><p class="text-[9px] ${t.pfiDelta >= 0 ? 'text-emerald' : 'text-red-400'}">PFI ${t.pfiDelta >= 0 ? '+' : ''}${parseFloat(t.pfiDelta).toFixed(1)}</p></div></div></div>`;
    });
    document.getElementById('earningsPanel').classList.remove('hidden');
    const el = document.getElementById('earningsList');
    let totalEarned = 0;
    let earningsHtml = '';
    state.transactions.forEach(t => { totalEarned += t.amount; earningsHtml += `<div class="flex justify-between items-center p-2 rounded-lg bg-dark-900"><span class="text-xs text-gray-300">${t.milestoneTitle}</span><span class="text-emerald font-mono font-bold text-sm">+$${parseFloat(t.amount).toFixed(0)}</span></div>`; });
    el.innerHTML = `<div class="flex justify-between items-center p-3 rounded-lg bg-emerald/5 border border-emerald/20 mb-3"><span class="text-xs font-bold text-emerald uppercase tracking-wider">Total Earned</span><span class="text-emerald font-mono font-black text-lg">$${totalEarned.toFixed(2)}</span></div>` + earningsHtml;
}

// ─── CLIENT: PLAN ──────────────────────────────
async function handlePlanProject() {
    const goal = document.getElementById('goalInput').value;
    const funds = document.getElementById('fundsInput').value;
    if (!goal || !funds) return;
    setLoading('plan', true);
    log(`Initializing blueprint: "${goal}"`, 'system');
    log(`Depositing $${funds} into escrow vault...`, 'system');
    try {
        const res = await fetch('/api/project/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal, totalFunds: parseFloat(funds), clientName: state.user?.name, clientEmail: state.user?.email }) });
        const data = await res.json();
        if (data.success) {
            state.milestones = data.milestones || [];
            state.transactions = [];
            state.project = data.project;
            updateVault(data.vault);
            renderAll();
            log(`Blueprint complete! ${state.milestones.length} milestones with ${state.milestones.reduce((s, m) => s + (m.subtasks?.length || 0), 0)} subtasks.`, 'success');
            log(`Vault funded: $${data.vault}. Freelancer notified.`, 'success');
            pulseVault();
        } else { log(`Planning failed: ${data.error}`, 'error'); }
    } catch (e) { log(`Network error: ${e.message}`, 'error'); }
    setLoading('plan', false);
}

function setLoading(which, on) {
    document.getElementById('planBtnText').innerText = on ? 'Agent Planning...' : 'Lock Funds & Deploy Agent';
    document.getElementById('planSpinner').classList.toggle('hidden', !on);
    document.getElementById('planThinking').classList.toggle('hidden', !on);
    document.getElementById('planBtn').disabled = on;
    document.getElementById('planBtn').style.opacity = on ? '0.7' : '1';
}

// ─── PREMIUM UI: STARFIELD ANIMATION ───────────
class Starfield {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.count = 400;
        this.mouseX = 0;
        this.mouseY = 0;
        this.init();
        window.addEventListener('resize', () => this.init());
        this.animate();
    }

    init() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.stars = [];
        for (let i = 0; i < this.count; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                z: Math.random() * this.canvas.width,
                o: Math.random(),
                s: Math.random() * 2 + 0.5,
                color: Math.random() > 0.8 ? '#00e5ff' : Math.random() > 0.6 ? '#a78bfa' : '#ffffff',
                angle: Math.random() * Math.PI * 2,
                dist: Math.random() * Math.max(this.canvas.width, this.canvas.height) * 0.5 + 50,
                speed: Math.random() * 0.005 + 0.002
            });
        }
    }

    animate() {
        // Subtle tail effect
        this.ctx.fillStyle = 'rgba(3, 7, 18, 0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Core Black Hole Glow
        const gradient = this.ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, 300);
        gradient.addColorStop(0, 'rgba(0, 229, 255, 0.03)');
        gradient.addColorStop(0.5, 'rgba(167, 139, 250, 0.01)');
        gradient.addColorStop(1, 'transparent');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.stars.forEach(s => {
            // Update spiral movement
            s.angle += s.speed;

            // Pull towards center effect
            s.dist *= 0.9995;
            if (s.dist < 30) s.dist = Math.random() * Math.max(this.canvas.width, this.canvas.height) * 0.5 + 200;

            const x = this.centerX + Math.cos(s.angle) * s.dist;
            const y = this.centerY + Math.sin(s.angle) * s.dist;

            // Draw star
            const size = (1 - s.dist / (this.canvas.width)) * s.s * 2;
            const opacity = (1 - s.dist / (this.canvas.width * 0.8)) * s.o;

            this.ctx.beginPath();
            this.ctx.arc(x, y, Math.max(0.1, size), 0, Math.PI * 2);
            this.ctx.fillStyle = s.color;
            this.ctx.globalAlpha = Math.max(0, opacity);
            this.ctx.fill();

            // Subtle glow for large stars
            if (s.s > 2) {
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = s.color;
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
            }
        });

        this.ctx.globalAlpha = 1;
        requestAnimationFrame(() => this.animate());
    }
}

// ─── BOOT ──────────────────────────────────────
window.onload = () => {
    lucide.createIcons();
    new Starfield('starfield');
};
