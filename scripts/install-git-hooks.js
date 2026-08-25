/**
 * Install repo git hooks by copying .githooks/* into .git/hooks/
 * (does not modify git config).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const srcDir = path.join(root, ".githooks");
const destDir = path.join(root, ".git", "hooks");

if (!fs.existsSync(path.join(root, ".git"))) {
  console.warn("install-git-hooks: no .git directory — skip");
  process.exit(0);
}

if (!fs.existsSync(srcDir)) {
  console.warn("install-git-hooks: .githooks missing — skip");
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

for (const name of fs.readdirSync(srcDir)) {
  const src = path.join(srcDir, name);
  if (!fs.statSync(src).isFile()) continue;
  const dest = path.join(destDir, name);
  fs.copyFileSync(src, dest);
  try {
    fs.chmodSync(dest, 0o755);
  } catch (_) {
    // Windows may ignore chmod
  }
  console.log(`Installed git hook: ${name}`);
}
