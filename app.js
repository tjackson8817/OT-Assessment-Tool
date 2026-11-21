/* =====================================================================
   OT Cybersecurity Assessment Tool — Application Logic
   Sale Fish Marketing and Consulting
   ===================================================================== */

const STORAGE_KEY = "otAssessmentPortfolio_v2";

const portfolio = {
  assessments: {},   // id -> assessment object
  activeId: null,
};

let selectedForRollup = new Set();
let charts = {};

function newAssessment() {
  const id = "site_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const now = new Date().toISOString();
  return {
    id,
    siteName: "", orgName: "", assessorName: "",
    industry: null, standard: null, mode: "short",
    responses: {},          // familyId -> { scores: [1-5|"NA"|null, ...], notes: "" }
    naMode: "exclude",
    currentFamilyIndex: 0,
    setupComplete: false,   // true once "Begin Assessment" has been clicked
    createdAt: now, updatedAt: now, completedAt: null,
  };
}

function savePortfolio() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio)); } catch (e) { /* storage unavailable */ }
}
function loadPortfolio() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      portfolio.assessments = {};
      Object.values(parsed.assessments || {}).forEach(r => {
        const a = normalizeAssessment(r);
        if (a && a.setupComplete) portfolio.assessments[a.id] = a; // drop abandoned setup drafts
      });
      portfolio.activeId = null;
    }
  } catch (e) { /* ignore */ }
}

function activeAssessment() {
  return portfolio.assessments[portfolio.activeId];
}

/* Fill in missing fields so older, imported or hand-edited records can't break
   the app. Unknown industries/standards are cleared so the user is asked again. */
function normalizeAssessment(raw) {
  if (!raw || typeof raw !== "object" || !raw.id) return null;
  const a = Object.assign(newAssessment(), raw);
  a.id = String(raw.id);
  ["siteName", "orgName", "assessorName"].forEach(k => { a[k] = a[k] == null ? "" : String(a[k]); });
  if (!INDUSTRIES.includes(a.industry)) a.industry = null;
  if (!QUESTION_BANK[a.standard]) a.standard = null;
  if (a.mode !== "long") a.mode = "short";
  if (a.naMode !== "zero") a.naMode = "exclude";
  if (!a.responses || typeof a.responses !== "object") a.responses = {};
  Object.keys(a.responses).forEach(fid => {
    const r = a.responses[fid];
    if (!r || !Array.isArray(r.scores)) { delete a.responses[fid]; return; }
    r.scores = r.scores.map(s => (s === NA_VALUE || (Number.isInteger(s) && s >= 1 && s <= 5)) ? s : null);
    r.notes = r.notes == null ? "" : String(r.notes);
  });
  if (typeof a.currentFamilyIndex !== "number" || a.currentFamilyIndex < 0) a.currentFamilyIndex = 0;
  ["createdAt", "updatedAt"].forEach(k => { if (!a[k] || isNaN(new Date(a[k]))) a[k] = new Date().toISOString(); });
  // Records from v1.0 have no setupComplete flag; anything with a standard chosen was started
  if (raw.setupComplete === undefined) a.setupComplete = !!(a.standard && a.industry);
  if (!a.standard || !a.industry) a.setupComplete = false;
  return a;
}

function isAssessmentComplete(a) {
  const families = QUESTION_BANK[a.standard] ? QUESTION_BANK[a.standard].families : [];
  if (!families.length) return false;
  return families.every(f => isFamilyAnswered(a, f.id));
}

function isFamilyAnswered(a, familyId) {
  const r = a.responses[familyId];
  if (!r) return false;
  // Every question the current depth asks must have a score (1-5 or N/A)
  const family = QUESTION_BANK[a.standard] && QUESTION_BANK[a.standard].families.find(f => f.id === familyId);
  const expected = family ? (a.mode === "long" ? family.longQuestions.length : 1) : r.scores.length;
  if (!expected) return false;
  for (let i = 0; i < expected; i++) {
    if (r.scores[i] === null || r.scores[i] === undefined) return false;
  }
  return true;
}

/* ---------------- Screen navigation ---------------- */
function showScreen(name) {
  document.querySelectorAll(".screen").forEach(el => el.classList.remove("active"));
  document.getElementById("screen-" + name).classList.add("active");
  updateStatusBar();
}

function updateStatusBar() {
  const a = activeAssessment();
  document.getElementById("sb-site").textContent = a && a.siteName ? a.siteName : "—";
  document.getElementById("sb-standard").textContent = a && a.standard ? STANDARDS_META[a.standard].name : "—";
  document.getElementById("sb-mode").textContent = a ? (a.mode === "long" ? "Detailed" : "Summary") : "—";
}

/* ================= MANAGER / DASHBOARD SCREEN ================= */
function renderManager() {
  const tbody = document.getElementById("manager-table-body");
  tbody.innerHTML = "";
  const ids = Object.keys(portfolio.assessments).sort((a, b) =>
    new Date(portfolio.assessments[b].updatedAt) - new Date(portfolio.assessments[a].updatedAt));

  ids.forEach(id => {
    const a = portfolio.assessments[id];
    const complete = isAssessmentComplete(a);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="pf-select" data-id="${escAttr(id)}" aria-label="Select ${esc(a.siteName || "unnamed site")} for portfolio rollup" ${complete ? "" : "disabled"} ${selectedForRollup.has(id) ? "checked" : ""}></td>
      <td>${esc(a.siteName || "(unnamed site)")}</td>
      <td>${esc(a.orgName || "—")}</td>
      <td>${esc(a.industry ? industryLabel(a.industry) : "—")}</td>
      <td>${esc(a.standard ? STANDARDS_META[a.standard].name : "—")}</td>
      <td>${a.mode === "long" ? "Detailed" : "Summary"}</td>
      <td>${complete ? '<span class="risk-badge low">COMPLETE</span>' : '<span class="risk-badge medium">IN PROGRESS</span>'}</td>
      <td>${new Date(a.updatedAt).toLocaleDateString()}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-ghost btn-sm" data-action="open" data-id="${escAttr(id)}">${complete ? "View" : "Resume"}</button>
        <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${escAttr(id)}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("manager-empty-note").style.display = ids.length ? "none" : "block";

  tbody.querySelectorAll('[data-action="open"]').forEach(btn => {
    btn.addEventListener("click", () => openAssessment(btn.dataset.id));
  });
  tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener("click", () => deleteAssessment(btn.dataset.id));
  });
  tbody.querySelectorAll(".pf-select").forEach(cb => {
    cb.addEventListener("change", () => {
      if (cb.checked) selectedForRollup.add(cb.dataset.id); else selectedForRollup.delete(cb.dataset.id);
      updatePortfolioButton();
    });
  });
  updatePortfolioButton();
}

function updatePortfolioButton() {
  const btn = document.getElementById("btn-view-portfolio");
  btn.disabled = selectedForRollup.size < 2;
  document.getElementById("portfolio-select-hint").textContent =
    selectedForRollup.size >= 2
      ? `${selectedForRollup.size} sites selected for rollup.`
      : "Select 2+ completed assessments above to build a portfolio rollup.";
}

function openAssessment(id) {
  const a = portfolio.assessments[id];
  if (!a) return;
  portfolio.activeId = id;
  savePortfolio();
  if (!a.setupComplete) { renderSetup(); showScreen("setup"); return; }
  if (isAssessmentComplete(a)) {
    showScreen("results");
    renderResults();
  } else {
    showScreen("assessment");
    renderAssessment();
  }
}

function deleteAssessment(id) {
  if (!confirm("Delete this assessment permanently? This cannot be undone.")) return;
  delete portfolio.assessments[id];
  selectedForRollup.delete(id);
  if (portfolio.activeId === id) portfolio.activeId = null;
  savePortfolio();
  renderManager();
}

/* ================= SETUP SCREEN ================= */
function openNewAssessmentSetup() {
  const a = newAssessment();
  portfolio.assessments[a.id] = a;
  portfolio.activeId = a.id;
  savePortfolio();
  renderSetup();
  showScreen("setup");
}

function renderSetup() {
  const a = activeAssessment();
  if (!a) return;

  document.getElementById("input-site-name").value = a.siteName;
  document.getElementById("input-org-name").value = a.orgName;
  document.getElementById("input-assessor-name").value = a.assessorName;

  const indGrid = document.getElementById("industry-grid");
  indGrid.innerHTML = "";
  INDUSTRIES.forEach(ind => {
    const card = document.createElement("div");
    card.className = "option-card" + (a.industry === ind ? " selected" : "");
    card.innerHTML = `<div class="oc-title">${ind}</div><div class="oc-sub">${industryLabel(ind)}</div>`;
    card.onclick = () => { a.industry = ind; savePortfolio(); renderSetup(); };
    indGrid.appendChild(card);
  });

  const stdGrid = document.getElementById("standard-grid");
  stdGrid.innerHTML = "";
  const hasResponses = Object.keys(a.responses).length > 0;
  Object.keys(STANDARDS_META).forEach(stdKey => {
    const meta = STANDARDS_META[stdKey];
    const card = document.createElement("div");
    card.className = "option-card" + (a.standard === stdKey ? " selected" : "");
    card.innerHTML = `<div class="oc-title">${meta.name}</div><div class="oc-sub">${meta.description.split(".")[0]}.</div>`;
    card.onclick = () => {
      if (stdKey === a.standard) return;
      if (hasResponses) {
        const proceed = confirm(
          "This assessment already has answered questions under a different standard. " +
          "Switching standards will change the question set — your existing answers will be kept but won't apply to the new standard's questions. Continue?"
        );
        if (!proceed) return;
      }
      a.standard = stdKey;
      a.currentFamilyIndex = 0; // avoid an out-of-range index if the new standard has fewer families
      savePortfolio();
      renderSetup();
    };
    stdGrid.appendChild(card);
  });

  const tsaNote = document.getElementById("tsa-note");
  tsaNote.style.display = (a.standard === "TSA_GAS" && a.industry && a.industry !== "O&G") ? "block" : "none";

  const modeGrid = document.getElementById("mode-grid");
  modeGrid.innerHTML = "";
  [
    { key: "short", title: "Short — Control Family", sub: "One question per control family. Fast, high-level." },
    { key: "long", title: "Long — Detailed", sub: "Multiple detailed questions per control family." },
  ].forEach(m => {
    const card = document.createElement("div");
    card.className = "option-card" + (a.mode === m.key ? " selected" : "");
    card.innerHTML = `<div class="oc-title">${m.title}</div><div class="oc-sub">${m.sub}</div>`;
    card.onclick = () => {
      if (m.key === a.mode) return;
      // Short and detailed modes ask different questions, so answers can't carry across
      const answered = Object.values(a.responses).some(r => r.scores.some(s => s !== null && s !== undefined));
      if (answered && !confirm("Changing the depth switches to a different set of questions, so the scores you've entered will be cleared (your notes are kept). Continue?")) return;
      Object.values(a.responses).forEach(r => { r.scores = []; });
      a.mode = m.key;
      a.currentFamilyIndex = 0;
      savePortfolio(); renderSetup();
    };
    modeGrid.appendChild(card);
  });

  document.getElementById("btn-start").disabled = !(a.industry && a.standard);
  document.getElementById("btn-start").textContent = isAssessmentComplete(a) ? "View Results \u2192" : "Begin Assessment \u2192";
}

function industryLabel(ind) {
  const map = { "P&U": "Power & Utilities", "O&G": "Oil & Gas", "Chemical": "Chemical", "Manufacturing": "Manufacturing", "Healthcare": "Healthcare" };
  return map[ind] || ind;
}

function commitSetupFields() {
  const a = activeAssessment();
  if (!a) return;
  a.siteName = document.getElementById("input-site-name").value.trim();
  a.orgName = document.getElementById("input-org-name").value.trim();
  a.assessorName = document.getElementById("input-assessor-name").value.trim();
  a.updatedAt = new Date().toISOString();
  savePortfolio();
}

/* ================= ASSESSMENT SCREEN ================= */
function startAssessment() {
  commitSetupFields();
  const a = activeAssessment();
  if (!a.industry || !a.standard) return;
  a.setupComplete = true;
  savePortfolio();
  if (isAssessmentComplete(a)) {
    showScreen("results");
    renderResults();
  } else {
    showScreen("assessment");
    renderAssessment();
  }
}

function currentFamilies() {
  const a = activeAssessment();
  return QUESTION_BANK[a.standard].families;
}

function renderAssessment() {
  const a = activeAssessment();
  const families = currentFamilies();
  if (a.currentFamilyIndex >= families.length) a.currentFamilyIndex = Math.max(0, families.length - 1);
  const idx = a.currentFamilyIndex;
  const family = families[idx];

  document.getElementById("progress-fill").style.width = `${(idx / families.length) * 100}%`;
  document.getElementById("progress-label").textContent = `Family ${idx + 1} of ${families.length} — ${a.siteName || "Unnamed site"}`;

  const nav = document.getElementById("family-nav");
  nav.innerHTML = "";
  families.forEach((f, i) => {
    const chip = document.createElement("div");
    const answered = isFamilyAnswered(a, f.id);
    chip.className = "family-chip" + (i === idx ? " current" : answered ? " done" : "");
    chip.textContent = f.id;
    chip.title = f.name;
    chip.onclick = () => { a.currentFamilyIndex = i; savePortfolio(); renderAssessment(); };
    nav.appendChild(chip);
  });

  const container = document.getElementById("question-container");
  container.innerHTML = "";

  const header = document.createElement("div");
  header.innerHTML = `<span class="panel-eyebrow">${family.csfCategory}</span><h2>${family.name}</h2>`;
  container.appendChild(header);

  const questions = a.mode === "long" ? family.longQuestions : [family.shortQuestion];

  if (!a.responses[family.id]) {
    a.responses[family.id] = { scores: new Array(questions.length).fill(null), notes: "" };
  }
  if (a.responses[family.id].scores.length !== questions.length) {
    const old = a.responses[family.id].scores;
    a.responses[family.id].scores = new Array(questions.length).fill(null).map((_, i) => old[i] ?? null);
  }

  const groupName = "cmm_" + family.id;
  questions.forEach((q, qi) => {
    const block = document.createElement("div");
    block.className = "question-block";
    const current = a.responses[family.id].scores[qi];
    const optionsHtml = CMM_LEVELS.map(l => {
      const inputId = `${groupName}_${qi}_${l.level}`;
      const isChecked = current === l.level;
      return `<label class="cmm-option${isChecked ? " is-checked" : ""}" for="${inputId}">
                <input type="radio" id="${inputId}" name="${groupName}_${qi}" value="${l.level}" data-family="${family.id}" data-qi="${qi}" ${isChecked ? "checked" : ""}>
                <span class="cmm-num">${l.level}</span>
                <span class="cmm-name">${l.name}</span>
              </label>`;
    }).join("");
    const naId = `${groupName}_${qi}_NA`;
    const naIsChecked = current === NA_VALUE;
    const naHtml = `<label class="cmm-option cmm-na${naIsChecked ? " is-checked" : ""}" for="${naId}">
                <input type="radio" id="${naId}" name="${groupName}_${qi}" value="NA" data-family="${family.id}" data-qi="${qi}" ${naIsChecked ? "checked" : ""}>
                <span class="cmm-num">N/A</span>
                <span class="cmm-name">Not applicable</span>
              </label>`;
    block.innerHTML = `
      <div class="question-text">${q.text}</div>
      <div class="question-help">${q.help || ""}</div>
      <div class="cmm-scale" role="radiogroup" aria-label="${esc(q.text)}">${optionsHtml}${naHtml}</div>
    `;
    container.appendChild(block);
  });

  const notesBlock = document.createElement("div");
  notesBlock.className = "notes-block";
  notesBlock.innerHTML = `
    <label class="field" for="family-notes">Notes / evidence for this control family <span style="color:var(--text-muted); font-weight:400;">(optional)</span>
      <textarea id="family-notes" rows="3" placeholder="e.g., reference to policy document, compensating control detail, planned remediation date...">${esc(a.responses[family.id].notes || "")}</textarea>
    </label>
  `;
  container.appendChild(notesBlock);

  container.querySelectorAll('input[type="radio"]').forEach(el => {
    el.addEventListener("change", () => {
      const fam = el.getAttribute("data-family");
      const qi = parseInt(el.getAttribute("data-qi"), 10);
      const val = el.value === "NA" ? NA_VALUE : parseInt(el.value, 10);
      a.responses[fam].scores[qi] = val;
      a.updatedAt = new Date().toISOString();
      savePortfolio();
      renderFamilyNavOnly();
      // Fallback visual state for browsers without CSS :has() support.
      const group = el.closest(".cmm-scale");
      group.querySelectorAll(".cmm-option").forEach(label => label.classList.remove("is-checked"));
      el.closest(".cmm-option").classList.add("is-checked");
    });
  });

  document.getElementById("family-notes").addEventListener("input", (e) => {
    a.responses[family.id].notes = e.target.value;
    a.updatedAt = new Date().toISOString();
    savePortfolio();
  });

  document.getElementById("btn-prev-family").disabled = idx === 0;
  const isLast = idx === families.length - 1;
  document.getElementById("btn-next-family").textContent = isLast ? "Finish" : "Next Family \u2192";
}

function renderFamilyNavOnly() {
  const a = activeAssessment();
  const families = currentFamilies();
  document.querySelectorAll("#family-nav .family-chip").forEach((chip, i) => {
    const answered = isFamilyAnswered(a, families[i].id);
    chip.classList.toggle("done", answered && i !== a.currentFamilyIndex);
  });
}

function goPrevFamily() {
  const a = activeAssessment();
  if (a.currentFamilyIndex > 0) { a.currentFamilyIndex--; savePortfolio(); renderAssessment(); }
}

function goNextFamily() {
  const a = activeAssessment();
  const families = currentFamilies();
  const family = families[a.currentFamilyIndex];
  const r = a.responses[family.id];
  const unanswered = r.scores.filter(s => s === null || s === undefined).length;

  if (unanswered > 0) {
    const proceed = confirm(
      `${unanswered} question(s) in "${family.name}" are unanswered and will not be scored. ` +
      `If a question doesn't apply, consider marking it N/A instead of leaving it blank. Continue anyway?`
    );
    if (!proceed) return;
  }

  if (a.currentFamilyIndex < families.length - 1) {
    a.currentFamilyIndex++;
    savePortfolio();
    renderAssessment();
  } else {
    a.completedAt = new Date().toISOString();
    savePortfolio();
    showScreen("results");
    renderResults();
  }
}

/* ================= SCORING (single assessment) ================= */
function computeFamilyScores(a) {
  const families = QUESTION_BANK[a.standard].families;
  return families.map(f => {
    const r = a.responses[f.id];
    const rawScores = r ? r.scores : [];
    const { avg, naCount, answeredCount } = reduceScores(rawScores, a.naMode);
    return { family: f, score: avg, naCount, answeredCount, totalQuestions: rawScores.length };
  });
}

function computeOverall(familyScores) {
  const valid = familyScores.filter(fs => fs.score !== null);
  if (!valid.length) return null;
  const simple = valid.reduce((a, fs) => a + fs.score, 0) / valid.length;
  const weightedSum = valid.reduce((a, fs) => a + fs.score * fs.family.criticalityWeight, 0);
  const weightTotal = valid.reduce((a, fs) => a + fs.family.criticalityWeight, 0);
  const weighted = weightedSum / weightTotal;
  return { simple, weighted };
}

function computeCsfRollup(familyScores) {
  const groups = {};
  familyScores.forEach(fs => {
    if (fs.score === null) return;
    const csf = fs.family.csf;
    if (!groups[csf]) groups[csf] = [];
    groups[csf].push(fs.score);
  });
  return Object.keys(CSF_FUNCTIONS).map(code => {
    const scores = groups[code] || [];
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return { code, name: CSF_FUNCTIONS[code].name, color: CSF_FUNCTIONS[code].color, score: avg };
  });
}

function computeRisks(a, familyScores) {
  const risks = [];
  familyScores.forEach(fs => {
    const family = fs.family;
    const r = a.responses[family.id];
    if (!r) return;
    const questions = a.mode === "long" ? family.longQuestions : [family.shortQuestion];
    questions.forEach((q, qi) => {
      const score = r.scores[qi];
      if (score === null || score === undefined || score === NA_VALUE) return; // N/A is never a "risk"
      if (score <= 3) {
        const gap = 5 - score;
        const priority = gap * family.criticalityWeight;
        risks.push({
          familyId: family.id, familyName: family.name, csfCategory: family.csfCategory,
          question: q.text, score, gap, priority, remediation: family.remediation,
        });
      }
    });
  });
  risks.sort((a, b) => b.priority - a.priority);
  return risks;
}

function riskLevel(score) {
  if (score <= 1) return "critical";
  if (score === 2) return "high";
  if (score === 3) return "medium";
  return "low";
}

/* ================= RESULTS SCREEN (single site) ================= */
function renderResults() {
  const a = activeAssessment();
  document.getElementById("results-title").textContent = a.siteName ? `Results — ${a.siteName}` : "Assessment Results";
  document.querySelector(`input[name="na-mode"][value="${a.naMode}"]`).checked = true;

  const familyScores = computeFamilyScores(a);
  const overall = computeOverall(familyScores);
  const csfRollup = computeCsfRollup(familyScores);
  const risks = computeRisks(a, familyScores);
  const baseline = INDUSTRY_BASELINES[a.industry] ? INDUSTRY_BASELINES[a.industry][a.standard] : null;

  const totalNA = familyScores.reduce((sum, fs) => sum + fs.naCount, 0);
  const unanswered = familyScores.reduce((sum, fs) => {
    const expected = (a.mode === "long" ? fs.family.longQuestions.length : 1);
    return sum + (expected - fs.answeredCount);
  }, 0);
  const notes = [];
  if (totalNA > 0) notes.push(`${totalNA} question(s) marked N/A`);
  if (unanswered > 0) notes.push(`${unanswered} question(s) not yet answered — results are provisional`);
  document.getElementById("na-count-note").textContent = notes.join(" · ");

  document.getElementById("kpi-overall").textContent = overall ? overall.simple.toFixed(1) : "—";
  document.getElementById("kpi-overall-label").textContent = overall ? cmmLevelFor(overall.simple).name : "Incomplete";
  document.getElementById("kpi-weighted").textContent = overall ? overall.weighted.toFixed(1) : "—";
  document.getElementById("kpi-baseline").textContent = baseline !== null ? baseline.toFixed(1) : "N/A";
  document.getElementById("kpi-risk-count").textContent = risks.length;

  renderGauge(document.getElementById("gauge-container"), overall ? overall.simple : 1);
  renderFamilyChart(familyScores);
  renderCsfChart(csfRollup);
  renderBaselineChart(a, overall, baseline);
  renderRiskTable(risks);
  renderTop10(risks);
  renderDetailTable(familyScores);
  renderAppendixTable(a, familyScores);
  renderExecSummaryText(a, overall, csfRollup, risks, baseline);
}

function renderFamilyChart(familyScores) {
  const ctx = document.getElementById("chart-family").getContext("2d");
  if (charts.family) charts.family.destroy();
  charts.family = new Chart(ctx, {
    type: "bar",
    data: {
      labels: familyScores.map(fs => fs.family.id),
      datasets: [{ label: "Maturity (1-5)", data: familyScores.map(fs => fs.score),
        backgroundColor: familyScores.map(fs => CSF_FUNCTIONS[fs.family.csf].color), borderRadius: 3 }],
    },
    options: chartBaseOptions("Control Family Maturity"),
  });
}

function renderCsfChart(csfRollup) {
  const ctx = document.getElementById("chart-csf").getContext("2d");
  if (charts.csf) charts.csf.destroy();
  // A radar needs at least three scored functions; IEC 62443's families only map to
  // Protect and Detect, so fall back to a bar chart that shows what isn't covered.
  const scored = csfRollup.filter(c => c.score !== null);
  if (scored.length < 3) {
    charts.csf = new Chart(ctx, {
      type: "bar",
      data: { labels: csfRollup.map(c => c.score === null ? `${c.name} (not covered)` : c.name),
        datasets: [{ data: csfRollup.map(c => c.score), backgroundColor: csfRollup.map(c => c.color), borderRadius: 3 }] },
      options: chartBaseOptions("NIST CSF 2.0 Function Rollup", true),
    });
    return;
  }
  // Plot only the functions this standard's families cover, so the shape stays closed
  charts.csf = new Chart(ctx, {
    type: "radar",
    data: { labels: scored.map(c => c.name),
      datasets: [{ label: "NIST CSF 2.0 Function Maturity", data: scored.map(c => c.score),
        backgroundColor: "rgba(79,209,197,0.15)", borderColor: "#4FD1C5", pointBackgroundColor: "#4FD1C5" }] },
    options: {
      plugins: { legend: { labels: { color: "#8B98A5" } }, title: { display: true, text: "NIST CSF 2.0 Function Rollup", color: "#E6ECF1", font: { family: "Space Grotesk" } } },
      scales: { r: { min: 0, max: 5, ticks: { color: "#5B6774", backdropColor: "transparent" }, grid: { color: "#2A3646" }, angleLines: { color: "#2A3646" }, pointLabels: { color: "#8B98A5", font: { size: 11 } } } },
    },
  });
}

function renderBaselineChart(a, overall, baseline) {
  const ctx = document.getElementById("chart-baseline").getContext("2d");
  if (charts.baseline) charts.baseline.destroy();
  charts.baseline = new Chart(ctx, {
    type: "bar",
    data: { labels: ["Your Score", `${industryLabel(a.industry)} Baseline (Illustrative)`],
      datasets: [{ data: [overall ? overall.simple : 0, baseline || 0], backgroundColor: ["#4FD1C5", "#E8A33D"], borderRadius: 3 }] },
    options: chartBaseOptions("Your Maturity vs. Industry Baseline (Illustrative)", true),
  });
}

/* The 0-5 limits belong on the score axis only. v1.0 set them on both axes,
   which on the category axis cut the chart off after six families (CP, CM and
   FR7 never appeared). horizontal = bars run left-to-right (indexAxis "y"). */
function chartBaseOptions(titleText, horizontal) {
  const valueAxis = { ticks: { color: "#8B98A5" }, grid: { color: "#2A3646" }, min: 0, max: 5 };
  const catAxis = { ticks: { color: "#8B98A5" }, grid: { color: "#2A3646" } };
  return {
    responsive: true, maintainAspectRatio: false,
    indexAxis: horizontal ? "y" : "x",
    plugins: { legend: { display: false }, title: { display: true, text: titleText, color: "#E6ECF1", font: { family: "Space Grotesk", size: 13 } } },
    scales: horizontal ? { x: valueAxis, y: catAxis } : { x: catAxis, y: valueAxis },
  };
}

function renderRiskTable(risks) {
  const tbody = document.getElementById("risk-table-body");
  tbody.innerHTML = "";
  risks.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="risk-badge ${riskLevel(r.score)}">${riskLevel(r.score).toUpperCase()}</span></td>
      <td>${esc(r.familyId)}</td>
      <td>${esc(r.question)}</td>
      <td>${r.score}</td>
      <td>${r.priority.toFixed(2)}</td>
      <td style="color:var(--text-secondary); font-size:12px;">${esc(r.remediation || "")}</td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById("risk-empty-note").style.display = risks.length ? "none" : "block";
}

function renderTop10(risks) {
  const container = document.getElementById("top10-container");
  container.innerHTML = "";
  risks.slice(0, 10).forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "recommendation-item";
    div.innerHTML = `
      <div class="rank">${i + 1}</div>
      <div>
        <div style="font-weight:600;">${esc(r.familyName)} <span class="risk-badge ${riskLevel(r.score)}">${riskLevel(r.score).toUpperCase()}</span></div>
        <div style="color:var(--text-secondary); font-size:13px; margin-top:2px;">${esc(r.question)}</div>
        <div style="color:var(--text-muted); font-size:12px; margin-top:4px;">Current: ${r.score}/5 &nbsp;|&nbsp; CSF: ${esc(r.csfCategory)} &nbsp;|&nbsp; Priority: ${r.priority.toFixed(2)}</div>
        <div style="color:var(--accent-cyan); font-size:12px; margin-top:6px;"><strong>Recommended action:</strong> ${esc(r.remediation || "See standard reference for guidance.")}</div>
      </div>
    `;
    container.appendChild(div);
  });
  if (!risks.length) container.innerHTML = "<p style='color:var(--text-secondary);'>No significant risks identified — all scored items are above the risk threshold (score &gt; 3).</p>";
}

function renderDetailTable(familyScores) {
  const tbody = document.getElementById("detail-table-body");
  tbody.innerHTML = "";
  familyScores.forEach(fs => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${esc(fs.family.id)}</td>
      <td>${esc(fs.family.name)}</td>
      <td>${esc(fs.family.csfCategory)}</td>
      <td style="font-family:var(--font-mono); font-size:11px;">${(fs.family.ctrlRefs || []).join(", ") || "—"}</td>
      <td>${fs.score !== null ? fs.score.toFixed(1) : "—"}</td>
      <td>${fs.score !== null ? esc(cmmLevelFor(fs.score).name) : "—"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAppendixTable(a, familyScores) {
  const tbody = document.getElementById("appendix-table-body");
  tbody.innerHTML = "";
  familyScores.forEach(fs => {
    const family = fs.family;
    const r = a.responses[family.id];
    const questions = a.mode === "long" ? family.longQuestions : [family.shortQuestion];
    questions.forEach((q, qi) => {
      const score = r ? r.scores[qi] : null;
      const scoreLabel = score === NA_VALUE ? "N/A" : (score === null || score === undefined ? "—" : score);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${esc(family.id)}</td>
        <td>${esc(q.text)}</td>
        <td>${scoreLabel}</td>
        <td style="color:var(--text-secondary); font-size:12px;">${esc((r && r.notes) || "")}</td>
      `;
      tbody.appendChild(tr);
    });
  });
}

function renderExecSummaryText(a, overall, csfRollup, risks, baseline) {
  const el = document.getElementById("exec-summary-text");
  if (!overall) { el.textContent = "Complete the assessment to generate an executive summary."; return; }
  const level = cmmLevelFor(overall.simple);
  const weakest = [...csfRollup].filter(c => c.score !== null).sort((a, b) => a.score - b.score)[0];
  const baselineText = baseline !== null
    ? (overall.simple >= baseline ? `at or above the illustrative ${industryLabel(a.industry)} sector baseline of ${baseline.toFixed(1)}` : `below the illustrative ${industryLabel(a.industry)} sector baseline of ${baseline.toFixed(1)}`)
    : "not compared to an industry baseline";
  el.innerHTML = `
    <p>${a.siteName ? `<strong>${esc(a.siteName)}</strong> (${esc(a.orgName || "organization not specified")}) — ` : ""}This assessment evaluated <strong>${industryLabel(a.industry)}</strong> OT cybersecurity maturity against <strong>${STANDARDS_META[a.standard].name}</strong>, cross-referenced to NIST CSF 2.0, using the ${a.mode === "long" ? "detailed" : "summary"} question set.</p>
    <p>Overall maturity scored <strong>${overall.simple.toFixed(1)} out of 5.0 (${level.name})</strong>, ${baselineText}. The risk-weighted maturity score is <strong>${overall.weighted.toFixed(1)}</strong>.</p>
    <p>${weakest ? `The weakest NIST CSF 2.0 function is <strong>${weakest.name}</strong> (${weakest.score.toFixed(1)}/5), warranting priority attention.` : ""} A total of <strong>${risks.length} risk item(s)</strong> scored at or below 3.0 and are prioritized in the Top 10 Risks section below.</p>
    ${a.assessorName ? `<p style="color:var(--text-muted); font-size:13px;">Assessed by: ${esc(a.assessorName)}</p>` : ""}
  `;
}

/* ================= PORTFOLIO ROLLUP ================= */
function computePortfolioData() {
  const ids = [...selectedForRollup];
  const sites = ids.map(id => {
    const a = portfolio.assessments[id];
    const familyScores = computeFamilyScores(a);
    const overall = computeOverall(familyScores);
    const risks = computeRisks(a, familyScores);
    return { a, overall, risks, familyScores };
  });
  return sites;
}

function renderPortfolio() {
  const sites = computePortfolioData();
  document.getElementById("pf-site-count").textContent = sites.length;

  const validOveralls = sites.filter(s => s.overall).map(s => s.overall.simple);
  const combinedAvg = validOveralls.length ? validOveralls.reduce((a, b) => a + b, 0) / validOveralls.length : null;
  document.getElementById("pf-overall").textContent = combinedAvg !== null ? combinedAvg.toFixed(1) : "—";

  const totalRisks = sites.reduce((sum, s) => sum + s.risks.length, 0);
  document.getElementById("pf-risk-count").textContent = totalRisks;

  const worst = [...sites].filter(s => s.overall).sort((a, b) => a.overall.simple - b.overall.simple)[0];
  document.getElementById("pf-worst-site").textContent = worst ? (worst.a.siteName || "(unnamed)") : "—";

  const ctx = document.getElementById("chart-portfolio-sites").getContext("2d");
  if (charts.portfolio) charts.portfolio.destroy();
  charts.portfolio = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sites.map(s => s.a.siteName || "(unnamed)"),
      datasets: [{ label: "Overall Maturity", data: sites.map(s => s.overall ? s.overall.simple : 0), backgroundColor: "#4FD1C5", borderRadius: 3 }],
    },
    options: chartBaseOptions("Overall Maturity by Site"),
  });

  const tbody = document.getElementById("portfolio-table-body");
  tbody.innerHTML = "";
  sites.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${esc(s.a.siteName || "(unnamed)")}</td>
      <td>${esc(industryLabel(s.a.industry))}</td>
      <td>${esc(STANDARDS_META[s.a.standard].name)}</td>
      <td>${s.overall ? s.overall.simple.toFixed(1) : "—"}</td>
      <td>${s.overall ? esc(cmmLevelFor(s.overall.simple).name) : "—"}</td>
      <td>${s.risks.length}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ================= JSON / CSV EXPORT & IMPORT ================= */
function exportSingleJSON() {
  const a = activeAssessment();
  downloadBlob(JSON.stringify(a, null, 2), `application/json`, `OT_Assessment_${safeName(a.siteName || a.id)}.json`);
}

function exportAllJSON() {
  downloadBlob(JSON.stringify(portfolio, null, 2), `application/json`, `OT_Assessment_Portfolio_${new Date().toISOString().slice(0,10)}.json`);
}

function importJSONFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      let incoming;
      if (data && data.assessments && typeof data.assessments === "object") incoming = Object.values(data.assessments); // full portfolio export
      else if (data && data.id) incoming = [data];                                                                         // single assessment export
      else { alert("This file doesn't look like a valid assessment export."); return; }
      let count = 0;
      incoming.forEach(r => {
        const a = normalizeAssessment(r);
        if (a && a.setupComplete) { portfolio.assessments[a.id] = a; count++; }
      });
      if (!count) { alert("No valid assessments were found in this file."); return; }
      savePortfolio();
      renderManager();
      alert(`Import complete: ${count} assessment(s).`);
    } catch (e) {
      alert("Could not read this file as valid JSON: " + e.message);
    }
  };
  reader.readAsText(file);
}

function exportCSV() {
  const a = activeAssessment();
  const familyScores = computeFamilyScores(a);
  const rows = [["Site", "Organization", "Standard", "Family ID", "Family Name", "CSF Category", "CTRL Refs", "Question", "Score", "Notes"]];
  familyScores.forEach(fs => {
    const family = fs.family;
    const r = a.responses[family.id];
    const questions = a.mode === "long" ? family.longQuestions : [family.shortQuestion];
    questions.forEach((q, qi) => {
      const score = r ? r.scores[qi] : "";
      rows.push([
        a.siteName, a.orgName, STANDARDS_META[a.standard].name, family.id, family.name, family.csfCategory,
        (family.ctrlRefs || []).join("; "), q.text, score === NA_VALUE ? "NA" : (score ?? ""), (r && r.notes) || "",
      ]);
    });
  });
  const csv = rows.map(row => row.map(csvEscape).join(",")).join("\r\n");
  downloadBlob(csv, "text/csv", `OT_Assessment_${safeName(a.siteName || a.id)}.csv`);
}

function csvEscape(val) {
  let s = String(val ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet apps treating a cell as a formula
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function downloadBlob(content, mime, filename) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeName(s) { return String(s).replace(/[^A-Za-z0-9]+/g, "_").slice(0, 60); }
function esc(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(str) { return esc(str).replace(/"/g, "&quot;"); }

/* ================= APP INIT / WIRING ================= */
function initApp() {
  loadPortfolio();
  document.getElementById("qb-version-tag").textContent = `Question bank v${QUESTION_BANK_VERSION} (${QUESTION_BANK_DATE})`;

  renderManager();
  showScreen("manager");

  document.getElementById("btn-new-assessment").addEventListener("click", openNewAssessmentSetup);
  document.getElementById("btn-view-portfolio").addEventListener("click", () => {
    showScreen("portfolio");
    renderPortfolio();
  });
  document.getElementById("btn-export-all-json").addEventListener("click", exportAllJSON);
  document.getElementById("btn-import-json").addEventListener("click", () => document.getElementById("file-import").click());
  document.getElementById("file-import").addEventListener("change", (e) => {
    if (e.target.files[0]) importJSONFile(e.target.files[0]);
    e.target.value = "";
  });

  document.getElementById("btn-setup-cancel").addEventListener("click", () => {
    // Discard a new assessment that was never started, so no blank "(unnamed site)" row is left
    const a = activeAssessment();
    if (a && !a.setupComplete) { delete portfolio.assessments[a.id]; portfolio.activeId = null; savePortfolio(); }
    showScreen("manager"); renderManager();
  });
  document.getElementById("btn-start").addEventListener("click", startAssessment);

  ["input-site-name", "input-org-name", "input-assessor-name"].forEach(id => {
    document.getElementById(id).addEventListener("input", commitSetupFields);
  });

  document.getElementById("btn-prev-family").addEventListener("click", goPrevFamily);
  document.getElementById("btn-next-family").addEventListener("click", goNextFamily);
  document.getElementById("btn-save-exit").addEventListener("click", () => { showScreen("manager"); renderManager(); });
  document.getElementById("btn-edit-details").addEventListener("click", () => { renderSetup(); showScreen("setup"); });
  document.getElementById("btn-edit-details-results").addEventListener("click", () => { renderSetup(); showScreen("setup"); });

  document.getElementById("btn-back-to-dashboard").addEventListener("click", () => { showScreen("manager"); renderManager(); });
  document.getElementById("btn-export").addEventListener("click", exportReport);
  document.getElementById("btn-export-csv").addEventListener("click", exportCSV);
  document.getElementById("btn-export-json").addEventListener("click", exportSingleJSON);

  document.querySelectorAll('input[name="na-mode"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      const a = activeAssessment();
      a.naMode = e.target.value;
      savePortfolio();
      renderResults();
    });
  });

  document.getElementById("btn-portfolio-back").addEventListener("click", () => { showScreen("manager"); renderManager(); });
  document.getElementById("btn-export-portfolio").addEventListener("click", exportPortfolioReport);

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "charts") {
        requestAnimationFrame(() => {
          ["family", "csf", "baseline"].forEach(key => { if (charts[key]) charts[key].resize(); });
        });
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", initApp);
