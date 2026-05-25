const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const { downloadFromR2 } = require('../config/cloud');
const { Submission, Evaluation, Competition } = require('../models');
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
    const submission = await Submission.findByPk(submissionId, {
      attributes: { exclude: ['score', 'feedback'] },
      include: [{ model: Competition, as: 'competition' }]
    });
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

    const isMultiTask = submission.competition?.config?.multiTask === true;
    const taskDirs = isMultiTask ? ['task1', 'task2'] : ['.'];
    if (isMultiTask) {
      const missing = taskDirs.filter((t) => !fsSync.existsSync(path.join(extractDir, t)));
      if (missing.length > 0) {
        const err = new Error(`Invalid submission structure. Missing: ${missing.join(', ')}`);
        err.statusCode = 400;
        throw err;
      }
    }

    const taskResults = {};
    for (const task of taskDirs) {
      const targetDir = task === '.' ? extractDir : path.join(extractDir, task);
      const staticResult = await runStaticAnalysis(targetDir, { log });
      const lh = await runLighthouseOnExtracted(targetDir, { log });
      const totalAuto = computeTotalAutoScore({
        html: staticResult.htmlScore,
        css: staticResult.cssScore,
        js: staticResult.jsScore,
        performance: lh.performance,
        accessibility: lh.accessibility
      });
      taskResults[task] = {
        total: totalAuto,
        staticResult,
        lh
      };
    }

    const totalAuto = isMultiTask
      ? Math.round(((taskResults.task1.total + taskResults.task2.total) / 2) * 100) / 100
      : taskResults['.'].total;

    const feedbackJson = isMultiTask
      ? {
          task1: {
            total_auto_score: taskResults.task1.total,
            linters: taskResults.task1.staticResult.feedback?.linters,
            lighthouse: {
              performance: taskResults.task1.lh.performance,
              accessibility: taskResults.task1.lh.accessibility
            }
          },
          task2: {
            total_auto_score: taskResults.task2.total,
            linters: taskResults.task2.staticResult.feedback?.linters,
            lighthouse: {
              performance: taskResults.task2.lh.performance,
              accessibility: taskResults.task2.lh.accessibility
            }
          },
          final: totalAuto
        }
      : {
          issues: taskResults['.'].staticResult.feedback?.custom?.issues || [],
          strengths: taskResults['.'].staticResult.feedback?.custom?.strengths || [],
          linters: taskResults['.'].staticResult.feedback?.linters,
          lighthouse: {
            performance: taskResults['.'].lh.performance,
            accessibility: taskResults['.'].lh.accessibility,
            skipped: taskResults['.'].lh.skipped === true
          }
        };

    const existing = await Evaluation.findOne({
      where: { submission_id: submissionId }
    });

    const scoresPayload = {
      html_score: isMultiTask ? 0 : taskResults['.'].staticResult.htmlScore,
      css_score: isMultiTask ? 0 : taskResults['.'].staticResult.cssScore,
      js_score: isMultiTask ? 0 : taskResults['.'].staticResult.jsScore,
      performance_score: isMultiTask ? 0 : taskResults['.'].lh.performance,
      accessibility_score: isMultiTask ? 0 : taskResults['.'].lh.accessibility,
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
        html_score: scoresPayload.html_score,
        css_score: scoresPayload.css_score,
        js_score: scoresPayload.js_score,
        performance_score: scoresPayload.performance_score,
        accessibility_score: scoresPayload.accessibility_score,
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
