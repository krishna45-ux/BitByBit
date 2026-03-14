const http = require('http');
function post(path, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const req = http.request({ hostname: 'localhost', port: 5000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
            let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(d); } });
        });
        req.on('error', reject); req.write(body); req.end();
    });
}

async function test() {
    const tests = [
        "Build a simple landing page for a coffee shop",
        "Create a TikTok-style social media app with short videos and messaging",
        "Train an ML model to predict stock prices using historical data",
        "Build a food delivery app with real-time tracking and payment",
    ];

    for (const goal of tests) {
        // First login
        await post('/api/auth/login', { email: 'test@test.io', role: 'client' });

        console.log(`\n${'='.repeat(60)}`);
        console.log(`GOAL: "${goal}"`);
        console.log('='.repeat(60));

        const result = await post('/api/project/plan', { goal, totalFunds: 5000, clientName: 'Test', clientEmail: 'test@test.io' });
        if (result.milestones) {
            result.milestones.forEach((m, i) => {
                const subtasks = Array.isArray(m.subtasks) ? m.subtasks : JSON.parse(m.subtasks || '[]');
                console.log(`\n  [${i + 1}] ${m.title}`);
                console.log(`      ${m.description.substring(0, 100)}`);
                subtasks.forEach(s => console.log(`      ☐ ${s}`));
                console.log(`      ✓ ${(m.acceptanceCriteria || '').substring(0, 100)}`);
            });
        } else {
            console.log("  ERROR:", result.error || result);
        }
    }
    console.log('\n✅ DONE');
}
test().catch(console.error);
