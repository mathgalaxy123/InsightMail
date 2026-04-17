/* ═══════════════════════════════════════════════════
   server.js — InsightMail Node.js / Express Backend
   ═══════════════════════════════════════════════════ */

'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const jwt = require('jsonwebtoken');
const userStore = require('./user-store');

const app = express();
const PORT = process.env.PORT || 3001;
const JAVA_SERVICE_URL = process.env.JAVA_SERVICE_URL || 'http://localhost:8081/api/mail/send';
const JWT_SECRET = process.env.JWT_SECRET || 'insightmail-secret-key-123';

/* ── Middleware ──────────────────────────────────── */
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500', '*'],
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve frontend statically
app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* ── Multer (CSV upload in-memory) ───────────────── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 52_428_800,  // 50 MB
    files: 1,
  },
  fileFilter(req, file, cb) {
    const allowed = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (allowed.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(null, true);
    }
    cb(new Error('Only CSV files are allowed'));
  },
});

/* ══════════════════════════════════════════════════
   REQUEST LOGGER
   ══════════════════════════════════════════════════ */
function logReq(method, url, status, ms) {
  const colors = { GET: '32', POST: '34', DELETE: '31', PUT: '33' };
  const c = colors[method] || '37';
  const s = status >= 400 ? '\x1b[31m' : status >= 200 ? '\x1b[32m' : '\x1b[37m';
  console.log(`\x1b[${c}m${method}\x1b[0m ${url} ${s}${status}\x1b[0m \x1b[90m${ms}ms\x1b[0m`);
}

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => logReq(req.method, req.url, res.statusCode, Date.now() - start));
  next();
});

/* ══════════════════════════════════════════════════
   GET /api/health
   ══════════════════════════════════════════════════ */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'InsightMail Node API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    javaService: JAVA_SERVICE_URL,
    uptime: Math.floor(process.uptime()) + 's',
  });
});

/* ══════════════════════════════════════════════════
   AUTHENTICATION ROUTES
   ══════════════════════════════════════════════════ */

// Middleware to protect routes
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  const existing = await userStore.findByEmail(email);
  if (existing) {
    return res.status(400).json({ success: false, message: 'User already exists' });
  }
  const user = await userStore.createUser({ name, email, password });
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await userStore.findByEmail(email);
  if (!user || !(await userStore.verifyPassword(user, password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, smtp: user.smtp } });
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  const user = await userStore.findByEmail(req.user.email);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, smtp: user.smtp } });
});

app.post('/api/auth/update-smtp', authenticate, async (req, res) => {
  const updatedUser = await userStore.updateSmtp(req.user.id, req.body);
  if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, smtp: updatedUser.smtp });
});

/* ══════════════════════════════════════════════════
   HISTORY ROUTES
   ══════════════════════════════════════════════════ */

app.get('/api/history', authenticate, async (req, res) => {
  const history = await userStore.getHistory(req.user.id);
  res.json({ success: true, history });
});

app.post('/api/history', authenticate, async (req, res) => {
  const history = await userStore.addHistory(req.user.id, req.body);
  if (!history) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, history });
});

app.delete('/api/history', authenticate, async (req, res) => {
  console.log(`\x1b[31m🗑 Clearing history for user\x1b[0m: ${req.user.id}`);
  const history = await userStore.clearHistory(req.user.id);
  if (history === null) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, history: [] });
});

app.delete('/api/history/:id', authenticate, async (req, res) => {
  console.log(`\x1b[31m🗑 Deleting history entry\x1b[0m: ${req.params.id} for user: ${req.user.id}`);
  const history = await userStore.deleteHistory(req.user.id, req.params.id);
  if (!history) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, history });
});

/* ══════════════════════════════════════════════════
   POST /api/parse-csv
   Accepts: multipart/form-data with field "csv"
   Returns: { headers, rows, rowCount }
   ══════════════════════════════════════════════════ */
app.post('/api/parse-csv', upload.single('csv'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file provided' });
    }

    const content = req.file.buffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

    if (lines.length < 2) {
      return res.status(400).json({ success: false, message: 'CSV has no data rows' });
    }

    // Simple CSV parser (for server-side use)
    function parseLine(line) {
      const result = [];
      let cur = '', inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          result.push(cur.trim()); cur = '';
        } else {
          cur += ch;
        }
      }
      result.push(cur.trim());
      return result;
    }

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(line => {
      const vals = parseLine(line);
      const row = {};
      headers.forEach((h, i) => {
        const raw = vals[i] ?? '';
        row[h] = isNaN(parseFloat(raw)) || raw === '' ? raw : parseFloat(raw);
      });
      return row;
    });

    return res.json({
      success: true,
      headers,
      rows,
      rowCount: rows.length,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });

  } catch (err) {
    console.error('CSV parse error:', err);
    return res.status(500).json({ success: false, message: 'Server error parsing CSV: ' + err.message });
  }
});

/* ══════════════════════════════════════════════════
   POST /api/send-email
   Body (JSON): {
     to, subject, body, attachments[],
     smtpHost, smtpPort, smtpUser, smtpPassword
   }
   Proxies request to Java Spring Boot mail service
   ══════════════════════════════════════════════════ */
app.post('/api/send-email', async (req, res) => {
  const {
    to, subject, body, attachments,
    smtpHost, smtpPort, smtpUser, smtpPassword,
  } = req.body;

  // SMTP Fallback logic
  const finalHost = smtpHost || process.env.DEFAULT_SMTP_HOST;
  const finalPort = smtpPort || process.env.DEFAULT_SMTP_PORT || 587;
  const finalUser = smtpUser || process.env.DEFAULT_SMTP_USER;
  const finalPass = smtpPassword || process.env.DEFAULT_SMTP_PASS;

  // Validation
  if (!to || !subject) {
    return res.status(400).json({ success: false, message: 'Fields "to" and "subject" are required' });
  }
  if (!finalHost || !finalUser || !finalPass) {
    return res.status(400).json({
      success: false,
      message: 'SMTP credentials missing. Please configure them in Profile or contact admin.',
    });
  }

  // ── GENERATE PDF ATTACHMENT FROM BODY ────────────
  let processedAttachments = attachments || [];
  if (body) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(body, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });

      processedAttachments = [{
        filename: 'InsightMail_Report.pdf',
        base64data: pdfBuffer.toString('base64'),
        contentType: 'application/pdf',
        cid: 'report.pdf'
      }, ...processedAttachments];

      console.log('\x1b[32m✓ PDF generated and attached\x1b[0m');
    } catch (pdfErr) {
      console.error('\x1b[31m⚠ PDF generation failed:\x1b[0m', pdfErr.message);
    } finally {
      if (browser) await browser.close();
    }
  }

  const payload = {
    to,
    subject,
    body: body || '',
    attachments: processedAttachments,
    smtpHost: finalHost,
    smtpPort: parseInt(finalPort),
    smtpUser: finalUser,
    smtpPassword: finalPass,
  };

  console.log(`\x1b[34m📧 Sending email\x1b[0m → ${to} | Subject: "${subject}" | Host: ${smtpHost}:${smtpPort}`);

  try {
    const response = await axios.post(JAVA_SERVICE_URL, payload, {
      timeout: 30_000, // 30 s
      headers: { 'Content-Type': 'application/json' },
    });

    return res.json({
      success: true,
      message: 'Email sent successfully',
      detail: response.data,
    });

  } catch (err) {
    // If Java service is down — return helpful error
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      console.error('\x1b[31m⚠ Java mail service unreachable:\x1b[0m', JAVA_SERVICE_URL);
      return res.status(503).json({
        success: false,
        message: `Java mail service is not running at ${JAVA_SERVICE_URL}. Please start the Spring Boot service first.`,
        hint: 'Run: cd backend-java && mvn spring-boot:run',
      });
    }

    const status = err.response?.status || 500;
    const errData = err.response?.data || {};
    console.error('\x1b[31mMail service error:\x1b[0m', errData);

    return res.status(status).json({
      success: false,
      message: errData.error || errData.message || err.message || 'Unknown mail service error',
    });
  }
});

/* ══════════════════════════════════════════════════
   POST /api/send-email/mock
   Same interface but bypasses Java service (testing)
   ══════════════════════════════════════════════════ */
app.post('/api/send-email/mock', (req, res) => {
  const { to, subject } = req.body;
  console.log(`\x1b[33m[MOCK]\x1b[0m Email to: ${to}, subject: "${subject}"`);
  setTimeout(() => {
    res.json({ success: true, message: `[MOCK] Email sent to ${to}` });
  }, 800);
});

/* ══════════════════════════════════════════════════
   GLOBAL ERROR HANDLER
   ══════════════════════════════════════════════════ */
app.use((err, req, res, next) => {
  console.error('\x1b[31mUnhandled error:\x1b[0m', err.message);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: 'File upload error: ' + err.message });
  }
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

/* ── 404 catch-all ───────────────────────────────── */
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
  }
  // Serve frontend for non-API routes
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

/* ── Start server ────────────────────────────────── */
app.listen(PORT, () => {
  console.log('\n\x1b[35m╔══════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[35m║\x1b[0m  \x1b[1m✉  InsightMail Node.js API\x1b[0m            \x1b[35m║\x1b[0m');
  console.log('\x1b[35m╚══════════════════════════════════════╝\x1b[0m');
  console.log(`\x1b[32m✓\x1b[0m Server running  → \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[32m✓\x1b[0m Frontend served → \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[32m✓\x1b[0m Java service    → \x1b[36m${JAVA_SERVICE_URL}\x1b[0m`);
  console.log(`\x1b[32m✓\x1b[0m Health check    → \x1b[36mhttp://localhost:${PORT}/api/health\x1b[0m`);
  console.log('\x1b[90m──────────────────────────────────────\x1b[0m\n');
});

module.exports = app;
