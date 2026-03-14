// PFI = (w_accuracy * A) + (w_deadline * D) + (w_quality * Q)

function calculateNewPFI(currentPFI, evaluationPass, isLate = false) {
    let pfiChange = 0;

    if (evaluationPass) {
        pfiChange += 5; // Good accuracy
        if (!isLate) pfiChange += 3; // On time
    } else {
        pfiChange -= 4; // Failed evaluation
    }

    let newScore = currentPFI + pfiChange;
    return Math.max(0, Math.min(newScore, 100)); // Cap between 0 and 100
}

module.exports = { calculateNewPFI };
