const puppeteer = require('puppeteer');

const SEVERITY_COLORS = {
  low: { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' },
  medium: { bg: '#fff8e1', text: '#f57f17', border: '#ffe082' },
  high: { bg: '#fff3e0', text: '#e65100', border: '#ffcc80' },
  critical: { bg: '#fce4ec', text: '#b71c1c', border: '#ef9a9a' }
};

const STATUS_COLORS = {
  open: { bg: '#e3f2fd', text: '#1565c0' },
  'in progress': { bg: '#f3e5f5', text: '#6a1b9a' },
  resolved: { bg: '#e8f5e9', text: '#2e7d32' },
  closed: { bg: '#f5f5f5', text: '#424242' }
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function buildDefectHTML(defect, index) {
  const sev = SEVERITY_COLORS[defect.severity?.toLowerCase()] || SEVERITY_COLORS.low;
  const stat = STATUS_COLORS[defect.status?.toLowerCase()] || STATUS_COLORS.open;

  const photos = defect.photos && defect.photos.length > 0
    ? `<div class="photos-grid">
        ${defect.photos.map(url => `<img src="${url}" class="defect-photo" alt="Defect photo" />`).join('')}
       </div>`
    : '<p class="no-photos">No photos attached</p>';

  return `
    <div class="defect-card">
      <div class="defect-header">
        <div class="defect-id">DEF-${String(index).padStart(3, '0')}</div>
        <div class="defect-title">${defect.title || 'Untitled Defect'}</div>
        <div class="badges">
          <span class="badge" style="background:${sev.bg}; color:${sev.text}; border:1px solid ${sev.border}">
            ${defect.severity || 'Low'}
          </span>
          <span class="badge" style="background:${stat.bg}; color:${stat.text}">
            ${defect.status || 'Open'}
          </span>
        </div>
      </div>
      <div class="defect-meta">
        <div class="meta-item"><span class="meta-label">Location</span><span>${defect.location || '—'}</span></div>
        <div class="meta-item"><span class="meta-label">Assigned To</span><span>${defect.assigned_to || '—'}</span></div>
        <div class="meta-item"><span class="meta-label">Due Date</span><span>${formatDate(defect.due_date)}</span></div>
        <div class="meta-item"><span class="meta-label">Logged</span><span>${formatDate(defect.created_at)}</span></div>
      </div>
      ${defect.description ? `<div class="defect-description">${defect.description}</div>` : ''}
      ${photos}
    </div>
  `;
}

function buildProjectReportHTML(project, defects) {
  const total = defects.length;
  const open = defects.filter(d => d.status?.toLowerCase() === 'open').length;
  const critical = defects.filter(d => d.severity?.toLowerCase() === 'critical').length;
  const resolved = defects.filter(d => ['resolved', 'closed'].includes(d.status?.toLowerCase())).length;
  const overdue = defects.filter(d => d.due_date && new Date(d.due_date) < new Date() && d.status?.toLowerCase() !== 'resolved').length;

  const defectsHTML = defects.length > 0
    ? defects.map((d, i) => buildDefectHTML(d, i + 1)).join('')
    : '<p class="no-defects">No defects recorded for this project.</p>';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 13px; background: #fff; }
    .report-header { background: #1a1a2e; color: white; padding: 32px 40px; display: flex; justify-content: space-between; align-items: flex-start; }
    .brand { font-size: 22px; font-weight: 700; letter-spacing: 1px; color: #ffffff; }
    .brand span { color: #4fc3f7; }
    .report-meta { text-align: right; font-size: 11px; opacity: 0.8; line-height: 1.8; }
    .project-section { padding: 28px 40px 20px; border-bottom: 1px solid #e8e8e8; }
    .project-name { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 6px; }
    .project-address { color: #666; font-size: 13px; margin-bottom: 4px; }
    .project-desc { color: #888; font-size: 12px; margin-top: 8px; font-style: italic; }
    .stats-section { padding: 20px 40px; background: #f8f9fa; border-bottom: 1px solid #e8e8e8; }
    .stats-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 12px; }
    .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
    .stat-box { background: white; border: 1px solid #e8e8e8; border-radius: 6px; padding: 14px; text-align: center; }
    .stat-number { font-size: 24px; font-weight: 700; color: #1a1a2e; }
    .stat-number.red { color: #b71c1c; }
    .stat-number.orange { color: #e65100; }
    .stat-number.green { color: #2e7d32; }
    .stat-label { font-size: 10px; color: #888; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
    .defects-section { padding: 24px 40px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 16px; }
    .defect-card { border: 1px solid #e8e8e8; border-radius: 8px; margin-bottom: 20px; overflow: hidden; page-break-inside: avoid; }
    .defect-header { padding: 14px 16px; background: #fafafa; border-bottom: 1px solid #e8e8e8; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .defect-id { font-size: 11px; font-weight: 700; color: #888; background: #e8e8e8; padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
    .defect-title { font-weight: 600; font-size: 14px; flex: 1; }
    .badges { display: flex; gap: 6px; }
    .badge { font-size: 10px; font-weight: 600; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .defect-meta { padding: 12px 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: white; border-bottom: 1px solid #f0f0f0; }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #aaa; }
    .defect-description { padding: 12px 16px; color: #555; line-height: 1.6; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
    .photos-grid { padding: 12px 16px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .defect-photo { width: 100%; height: 160px; object-fit: cover; border-radius: 4px; border: 1px solid #e8e8e8; }
    .no-photos { padding: 12px 16px; color: #bbb; font-size: 12px; font-style: italic; }
    .report-footer { padding: 20px 40px; border-top: 2px solid #1a1a2e; text-align: center; color: #aaa; font-size: 11px; }
    .no-defects { color: #aaa; font-style: italic; text-align: center; padding: 40px; }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="brand">Prop<span>Agent</span></div>
      <div style="margin-top:6px; font-size:12px; opacity:0.7;">Defect Inspection Report</div>
    </div>
    <div class="report-meta">
      <div>Generated: ${formatDate(new Date().toISOString())}</div>
      <div>Total Defects: ${total}</div>
    </div>
  </div>
  <div class="project-section">
    <div class="project-name">${project.name || 'Unnamed Project'}</div>
    <div class="project-address">${project.address || ''}</div>
    ${project.description ? `<div class="project-desc">${project.description}</div>` : ''}
  </div>
  <div class="stats-section">
    <div class="stats-title">Summary</div>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-number">${total}</div><div class="stat-label">Total</div></div>
      <div class="stat-box"><div class="stat-number orange">${open}</div><div class="stat-label">Open</div></div>
      <div class="stat-box"><div class="stat-number red">${critical}</div><div class="stat-label">Critical</div></div>
      <div class="stat-box"><div class="stat-number red">${overdue}</div><div class="stat-label">Overdue</div></div>
      <div class="stat-box"><div class="stat-number green">${resolved}</div><div class="stat-label">Resolved</div></div>
    </div>
  </div>
  <div class="defects-section">
    <div class="section-title">Defect Details</div>
    ${defectsHTML}
  </div>
  <div class="report-footer">
    PropAgent &mdash; Property Defect Management &mdash; Confidential
  </div>
</body>
</html>`;
}

async function generatePDF(html) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = { buildProjectReportHTML, generatePDF };
