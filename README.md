# InsightMail 📊✉️

> **A full-stack data analytics + email reporting platform.**  
> Sign up / Log in → Upload any CSV → Get instant interactive charts → Email the report to anyone.

---

## 🗂 Project Structure

```
insightmail/
├── frontend/                     ← Vanilla HTML/CSS/JS frontend
│   ├── index.html                ← Main app (5-tab SPA: Home, Dashboard, History, Reports, Profile)
│   ├── login.html                ← Login / Sign-up page
│   ├── style.css                 ← Premium dark/light design system
│   ├── app.js                    ← Main app controller
│   ├── auth.js                   ← Login / signup logic
│   ├── charts.js                 ← Chart.js chart rendering
│   ├── csvParser.js              ← PapaParse CSV module
│   └── mailer.js                 ← Email composition & API calls
│
├── backend-node/                 ← Node.js / Express backend
│   ├── server.js                 ← Express server (auth, history API, email proxy)
│   ├── user-store.js             ← File-based user store (users.json)
│   ├── package.json
│   ├── .env                      ← Environment config
│   └── data/
│       └── users.json            ← Persisted user accounts & history
│
└── backend-java/                 ← Java Spring Boot mail microservice
    ├── pom.xml
    └── src/main/java/com/insightmail/
        ├── InsightMailApplication.java
        ├── MailController.java   ← POST /api/mail/send endpoint
        └── MailService.java      ← Dynamic SMTP + JavaMail sender
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| Java JDK | ≥ 17 |
| Maven | ≥ 3.8 |

---

### 1️⃣ Start the Node.js Backend

```bash
cd insightmail/backend-node
npm install
npm start
# Server running at http://localhost:3001
# Frontend served at  http://localhost:3001
```

The frontend is **automatically served** by the Node server — just open:
> **http://localhost:3001**

---

### 2️⃣ Start the Java Mail Service *(optional — only needed for sending emails)*

```bash
cd insightmail/backend-java
mvn spring-boot:run
# Mail service running at http://localhost:8081
```

> The Java service only needs to run when you want to **send actual emails**.  
> All CSV analytics, charts, and history work fully without it.

---

### 3️⃣ Open the App

```
http://localhost:3001
```

Register a new account or log in, then upload a CSV to get started.

---

## 📋 Features

### 🔐 Authentication
- **Sign up / Log in** with name, email, and password
- Passwords hashed with **bcrypt** (never stored in plain text)
- **JWT tokens** — session persists across browser refreshes
- Auto-redirect to login if session expired

### 🏠 Home Tab
- **Drag & drop CSV upload** with animated border pulse
- Auto-detects file metadata (rows, columns, size)
- Column tag preview (up to 12 columns shown)
- **Recent files grid** — last 6 uploaded files from history
- **Clear All** button to wipe history
- Download sample CSV for quick testing
- **Keyboard shortcut:** `Ctrl+U` to open file dialog

### 📊 Dashboard Tab
- **4 interactive charts (Chart.js):**
  - **Bar Chart** — Current vs Previous period, bars colored green / red
  - **Line Chart** — Trend over time with gradient area fill
  - **Donut Chart** — Category-wise value distribution
  - **Delta Chart** — Net difference with zero-line annotation
- **Summary cards:**
  - Total (Current) — sum of current column
  - Total (Previous) — sum of previous column
  - Net Difference — current minus previous
  - Change % — percentage change
- **Column mapper** — choose which CSV column = label / current / previous
- **Filter:** Show Both / Profit Only / Loss Only
- Chart zoom/pan (scroll wheel)
- Download any chart as PNG
- Export entire dashboard as PDF (`html2canvas + jsPDF`)
- Raw data table with color-coded Δ difference and % change columns

### 🕐 History Tab
- Full upload history table (stored in backend per user)
- Filter by date range and result status (Positive / Negative)
- Per-row actions: **View** (switches to Dashboard) / **Delete**
- **Clear History** button to wipe all entries
- Net result badge (▲ Profit / ▼ Loss / Neutral)
- History badge count in sidebar nav

### ✉️ Send Report Tab
- Compose email (recipient, subject, custom message)
- Chart selector checkboxes — choose which charts to embed
- "Include raw CSV data" toggle
- **Live email preview** pane (updates as you type)
- Node API → PDF generated via Puppeteer → Java mail service → HTML email sent

### 👤 Profile Tab
- Display name + email (avatar initial auto-updates)
- **SMTP settings** (host, port, username, app password)
- Show/hide password toggle
- **Send Test Email** — verify credentials work
- Statistics: files uploaded, reports sent, member since

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Primary | `#6366f1` (Indigo) |
| Profit / Positive | `#22c55e` (Green-500) |
| Loss / Negative | `#ef4444` (Red-500) |
| Dark BG | `#0f172a` |
| Light BG | `#f1f5f9` |
| Card | `rgba(255,255,255,0.04)` + backdrop blur |

**Themes:** Dark (default) and Light mode — toggle in sidebar footer, persisted to localStorage.

---

## 🔌 API Reference

### Node.js Backend (`http://localhost:3001`)

#### Auth Routes
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user (requires token) |
| POST | `/api/auth/update-smtp` | Save SMTP settings (requires token) |

#### History Routes *(all require Bearer token)*
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/history` | Get current user's history |
| POST | `/api/history` | Add a history entry |
| DELETE | `/api/history` | Clear all history |
| DELETE | `/api/history/:id` | Delete single entry by ID |

#### Utility Routes
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Server health check |
| POST | `/api/parse-csv` | Upload CSV (multipart), returns parsed JSON |
| POST | `/api/send-email` | Send email (proxies to Java + Puppeteer PDF) |
| POST | `/api/send-email/mock` | Mock send — no Java needed, for testing |

---

### Java Mail Service (`http://localhost:8081`)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/mail/send` | Send HTML email via SMTP |

**`POST /api/mail/send` body:**
```json
{
  "to"          : "recipient@example.com",
  "subject"     : "InsightMail Report",
  "body"        : "<html>...</html>",
  "attachments" : [
    { "filename": "report.pdf", "base64data": "...", "contentType": "application/pdf", "cid": "report.pdf" }
  ],
  "smtpHost"    : "smtp.gmail.com",
  "smtpPort"    : 587,
  "smtpUser"    : "you@gmail.com",
  "smtpPassword": "your-app-password"
}
```

---

## 📧 SMTP Setup (Gmail)

1. Enable **2-Step Verification** on your Google Account
2. Go to: **Google Account → Security → 2-Step Verification → App passwords**
3. Generate an App Password for "Mail"
4. In InsightMail → **Profile tab:**
   - SMTP Host: `smtp.gmail.com`
   - Port: `587`
   - Username: `your@gmail.com`
   - App Password: *(the 16-char password from step 3)*
5. Click **Save Settings**, then **Send Test Email**

---

## 📄 Sample CSV Format

```csv
Month,Current_Revenue,Previous_Revenue,Expenses
January,45000,38000,20000
February,52000,55000,22000
March,61000,48000,25000
April,38000,60000,21000
```

> Download the sample directly from the **Home tab** → "Download Sample CSV" button.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+U` | Open file upload dialog |
| `Ctrl+K` | Focus search bar |

---

## 🔧 Development

```bash
# Node backend with auto-reload
cd backend-node && npm run dev   # uses nodemon

# Java mail service
cd backend-java && mvn spring-boot:run

# Frontend — no build step needed, served at http://localhost:3001
# Edit frontend files and refresh the browser
```

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3 (Vanilla), JavaScript (ES2022) |
| Charts | Chart.js 4 + zoom + annotation + datalabels plugins |
| CSV Parsing | PapaParse 5 |
| PDF Generation | Puppeteer (server-side, headless Chrome) |
| PDF Export (client) | html2canvas + jsPDF |
| Backend API | Node.js 18 + Express 4 |
| Authentication | JWT (jsonwebtoken) + bcryptjs |
| File Upload | Multer 2 |
| HTTP Client | Axios |
| User Persistence | JSON file (`data/users.json`) via `user-store.js` |
| Mail Service | Java 17 + Spring Boot 3 + JavaMail |
