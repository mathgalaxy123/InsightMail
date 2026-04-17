/* ═══════════════════════════════════════════════════
   csvParser.js — CSV Parsing & Analysis Module
   InsightMail
   ═══════════════════════════════════════════════════ */

const CSVParser = (() => {

  let parsedData = null; // { headers, rows, fileName, rowCount }

  /* ── Core parse function ─────────────────────────── */
  function parseFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file provided'));
      if (!file.name.toLowerCase().endsWith('.csv')) {
        return reject(new Error('File must be a .csv file'));
      }
      if (file.size > 52_428_800) { // 50 MB
        return reject(new Error('File size exceeds 50 MB limit'));
      }

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete(results) {
          if (!results.data || results.data.length === 0) {
            return reject(new Error('CSV file is empty or has no data rows'));
          }

          const headers = results.meta.fields || [];
          const rows    = results.data;

          parsedData = {
            headers,
            rows,
            fileName : file.name,
            fileSize : file.size,
            rowCount : rows.length,
            parsedAt : new Date().toISOString(),
          };

          resolve(parsedData);
        },
        error(err) { reject(new Error('Parse error: ' + err.message)); },
      });
    });
  }

  /* ── Auto-detect numeric columns ────────────────── */
  function detectNumericColumns(headers, rows) {
    return headers.filter(h => {
      const vals = rows.map(r => r[h]).filter(v => v !== null && v !== undefined && v !== '');
      const numCount = vals.filter(v => !isNaN(parseFloat(v))).length;
      return numCount / vals.length > 0.7; // 70 %+ numeric → numeric column
    });
  }

  /* ── Auto-detect label column ───────────────────── */
  function detectLabelColumn(headers, rows) {
    const numCols = detectNumericColumns(headers, rows);
    // First non-numeric column is likely the label
    return headers.find(h => !numCols.includes(h)) || headers[0];
  }

  /* ── Smart column suggestions ────────────────────── */
  function suggestMapping(headers, rows) {
    const numCols    = detectNumericColumns(headers, rows);
    const labelCol   = detectLabelColumn(headers, rows);

    // Heuristic: prefer columns with "current", "revenue", "value" in name
    const currentKeywords  = ['current', 'revenue', 'value', 'sales', 'income', 'amount'];
    const previousKeywords = ['previous', 'prev', 'last', 'prior', 'old'];

    const findByKeyword = (keywords, pool) =>
      pool.find(h => keywords.some(k => h.toLowerCase().includes(k)));

    const currentCol  = findByKeyword(currentKeywords, numCols)  || numCols[0]  || headers[1];
    const previousCol = findByKeyword(previousKeywords, numCols) || numCols[1]  || '';

    return { labelCol, currentCol, previousCol };
  }

  /* ── Extract column values ───────────────────────── */
  function getColumnValues(col, rows) {
    return rows.map(r => {
      const v = r[col];
      return (v === null || v === undefined || v === '') ? 0 : parseFloat(v) || 0;
    });
  }

  /* ── Main analysis function ──────────────────────── */
  function analyzeData(currentValues, previousValues) {
    return currentValues.map((curr, i) => {
      const prev  = (previousValues && previousValues[i] !== undefined) ? previousValues[i] : 0;
      const diff  = curr - prev;
      const pct   = prev !== 0 ? ((diff / Math.abs(prev)) * 100).toFixed(1) : 'N/A';
      return {
        current       : curr,
        previous      : prev,
        difference    : diff,
        percentChange : pct,
        status        : diff >= 0 ? 'profit' : 'loss',
        barColor      : diff >= 0 ? '#22c55e' : '#ef4444',
      };
    });
  }

  /* ── Build summary stats ─────────────────────────── */
  function buildSummary(analysis, rows, expensesCol) {
    const totalCurrent  = analysis.reduce((s, a) => s + a.current, 0);
    const totalPrevious = analysis.reduce((s, a) => s + a.previous, 0);

    const totalExpenses = expensesCol
      ? rows.reduce((s, r) => {
          const v = parseFloat(r[expensesCol]) || 0;
          return s + v;
        }, 0)
      : 0;

    const netProfit    = totalCurrent - totalExpenses;
    const profitMargin = totalCurrent !== 0
      ? ((netProfit / totalCurrent) * 100).toFixed(1)
      : '0.0';

    const prevNetProfit = totalPrevious - totalExpenses;
    const profitChange  = prevNetProfit !== 0
      ? (((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100).toFixed(1)
      : 'N/A';

    return {
      totalRevenue  : totalCurrent,
      totalPrevious,
      totalExpenses,
      netProfit,
      profitMargin  : parseFloat(profitMargin),
      profitChange,
      overallStatus : netProfit >= 0 ? 'profit' : 'loss',
    };
  }

  /* ── Format number for display ───────────────────── */
  function formatNumber(val) {
    if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
    if (Math.abs(val) >= 1_000)     return (val / 1_000).toFixed(1) + 'K';
    return val.toFixed(0);
  }

  function formatCurrency(val) {
    return '$' + formatNumber(val);
  }

  /* ── Get parsed data ─────────────────────────────── */
  function getData() { return parsedData; }
  function clearData() { parsedData = null; }

  /* ── Public API ──────────────────────────────────── */
  return {
    parseFile,
    getData,
    clearData,
    detectNumericColumns,
    detectLabelColumn,
    suggestMapping,
    getColumnValues,
    analyzeData,
    buildSummary,
    formatNumber,
    formatCurrency,
  };
})();
