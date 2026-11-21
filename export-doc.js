/* =====================================================================
   Export the current assessment results as a Word-compatible .doc file.
   Technique: build a self-contained HTML document (inline styles, no
   external assets except embedded base64 chart images) and serve it
   with an application/msword MIME type — Word opens this natively.
   ===================================================================== */

const REPORT_CSS = `
  body { font-family: Calibri, Arial, sans-serif; color: #1a1a1a; font-size: 11pt; }
  h1 { color: #1F3864; font-size: 24pt; margin-bottom: 4pt; }
  h2 { color: #1F3864; font-size: 16pt; margin-top: 26pt; border-bottom: 2pt solid #1F3864; padding-bottom: 4pt; }
  h3 { color: #2C5F8A; font-size: 13pt; margin-top: 16pt; }
  .cover { text-align: center; margin-top: 90pt; }
  .cover .company { font-size: 16pt; font-weight: bold; color: #1F3864; letter-spacing: 1pt; }
  .cover .tagline { font-size: 11pt; color: #595959; font-style: italic; margin-bottom: 50pt; }
  .cover .title { font-size: 26pt; font-weight: bold; color: #1F3864; }
  .meta-table td { padding: 3pt 10pt 3pt 0; font-size: 10.5pt; }
  .meta-label { color: #595959; }
  table.report-table { border-collapse: collapse; width: 100%; margin: 10pt 0 16pt 0; }
  table.report-table th { background: #1F3864; color: white; padding: 6pt 8pt; font-size: 10pt; text-align: left; }
  table.report-table td { border: 1pt solid #cccccc; padding: 6pt 8pt; font-size: 9.5pt; }
  .kpi-box { display: inline-block; border: 1pt solid #cccccc; padding: 10pt 16pt; margin: 4pt 8pt 4pt 0; text-align: center; }
  .kpi-box .val { font-size: 20pt; font-weight: bold; color: #1F3864; }
  .kpi-box .lbl { font-size: 9pt; color: #595959; text-transform: uppercase; }
  .page-break { page-break-before: always; }
  img.chart-img { max-width: 500pt; display: block; margin: 10pt auto; }
  .note { font-size: 9.5pt; color: #595959; font-style: italic; }
  .approval-table { border-collapse: collapse; margin-top: 20pt; width: 100%; }
  .approval-table td { border-bottom: 1pt solid #999999; padding: 18pt 8pt 4pt 0; font-size: 10pt; }
  .approval-table .al { color: #595959; font-size: 8.5pt; }
`;

function reportHead(title) {
  return `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8">
    <title>${esc(title)}</title>
    <!--[if gte mso 9]>
    <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml>
    <![endif]-->
    <style>${REPORT_CSS}</style>
  </head>
  <body>`;
}

function approvalBlock(assessorName) {
  return `
    <h2>Approval</h2>
    <table class="approval-table">
      <tr>
        <td style="width:33%;">${esc(assessorName || "")}</td>
        <td style="width:33%;"></td>
        <td style="width:33%;"></td>
      </tr>
      <tr>
        <td class="al">Assessed By</td>
        <td class="al">Reviewed By</td>
        <td class="al">Date</td>
      </tr>
    </table>`;
}

/* ---------------- Print-ready charts ----------------
   The on-screen charts use the app's dark theme and animate in, so capturing
   them directly gave blank or near-invisible images in Word. Each report chart
   is drawn separately on an off-screen canvas: white background, dark text,
   no animation, fixed size. */
const PRINT_TEXT = "#1F2933", PRINT_MUTED = "#52606D", PRINT_GRID = "#D9E2EC";
const whiteBackgroundPlugin = {
  id: "whiteBackground",
  beforeDraw(chart) {
    const { ctx, width, height } = chart;
    ctx.save(); ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, width, height); ctx.restore();
  },
};
function printChartImage(config, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.style.cssText = `position:fixed; left:-10000px; top:0; width:${width}px; height:${height}px;`;
  document.body.appendChild(canvas);
  config.options = Object.assign({}, config.options, { animation: false, responsive: false, maintainAspectRatio: false, devicePixelRatio: 2 });
  config.plugins = (config.plugins || []).concat([whiteBackgroundPlugin]);
  const chart = new Chart(canvas.getContext("2d"), config);
  const img = chart.toBase64Image("image/png", 1);
  chart.destroy(); canvas.remove();
  return img;
}
function printBarOptions(title, horizontal) {
  const valueAxis = { min: 0, max: 5, ticks: { color: PRINT_MUTED, stepSize: 1 }, grid: { color: PRINT_GRID } };
  const catAxis = { ticks: { color: PRINT_TEXT, font: { size: 12 } }, grid: { display: false } };
  return {
    indexAxis: horizontal ? "y" : "x",
    plugins: { legend: { display: false }, title: { display: true, text: title, color: PRINT_TEXT, font: { size: 15, weight: "bold" } } },
    scales: horizontal ? { x: valueAxis, y: catAxis } : { x: catAxis, y: valueAxis },
  };
}
function familyChartImage(familyScores) {
  return printChartImage({ type: "bar",
    data: { labels: familyScores.map(fs => fs.family.id),
      datasets: [{ data: familyScores.map(fs => fs.score), backgroundColor: familyScores.map(fs => CSF_FUNCTIONS[fs.family.csf].color), borderRadius: 3 }] },
    options: printBarOptions("Control Family Maturity (1–5)") }, 900, 320);
}
function csfChartImage(csfRollup) {
  if (csfRollup.filter(c => c.score !== null).length < 3) {
    return printChartImage({ type: "bar",
      data: { labels: csfRollup.map(c => c.score === null ? `${c.name} (not covered)` : c.name),
        datasets: [{ data: csfRollup.map(c => c.score), backgroundColor: csfRollup.map(c => c.color), borderRadius: 3 }] },
      options: printBarOptions("NIST CSF 2.0 Function Rollup", true) }, 900, 300);
  }
  const scored = csfRollup.filter(c => c.score !== null);
  return printChartImage({ type: "radar",
    data: { labels: scored.map(c => c.name),
      datasets: [{ label: "NIST CSF 2.0 Function Maturity", data: scored.map(c => c.score),
        backgroundColor: "rgba(31,111,139,0.18)", borderColor: "#1F6F8B", pointBackgroundColor: "#1F6F8B", spanGaps: true }] },
    options: { plugins: { legend: { display: false }, title: { display: true, text: "NIST CSF 2.0 Function Rollup", color: PRINT_TEXT, font: { size: 15, weight: "bold" } } },
      scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, color: PRINT_MUTED, backdropColor: "transparent" }, grid: { color: PRINT_GRID }, angleLines: { color: PRINT_GRID },
        pointLabels: { color: PRINT_TEXT, font: { size: 13 } } } } } }, 520, 420);
}
function baselineChartImage(a, overall, baseline) {
  return printChartImage({ type: "bar",
    data: { labels: ["Your score", `${industryLabel(a.industry)} baseline (illustrative)`],
      datasets: [{ data: [overall ? overall.simple : 0, baseline || 0], backgroundColor: ["#1F6F8B", "#E8A33D"], borderRadius: 3 }] },
    options: printBarOptions("Your Maturity vs. Industry Baseline", true) }, 900, 220);
}
function portfolioChartImage(sites) {
  return printChartImage({ type: "bar",
    data: { labels: sites.map(s => s.a.siteName || "(unnamed)"),
      datasets: [{ data: sites.map(s => s.overall ? s.overall.simple : 0), backgroundColor: "#1F6F8B", borderRadius: 3 }] },
    options: printBarOptions("Overall Maturity by Site (1–5)") }, 900, 320);
}

/* ---------------- Single-site report ---------------- */
async function exportReport() {
  const a = activeAssessment();
  const familyScores = computeFamilyScores(a);
  const overall = computeOverall(familyScores);
  const csfRollup = computeCsfRollup(familyScores);
  const risks = computeRisks(a, familyScores);
  const baseline = INDUSTRY_BASELINES[a.industry] ? INDUSTRY_BASELINES[a.industry][a.standard] : null;

  if (!overall) { alert("Complete the assessment before exporting a report."); return; }

  const dateStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const familyImg = familyChartImage(familyScores);
  const csfImg = csfChartImage(csfRollup);
  const baselineImg = baselineChartImage(a, overall, baseline);

  const top10 = risks.slice(0, 10);
  const execSummaryHtml = document.getElementById("exec-summary-text").innerHTML;

  const familyRows = familyScores.map(fs => `
    <tr>
      <td>${esc(fs.family.id)}</td><td>${esc(fs.family.name)}</td><td>${esc(fs.family.csfCategory)}</td>
      <td style="font-family:Consolas,monospace; font-size:8.5pt;">${(fs.family.ctrlRefs||[]).join(", ")||"—"}</td>
      <td style="text-align:center;">${fs.score !== null ? fs.score.toFixed(1) : "—"}</td>
      <td>${fs.score !== null ? esc(cmmLevelFor(fs.score).name) : "—"}</td>
    </tr>`).join("");

  const riskRows = risks.map(r => `
    <tr>
      <td>${esc(riskLevel(r.score).toUpperCase())}</td><td>${esc(r.familyId)}</td><td>${esc(r.question)}</td>
      <td style="text-align:center;">${r.score}</td><td style="text-align:center;">${r.priority.toFixed(2)}</td>
      <td>${esc(r.remediation||"")}</td>
    </tr>`).join("");

  const top10Html = top10.map((r, i) => `
    <tr>
      <td style="text-align:center; font-weight:bold;">${i + 1}</td><td>${esc(r.familyName)}</td><td>${esc(r.question)}</td>
      <td style="text-align:center;">${r.score}/5</td><td>${esc(r.remediation||"")}</td>
    </tr>`).join("");

  const csfRows = csfRollup.map(c => `<tr><td>${esc(c.name)} (${esc(c.code)})</td><td style="text-align:center;">${c.score !== null ? c.score.toFixed(1) : "—"}</td></tr>`).join("");

  const appendixRows = [];
  familyScores.forEach(fs => {
    const family = fs.family;
    const r = a.responses[family.id];
    const questions = a.mode === "long" ? family.longQuestions : [family.shortQuestion];
    questions.forEach((q, qi) => {
      const score = r ? r.scores[qi] : null;
      const label = score === "NA" ? "N/A" : (score === null || score === undefined ? "—" : score);
      appendixRows.push(`<tr><td>${esc(family.id)}</td><td>${esc(q.text)}</td><td style="text-align:center;">${label}</td><td>${esc((r && r.notes) || "")}</td></tr>`);
    });
  });

  const naNote = a.naMode === "zero" ? "N/A responses were treated as 0 in scoring for this report." : "N/A responses were excluded from scoring averages for this report.";

  const html = `${reportHead("OT Cybersecurity Assessment Report")}
    <div class="cover">
      <div class="company">SALE FISH MARKETING AND CONSULTING</div>
      <div class="tagline">OT Cybersecurity Practice</div>
      <div class="title">OT Cybersecurity<br/>Assessment Report</div>
      <p style="margin-top:30pt; font-size:13pt; font-weight:bold;">${esc(a.siteName || "Unnamed Site")}</p>
      <p style="font-size:11pt;">${esc(a.orgName || "")}</p>
      <p style="margin-top:20pt; font-size:12pt;">${esc(industryLabel(a.industry))} &nbsp;|&nbsp; ${esc(STANDARDS_META[a.standard].name)}</p>
      <p style="font-size:11pt; color:#595959;">${esc(dateStr)}</p>
    </div>

    <div class="page-break"></div>
    <h1>Executive Summary</h1>
    <table class="meta-table">
      <tr><td class="meta-label">Site:</td><td>${esc(a.siteName || "—")}</td><td class="meta-label">Organization:</td><td>${esc(a.orgName || "—")}</td></tr>
      <tr><td class="meta-label">Industry:</td><td>${esc(industryLabel(a.industry))}</td><td class="meta-label">Standard:</td><td>${esc(STANDARDS_META[a.standard].name)}</td></tr>
      <tr><td class="meta-label">Assessment Mode:</td><td>${a.mode === "long" ? "Detailed" : "Summary"}</td><td class="meta-label">Date:</td><td>${esc(dateStr)}</td></tr>
      <tr><td class="meta-label">Assessor:</td><td>${esc(a.assessorName || "—")}</td><td class="meta-label">Question Bank:</td><td>v${QUESTION_BANK_VERSION}</td></tr>
    </table>

    <div style="margin-top:14pt;">
      <div class="kpi-box"><div class="val">${overall.simple.toFixed(1)}</div><div class="lbl">Overall Maturity (CMM 1-5)</div></div>
      <div class="kpi-box"><div class="val">${overall.weighted.toFixed(1)}</div><div class="lbl">Risk-Weighted Maturity</div></div>
      <div class="kpi-box"><div class="val">${baseline !== null ? baseline.toFixed(1) : "N/A"}</div><div class="lbl">Industry Baseline (Illustrative)</div></div>
      <div class="kpi-box"><div class="val">${risks.length}</div><div class="lbl">Risk Items Identified</div></div>
    </div>

    ${execSummaryHtml}
    <p class="note">${naNote} Industry baseline is an illustrative planning estimate, not empirical survey data.</p>

    <div class="page-break"></div>
    <h1>Detailed Summary</h1>
    <h2>Control Family Maturity</h2>
    ${familyImg ? `<img class="chart-img" src="${familyImg}" width="600" style="width:600px;" />` : ""}
    <table class="report-table"><tr><th>ID</th><th>Control Family</th><th>NIST CSF 2.0 Cross-Reference</th><th>CTRL Ref</th><th>Score</th><th>CMM Level</th></tr>${familyRows}</table>

    <h2>NIST CSF 2.0 Function Rollup</h2>
    ${csfImg ? `<img class="chart-img" src="${csfImg}" width="${csfRollup.filter(c => c.score !== null).length < 3 ? 600 : 380}" style="width:${csfRollup.filter(c => c.score !== null).length < 3 ? 600 : 380}px;" />` : ""}
    <table class="report-table"><tr><th>CSF 2.0 Function</th><th>Average Score</th></tr>${csfRows}</table>

    <h2>Maturity vs. Industry Baseline</h2>
    ${baselineImg ? `<img class="chart-img" src="${baselineImg}" width="600" style="width:600px;" />` : ""}

    <div class="page-break"></div>
    <h1>Top 10 Risks (Prioritized)</h1>
    <p class="note">Priority score = (5 − control score) × control-family criticality weight.</p>
    <table class="report-table"><tr><th>#</th><th>Control Family</th><th>Item</th><th>Score</th><th>Recommended Action</th></tr>${top10Html || "<tr><td colspan='5'>No significant risks identified.</td></tr>"}</table>

    <div class="page-break"></div>
    <h1>Full List of Risks Identified</h1>
    <table class="report-table"><tr><th>Level</th><th>Family</th><th>Item</th><th>Score</th><th>Priority</th><th>Recommended Action</th></tr>${riskRows || "<tr><td colspan='6'>No significant risks identified.</td></tr>"}</table>

    <div class="page-break"></div>
    <h1>Full Assessment Detail (Appendix)</h1>
    <p class="note">Every question and response, including items that scored above the risk threshold.</p>
    <table class="report-table"><tr><th>Family</th><th>Question</th><th>Score</th><th>Notes</th></tr>${appendixRows.join("")}</table>

    ${approvalBlock(a.assessorName)}

    <div class="page-break"></div>
    <h1>Methodology Note</h1>
    <p>This assessment uses a representative, foundational set of control families derived from the selected standard's core structure, cross-referenced to NIST CSF 2.0. It is a maturity self-assessment tool intended to support planning and prioritization, and is not a substitute for a full formal control-by-control audit against the complete standard text by an accredited assessor.</p>
    <p class="note">Report generated by the Sale Fish Marketing and Consulting OT Cybersecurity Assessment Tool — Question Bank v${QUESTION_BANK_VERSION} (${QUESTION_BANK_DATE}).</p>
  </body></html>`;

  downloadDoc(html, `OT_Cybersecurity_Assessment_${safeName(a.siteName || a.industry)}_${a.standard}_${new Date().toISOString().slice(0,10)}.doc`);
}

/* ---------------- Portfolio rollup report ---------------- */
async function exportPortfolioReport() {
  const sites = computePortfolioData();
  if (!sites.length) { alert("Select at least 2 completed assessments to export a portfolio report."); return; }

  const portfolioImg = portfolioChartImage(sites);

  const dateStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const validOveralls = sites.filter(s => s.overall).map(s => s.overall.simple);
  const combinedAvg = validOveralls.length ? validOveralls.reduce((a, b) => a + b, 0) / validOveralls.length : null;
  const totalRisks = sites.reduce((sum, s) => sum + s.risks.length, 0);
  const worst = [...sites].filter(s => s.overall).sort((a, b) => a.overall.simple - b.overall.simple)[0];

  const siteRows = sites.map(s => `
    <tr>
      <td>${esc(s.a.siteName || "(unnamed)")}</td><td>${esc(industryLabel(s.a.industry))}</td><td>${esc(STANDARDS_META[s.a.standard].name)}</td>
      <td style="text-align:center;">${s.overall ? s.overall.simple.toFixed(1) : "—"}</td>
      <td>${s.overall ? esc(cmmLevelFor(s.overall.simple).name) : "—"}</td>
      <td style="text-align:center;">${s.risks.length}</td>
    </tr>`).join("");

  let siteDetailSections = "";
  sites.forEach(s => {
    const topRisksForSite = s.risks.slice(0, 5).map(r => `<li>${esc(r.familyName)}: ${esc(r.question)} (score ${r.score}/5) — ${esc(r.remediation||"")}</li>`).join("");
    siteDetailSections += `
      <div class="page-break"></div>
      <h2>${esc(s.a.siteName || "(unnamed site)")}</h2>
      <table class="meta-table">
        <tr><td class="meta-label">Organization:</td><td>${esc(s.a.orgName||"—")}</td><td class="meta-label">Industry:</td><td>${esc(industryLabel(s.a.industry))}</td></tr>
        <tr><td class="meta-label">Standard:</td><td>${esc(STANDARDS_META[s.a.standard].name)}</td><td class="meta-label">Overall Maturity:</td><td>${s.overall ? s.overall.simple.toFixed(1) : "—"}</td></tr>
      </table>
      <h3>Top Risks at This Site</h3>
      <ul>${topRisksForSite || "<li>No significant risks identified.</li>"}</ul>
    `;
  });

  const html = `${reportHead("OT Cybersecurity Portfolio Rollup Report")}
    <div class="cover">
      <div class="company">SALE FISH MARKETING AND CONSULTING</div>
      <div class="tagline">OT Cybersecurity Practice</div>
      <div class="title">Multi-Site Portfolio<br/>Rollup Report</div>
      <p style="margin-top:30pt; font-size:12pt;">${sites.length} Sites</p>
      <p style="font-size:11pt; color:#595959;">${esc(dateStr)}</p>
    </div>

    <div class="page-break"></div>
    <h1>Executive Summary</h1>
    <div style="margin-top:14pt;">
      <div class="kpi-box"><div class="val">${sites.length}</div><div class="lbl">Sites Included</div></div>
      <div class="kpi-box"><div class="val">${combinedAvg !== null ? combinedAvg.toFixed(1) : "—"}</div><div class="lbl">Combined Maturity (avg)</div></div>
      <div class="kpi-box"><div class="val">${totalRisks}</div><div class="lbl">Total Risks (all sites)</div></div>
    </div>
    <p>This report rolls up ${sites.length} individual site assessments into a combined portfolio view. The lowest-scoring site is <strong>${esc(worst ? (worst.a.siteName || "(unnamed)") : "N/A")}</strong>${worst && worst.overall ? ` at ${worst.overall.simple.toFixed(1)}/5.0` : ""}. Combined average maturity across all included sites is <strong>${combinedAvg !== null ? combinedAvg.toFixed(1) : "—"}/5.0</strong>.</p>

    <h2>Maturity by Site</h2>
    ${portfolioImg ? `<img class="chart-img" src="${portfolioImg}" width="600" style="width:600px;" />` : ""}
    <table class="report-table"><tr><th>Site</th><th>Industry</th><th>Standard</th><th>Overall Maturity</th><th>CMM Level</th><th>Risks</th></tr>${siteRows}</table>

    ${siteDetailSections}

    <div class="page-break"></div>
    <h1>Methodology Note</h1>
    <p>Each site was assessed independently using the tool's standard question bank; this report aggregates those independent results. Sites using different standards or assessment modes (short/long) are shown side-by-side for comparison but their underlying question sets differ — treat cross-site comparisons as directional, not a precise apples-to-apples score.</p>
    <p class="note">Report generated by the Sale Fish Marketing and Consulting OT Cybersecurity Assessment Tool — Question Bank v${QUESTION_BANK_VERSION} (${QUESTION_BANK_DATE}).</p>
  </body></html>`;

  downloadDoc(html, `OT_Cybersecurity_Portfolio_Rollup_${new Date().toISOString().slice(0,10)}.doc`);
}

function downloadDoc(html, filename) {
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
