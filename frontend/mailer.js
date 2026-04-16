/* ═══════════════════════════════════════════════════
   mailer.js — Email Sending Module
   InsightMail
   ═══════════════════════════════════════════════════ */

const Mailer = (() => {

  const NODE_API = 'http://localhost:3001/api';

  /* ── Build HTML email body ────────────────────── */
  function buildEmailHTML({ subject, message, summary, csvRows, headers, includeCSV, chartBase64, selectedCharts }) {
    const isProfitable = summary && summary.netProfit >= 0;
    const statusColor  = isProfitable ? '#22c55e' : '#ef4444';
    const statusLabel  = isProfitable ? 'PROFIT' : 'LOSS';

    // Format currency for email
    const fmt = v => {
      if (!v && v !== 0) return '—';
      const abs = Math.abs(v);
      const prefix = v < 0 ? '-$' : '$';
      if (abs >= 1_000_000) return prefix + (abs / 1_000_000).toFixed(2) + 'M';
      if (abs >= 1_000)     return prefix + (abs / 1_000).toFixed(1) + 'K';
      return prefix + abs.toFixed(0);
    };

    // Build chart images section
    let chartImagesHTML = '';
    if (chartBase64) {
      const chartLabels = {
        barChart  : 'Period Comparison (Bar Chart)',
        lineChart : 'Trend Analysis (Line Chart)',
        donutChart: 'Category Distribution (Donut Chart)',
        areaChart : 'Profit / Loss Delta',
      };
      Object.entries(chartBase64).forEach(([key, base64]) => {
        if (!base64) return;
        const included = selectedCharts[key] !== false;
        if (!included) return;
        chartImagesHTML += `
          <div style="margin:24px 0;">
            <p style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;
                      letter-spacing:.06em;margin:0 0 10px;">${chartLabels[key] || key}</p>
            <img src="${base64}" alt="${key}" style="width:100%;border-radius:10px;
                 border:1px solid #e2e8f0;display:block;" />
          </div>`;
      });
    }

    // Build CSV table
    let csvTableHTML = '';
    if (includeCSV && csvRows && headers && csvRows.length > 0) {
      const headerCells = headers.map(h =>
        `<th style="padding:8px 12px;background:#f8fafc;border-bottom:2px solid #e2e8f0;
                    font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;
                    text-align:left;">${h}</th>`
      ).join('');

      const bodyRows = csvRows.slice(0, 50).map((row, i) => {
        const cells = headers.map(h =>
          `<td style="padding:8px 12px;font-size:13px;color:#1e293b;
                      border-bottom:1px solid #f1f5f9;">${row[h] ?? ''}</td>`
        ).join('');
        return `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">${cells}</tr>`;
      }).join('');

      csvTableHTML = `
        <div style="margin:24px 0;">
          <p style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;
                    letter-spacing:.06em;margin:0 0 12px;">Raw CSV Data (showing up to 50 rows)</p>
          <div style="overflow-x:auto;border-radius:10px;border:1px solid #e2e8f0;">
            <table style="width:100%;border-collapse:collapse;font-family:sans-serif;">
              <thead><tr>${headerCells}</tr></thead>
              <tbody>${bodyRows}</tbody>
            </table>
          </div>
        </div>`;
    }

    // Summary cards
    let summaryHTML = '';
    if (summary) {
      const cards = [
        { label: 'Total Revenue',  value: fmt(summary.totalRevenue),  color: '#6366f1' },
        { label: 'Total Expenses', value: fmt(summary.totalExpenses), color: '#ef4444' },
        { label: 'Net Profit',     value: fmt(summary.netProfit),     color: statusColor },
        { label: 'Profit Margin',  value: summary.profitMargin + '%', color: '#f59e0b' },
      ];
      const cardCells = cards.map(c => `
        <td style="width:25%;padding:8px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;
                      padding:16px;text-align:center;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;
                        color:#94a3b8;letter-spacing:.06em;margin-bottom:8px;">${c.label}</div>
            <div style="font-size:20px;font-weight:700;color:${c.color};">${c.value}</div>
          </div>
        </td>`
      ).join('');
      summaryHTML = `
        <div style="margin:24px 0;">
          <p style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;
                    letter-spacing:.06em;margin:0 0 12px;">Financial Summary</p>
          <table style="width:100%;border-collapse:separate;border-spacing:0;">
            <tr>${cardCells}</tr>
          </table>
        </div>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${subject}</title></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;
             background:#f1f5f9;color:#1e293b;">
  <div style="max-width:700px;margin:0 auto;background:#ffffff;">

    <!-- Header Banner -->
    <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:32px 40px;
                border-radius:0;">
      <table style="width:100%;"><tr>
        <td>
          <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-.03em;">
            ✉ InsightMail
          </div>
          <div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:4px;">
            Analytics Report
          </div>
        </td>
        <td style="text-align:right;">
          <span style="background:${statusColor};color:#fff;font-size:12px;font-weight:700;
                       padding:5px 14px;border-radius:99px;text-transform:uppercase;
                       letter-spacing:.06em;">${statusLabel}</span>
        </td>
      </tr></table>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px;">

      <!-- Message -->
      <p style="font-size:15px;line-height:1.7;color:#475569;white-space:pre-wrap;
                margin:0 0 24px;">${message || 'Please find your analytics report below.'}</p>

      <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 24px;" />

      <!-- Summary Cards -->
      ${summaryHTML}

      <!-- Chart Images -->
      ${chartImagesHTML}

      <!-- CSV Table -->
      ${csvTableHTML}

      <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;" />

      <!-- Footer -->
      <p style="font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;">
        Generated by <strong>InsightMail</strong> • ${new Date().toLocaleString()}<br/>
        This email was sent automatically. Please do not reply.
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  /* ── Send report via Node API ─────────────────── */
  async function sendReport({ to, subject, message, summary, csvRows, headers, smtpConfig,
                              includeCSV = false, selectedCharts = {} }) {
    // Gather chart images
    const chartBase64 = Charts.getAllBase64();

    // Filter only selected charts
    const filteredCharts = {};
    Object.entries(chartBase64).forEach(([key, val]) => {
      if (selectedCharts[key] !== false) filteredCharts[key] = val;
    });

    // Build HTML
    const htmlBody = buildEmailHTML({
      subject, message, summary, csvRows, headers,
      includeCSV, chartBase64: filteredCharts, selectedCharts,
    });

    // Build chart attachments array
    const attachments = Object.entries(filteredCharts)
      .filter(([, v]) => v)
      .map(([key, base64]) => ({
        filename   : key + '.png',
        base64data : base64.replace(/^data:image\/png;base64,/, ''),
        contentType: 'image/png',
        cid        : key,
      }));

    const payload = {
      to,
      subject,
      body       : htmlBody,
      attachments,
      smtpHost   : smtpConfig.host,
      smtpPort   : smtpConfig.port,
      smtpUser   : smtpConfig.user,
      smtpPassword: smtpConfig.pass,
    };

    const response = await fetch(`${NODE_API}/send-email`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /* ── Build live email preview ──────────────────── */
  function buildPreview({ to, subject, message, summary }) {
    const to_safe = to || '—';
    const sub_safe = subject || '—';
    const isProfitable = summary && summary.netProfit >= 0;
    const statusColor  = isProfitable ? '#22c55e' : '#ef4444';
    const statusLabel  = isProfitable ? '▲ Profit' : '▼ Loss';

    const fmt = v => {
      if (v === undefined || v === null) return '—';
      const abs = Math.abs(v);
      const prefix = v < 0 ? '-$' : '$';
      if (abs >= 1_000_000) return prefix + (abs / 1_000_000).toFixed(2) + 'M';
      if (abs >= 1_000)     return prefix + (abs / 1_000).toFixed(1) + 'K';
      return prefix + abs.toFixed(0);
    };

    document.getElementById('previewTo').textContent = to_safe;
    document.getElementById('previewSubject').textContent = sub_safe;

    let bodyHTML = `
      <p style="font-size:.9rem;line-height:1.7;white-space:pre-wrap;margin:0 0 1rem;">
        ${message || 'Your message will appear here…'}
      </p>`;

    if (summary) {
      bodyHTML += `
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:.6rem;margin-bottom:1rem;">
          ${[
            ['Total Revenue', fmt(summary.totalRevenue), 'var(--primary)'],
            ['Total Expenses',fmt(summary.totalExpenses),'var(--loss)'],
            ['Net Profit',    fmt(summary.netProfit),    statusColor],
            ['Margin',        (summary.profitMargin||0)+'%','var(--warning)'],
          ].map(([l,v,c]) => `
            <div style="background:var(--input-bg);border:1px solid var(--border);
                        border-radius:8px;padding:.75rem;text-align:center;">
              <div style="font-size:.7rem;color:var(--text-tertiary);text-transform:uppercase;
                          letter-spacing:.04em;margin-bottom:.3rem;">${l}</div>
              <div style="font-size:1rem;font-weight:700;color:${c};">${v}</div>
            </div>`
          ).join('')}
        </div>
        <div style="display:inline-flex;align-items:center;gap:.4rem;font-size:.78rem;
                    font-weight:600;color:${statusColor};background:${isProfitable?'rgba(34,197,94,.1)':'rgba(239,68,68,.1)'};
                    padding:.3rem .75rem;border-radius:99px;">
          ${statusLabel}
        </div>`;
    } else {
      bodyHTML += `<p style="font-size:.82rem;color:var(--text-tertiary);font-style:italic;">
        Upload a CSV and generate a report to see summary data in preview.</p>`;
    }

    bodyHTML += `
      <p style="margin-top:1rem;font-size:.75rem;color:var(--text-tertiary);
                border-top:1px solid var(--border);padding-top:.75rem;">
        Charts and data will be embedded in the actual email.
      </p>`;

    document.getElementById('emailPreviewBody').innerHTML = bodyHTML;
  }

  return { sendReport, buildPreview, buildEmailHTML };

})();
