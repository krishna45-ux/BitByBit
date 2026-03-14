const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'boss.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                goal TEXT,
                totalFunds REAL,
                clientName TEXT,
                clientEmail TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS milestones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                projectId INTEGER,
                title TEXT,
                description TEXT,
                subtasks TEXT DEFAULT '[]',
                acceptanceCriteria TEXT DEFAULT '',
                deliverables TEXT DEFAULT '',
                status TEXT DEFAULT 'Locked',
                fundAmount REAL DEFAULT 0,
                priority TEXT DEFAULT 'medium',
                estimatedDays INTEGER DEFAULT 3
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS freelancers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT,
                pfiScore REAL DEFAULT 100
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                milestoneId INTEGER,
                milestoneTitle TEXT,
                amount REAL,
                type TEXT DEFAULT 'payout',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                pfiDelta REAL DEFAULT 0
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT,
                message TEXT,
                type TEXT DEFAULT 'info',
                read INTEGER DEFAULT 0,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.get("SELECT COUNT(*) as count FROM freelancers", (err, row) => {
                if (row && row.count === 0) {
                    db.run(`INSERT INTO freelancers (name, email, pfiScore) VALUES ('Dev Alpha', 'dev@bitbybit.io', 100)`);
                }
            });
            db.get("SELECT COUNT(*) as count FROM clients", (err, row) => {
                if (row && row.count === 0) {
                    db.run(`INSERT INTO clients (name, email) VALUES ('Client Corp', 'client@bitbybit.io')`);
                }
            });
        });
    }
});

module.exports = db;
