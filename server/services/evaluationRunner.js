const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const { downloadFromR2 } = require('../config/cloud');
const { Submission, Evaluation } = require('../models');
const { runStaticAnalysis } = require('./codeEvaluator');
const { runLighthouseOnExtracted } = require('./lighthouseRunner');
const { computeTotalAutoScore } = require('../utils/scoreCalculator');

/**
 * Full evaluation pipeline: download ZIP from R2, extract, static analysis, Lighthouse, persist.
 * Designed to be callable from HTTP handlers or a future job queue worker.
 *
 * @param {number} submissionId
 * @param {{ log?: (msg: string, data?: object) => void }} [options]
 */
async function runEvaluationForSubmission(submissionId, options = {}) {
  const log =
    options.log ||
    ((msg, data) =>
      console.log('[EVAL]', msg, data !== undefined ? JSON.stringify(data) : ''));

  let workDir = null;

  try {
    const submission = await Submission.findByPk(submissionId);
    if (!submission) {
      const err = new Error('Submission not found');
      err.statusCode = 404;
      throw err;
    }
    if (!submission.r2_key) {
      const err = new Error(
        'No ZIP stored for this submission. Automated scoring requires upload type with a ZIP in R2.'
      );
      err.statusCode = 400;
      throw err;
    }

    log('download.start', { submissionId });
    const buffer = await downloadFromR2(submission.r2_key);

    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'msp-eval-'));
    const zipPath = path.join(workDir, 'submission.zip');
    await fs.writeFile(zipPath, buffer);

    const extractDir = path.join(workDir, 'extracted');
    await fs.mkdir(extractDir, { recursive: true });
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractDir, true);

    log('extract.done', { bytes: buffer.length });

    const staticResult = await runStaticAnalysis(extractDir, { log });
    const lh = await runLighthouseOnExtracted(extractDir, { log });

    const totalAuto = computeTotalAutoScore({
      html: staticResult.htmlScore,
      css: staticResult.cssScore,
      js: staticResult.jsScore,
      performance: lh.performance,
      accessibility: lh.accessibility
    });

    const feedbackJson = {
      issues: staticResult.feedback?.custom?.issues || [],
      strengths: staticResult.feedback?.custom?.strengths || [],
      linters: staticResult.feedback?.linters,
      lighthouse: {
        performance: lh.performance,
        accessibility: lh.accessibility,
        skipped: lh.skipped === true
      }
    };

    const existing = await Evaluation.findOne({
      where: { submission_id: submissionId }
    });

    const scoresPayload = {
      html_score: staticResult.htmlScore,
      css_score: staticResult.cssScore,
      js_score: staticResult.jsScore,
      performance_score: lh.performance,
      accessibility_score: lh.accessibility,
      total_auto_score: totalAuto,
      feedback_json: feedbackJson
    };

    let evaluation;
    if (existing) {
      await existing.update(scoresPayload);
      await existing.reload();
      evaluation = existing;
    } else {
      evaluation = await Evaluation.create({
        submission_id: submissionId,
        ...scoresPayload
      });
    }

    log('persisted', { evaluation_id: evaluation.evaluation_id, total_auto_score: totalAuto });

    return {
      evaluation,
      breakdown: {
        html_score: staticResult.htmlScore,
        css_score: staticResult.cssScore,
        js_score: staticResult.jsScore,
        performance_score: lh.performance,
        accessibility_score: lh.accessibility,
        total_auto_score: totalAuto
      },
      feedback: feedbackJson
    };
  } finally {
    if (workDir && fsSync.existsSync(workDir)) {
      await fs.rm(workDir, { recursive: true, force: true }).catch((err) => {
        log('cleanup.warning', { message: err.message });
      });
    }
  }
}

module.exports = {
  runEvaluationForSubmission
};
