import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, "output/playwright/hero-regression-html");
const sourceMarkdown = path.join(repoRoot, "output/playwright/hero-regression-report.md");
const targetDir = path.join(repoRoot, "hero/test-report");
const targetMarkdown = path.join(targetDir, "hero-regression-report.md");

function removeDirContents(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath)) {
    fs.rmSync(path.join(dirPath, entry), { recursive: true, force: true });
  }
}

function main() {
  if (!fs.existsSync(sourceDir)) {
    console.error(`Missing Playwright HTML report folder: ${sourceDir}`);
    process.exit(1);
  }

  fs.mkdirSync(targetDir, { recursive: true });
  removeDirContents(targetDir);
  fs.cpSync(sourceDir, targetDir, { recursive: true });

  if (fs.existsSync(sourceMarkdown)) {
    fs.copyFileSync(sourceMarkdown, targetMarkdown);
  }

  console.log(`Hero E2E HTML report synced to ${path.relative(repoRoot, targetDir)}`);
}

main();
