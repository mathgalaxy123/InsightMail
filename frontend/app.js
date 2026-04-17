/* ═══════════════════════════════════════════════════
   app.js — Main Application Controller
   InsightMail
   ═══════════════════════════════════════════════════ */

/* ────────────────────────────────────────────────────
   STATE
   ──────────────────────────────────────────────────── */
const State = {
  currentFile   : null,   // parsed CSV data
  analysis      : null,   // analyzeData() result
  labels        : [],
  summary       : null,
  filterMode    : 'both',
  isDark        : true,
  chartsReady   : false,
  smtpConfig    : { host:'', port:587, user:'', pass:'' },
  user          : { name:'', email:'', initials:'U' },
  stats         : { filesUploaded:0, reportsSent:0, memberSince:'' },
};

/* ────────────────────────────────────────────────────
   TOAST SYSTEM
   ──────────────────────────────────────────────────── */
function showToast(message, type = 'info', duration = 4000) {
  const icons = {
    success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    error  : `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info   : `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icons[type] || icons.info}
    <span style="flex:1">${message}</span>
    <span class="toast-close" onclick="this.parentElement.remove()">×</span>`;
  document.getElementById('toastContainer').appendChild(toast);
  if (duration > 0) setTimeout(() => { toast.style.opacity='0'; toast.style.transform='translateY(8px)'; setTimeout(() => toast.remove(), 300); }, duration);
}

/* ────────────────────────────────────────────────────
   LOCAL STORAGE HELPERS
   ──────────────────────────────────────────────────── */
const LS = {
  KEY_HISTORY : 'insightmail_history',
  KEY_THEME   : 'insightmail_theme',
  KEY_USER    : 'insightmail_user',
  KEY_SMTP    : 'insightmail_smtp',
  KEY_STATS   : 'insightmail_stats',
  KEY_TOKEN   : 'insightmail_token',

  getHistory() { 
    // Now fetched from State.history which is synced with backend
    return State.history || []; 
  },
  saveHistory(arr) { 
    // No longer used for shared history, but keeping for local state if needed
    State.history = arr;
  },

  async addHistoryEntry(entry) {
    const token = localStorage.getItem(this.KEY_TOKEN);
    if (!token) return;

    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(entry)
      });
      const data = await response.json();
      if (response.ok) {
        State.history = data.history;
        renderRecentFiles();
        updateHistoryBadge();
      }
    } catch (err) {
      console.error('Failed to save history to backend:', err);
    }
  },

  getTheme()     { return localStorage.getItem(this.KEY_THEME)   || 'dark'; },
  setTheme(t)    { localStorage.setItem(this.KEY_THEME, t); },

  getUser()      { try { return JSON.parse(localStorage.getItem(this.KEY_USER) || '{}'); } catch{ return {}; } },
  setUser(u)     { localStorage.setItem(this.KEY_USER, JSON.stringify(u)); },

  getSMTP()      { try { return JSON.parse(localStorage.getItem(this.KEY_SMTP) || '{}'); } catch{ return {}; } },
  setSMTP(s)     { localStorage.setItem(this.KEY_SMTP, JSON.stringify(s)); },

  getStats()     { try { return JSON.parse(localStorage.getItem(this.KEY_STATS) || '{}'); } catch{ return {}; } },
  setStats(s)    { localStorage.setItem(this.KEY_STATS, JSON.stringify(s)); },
};

/* ────────────────────────────────────────────────────
   NAVIGATION / TAB SWITCHING
   ──────────────────────────────────────────────────── */
function switchTab(tabId) {
  document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const page = document.getElementById('tab-' + tabId);
  const nav  = document.getElementById('nav-' + tabId);
  if (page) page.classList.add('active');
  if (nav)  nav.classList.add('active');

  // Close mobile sidebar
  closeMobileSidebar();

  // Tab-specific on-show logic
  if (tabId === 'history') renderHistoryTable();
  if (tabId === 'profile') loadProfileUI();
  if (tabId === 'reports') updateEmailPreview();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    switchTab(item.dataset.tab);
  });
});

/* ────────────────────────────────────────────────────
   SIDEBAR COLLAPSE
   ──────────────────────────────────────────────────── */
const sidebar     = document.getElementById('sidebar');
const mainWrapper = document.getElementById('mainWrapper');

document.getElementById('sidebarToggle').addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// Mobile sidebar
const overlay = document.createElement('div');
overlay.className = 'sidebar-overlay';
overlay.addEventListener('click', closeMobileSidebar);
document.body.appendChild(overlay);

document.getElementById('mobileMenuBtn').addEventListener('click', () => {
  sidebar.classList.add('mobile-open');
  overlay.classList.add('active');
});
function closeMobileSidebar() {
  sidebar.classList.remove('mobile-open');
  overlay.classList.remove('active');
}

/* ────────────────────────────────────────────────────
   THEME TOGGLE
   ──────────────────────────────────────────────────── */
function applyTheme(theme) {
  State.isDark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (State.isDark) {
    btn.classList.remove('on');
  } else {
    btn.classList.add('on');
  }
  // Re-render charts if ready
  if (State.chartsReady && State.analysis) {
    renderDashboard();
  }
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const newTheme = State.isDark ? 'light' : 'dark';
  LS.setTheme(newTheme);
  applyTheme(newTheme);
});

/* ────────────────────────────────────────────────────
   FILE UPLOAD LOGIC
   ──────────────────────────────────────────────────── */
const uploadZone  = document.getElementById('uploadZone');
const fileInput   = document.getElementById('csvFileInput');
const browseBtn   = document.getElementById('browseBtn');

browseBtn.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
uploadZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', e => {
  if (e.target.files[0]) handleFileSelected(e.target.files[0]);
});

// Drag and drop
uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelected(file);
});

async function handleFileSelected(file) {
  try {
    showFilePreview(file.name, '…parsing…', []);
    const data = await CSVParser.parseFile(file);
    State.currentFile = data;

    // Show preview
    const size = (file.size / 1024).toFixed(1) + ' KB';
    showFilePreview(data.fileName, `${data.rowCount} rows • ${data.headers.length} columns • ${size}`, data.headers);

    showToast(`✓ "${data.fileName}" parsed — ${data.rowCount} rows`, 'success');
  } catch(err) {
    showToast(err.message, 'error');
  }
}

function showFilePreview(name, meta, cols) {
  document.getElementById('filePreview').classList.remove('hidden');
  document.getElementById('previewFileName').textContent = name;
  document.getElementById('previewFileMeta').textContent = meta;

  const colWrap = document.getElementById('columnPreview');
  colWrap.innerHTML = '';
  cols.slice(0, 12).forEach(h => {
    const tag = document.createElement('span');
    tag.className = 'col-tag';
    tag.textContent = h;
    colWrap.appendChild(tag);
  });
  if (cols.length > 12) {
    const more = document.createElement('span');
    more.className = 'col-tag';
    more.textContent = `+${cols.length - 12} more`;
    colWrap.appendChild(more);
  }
}

document.getElementById('removeFileBtn').addEventListener('click', e => {
  e.stopPropagation();
  State.currentFile = null;
  document.getElementById('filePreview').classList.add('hidden');
  fileInput.value = '';
});

/* ── Generate Report CTA ─────────────────────────── */
document.getElementById('generateReportBtn').addEventListener('click', () => {
  if (!State.currentFile) {
    showToast('No file loaded', 'warning');
    return;
  }
  switchTab('dashboard');
  setTimeout(() => initDashboard(State.currentFile), 100);
});

/* ── Dashboard quick link ─────────────────────────── */
document.getElementById('goToUploadBtn').addEventListener('click', () => switchTab('home'));
document.getElementById('openMailFromDash').addEventListener('click', () => switchTab('reports'));

/* ────────────────────────────────────────────────────
   SAMPLE CSV DOWNLOAD
   ──────────────────────────────────────────────────── */
document.getElementById('downloadSampleCsv').addEventListener('click', () => {
  const sample = `Month,Current_Revenue,Previous_Revenue,Expenses
January,45000,38000,20000
February,52000,55000,22000
March,61000,48000,25000
April,38000,60000,21000
May,72000,65000,28000
June,68000,70000,26000
July,83000,72000,31000
August,91000,80000,33000
September,76000,88000,29000
October,95000,82000,35000
November,88000,91000,32000
December,105000,95000,40000`;

  const blob = new Blob([sample], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'insightmail_sample.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('Sample CSV downloaded!', 'success');
});

/* ────────────────────────────────────────────────────
   DASHBOARD INITIALISATION
   ──────────────────────────────────────────────────── */
function initDashboard(data) {
  // Show loading
  document.getElementById('dashboardEmptyState').classList.add('hidden');
  document.getElementById('dashboardContent').classList.add('hidden');
  document.getElementById('dashboardLoading').classList.remove('hidden');

  // Populate column selectors
  const { labelCol, currentCol, previousCol } = CSVParser.suggestMapping(data.headers, data.rows);

  const labelSel   = document.getElementById('labelColSelect');
  const currentSel = document.getElementById('currentColSelect');
  const prevSel    = document.getElementById('previousColSelect');

  [labelSel, currentSel].forEach(sel => {
    sel.innerHTML = '';
    data.headers.forEach(h => {
      const o = document.createElement('option');
      o.value = h; o.textContent = h;
      sel.appendChild(o);
    });
  });

  // Previous col has empty option
  prevSel.innerHTML = '<option value="">— None —</option>';
  data.headers.forEach(h => {
    const o = document.createElement('option');
    o.value = h; o.textContent = h;
    prevSel.appendChild(o);
  });

  labelSel.value   = labelCol   || data.headers[0] || '';
  currentSel.value = currentCol || data.headers[1] || '';
  prevSel.value    = previousCol || '';

  // Simulate brief loading
  setTimeout(() => {
    document.getElementById('dashboardLoading').classList.add('hidden');
    document.getElementById('dashboardContent').classList.remove('hidden');
    document.getElementById('dashboardSubtitle').textContent =
      `Showing data from "${data.fileName}" • ${data.rowCount} rows`;
    renderDashboard();
  }, 600);
}

function renderDashboard() {
  const data = State.currentFile;
  if (!data) return;

  const labelCol   = document.getElementById('labelColSelect').value;
  const currentCol = document.getElementById('currentColSelect').value;
  const prevCol    = document.getElementById('previousColSelect').value;

  const labels       = data.rows.map(r => String(r[labelCol] || ''));
  const currVals     = CSVParser.getColumnValues(currentCol, data.rows);
  const prevVals     = prevCol ? CSVParser.getColumnValues(prevCol, data.rows) : currVals.map(() => 0);

  const analysis = CSVParser.analyzeData(currVals, prevVals);
  const summary  = CSVParser.buildSummary(analysis, data.rows, null);

  State.labels   = labels;
  State.analysis = analysis;
  State.summary  = summary;
  State.chartsReady = true;

  // Summary cards
  updateSummaryCards(summary);

  // Charts
  Charts.renderAll({
    labels,
    analysis,
    filterMode: State.filterMode,
    isDark    : State.isDark,
  });

  // Data table
  renderDataTable(data.headers, data.rows, analysis, labelCol, currentCol, prevCol);

  // Save to history
  saveToHistory(data, summary);
  renderRecentFiles();
  updateHistoryBadge();
}

/* ── Apply mapping button ─────────────────────────── */
document.getElementById('applyMappingBtn').addEventListener('click', () => {
  if (!State.currentFile) {
    showToast('No CSV loaded yet', 'warning');
    return;
  }
  renderDashboard();
  showToast('Charts updated!', 'success', 2000);
});

/* ────────────────────────────────────────────────────
   SUMMARY CARDS
   ──────────────────────────────────────────────────── */
function updateSummaryCards(s) {
  const fmt = CSVParser.formatCurrency;

  // Revenue
  set('cardRevenueVal', fmt(s.totalRevenue));
  setChange('cardRevenueChange', s.totalRevenue - s.totalPrevious, s.totalPrevious);

  // Expenses
  set('cardExpensesVal', fmt(s.totalExpenses));
  document.getElementById('cardExpensesChange').textContent = s.totalExpenses > 0
    ? 'Recorded deductions'
    : 'No expense column mapped';
  document.getElementById('cardExpensesChange').className = 'card-change';

  // Net Difference
  set('cardProfitVal', fmt(s.netProfit));
  document.getElementById('cardProfitVal').style.color =
    s.netProfit >= 0 ? 'var(--profit)' : 'var(--loss)';
  const profitEl = document.getElementById('cardProfitChange');
  if (s.profitChange !== 'N/A') {
    const up = parseFloat(s.profitChange) >= 0;
    profitEl.textContent = (up ? '▲ ' : '▼ ') + Math.abs(s.profitChange) + '% change';
    profitEl.className = 'card-change ' + (up ? 'up' : 'down');
  } else {
    profitEl.textContent = 'No previous data';
    profitEl.className = 'card-change';
  }

  // Change %
  set('cardMarginVal', s.profitMargin.toFixed(1) + '%');
  document.getElementById('cardMarginVal').style.color =
    s.profitMargin >= 0 ? 'var(--profit)' : 'var(--loss)';
  document.getElementById('cardMarginChange').textContent =
    s.netProfit >= 0 ? '▲ Positive overall' : '▼ Negative overall';
  document.getElementById('cardMarginChange').className =
    'card-change ' + (s.netProfit >= 0 ? 'up' : 'down');
}

function set(id, val) { document.getElementById(id).textContent = val; }

function setChange(id, diff, prev) {
  const el  = document.getElementById(id);
  const pct = prev !== 0 ? ((diff/Math.abs(prev))*100).toFixed(1) : null;
  if (pct !== null) {
    const up = diff >= 0;
    el.textContent = (up ? '▲ +' : '▼ ') + Math.abs(pct) + '% vs previous';
    el.className = 'card-change ' + (up ? 'up' : 'down');
  } else {
    el.textContent = '—';
    el.className = 'card-change';
  }
}

/* ────────────────────────────────────────────────────
   FILTER BUTTONS
   ──────────────────────────────────────────────────── */
['filterBoth', 'filterProfit', 'filterLoss'].forEach(id => {
  document.getElementById(id).addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    State.filterMode = this.dataset.filter;
    if (State.analysis) {
      Charts.applyFilter(State.filterMode, {
        labels  : State.labels,
        analysis: State.analysis,
        isDark  : State.isDark,
      });
    }
  });
});

/* ────────────────────────────────────────────────────
   DATA TABLE
   ──────────────────────────────────────────────────── */
function renderDataTable(headers, rows, analysis, labelCol, currentCol, prevCol) {
  const thead = document.getElementById('dataTableHead');
  const tbody = document.getElementById('dataTableBody');

  // Build headers
  const extraCols = ['Δ Difference', '% Change', 'Status'];
  const allHeaders = [...headers, ...extraCols];
  thead.innerHTML = '<tr>' + allHeaders.map(h => `<th>${h}</th>`).join('') + '</tr>';

  // Build rows
  tbody.innerHTML = '';
  rows.forEach((row, i) => {
    const a = analysis[i] || {};
    const tr = document.createElement('tr');

    // Original columns
    headers.forEach(h => {
      const td = document.createElement('td');
      const val = row[h];
      // Color value columns
      if ((h === currentCol || h === prevCol) && val !== null && !isNaN(parseFloat(val))) {
        td.textContent = CSVParser.formatCurrency(parseFloat(val));
        td.className = parseFloat(val) >= 0 ? 'profit-cell' : 'loss-cell';
      } else {
        td.textContent = val ?? '—';
      }
      tr.appendChild(td);
    });

    // Delta
    const tdDelta = document.createElement('td');
    if (a.difference !== undefined) {
      tdDelta.textContent = (a.difference >= 0 ? '+' : '') + CSVParser.formatCurrency(a.difference);
      tdDelta.className = a.difference >= 0 ? 'profit-cell' : 'loss-cell';
    } else { tdDelta.textContent = '—'; }
    tr.appendChild(tdDelta);

    // %
    const tdPct = document.createElement('td');
    if (a.percentChange !== undefined && a.percentChange !== 'N/A') {
      tdPct.textContent = (parseFloat(a.percentChange) >= 0 ? '+' : '') + a.percentChange + '%';
      tdPct.className = parseFloat(a.percentChange) >= 0 ? 'profit-cell' : 'loss-cell';
    } else { tdPct.textContent = a.percentChange || '—'; }
    tr.appendChild(tdPct);

    // Status badge
    const tdStatus = document.createElement('td');
    tdStatus.innerHTML = a.status === 'profit'
      ? `<span class="recent-status-badge badge-profit">▲ Profit</span>`
      : `<span class="recent-status-badge badge-loss">▼ Loss</span>`;
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  });
}

// Toggle table
let tableVisible = true;
document.getElementById('toggleTableBtn').addEventListener('click', function() {
  tableVisible = !tableVisible;
  document.getElementById('dataTableWrap').style.display = tableVisible ? '' : 'none';
  this.textContent = tableVisible ? 'Hide Table' : 'Show Table';
});

/* ────────────────────────────────────────────────────
   HISTORY
   ──────────────────────────────────────────────────── */
function saveToHistory(data, summary) {
  const existing = LS.getHistory();
  // Avoid exact duplicates by file name + same parsedAt
  const isDup = existing.some(e => e.fileName === data.fileName && e.parsedAt === data.parsedAt);
  if (isDup) return;

  const entry = {
    id        : Date.now(),
    fileName  : data.fileName,
    uploadDate: new Date().toISOString(),
    rowCount  : data.rowCount,
    headers   : data.headers,
    netProfit : summary.netProfit,
    status    : summary.overallStatus,
    parsedAt  : data.parsedAt,
  };
  LS.addHistoryEntry(entry);

  // Update stats
  const stats = LS.getStats();
  stats.filesUploaded = (stats.filesUploaded || 0) + 1;
  if (!stats.memberSince) stats.memberSince = new Date().toISOString();
  LS.setStats(stats);
  State.stats = stats;
}

function updateHistoryBadge() {
  const count = LS.getHistory().length;
  document.getElementById('historyBadge').textContent = count;
}

function renderRecentFiles() {
  const history = (State.history || []).slice(0, 6);
  const grid    = document.getElementById('recentGrid');
  const empty   = document.getElementById('emptyRecentFiles');

  if (history.length === 0) {
    empty.style.display = '';
    grid.innerHTML = '';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = history.map(e => {
    const date = new Date(e.uploadDate).toLocaleDateString();
    const badge = e.status === 'profit'
      ? `<span class="recent-status-badge badge-profit">▲ Profit</span>`
      : e.status === 'loss'
      ? `<span class="recent-status-badge badge-loss">▼ Loss</span>`
      : `<span class="recent-status-badge badge-neutral">Neutral</span>`;
    return `<div class="glass-card recent-file-card" data-id="${e.id}">
      <div class="file-name">${e.fileName}</div>
      <div class="file-meta">${date} • ${e.rowCount} rows</div>
      ${badge}
    </div>`;
  }).join('');
}

function renderHistoryTable(filterParams = {}) {
  let history = LS.getHistory();

  // Apply filters
  if (filterParams.dateFrom) {
    history = history.filter(e => new Date(e.uploadDate) >= new Date(filterParams.dateFrom));
  }
  if (filterParams.dateTo) {
    const to = new Date(filterParams.dateTo);
    to.setHours(23,59,59);
    history = history.filter(e => new Date(e.uploadDate) <= to);
  }
  if (filterParams.status && filterParams.status !== 'all') {
    history = history.filter(e => e.status === filterParams.status);
  }

  const wrap  = document.getElementById('historyTableWrap');
  const empty = document.getElementById('historyEmpty');
  const tbody = document.getElementById('historyTableBody');

  if (history.length === 0) {
    wrap.style.display  = 'none';
    empty.style.display = '';
    return;
  }
  wrap.style.display  = '';
  empty.style.display = 'none';

  tbody.innerHTML = history.map(e => {
    const date   = new Date(e.uploadDate).toLocaleString();
    const netFmt = CSVParser.formatCurrency(Math.abs(e.netProfit || 0));
    const badge  = e.status === 'profit'
      ? `<span class="badge badge-profit">▲ +${netFmt}</span>`
      : e.status === 'loss'
      ? `<span class="badge badge-loss">▼ -${netFmt}</span>`
      : `<span class="badge badge-neutral">Neutral</span>`;

    return `<tr>
      <td><strong>${e.fileName}</strong></td>
      <td>${date}</td>
      <td>${e.rowCount}</td>
      <td>${badge}</td>
      <td class="text-right">
        <div class="action-btns">
          <button class="btn-ghost btn-sm" onclick="historyView(${e.id})">View</button>
          <button class="btn-danger-outline btn-sm" onclick="historyDelete('${e.id}')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

window.historyView = function(id) {
  const entry = (State.history || []).find(e => e.id == id);
  if (!entry) return;

  switchTab('dashboard');

  if (State.currentFile && State.currentFile.fileName === entry.fileName) {
    renderDashboard();
  } else {
    showToast(`Please re-upload '${entry.fileName}' to view its report`, 'info');
  }
};

window.historyDelete = async function(id) {
  const token = localStorage.getItem(LS.KEY_TOKEN);
  if (!token) return;

  try {
    const response = await fetch(`/api/history/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      State.history = data.history;
      renderHistoryTable();
      updateHistoryBadge();
      renderRecentFiles();
      showToast('Entry deleted', 'info', 2000);
    }
  } catch (err) {
    showToast('Delete failed', 'error');
  }
};

// Filter buttons
document.getElementById('applyHistoryFilter').addEventListener('click', () => {
  renderHistoryTable({
    dateFrom: document.getElementById('filterDateFrom').value,
    dateTo  : document.getElementById('filterDateTo').value,
    status  : document.getElementById('filterStatus').value,
  });
});
document.getElementById('clearHistoryFilter').addEventListener('click', () => {
  document.getElementById('filterDateFrom').value = '';
  document.getElementById('filterDateTo').value   = '';
  document.getElementById('filterStatus').value   = 'all';
  renderHistoryTable();
});
const clearHistory = async () => {
  if (!confirm('Clear all history? This cannot be undone.')) return;
  
  const token = localStorage.getItem(LS.KEY_TOKEN);
  if (!token) return;

  try {
    const response = await fetch('/api/history', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      State.history = data.history;
      updateHistoryBadge();
      renderRecentFiles();
      renderHistoryTable();
      showToast('History cleared', 'info', 2000);
    } else {
      throw new Error(data.message || 'Server error');
    }
  } catch (err) {
    console.error('Clear history error:', err);
    showToast('Clear failed: ' + err.message, 'error');
  }
};

document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
document.getElementById('clearHistoryBtnHome')?.addEventListener('click', clearHistory);

document.getElementById('historyGoUpload').addEventListener('click', () => switchTab('home'));

/* ────────────────────────────────────────────────────
   AUTHENTICATION CHECK / SYNC
   ──────────────────────────────────────────────────── */
async function syncAuth() {
  const token = localStorage.getItem(LS.KEY_TOKEN);
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const response = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        logout();
        return;
      }
      throw new Error(data.message);
    }

    // Sync state and LS
    State.user = { name: data.user.name, email: data.user.email, initials: data.user.name[0] };
    State.smtpConfig = data.user.smtp || { host:'', port:587, user:'', pass:'' };
    
    LS.setUser(State.user);
    LS.setSMTP(State.smtpConfig);
    
    // Fetch History
    const historyRes = await fetch('/api/history', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const historyData = await historyRes.json();
    if (historyRes.ok) {
      State.history = historyData.history;
      renderRecentFiles();
      updateHistoryBadge();
    }

    updateAvatarUI(State.user.name);
    
  } catch (err) {
    console.error('Auth sync failed:', err);
    showToast('Session sync failed. Using local data.', 'warning');
  }
}

function logout() {
  localStorage.removeItem(LS.KEY_TOKEN);
  localStorage.removeItem(LS.KEY_USER);
  localStorage.removeItem(LS.KEY_SMTP);
  window.location.href = 'login.html';
}

document.getElementById('logoutBtn').addEventListener('click', logout);

/* ────────────────────────────────────────────────────
   PROFILE
   ──────────────────────────────────────────────────── */
function loadProfileUI() {
  const user = LS.getUser();
  const smtp = LS.getSMTP();
  const stats = LS.getStats();

  document.getElementById('profileName').value  = user.name  || '';
  document.getElementById('profileEmail').value = user.email || '';
  document.getElementById('smtpHost').value = smtp.host || '';
  document.getElementById('smtpPort').value = smtp.port || 587;
  document.getElementById('smtpUser').value = smtp.user || '';
  document.getElementById('smtpPass').value = smtp.pass || '';

  updateAvatarUI(user.name || user.email || 'U');

  document.getElementById('statFiles').textContent   = stats.filesUploaded || 0;
  document.getElementById('statReports').textContent = stats.reportsSent   || 0;
  document.getElementById('statSince').textContent   = stats.memberSince
    ? new Date(stats.memberSince).toLocaleDateString()
    : '—';
}

function updateAvatarUI(nameOrEmail) {
  const initial = (nameOrEmail || 'U')[0].toUpperCase();
  document.getElementById('profileInitials').textContent = initial;
  document.getElementById('avatarInitials').textContent  = initial;
  document.getElementById('profileAvatarCircle').style.background =
    `linear-gradient(135deg, var(--primary), #8b5cf6)`;
}

// Live preview initials
document.getElementById('profileName').addEventListener('input', function() {
  updateAvatarUI(this.value || document.getElementById('profileEmail').value || 'U');
});

document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  const user = {
    name : document.getElementById('profileName').value.trim(),
    email: document.getElementById('profileEmail').value.trim(),
  };
  const smtp = {
    host: document.getElementById('smtpHost').value.trim(),
    port: parseInt(document.getElementById('smtpPort').value) || 587,
    user: document.getElementById('smtpUser').value.trim(),
    pass: document.getElementById('smtpPass').value,
  };
  LS.setUser(user);
  LS.setSMTP(smtp);
  State.smtpConfig = smtp;
  State.user = user;
  updateAvatarUI(user.name || user.email || 'U');

  // Save to backend
  const token = localStorage.getItem(LS.KEY_TOKEN);
  if (token) {
    fetch('/api/auth/update-smtp', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(smtp)
    }).catch(err => console.error('Failed to sync SMTP to backend:', err));
  }

  showToast('Settings saved ✓', 'success');
});

// Toggle password visibility
document.getElementById('togglePass').addEventListener('click', () => {
  const inp = document.getElementById('smtpPass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

// Test SMTP
document.getElementById('testSmtpBtn').addEventListener('click', async () => {
  const smtp = {
    host: document.getElementById('smtpHost').value.trim(),
    port: parseInt(document.getElementById('smtpPort').value) || 587,
    user: document.getElementById('smtpUser').value.trim(),
    pass: document.getElementById('smtpPass').value,
  };
  const email = document.getElementById('profileEmail').value.trim()
             || document.getElementById('smtpUser').value.trim();
  if (!smtp.host || !smtp.user || !smtp.pass) {
    showToast('Fill in SMTP Host, Username, and Password first', 'warning');
    return;
  }
  if (!email) {
    showToast('Enter your email in the Profile section first', 'warning');
    return;
  }
  showToast('Sending test email…', 'info', 2000);
  try {
    await Mailer.sendReport({
      to        : email,
      subject   : 'InsightMail — SMTP Test',
      message   : 'This is a test email from InsightMail. Your SMTP settings are working correctly!',
      smtpConfig: smtp,
      includeCSV: false,
      selectedCharts: { barChart:false, lineChart:false, donutChart:false, areaChart:false },
    });
    showToast('Test email sent! Check your inbox.', 'success');
    const stats = LS.getStats();
    stats.reportsSent = (stats.reportsSent || 0) + 1;
    LS.setStats(stats);
  } catch (err) {
    if (err.javaDown) {
      showToast('⚠ Java mail service is not running on port 8081. Start it with: cd backend-java && mvn spring-boot:run', 'warning', 8000);
    } else {
      showToast('Failed: ' + err.message, 'error', 6000);
    }
  }
});

/* ────────────────────────────────────────────────────
   REPORTS / SEND EMAIL
   ──────────────────────────────────────────────────── */
function updateEmailPreview() {
  Mailer.buildPreview({
    to     : document.getElementById('recipientEmail').value,
    subject: document.getElementById('mailSubject').value,
    message: document.getElementById('mailBody').value,
    summary: State.summary,
  });
}

['recipientEmail','mailSubject','mailBody'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateEmailPreview);
});

document.getElementById('sendReportBtn').addEventListener('click', async () => {
  const to      = document.getElementById('recipientEmail').value.trim();
  const subject = document.getElementById('mailSubject').value.trim();
  const message = document.getElementById('mailBody').value.trim();

  if (!to || !to.includes('@')) {
    showToast('Enter a valid recipient email', 'warning');
    return;
  }

  const smtp = LS.getSMTP();
  if (!smtp.host || !smtp.user || !smtp.pass) {
    showToast('Configure SMTP settings in Profile first', 'warning');
    setTimeout(() => switchTab('profile'), 1200);
    return;
  }

  const btn = document.getElementById('sendReportBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Sending…';

  try {
    const selectedCharts = {
      barChart  : document.getElementById('inclBar').checked,
      lineChart : document.getElementById('inclLine').checked,
      donutChart: document.getElementById('inclDonut').checked,
      areaChart : document.getElementById('inclArea').checked,
    };

    const data = CSVParser.getData();

    await Mailer.sendReport({
      to, subject, message,
      summary       : State.summary,
      csvRows       : data ? data.rows : [],
      headers       : data ? data.headers : [],
      smtpConfig    : smtp,
      includeCSV    : document.getElementById('inclCsvData').checked,
      selectedCharts,
    });

    showToast(`Report sent to ${to} ✓`, 'success');

    // Update stats
    const stats = LS.getStats();
    stats.reportsSent = (stats.reportsSent || 0) + 1;
    LS.setStats(stats);
    State.stats = stats;

  } catch (err) {
    if (err.javaDown) {
      // Java service not running — offer mock fallback
      showToast(
        '⚠ Java mail service not running. Start it with: cd backend-java && mvn spring-boot:run',
        'warning',
        8000
      );
      // Auto-retry with mock so user can see the success flow
      try {
        await Mailer.sendReport({
          to, subject, message, summary: State.summary,
          csvRows: [], headers: [],
          smtpConfig: smtp,
          includeCSV: false,
          selectedCharts: {},
          useMock: true,
        });
        showToast('📨 Mock send succeeded (Java service offline — no real email sent)', 'info', 6000);
      } catch(mockErr) {
        showToast('Mock send failed too: ' + mockErr.message, 'error');
      }
    } else {
      showToast('Send failed: ' + err.message, 'error', 7000);
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Report`;
  }
});

/* ────────────────────────────────────────────────────
   EXPORT PDF
   ──────────────────────────────────────────────────── */
document.getElementById('exportPdfBtn').addEventListener('click', async () => {
  if (!State.chartsReady) {
    showToast('Generate a report first', 'warning');
    return;
  }
  showToast('Generating PDF…', 'info', 2500);
  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' });
    const pw  = pdf.internal.pageSize.getWidth();
    const ph  = pdf.internal.pageSize.getHeight();

    const charts = [
      { id: 'barChartCard',   label: 'Period Comparison' },
      { id: 'lineChartCard',  label: 'Trend Analysis' },
      { id: 'donutChartCard', label: 'Category Distribution' },
      { id: 'areaChartCard',  label: 'Profit / Loss Delta' },
    ];

    // Cover page
    pdf.setFontSize(22);
    pdf.setTextColor(99,102,241);
    pdf.text('InsightMail Analytics Report', pw/2, 60, { align:'center' });
    pdf.setFontSize(11);
    pdf.setTextColor(100,116,139);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, pw/2, 80, { align:'center' });
    if (State.currentFile) {
      pdf.text(`File: ${State.currentFile.fileName} (${State.currentFile.rowCount} rows)`, pw/2, 96, { align:'center' });
    }

    // Chart pages
    for (let i = 0; i < charts.length; i++) {
      const { id, label } = charts[i];
      const el = document.getElementById(id);
      if (!el) continue;
      const canvas = await html2canvas(el, { scale: 1.5, backgroundColor: null, useCORS: true });
      const img    = canvas.toDataURL('image/png');
      const ratio  = canvas.width / canvas.height;
      const w      = Math.min(pw - 40, canvas.width / 1.5);
      const h      = w / ratio;
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.setTextColor(99,102,241);
      pdf.text(label, 20, 30);
      pdf.addImage(img, 'PNG', 20, 40, w, h);
    }

    pdf.save(`insightmail-report-${Date.now()}.pdf`);
    showToast('PDF exported!', 'success');
  } catch (err) {
    showToast('PDF export failed: ' + err.message, 'error');
  }
});

/* ────────────────────────────────────────────────────
   KEYBOARD SHORTCUTS
   ──────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  // Ctrl+U → open file dialog
  if (e.ctrlKey && e.key === 'u') {
    e.preventDefault();
    switchTab('home');
    setTimeout(() => document.getElementById('csvFileInput').click(), 100);
  }
  // Ctrl+K → focus search
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    document.getElementById('globalSearch').focus();
  }
  // Escape → close mobile sidebar
  if (e.key === 'Escape') closeMobileSidebar();
});

/* ────────────────────────────────────────────────────
   SEARCH (basic in-page)
   ──────────────────────────────────────────────────── */
document.getElementById('globalSearch').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return;
    const tabs = { home:'home', dashboard:'dashboard', history:'history', profile:'profile', report:'reports', mail:'reports', send:'reports' };
    const match = Object.keys(tabs).find(k => q.includes(k));
    if (match) {
      switchTab(tabs[match]);
      e.target.value = '';
    }
  }
});

/* ────────────────────────────────────────────────────
   INITIALISE APP
   ──────────────────────────────────────────────────── */
function init() {
  // Load theme
  const savedTheme = LS.getTheme();
  applyTheme(savedTheme);

  // Load user/smtp
  const savedUser = LS.getUser();
  const savedSmtp = LS.getSMTP();
  State.user = savedUser;
  State.smtpConfig = savedSmtp;

  if (savedUser.name || savedUser.email) {
    updateAvatarUI(savedUser.name || savedUser.email || 'U');
  }

  // Load stats
  State.stats = LS.getStats();

  // Render recent + badge
  renderRecentFiles();
  updateHistoryBadge();

  // Ensure stats member since
  const stats = LS.getStats();
  if (!stats.memberSince) {
    stats.memberSince = new Date().toISOString();
    LS.setStats(stats);
  }

  // Show home tab by default
  switchTab('home');

  // Sync auth
  syncAuth();

  console.log('%c InsightMail Ready ', 'background:#6366f1;color:#fff;font-size:14px;padding:4px 10px;border-radius:6px;font-weight:700;font-family:Inter,sans-serif');
}

init();
