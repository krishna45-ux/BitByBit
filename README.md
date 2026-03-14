# 🚀 Autonomous Boss — AI Escrow Platform

**Trustless project management powered by AI.** The Autonomous Boss takes a client's funds, plans the work, evaluates freelancer submissions, and pays them instantly if the AI Judge approves.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **AI Escrow Vault** | Funds are locked and only released when AI verifies milestone quality |
| 🤖 **AQA Engine** | Automated Quality Assurance evaluates code completeness and logic |
| ⚡ **Instant Payouts** | Pass a milestone → get paid instantly. No invoicing, no delays |
| 👤 **Role-Based Login** | Separate Client and Freelancer portals with distinct workflows |
| 📊 **PFI Score** | Professional Fidelity Index tracks freelancer reputation |
| 🔔 **Live Notifications** | Cross-portal notifications when milestones are submitted or approved |
| 🧾 **Payment Receipts** | Full transaction history with PFI delta tracking |

---

## 🖥️ Quick Start (Single Click)

1. **Double-click** `run_app.bat` inside this folder
2. Your browser will automatically open to `http://localhost:5000`
3. **Login** with any email and select your role (Client or Freelancer)
4. That's it! 🎉

### Requirements
- **Node.js** (v18+) — [Download here](https://nodejs.org/)
- Dependencies are installed automatically on first run

---

## 🧪 How to Demo

### As a Client:
1. Login as **Client**
2. Type a project goal (e.g., "Build a food delivery app")
3. Set a budget and click **Lock Funds & Deploy Agent**
4. Watch the AI break the project into milestones with priority tags and timelines

### As a Freelancer:
1. Logout and login as **Freelancer**
2. Click on a milestone to lock in
3. Paste code/text into the submission console
4. Click **Trigger AQA Evaluation** — the AI grades your work
5. If it passes, your PFI score goes up and payment is released instantly!

> **Tip**: Type the word "fail" in a submission to see the rejection flow.

---

## ⚙️ Configuration

Edit `backend/.env` to configure:

```env
AI_MODE=fast          # "fast" = instant mock responses, "ollama" = local LLM
PORT=5000             # Server port
```

### AI Modes
- **`fast`** — Instant mock responses (~1 second). Perfect for demos.
- **Remove `AI_MODE`** — Uses local Ollama for real AI generation (requires [Ollama](https://ollama.com) running).

---

## 📁 Project Structure

```
bitbybit/
├── run_app.bat          ← Double-click to launch
├── README.md            ← You are here
└── backend/
    ├── index.js         ← Express API server
    ├── ai.js            ← AI planning & evaluation logic
    ├── db.js            ← SQLite database schema
    ├── pfi.js           ← Professional Fidelity Index algorithm
    ├── .env             ← Configuration
    └── public/
        ├── index.html   ← Premium SPA frontend
        └── app.js       ← Frontend logic
```

---

## 🛡️ Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS, Tailwind CSS (CDN), Lucide Icons
- **Backend**: Node.js, Express
- **Database**: SQLite (zero-config, portable)
- **AI**: Ollama (local) or Fast Mock Mode
- **Typography**: Inter + JetBrains Mono (Google Fonts)

---

Built with ❤️ by BitByBit
