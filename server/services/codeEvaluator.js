const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const stylelint = require('stylelint');
const { HTMLHint } = require('htmlhint');
const { scoreFromLintCounts } = require('../utils/scoreCalculator');
const { findFilesRelative } = require('./lighthouseRunner');

const execFileAsync = promisify(execFile);

const ESLINT_CONFIG = path.join(__dirname, '../config/evaluation/eslint.eval.cjs');
const STYLELINT_CONFIG = path.join(__dirname, '../config/evaluation/stylelint.eval.cjs');

const MAX_FILE_BYTES = 1_500_000;

/**
 * Run ESLint via child process (JSON on stdout even when exit code is non-zero).
 * @param {string} cwd
 * @param {(msg: string, data?: object) => void} log
 */
function eslintCliPath() {
  return path.join(path.dirname(require.resolve('eslint/package.json')), 'bin', 'eslint.js');
}

async function runEslintProcess(cwd, log) {
  const eslintBin = eslintCliPath();
  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        eslintBin,
        '.',
        '--ext',
        '.js',
        '--format',
        'json',
        '--no-error-on-unmatched-pattern',
        '--config',
        ESLINT_CONFIG
      ],
      {
        cwd,
        maxBuffer: 50 * 1024 * 1024
      }
    );
    return JSON.parse(stdout || '[]');
  } catch (err) {
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch (e) {
        log('eslint.parse_error', { message: e.message });
      }
    }
    log('eslint.failed', { message: err.message });
    return [];
  }
}

/**
 * @param {any[]} eslintResults
 */
function summarizeEslint(eslintResults) {
  let errors = 0;
  let warnings = 0;
  for (const file of eslintResults || []) {
    for (const m of file.messages || []) {
      if (m.severity === 2) errors += 1;
      else if (m.severity === 1) warnings += 1;
    }
  }
  return { errors, warnings, score: scoreFromLintCounts(errors, warnings) };
}

/**
 * Run Stylelint programmatically (CSS).
 * @param {string} cwd
 * @param {(msg: string, data?: object) => void} log
 */
async function runStylelintLint(cwd, log) {
  try {
    const result = await stylelint.lint({
      files: '**/*.css',
      cwd,
      configFile: STYLELINT_CONFIG,
      allowEmptyInput: true
    });
    let errors = 0;
    let warnings = 0;
    for (const r of result.results || []) {
      for (const w of r.warnings || []) {
        const sev = w.severity;
        if (sev === 'error' || sev === 2) errors += 1;
        else warnings += 1;
      }
    }
    return {
      errors,
      warnings,
      score: scoreFromLintCounts(errors, warnings),
      result
    };
  } catch (err) {
    log('stylelint.failed', { message: err.message });
    return { errors: 0, warnings: 0, score: 100, result: null };
  }
}

/**
 * Run HTMLHint on HTML files (read-only static analysis).
 * @param {string} extractDir
 * @param {(msg: string, data?: object) => void} log
 */
function runHtmlHintOnDir(extractDir, log) {
  const htmlRel = findFilesRelative(
    extractDir,
    (rel, abs) =>
      rel.toLowerCase().endsWith('.html') && fs.statSync(abs).size < MAX_FILE_BYTES,
    { maxDepth: 6 }
  );

  if (htmlRel.length === 0) {
    return { errors: 0, warnings: 0, score: 100, files: 0, messages: [] };
  }

  let errors = 0;
  let warnings = 0;
  const messages = [];

  for (const rel of htmlRel) {
    const abs = path.join(extractDir, rel);
    let code;
    try {
      code = fs.readFileSync(abs, 'utf8');
    } catch (e) {
      log('htmlhint.read_error', { file: rel, message: e.message });
      continue;
    }
    const res = HTMLHint.verify(code) || [];
    for (const m of res) {
      const isError = m.type === 'error' || m.type === 1;
      if (isError) errors += 1;
      else warnings += 1;
      messages.push({
        file: rel,
        line: m.line,
        col: m.col,
        rule: m.rule && m.rule.id ? m.rule.id : m.rule,
        message: m.message,
        type: m.type
      });
    }
  }

  return {
    errors,
    warnings,
    score: scoreFromLintCounts(errors, warnings),
    files: htmlRel.length,
    messages: messages.slice(0, 200)
  };
}

/**
 * Custom static rules (regex / structural); does not execute JS.
 * @param {string} extractDir
 * @param {(msg: string, data?: object) => void} log
 */
function runCustomRules(extractDir, log) {
  const issues = [];
  const strengths = [];

  const htmlFiles = findFilesRelative(
    extractDir,
    (rel, abs) =>
      rel.toLowerCase().endsWith('.html') && fs.statSync(abs).size < MAX_FILE_BYTES,
    { maxDepth: 6 }
  );

  const cssFiles = findFilesRelative(
    extractDir,
    (rel, abs) =>
      rel.toLowerCase().endsWith('.css') && fs.statSync(abs).size < MAX_FILE_BYTES,
    { maxDepth: 6 }
  );

  let inlineStyleHits = 0;
  let imgWithoutAlt = 0;
  let semanticHits = 0;
  let mediaQueryHits = 0;

  const semanticTags = ['<main', '<article', '<section', '<nav', '<header', '<footer'];

  for (const rel of htmlFiles) {
    let content;
    try {
      content = fs.readFileSync(path.join(extractDir, rel), 'utf8');
    } catch (e) {
      log('custom.read_error', { file: rel });
      continue;
    }

    const inlineMatches = content.match(/\sstyle\s*=/gi);
    if (inlineMatches) {
      inlineStyleHits += inlineMatches.length;
    }

    const imgTags = content.match(/<img\b[^>]*>/gi) || [];
    for (const tag of imgTags) {
      if (!/\salt\s*=/i.test(tag)) {
        imgWithoutAlt += 1;
      }
    }

    const lower = content.toLowerCase();
    for (const t of semanticTags) {
      if (lower.includes(t)) semanticHits += 1;
    }
  }

  for (const rel of cssFiles) {
    let content;
    try {
      content = fs.readFileSync(path.join(extractDir, rel), 'utf8');
    } catch (e) {
      continue;
    }
    if (/@media\b/.test(content)) mediaQueryHits += 1;
  }

  if (inlineStyleHits > 0) {
    issues.push({
      code: 'inline_styles',
      message: `Found ${inlineStyleHits} inline style attribute(s). Prefer external CSS.`,
      penaltySuggestion: 'Consider moving styles to stylesheets.'
    });
  }
  if (imgWithoutAlt > 0) {
    issues.push({
      code: 'missing_img_alt',
      message: `${imgWithoutAlt} <img> element(s) missing alt attributes.`,
      penaltySuggestion: 'Add descriptive alt text for accessibility.'
    });
  }
  if (mediaQueryHits > 0) {
    strengths.push({
      code: 'media_queries',
      message: `Responsive CSS: @media found in ${mediaQueryHits} stylesheet(s).`
    });
  }
  if (semanticHits >= 2) {
    strengths.push({
      code: 'semantic_html',
      message: 'Uses multiple semantic HTML landmarks (main/article/section/nav/header/footer).'
    });
  }

  return { issues, strengths };
}

/**
 * Apply small adjustments to category scores based on custom rules (bounded).
 * @param {number} htmlScore
 * @param {{ issues: any[], strengths: any[] }} custom
 */
function applyCustomAdjustments(htmlScore, cssScore, custom) {
  let html = htmlScore;
  let css = cssScore;
  for (const issue of custom.issues || []) {
    if (issue.code === 'inline_styles') html = Math.max(0, html - 3);
    if (issue.code === 'missing_img_alt') html = Math.max(0, html - 5);
  }
  for (const s of custom.strengths || []) {
    if (s.code === 'media_queries') css = Math.min(100, css + 2);
    if (s.code === 'semantic_html') html = Math.min(100, html + 2);
  }
  return { html, css };
}

/**
 * Full static analysis pipeline for an extracted submission directory.
 * @param {string} extractDir
 * @param {{ log?: (msg: string, data?: object) => void }} [options]
 */
async function runStaticAnalysis(extractDir, options = {}) {
  const log = options.log || (() => {});

  const eslintJson = await runEslintProcess(extractDir, log);
  const eslint = summarizeEslint(eslintJson);

  const style = await runStylelintLint(extractDir, log);
  const htmlhint = runHtmlHintOnDir(extractDir, log);
  const custom = runCustomRules(extractDir, log);

  let htmlScore = htmlhint.score;
  let cssScore = style.score;
  let jsScore = eslint.score;

  const adjusted = applyCustomAdjustments(htmlScore, cssScore, custom);
  htmlScore = adjusted.html;
  cssScore = adjusted.css;

  const feedback = {
    linters: {
      eslint: {
        errors: eslint.errors,
        warnings: eslint.warnings,
        score: eslint.score,
        sample: (eslintJson || []).slice(0, 3).map((f) => ({
          filePath: f.filePath ? path.relative(extractDir, f.filePath) : '',
          messageCount: f.messages?.length
        }))
      },
      stylelint: {
        errors: style.errors,
        warnings: style.warnings,
        score: style.score
      },
      htmlhint: {
        errors: htmlhint.errors,
        warnings: htmlhint.warnings,
        score: htmlhint.score,
        filesScanned: htmlhint.files
      }
    },
    custom
  };

  log('static_analysis.done', {
    htmlScore,
    cssScore,
    jsScore
  });

  return {
    htmlScore,
    cssScore,
    jsScore,
    feedback
  };
}

module.exports = {
  runStaticAnalysis,
  runEslintProcess,
  runStylelintLint,
  runHtmlHintOnDir,
  runCustomRules
};
