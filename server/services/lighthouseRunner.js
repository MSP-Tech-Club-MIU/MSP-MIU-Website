const express = require('express');
const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next']);

/**
 * Recursively find files matching predicate up to maxDepth.
 * @param {string} dir
 * @param {(rel: string, abs: string) => boolean} predicate
 * @param {{ maxDepth?: number }} [options]
 * @returns {string[]} relative posix paths from dir
 */
function findFilesRelative(dir, predicate, options = {}) {
  const maxDepth = options.maxDepth ?? 6;
  const results = [];

  function walk(currentAbs, relParts, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(currentAbs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (IGNORE_DIRS.has(ent.name)) continue;
      const abs = path.join(currentAbs, ent.name);
      const rel = path.posix.join(...relParts, ent.name.replace(/\\/g, '/'));
      if (ent.isDirectory()) {
        walk(abs, [...relParts, ent.name], depth + 1);
      } else if (ent.isFile() && predicate(rel, abs)) {
        results.push(rel);
      }
    }
  }

  walk(dir, [], 0);
  return results;
}

/**
 * Choose directory to serve and path to open in browser (relative to serve root).
 * @param {string} extractDir
 * @returns {{ root: string, urlPath: string } | null}
 */
function resolveServeTarget(extractDir) {
  const rootIndex = path.join(extractDir, 'index.html');
  if (fs.existsSync(rootIndex)) {
    return { root: extractDir, urlPath: '/index.html' };
  }

  const htmlFiles = findFilesRelative(
    extractDir,
    (rel) => rel.toLowerCase().endsWith('index.html'),
    { maxDepth: 5 }
  );
  if (htmlFiles.length > 0) {
    const rel = htmlFiles.sort((a, b) => a.split('/').length - b.split('/').length)[0];
    const root = path.dirname(path.join(extractDir, rel));
    const fromRoot = path.relative(root, path.join(extractDir, rel)).replace(/\\/g, '/');
    const urlPath = `/${fromRoot.startsWith('.') ? fromRoot.replace(/^\.\//, '') : fromRoot}`;
    return { root, urlPath: urlPath.startsWith('//') ? urlPath.slice(1) : urlPath };
  }

  const anyHtml = findFilesRelative(
    extractDir,
    (rel, abs) => rel.toLowerCase().endsWith('.html') && fs.statSync(abs).size < 2_000_000,
    { maxDepth: 5 }
  );
  if (anyHtml.length > 0) {
    const rel = anyHtml.sort((a, b) => a.split('/').length - b.split('/').length)[0];
    const root = path.dirname(path.join(extractDir, rel));
    const fromRoot = path.relative(root, path.join(extractDir, rel)).replace(/\\/g, '/');
    const urlPath = `/${fromRoot}`;
    return { root, urlPath: urlPath.startsWith('//') ? urlPath.slice(1) : urlPath };
  }

  return null;
}

/**
 * Start a temporary static server for Lighthouse.
 * @param {string} rootDir
 * @returns {Promise<{ port: number, close: () => Promise<void> }>}
 */
function startTempStaticServer(rootDir) {
  const app = express();
  app.use(express.static(rootDir, { index: false }));

  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Could not bind static server'));
        return;
      }
      resolve({
        port: addr.port,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          })
      });
    });
    server.on('error', reject);
  });
}

/**
 * Run Lighthouse (performance + accessibility scores 0–100).
 * @param {string} pageUrl
 * @param {{ log?: (msg: string, data?: object) => void }} [options]
 * @returns {Promise<{ performance: number, accessibility: number, raw?: object }>}
 */
async function runLighthouse(pageUrl, options = {}) {
  const log = options.log || (() => {});
  const [{ default: lighthouse }, chromeLauncherMod] = await Promise.all([
    import('lighthouse'),
    import('chrome-launcher')
  ]);
  const chromeLauncher = chromeLauncherMod.default || chromeLauncherMod;

  const chromeFlags = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage'
  ];

  const chrome = await chromeLauncher.launch({
    chromeFlags,
    chromePath: process.env.CHROME_PATH || undefined
  });
  try {
    log('lighthouse.started', { pageUrl, port: chrome.port });
    const result = await lighthouse(pageUrl, {
      logLevel: 'error',
      output: 'json',
      onlyCategories: ['performance', 'accessibility'],
      port: chrome.port,
      settings: {
        formFactor: 'desktop',
        screenEmulation: { disabled: true },
        throttlingMethod: 'provided'
      }
    });

    const lhr = result?.lhr;
    const perf = Math.round((lhr?.categories?.performance?.score ?? 0) * 100);
    const a11y = Math.round((lhr?.categories?.accessibility?.score ?? 0) * 100);

    return {
      performance: perf,
      accessibility: a11y,
      raw: process.env.NODE_ENV === 'development' ? { finalUrl: lhr?.finalUrl } : undefined
    };
  } finally {
    await chrome.kill();
    log('lighthouse.chrome_closed', {});
  }
}

/**
 * Serve extracted submission and run Lighthouse.
 * @param {string} extractDir
 * @param {{ log?: (msg: string, data?: object) => void }} [options]
 */
async function runLighthouseOnExtracted(extractDir, options = {}) {
  const log = options.log || (() => {});
  const target = resolveServeTarget(extractDir);
  if (!target) {
    log('lighthouse.skip', { reason: 'no_html' });
    return { performance: 0, accessibility: 0, skipped: true };
  }

  let server;
  try {
    server = await startTempStaticServer(target.root);
  } catch (err) {
    log('lighthouse.server_error', { message: err.message });
    return { performance: 0, accessibility: 0, skipped: true };
  }

  const url = `http://127.0.0.1:${server.port}${target.urlPath.startsWith('/') ? target.urlPath : `/${target.urlPath}`}`;

  try {
    return await runLighthouse(url, { log });
  } finally {
    await server.close().catch(() => {});
  }
}

module.exports = {
  resolveServeTarget,
  startTempStaticServer,
  runLighthouse,
  runLighthouseOnExtracted,
  findFilesRelative
};
