require('dotenv').config();
const { generateMilestones, evaluateSubmission } = require('./ai.js');
const db = require('./db.js');

generateMilestones("Make a quick test app", 1000)
    .then(res => {
        console.log("Success:", res);
        process.exit(0);
    })
    .catch(err => {
        console.error("Error:", err);
        process.exit(1);
    });
