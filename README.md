# OT Cybersecurity Assessment Tool

A free, web-based OT/ICS cybersecurity maturity self-assessment tool. No build step, no backend, no dependencies to install — open `index.html` in a browser or host it on GitHub Pages. Fully self-contained: Chart.js is vendored locally, so the tool works even with no internet connection (fonts will gracefully fall back to system fonts offline).

**Built by Sale Fish Marketing and Consulting.**

---

## What it does

- Assess OT cybersecurity maturity against **NIST SP 800-82r3**, **IEC 62443**, or **TSA Security Directives (Gas Pipeline)** — all cross-referenced to **NIST CSF 2.0**.
- Two assessment depths: **Short** (control-family level) and **Long** (detailed, multiple sub-questions per family).
- **N/A support** — mark a question as Not Applicable, and choose (per assessment, adjustable live on the results screen) whether N/A items are excluded from the average or counted as 0.
- Select your **industry** (Power & Utilities, Oil & Gas, Chemical, Manufacturing, Healthcare) for illustrative baseline comparison.
- **Multi-site portfolio support** — run independent assessments for multiple sites/facilities, then build a combined rollup view and export a portfolio report alongside individual per-site reports.
- Scoring uses the standard **CMM 1-5** maturity model (Initial → Optimizing).
- Notes/evidence field per control family, and assessor/organization/site fields captured with every assessment.
- An executive dashboard: overall maturity gauge, risk-weighted score, NIST CSF 2.0 function rollup (radar chart), industry baseline comparison, and a prioritized Top 10 Risks list with recommended remediation actions.
- **CTRL ID traceability** — every control family cross-references the CTRL-x.x.x IDs from the companion "OT Cybersecurity Technical Reference" document, so findings here can be traced back to that document's detailed guidance.
- **Export formats:** a full Word-compatible `.doc` report (executive summary, detailed summary with charts, full risk list, Top 10 risks, full Q&A appendix, approval signature block), a `.csv` raw-data export, and a `.json` progress/backup export — all entirely client-side.
- **Import/export portfolio data** as JSON for backup or transfer between devices.
- Progress is saved automatically to browser `localStorage`.
- Accessible: CMM scoring uses native radio-button semantics (full keyboard navigation, screen-reader announced), visible focus states, and respects `prefers-reduced-motion`.
- On-screen privacy notice: all data stays in the browser, nothing is sent to a server.

## Quick start

**Option 1 — just open it.** Double-click `index.html`. Everything runs client-side, fully offline-capable (Chart.js is bundled locally).

**Option 2 — GitHub Pages.**
1. Push this repo to GitHub.
2. Repo Settings → Pages → Deploy from branch → select `main` and `/ (root)`.
3. Your tool is live at `https://<username>.github.io/<repo-name>/`.

**Option 3 — any static file server**, e.g. `python3 -m http.server 8080`.

## Using multi-site portfolios

1. From the **Dashboard**, click **+ New Assessment** for each site/facility you want to assess. Give each one a distinct Site Name.
2. Complete each site's assessment independently (progress auto-saves; you can leave and resume anytime via **Save & exit to dashboard**).
3. Once 2 or more assessments are marked **COMPLETE**, check their boxes on the Dashboard and click **View Portfolio Rollup**.
4. The Portfolio screen shows combined average maturity, a per-site comparison chart/table, and the lowest-scoring site. Export a combined **Portfolio Report (.doc)** with an executive summary plus a detail section per site, or export each site's own individual report from its Results screen.

Note: sites assessed against different standards or modes (short/long) can still be included in a rollup for side-by-side comparison, but the report notes this explicitly — cross-standard comparisons are directional, not a precise apples-to-apples score.

## Project structure

```
index.html              Main app shell (dashboard, setup, assessment, results, portfolio screens)
css/style.css           Design system (dark control-room theme)
data/questions.js       Question bank: control families, questions, CSF 2.0 mappings, CTRL ID cross-refs, remediation text, industry baselines
data/cmm-levels.js      CMM 1-5 level definitions, N/A-handling scoring logic
js/gauge.js             Custom SVG analog gauge (the maturity score dial)
js/app.js               Multi-assessment state management, navigation, scoring, chart rendering
js/export-doc.js        Generates Word-compatible .doc exports (single-site and portfolio rollup)
js/vendor/chart.umd.js  Chart.js, vendored locally for offline use (MIT licensed, see js/vendor/CHART.JS.LICENSE.md)
```

External dependencies:
- **Chart.js** — vendored locally in `js/vendor/`, no internet connection required.
- **Google Fonts** (Space Grotesk, IBM Plex Sans, IBM Plex Mono) — loaded via CDN; falls back gracefully to system fonts if offline.

## Methodology & scope

The control families in `data/questions.js` are a **representative, foundational set** derived from each standard's core structure:

- **NIST SP 800-82r3** — a representative subset of NIST SP 800-53 control families as tailored for OT (Access Control, Identification & Authentication, System & Communications Protection, System & Information Integrity, Audit & Accountability, Incident Response, Contingency Planning, Configuration Management).
- **IEC 62443** — the 7 Foundational Requirements (FR1–FR7) defined in IEC 62443-3-3.
- **TSA Security Directives** — the core requirement areas of the pipeline Security Directive series (segmentation, MFA, patch management, monitoring, incident reporting, governance, third-party assessment). This reflects the **gas pipeline** directive series specifically.

This is a **maturity self-assessment tool**, not a substitute for a full, formal control-by-control audit against the complete standard text by an accredited assessor. The current question bank version is stamped in the tool's header strip and in every exported report.

**Industry baseline maturity figures** are **illustrative planning estimates** based on general sector regulatory-pressure trends, not empirical survey data.

**This tool is complementary to, not a replacement for, the companion Excel-based risk register.** This tool measures *program/control maturity* (how mature is your access control practice, broadly); the companion workbook's Risk Register tracks *specific named risk scenarios* (Likelihood × Consequence for a particular vulnerability or threat). Use both together — CTRL ID cross-references in this tool's question bank tie back to the same IDs used in the companion Word document and workbook.

## N/A handling

Every question can be marked **N/A** instead of scored 1-5. On the Results screen, a toggle controls how N/A responses factor into averages:
- **Exclude N/A from average** (default) — N/A items simply don't count; the average is computed only over applicable, scored items.
- **Treat N/A as 0** — N/A items count as a full miss (0) in the average. Use this if your organization wants "not applicable" to still be visible as a gap in the overall score (e.g., "we have no cloud exposure" might still warrant a lower score if cloud governance would be expected at your maturity target).

This toggle can be changed after the fact without re-doing the assessment — it recomputes live from the same underlying responses. N/A items are never counted as "risks" in the Top 10 / risk list, since by definition they don't apply to the environment.

## Extending the question bank

To add more control families, deeper sub-questions, or additional standards, edit `data/questions.js`. Each family follows this shape:

```js
{
  id: "AC",
  name: "Access Control",
  csf: "PR",                          // NIST CSF 2.0 function code (GV/ID/PR/DE/RS/RC)
  csfCategory: "PR.AA — ...",
  ctrlRefs: ["CTRL-3.3.2", "CTRL-3.3.3"], // cross-reference to the companion reference document, if applicable
  remediation: "Recommended action text shown for low-scoring items...",
  criticalityWeight: 1.3,             // used in risk-weighted maturity and risk prioritization
  shortQuestion: { text: "...", help: "..." },
  longQuestions: [
    { text: "...", help: "..." },
  ],
}
```

Bump `QUESTION_BANK_VERSION` and `QUESTION_BANK_DATE` at the top of the file whenever you make a meaningful change — this is stamped into every exported report so old and new reports stay distinguishable.

To add a new standard entirely, add a new top-level key to `QUESTION_BANK` and a matching entry in `STANDARDS_META`, and (optionally) baseline figures per industry in `INDUSTRY_BASELINES`.

## Browser storage & privacy

This tool uses `localStorage` to persist assessments (including across multiple sites) between sessions. No data leaves the browser — there is no backend, no analytics, and (with Chart.js vendored locally) no network calls at all except loading Google Fonts, which degrade gracefully if unavailable.

To back up or transfer your data: use **Export All (.json)** on the Dashboard to export your entire portfolio, and **Import Data (.json)** to restore it (on this device or another).

## License / attribution

Prepared by Sale Fish Marketing and Consulting. Adapt freely for your own use. Chart.js is bundled under the MIT License (see `js/vendor/CHART.JS.LICENSE.md`).
