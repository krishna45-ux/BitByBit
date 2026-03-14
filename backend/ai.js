// ═══════════════════════════════════════════════
//  AUTONOMOUS BOSS — Smart AI Engine v5
//  Goal-Aware Milestone Generation + File Eval
// ═══════════════════════════════════════════════

async function getOllamaModel() {
    try {
        const res = await fetch('http://localhost:11434/api/tags');
        const data = await res.json();
        if (data && data.models && data.models.length > 0) {
            const textModel = data.models.find(m => !m.name.includes('vision'));
            return textModel ? textModel.name : data.models[0].name;
        }
    } catch (e) { }
    return 'llama3';
}

async function callOllama(prompt) {
    const model = await getOllamaModel();
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false })
    });
    if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
    return (await response.json()).response;
}

// ─────────────────────────────────────────────────
//  SMART GOAL PARSER
//  Analyzes the goal text to understand WHAT to build
// ─────────────────────────────────────────────────

function parseGoal(goal) {
    const g = goal.toLowerCase();

    // Extract key entities and actions from the goal
    const features = {
        hasAuth: /\b(login|signup|auth|register|account|user)\b/.test(g),
        hasPayment: /\b(payment|pay|checkout|stripe|billing|subscription|pricing)\b/.test(g),
        hasChat: /\b(chat|messag|dm|inbox|conversation|real.?time)\b/.test(g),
        hasSearch: /\b(search|filter|discover|browse|explore)\b/.test(g),
        hasFeed: /\b(feed|timeline|post|content|story|stories)\b/.test(g),
        hasUpload: /\b(upload|image|photo|video|media|file|gallery)\b/.test(g),
        hasNotifications: /\b(notif|alert|push|remind)\b/.test(g),
        hasDashboard: /\b(dashboard|analytics|stats|report|chart|graph|metric)\b/.test(g),
        hasAPI: /\b(api|endpoint|rest|graphql|backend|server|microservice)\b/.test(g),
        hasDB: /\b(database|db|schema|sql|mongo|postgres|data\s?model)\b/.test(g),
        hasCRUD: /\b(crud|create|manage|admin|panel|edit|delete)\b/.test(g),
        hasMap: /\b(map|location|geo|gps|track|route|deliver)\b/.test(g),
        hasAI: /\b(ai|ml|model|train|predict|neural|nlp|gpt|llm|chatbot)\b/.test(g),
        hasBooking: /\b(book|reserv|appoint|schedul|calendar|slot)\b/.test(g),
        hasEcommerce: /\b(cart|checkout|product|catalog|inventory|order|e.?commerce|marketplace)\b/.test(g), // Removed 'shop', 'store' as they are often just 'websites for a shop'
        hasMobile: /\b(mobile|ios|android|react.?native|flutter|app\b)/.test(g),
        hasSocial: /\b(social|follow|friend|profile|community|network)\b/.test(g),
        hasGame: /\b(game|play|level|score|multiplayer|player)\b/.test(g),
        hasLanding: /\b(landing|website|portfolio|page|blog|brochure|showcase|shop|store)\b/.test(g), // Put 'shop', 'store' here as fallback
    };

    // Determine primary type based on feature density
    const scores = {
        ecommerce: (features.hasEcommerce ? 5 : 0) + (features.hasPayment ? 2 : 0) + (features.hasCRUD ? 1 : 0),
        social: (features.hasSocial ? 5 : 0) + (features.hasFeed ? 3 : 0) + (features.hasChat ? 2 : 0),
        webapp: (features.hasDashboard ? 3 : 0) + (features.hasAPI ? 2 : 0) + (features.hasCRUD ? 2 : 0) + (features.hasAuth ? 1 : 0),
        mobile: (features.hasMobile ? 5 : 0),
        ai_ml: (features.hasAI ? 5 : 0),
        game: (features.hasGame ? 5 : 0),
        landing: (features.hasLanding ? 5 : 0),
        booking: (features.hasBooking ? 4 : 0) + (features.hasMap ? 2 : 0),
    };

    // Prioritization: If landing is high and ecommerce is also present but lacks 'payment/cart' specifics, it's a landing page
    if (scores.landing >= 5 && scores.ecommerce <= 6 && !features.hasPayment) {
        scores.ecommerce = 0;
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const projectType = sorted[0][1] >= 3 ? sorted[0][0] : 'custom';

    return { features, projectType, goal };
}

// ─────────────────────────────────────────────────
//  GENERATE MILESTONES BASED ON ACTUAL GOAL
// ─────────────────────────────────────────────────

function buildMilestones(parsed) {
    const { features, projectType, goal } = parsed;
    const g = goal; // short alias

    // We always build milestones based on what the goal actually needs
    const milestones = [];

    // ─── Phase 1: Research & Design (always first) ───
    milestones.push({
        title: "Research, Planning & UI/UX Design",
        description: `Deep research for: "${g}". Analyze target users, study competitor solutions, define feature requirements, create wireframes, and build an interactive prototype.`,
        subtasks: [
            `Research existing solutions similar to: ${g.substring(0, 60)}`,
            "Define target audience, user personas, and core user journeys",
            "Create wireframes and high-fidelity mockups for all key screens",
            "Build clickable prototype and validate with 3+ test users",
            "Write technical spec with architecture diagram and tech stack decision"
        ],
        acceptanceCriteria: "All screens mocked up, user flows defined, prototype tested, tech spec approved by stakeholders.",
        deliverables: "Wireframes (Figma/PDF), user flow diagrams, prototype link, technical specification document, architecture diagram"
    });

    // ─── Phase 2: Core Build (based on detected features) ───
    const coreSubtasks = [];
    const coreFeatures = [];

    if (features.hasAuth) { coreSubtasks.push("Implement user registration, login, and session management"); coreFeatures.push("authentication"); }
    if (features.hasDB || features.hasCRUD) { coreSubtasks.push("Design and implement database schema with all entity relationships"); coreFeatures.push("data layer"); }
    if (features.hasAPI) { coreSubtasks.push("Build RESTful API endpoints with input validation and error handling"); coreFeatures.push("API"); }
    if (features.hasEcommerce) { coreSubtasks.push("Build product catalog, shopping cart, and inventory management"); coreFeatures.push("product system"); }
    if (features.hasFeed) { coreSubtasks.push("Build content feed system with creation, display, and engagement"); coreFeatures.push("content feed"); }
    if (features.hasBooking) { coreSubtasks.push("Implement booking/scheduling system with availability management"); coreFeatures.push("booking engine"); }
    if (features.hasAI) { coreSubtasks.push("Train and integrate AI/ML model with data pipeline"); coreFeatures.push("AI pipeline"); }
    if (features.hasMap) { coreSubtasks.push("Integrate maps, geolocation, and route/delivery tracking"); coreFeatures.push("location services"); }
    if (features.hasGame) { coreSubtasks.push("Implement core game mechanics, physics, and game loop"); coreFeatures.push("game engine"); }

    // If nothing specific detected, add generic core tasks
    if (coreSubtasks.length < 2) {
        coreSubtasks.push(`Build the primary feature set described in: ${g.substring(0, 60)}`);
        coreSubtasks.push("Implement data models and business logic layer");
    }
    coreSubtasks.push("Write unit tests for all critical business logic (>70% coverage)");
    if (coreSubtasks.length < 5) coreSubtasks.push("Set up CI/CD pipeline for automated testing and deployment");

    milestones.push({
        title: `Core Development: ${coreFeatures.slice(0, 3).join(', ') || 'Primary Features'}`,
        description: `Build the foundation and core features for: "${g}". This is the most critical phase where the product takes shape.`,
        subtasks: coreSubtasks.slice(0, 5),
        acceptanceCriteria: `Core features (${coreFeatures.join(', ') || 'main functionality'}) work end-to-end. Data persists correctly. Unit tests pass with >70% coverage.`,
        deliverables: "Working backend/logic, database with seed data, API documentation, unit test results, CI/CD pipeline proof"
    });

    // ─── Phase 3: Frontend / UI / Interactions ───
    const uiSubtasks = [];
    if (features.hasLanding) {
        uiSubtasks.push("Build responsive landing page with hero section, features, and CTA");
        uiSubtasks.push("Implement smooth scroll animations and micro-interactions");
        uiSubtasks.push("Add contact form or newsletter signup with validation");
        uiSubtasks.push("Optimize for SEO (meta tags, structured data, sitemap)");
        uiSubtasks.push("Ensure cross-browser and mobile compatibility");
    } else if (features.hasMobile) {
        uiSubtasks.push("Build all screens with native-feeling navigation and gestures");
        uiSubtasks.push("Implement pull-to-refresh, infinite scroll, and loading skeletons");
        uiSubtasks.push("Add offline support with local data caching");
        uiSubtasks.push("Optimize for different screen sizes (phone + tablet)");
        uiSubtasks.push("Implement platform-specific patterns (iOS/Android)");
    } else {
        uiSubtasks.push("Build responsive frontend with all pages and components");
        uiSubtasks.push("Connect frontend to backend APIs with proper state management");
        if (features.hasDashboard) uiSubtasks.push("Create interactive charts and data visualization dashboard");
        if (features.hasSearch) uiSubtasks.push("Implement search with autocomplete, filters, and sorting");
        if (features.hasUpload) uiSubtasks.push("Build media upload with preview, cropping, and gallery view");
        if (features.hasChat) uiSubtasks.push("Implement real-time messaging with typing indicators");
        if (features.hasNotifications) uiSubtasks.push("Add notification system with push and in-app alerts");
        if (features.hasPayment) uiSubtasks.push("Integrate payment processing (Stripe/PayPal) with checkout flow");
        if (uiSubtasks.length < 4) uiSubtasks.push("Add form validation, error states, and loading indicators");
        if (uiSubtasks.length < 5) uiSubtasks.push("Ensure responsive design across desktop, tablet, and mobile");
    }

    milestones.push({
        title: features.hasLanding ? "Frontend Build & SEO" : features.hasMobile ? "Mobile Screens & Interactions" : "Frontend, UI & Integrations",
        description: `Build the user-facing layer for: "${g}". Every screen, interaction, and integration that makes the product usable and delightful.`,
        subtasks: uiSubtasks.slice(0, 5),
        acceptanceCriteria: features.hasLanding
            ? "Landing page loads in <2s, scores 90+ on Lighthouse, works on all modern browsers and mobile. Contact form sends emails."
            : "All user flows complete without errors. UI renders correctly on 3 breakpoints. Loading states cover all async operations.",
        deliverables: features.hasLanding
            ? "Live URL, Lighthouse report, mobile screenshots, SEO audit, cross-browser test results"
            : "Screenshots on 3 breakpoints, user flow recordings, integration test results, component documentation"
    });

    // ─── Phase 4: Testing, Polish & Launch ───
    const launchSubtasks = [
        "End-to-end testing of all user scenarios and edge cases",
        "Performance profiling and optimization (target: <2s page load)",
        "Security review: input sanitization, auth checks, data protection",
    ];
    if (features.hasMobile) {
        launchSubtasks.push("Test on 5+ real devices across screen sizes");
        launchSubtasks.push("Submit to App Store / Play Store");
    } else {
        launchSubtasks.push("Write user documentation and deployment guide");
        launchSubtasks.push("Production deployment with SSL, monitoring, and backups");
    }

    milestones.push({
        title: "Testing, Polish & Launch",
        description: `Final QA, performance optimization, security review, and production deployment for: "${g}".`,
        subtasks: launchSubtasks,
        acceptanceCriteria: "Zero critical bugs. Performance meets targets. Security checklist complete. Deployed to production and accessible.",
        deliverables: "QA test report, performance benchmarks, security checklist, production URL, deployment guide, user documentation"
    });

    return milestones;
}

// ─────────────────────────────────────────────────
//  FILE CONTENT EVALUATOR
//  Actually reads the file and checks it
// ─────────────────────────────────────────────────

function evaluateFileContent(fileContent, milestone) {
    const content = (fileContent || '').toLowerCase();
    const title = (milestone.title || '').toLowerCase();
    const criteria = (milestone.acceptanceCriteria || '').toLowerCase();
    const subtasks = Array.isArray(milestone.subtasks) ? milestone.subtasks : [];

    // Score the file against this milestone
    let score = 0;
    let maxScore = 0;
    const findings = [];

    // 1. Check file length (minimum effort indicator)
    maxScore += 2;
    if (content.length > 500) { score += 1; findings.push("File has substantial content"); }
    if (content.length > 2000) { score += 1; findings.push("File has detailed implementation"); }

    // 2. Check if file contains keywords from milestone title
    maxScore += 3;
    const titleWords = title.split(/\s+/).filter(w => w.length > 3 && !['with', 'from', 'this', 'that', 'build', 'core', 'phase'].includes(w));
    const titleMatches = titleWords.filter(w => content.includes(w));
    if (titleMatches.length > 0) { score += 1; findings.push(`References: ${titleMatches.slice(0, 3).join(', ')}`); }
    if (titleMatches.length > 2) { score += 1; }
    if (titleMatches.length > 4) { score += 1; }

    // 3. Check for subtask keyword matches
    maxScore += 3;
    let subtaskMatches = 0;
    subtasks.forEach(st => {
        const stWords = st.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        const matches = stWords.filter(w => content.includes(w));
        if (matches.length >= 2) subtaskMatches++;
    });
    if (subtaskMatches >= 1) { score += 1; findings.push(`Addresses ${subtaskMatches}/${subtasks.length} subtasks`); }
    if (subtaskMatches >= 2) { score += 1; }
    if (subtaskMatches >= Math.ceil(subtasks.length / 2)) { score += 1; findings.push("Covers majority of subtasks"); }

    // 4. Check for code quality indicators
    maxScore += 2;
    const hasCode = /\b(function|class|const|let|var|import|export|def |if |for |while |return)\b/.test(content);
    const hasStructure = /\b(module|require|import|export|package|from)\b/.test(content);
    const hasTests = /\b(test|describe|it\(|expect|assert|jest|mocha|pytest)\b/.test(content);
    const hasDocs = /\b(readme|documentation|##|###|description|overview)\b/i.test(content);

    if (hasCode || hasDocs) { score += 1; findings.push(hasCode ? "Contains code implementation" : "Contains documentation"); }
    if (hasTests || hasStructure) { score += 1; findings.push(hasTests ? "Includes test coverage" : "Has modular structure"); }

    const ratio = score / maxScore;
    const pass = ratio >= 0.35; // 35% threshold — reasonable for a file covering multiple milestones

    return {
        pass,
        score,
        maxScore,
        ratio,
        feedback: pass
            ? `Approved — File analysis score: ${score}/${maxScore} (${Math.round(ratio * 100)}%). ${findings.join('. ')}. Milestone "${milestone.title}" accepted.`
            : `Rejected — File analysis score: ${score}/${maxScore} (${Math.round(ratio * 100)}%). The submission lacks sufficient coverage for "${milestone.title}". ${findings.length > 0 ? 'Found: ' + findings.join(', ') + '.' : 'No relevant content detected.'} Please submit a file with actual implementation covering the subtasks and acceptance criteria.`
    };
}

// ─────────────────────────────────────────────────
//  MAIN EXPORTS
// ─────────────────────────────────────────────────

async function generateMilestones(goal, totalFunds) {
    if (process.env.AI_MODE === 'fast') {
        await new Promise(r => setTimeout(r, 800));
        const parsed = parseGoal(goal);
        return buildMilestones(parsed);
    }

    const prompt = `You are an expert project planner. A client wants: "${goal}" with budget $${totalFunds}. Break into 3-5 milestones. Return ONLY a raw JSON array with objects having: "title", "description", "subtasks" (array of 4-5 strings), "acceptanceCriteria" (string), "deliverables" (string). No markdown.`;
    try {
        let r = await callOllama(prompt);
        r = r.replace(/```json/g, '').replace(/```/g, '').trim();
        const s = r.indexOf('['), e = r.lastIndexOf(']');
        if (s !== -1 && e !== -1) r = r.substring(s, e + 1);
        return JSON.parse(r);
    } catch (e) {
        console.error("AI Plan error:", e.message);
        return [];
    }
}

async function evaluateSubmission(milestone, submission) {
    if (process.env.AI_MODE === 'fast') {
        await new Promise(r => setTimeout(r, 600));
        return evaluateFileContent(submission, milestone);
    }

    const prompt = `You are an AQA Evaluator. Milestone: "${milestone.title}" - "${milestone.description}". Acceptance: "${milestone.acceptanceCriteria || 'N/A'}". Submission: ${submission}. Return ONLY raw JSON: {"pass": boolean, "feedback": "string"}. No markdown.`;
    try {
        let r = await callOllama(prompt);
        r = r.replace(/```json/g, '').replace(/```/g, '').trim();
        const s = r.indexOf('{'), e = r.lastIndexOf('}');
        if (s !== -1 && e !== -1) r = r.substring(s, e + 1);
        return JSON.parse(r);
    } catch (e) {
        console.error("AI Eval error:", e.message);
        return { pass: false, feedback: "Evaluation engine error." };
    }
}

module.exports = { generateMilestones, evaluateSubmission };
