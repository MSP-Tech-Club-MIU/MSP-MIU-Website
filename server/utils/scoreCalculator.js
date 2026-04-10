/**
 * Normalize a 0–100 score.
 * @param {number} n
 * @returns {number}
 */
function normalizeTo100(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

/** Weights for automated composite score (must sum to 1). */
const AUTO_WEIGHTS = {
  html: 0.15,
  css: 0.15,
  js: 0.25,
  performance: 0.25,
  accessibility: 0.2
};

/**
 * Weighted total automated score (0–100).
 * @param {{ html: number, css: number, js: number, performance: number, accessibility: number }} scores
 * @returns {number}
 */
function computeTotalAutoScore(scores) {
  const h = normalizeTo100(scores.html);
  const c = normalizeTo100(scores.css);
  const j = normalizeTo100(scores.js);
  const p = normalizeTo100(scores.performance);
  const a = normalizeTo100(scores.accessibility);
  const total =
    h * AUTO_WEIGHTS.html +
    c * AUTO_WEIGHTS.css +
    j * AUTO_WEIGHTS.js +
    p * AUTO_WEIGHTS.performance +
    a * AUTO_WEIGHTS.accessibility;
  return Math.round(total * 100) / 100;
}

/**
 * Average of four judge dimensions for one judge row (0–100).
 * @param {{ design_score: number, creativity_score: number, ux_score: number, innovation_score: number }} row
 * @returns {number}
 */
function judgeRowAverage(row) {
  const d = normalizeTo100(row.design_score);
  const c = normalizeTo100(row.creativity_score);
  const u = normalizeTo100(row.ux_score);
  const i = normalizeTo100(row.innovation_score);
  return Math.round(((d + c + u + i) / 4) * 100) / 100;
}

/**
 * Mean judge score across multiple judge rows (0–100).
 * @param {Array<{ design_score: number, creativity_score: number, ux_score: number, innovation_score: number }>} rows
 * @returns {number|null}
 */
function meanJudgeScore(rows) {
  if (!rows || rows.length === 0) return null;
  const sum = rows.reduce((acc, r) => acc + judgeRowAverage(r), 0);
  return Math.round((sum / rows.length) * 100) / 100;
}

/**
 * Final combined score: 60% automated + 40% judge average.
 * If judge average is missing, returns automated only.
 * If automated is missing, returns judge only if present.
 * @param {number|null|undefined} totalAutoScore
 * @param {number|null|undefined} judgeAverage
 * @returns {number|null}
 */
function computeFinalScore(totalAutoScore, judgeAverage) {
  const auto = totalAutoScore == null ? null : normalizeTo100(totalAutoScore);
  const judge = judgeAverage == null ? null : normalizeTo100(judgeAverage);

  if (auto != null && judge != null) {
    return Math.round((auto * 0.6 + judge * 0.4) * 100) / 100;
  }
  if (auto != null) return auto;
  if (judge != null) return judge;
  return null;
}

/**
 * Lint-based score: start at 100, subtract for errors and warnings.
 * @param {number} errorCount
 * @param {number} warningCount
 * @param {{ errorPenalty?: number, warningPenalty?: number }} [opts]
 */
function scoreFromLintCounts(errorCount, warningCount, opts = {}) {
  const ep = opts.errorPenalty ?? 5;
  const wp = opts.warningPenalty ?? 2;
  const raw = 100 - errorCount * ep - warningCount * wp;
  return normalizeTo100(raw);
}

module.exports = {
  normalizeTo100,
  AUTO_WEIGHTS,
  computeTotalAutoScore,
  judgeRowAverage,
  meanJudgeScore,
  computeFinalScore,
  scoreFromLintCounts
};
