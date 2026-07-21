/* CMM 1-5 maturity level definitions used throughout the tool.
   Distinct from the 0-4 Control/Maturity scale used in the companion
   OT Cybersecurity Technical Reference document — this tool uses
   standard CMM 1-5 levels by design. */

const CMM_LEVELS = [
  { level: 1, name: "Initial", short: "Ad hoc", description: "Ad hoc or absent. No defined process; success depends on individual effort." },
  { level: 2, name: "Managed", short: "Reactive", description: "A process exists but is applied inconsistently, informally, or reactively." },
  { level: 3, name: "Defined", short: "Standardized", description: "Process is documented, standardized, and applied consistently across the organization." },
  { level: 4, name: "Quantitatively Managed", short: "Measured", description: "Process performance is measured, controlled, and managed using data." },
  { level: 5, name: "Optimizing", short: "Improving", description: "Process is continuously improved based on quantitative feedback and lessons learned." },
];

const NA_VALUE = "NA"; // sentinel stored in a response's scores array to mean "not applicable"

function cmmLevelFor(score) {
  const rounded = Math.max(1, Math.min(5, Math.round(score)));
  return CMM_LEVELS[rounded - 1];
}

function cmmLabel(score) {
  if (score === null || score === undefined || isNaN(score)) return "Not scored";
  const lvl = cmmLevelFor(score);
  return `${score.toFixed(1)} — ${lvl.name}`;
}

/* Reduce a raw scores array (each entry: 1-5, "NA", or null-for-unanswered)
   to a numeric average given the current N/A handling mode.
   naMode: "exclude" (default) — N/A items don't count toward the average
           "zero"    — N/A items count as 0 (a full miss) in the average
   Unanswered (null) items are always excluded — they are not yet answered,
   distinct from a deliberate N/A. Returns null if nothing scorable. */
function reduceScores(rawScores, naMode) {
  const answered = rawScores.filter(s => s !== null && s !== undefined);
  if (!answered.length) return { avg: null, naCount: 0, answeredCount: 0 };
  const naCount = answered.filter(s => s === NA_VALUE).length;
  if (naMode === "zero") {
    const numeric = answered.map(s => (s === NA_VALUE ? 0 : s));
    const avg = numeric.reduce((a, b) => a + b, 0) / numeric.length;
    return { avg, naCount, answeredCount: answered.length };
  }
  // exclude mode (default)
  const numericOnly = answered.filter(s => s !== NA_VALUE);
  if (!numericOnly.length) return { avg: null, naCount, answeredCount: answered.length };
  const avg = numericOnly.reduce((a, b) => a + b, 0) / numericOnly.length;
  return { avg, naCount, answeredCount: answered.length };
}

if (typeof module !== "undefined") {
  module.exports = { CMM_LEVELS, NA_VALUE, cmmLevelFor, cmmLabel, reduceScores };
}
