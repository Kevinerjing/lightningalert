import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const heroDir = path.join(repoRoot, "hero");
const filesToSyntaxCheck = [
  path.join(heroDir, "game.js"),
  path.join(heroDir, "effect-system.js"),
  path.join(heroDir, "visual-effects.js"),
  path.join(heroDir, "release-data.js"),
];

const introHtmlPath = path.join(heroDir, "index.html");
const appHtmlPath = path.join(heroDir, "main.html");
const gameJsPath = path.join(heroDir, "game.js");
const vfxPath = path.join(heroDir, "visual-effects.js");

const failures = [];
const passes = [];

function ok(message) {
  passes.push(message);
}

function fail(message) {
  failures.push(message);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function runNodeCheck(filePath) {
  const result = spawnSync(process.execPath, ["--check", filePath], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    fail(`Syntax check failed for ${path.relative(repoRoot, filePath)}\n${result.stderr || result.stdout}`);
    return;
  }

  ok(`Syntax OK: ${path.relative(repoRoot, filePath)}`);
}

function collectHtmlIds(html) {
  const ids = new Set();
  const regex = /\bid="([^"]+)"/g;
  let match = regex.exec(html);
  while (match) {
    ids.add(match[1]);
    match = regex.exec(html);
  }
  return ids;
}

function collectGameJsIds(js) {
  const ids = new Set();
  const regex = /getElementById\(\s*"([^"]+)"\s*\)/g;
  let match = regex.exec(js);
  while (match) {
    ids.add(match[1]);
    match = regex.exec(js);
  }
  return ids;
}

function checkRequiredFiles() {
  for (const filePath of [introHtmlPath, appHtmlPath, gameJsPath, vfxPath]) {
    if (!fileExists(filePath)) {
      fail(`Missing required file: ${path.relative(repoRoot, filePath)}`);
      continue;
    }
    ok(`Found file: ${path.relative(repoRoot, filePath)}`);
  }
}

function checkSyntax() {
  for (const filePath of filesToSyntaxCheck) {
    if (!fileExists(filePath)) {
      fail(`Missing JS file for syntax check: ${path.relative(repoRoot, filePath)}`);
      continue;
    }
    runNodeCheck(filePath);
  }
}

function checkIntroPage() {
  const html = readText(introHtmlPath);
  const requiredIntroSnippets = [
    'id="intro"',
    'id="replayBtn"',
    'id="skipBtn"',
    'window.location.href = \'main.html\'',
  ];

  for (const snippet of requiredIntroSnippets) {
    if (!html.includes(snippet)) {
      fail(`hero/index.html is missing required intro snippet: ${snippet}`);
    }
  }

  ok("Intro page routes players to hero/main.html");
}

function checkHtmlAndDomWiring() {
  const html = readText(appHtmlPath);
  const js = readText(gameJsPath);
  const htmlIds = collectHtmlIds(html);
  const jsIds = collectGameJsIds(js);

  for (const id of jsIds) {
    if (!htmlIds.has(id)) {
      fail(`game.js expects #${id}, but it is missing from hero/main.html`);
    }
  }

  ok(`DOM id coverage OK: ${jsIds.size} ids referenced by game.js are present in hero/main.html`);

  const requiredHtmlSnippets = [
    '<div id="fx-layer"></div>',
    '<div id="combat-cinematic-root"></div>',
    '<template id="cardTemplate">',
    '<script src="visual-effects.js"></script>',
    'id="card-preview-overlay"',
  ];

  for (const snippet of requiredHtmlSnippets) {
    if (!html.includes(snippet)) {
      fail(`hero/main.html is missing required snippet: ${snippet}`);
    }
  }

  ok("Critical animation HTML hooks are present");
}

function checkAnimationWiring() {
  const js = readText(gameJsPath);
  const vfx = readText(vfxPath);

  const requiredGameJsSnippets = [
    "async function playSelectedCard()",
    "await runPlayCardAnimation(card, playerId, selectedCardIndex);",
    'sendAction("play_card", { handIndex: selectedCardIndex });',
    "function cueAttackMotion(cardId, ctx)",
    "cueAttackMotion(cardId, ctx);",
    "window.HeroVfx?.animatePlayCard",
    "window.HeroVfx?.animateAttack",
  ];

  for (const snippet of requiredGameJsSnippets) {
    if (!js.includes(snippet)) {
      fail(`hero/game.js is missing required animation wiring: ${snippet}`);
    }
  }

  const playIndex = js.indexOf("await runPlayCardAnimation(card, playerId, selectedCardIndex);");
  const sendIndex = js.indexOf('sendAction("play_card", { handIndex: selectedCardIndex });');
  if (playIndex === -1 || sendIndex === -1 || playIndex > sendIndex) {
    fail("Play-card animation must run before sendAction(\"play_card\", ...)");
  } else {
    ok("Play-card animation runs before play action is sent");
  }

  const requiredVfxSnippets = [
    "function animatePlayCard(cardEl, options = {})",
    "function animateAttack(options = {})",
    "const controlX = (startX + endX) * 0.5",
    "const controlY = Math.min(startY, endY) - 120;",
    'translate3d(0, -10px, 0) scale(1.08)',
    "window.HeroVfx = {",
    "animatePlayCard,",
    "animateAttack,",
  ];

  for (const snippet of requiredVfxSnippets) {
    if (!vfx.includes(snippet)) {
      fail(`hero/visual-effects.js is missing expected implementation detail: ${snippet}`);
    }
  }

  ok("Animation wiring looks intact");
}

function checkReferencedLocalScripts() {
  for (const htmlPath of [introHtmlPath, appHtmlPath]) {
    const html = readText(htmlPath);
    const relativeHtmlPath = path.relative(repoRoot, htmlPath);
    const regex = /<script\s+src="([^"]+)"/g;
    let match = regex.exec(html);

    while (match) {
      const relativePath = match[1];
      if (/^https?:/i.test(relativePath)) {
        match = regex.exec(html);
        continue;
      }

      const normalizedPath = relativePath.split("?")[0].split("#")[0];
      const target = path.join(heroDir, normalizedPath);
      if (!fileExists(target)) {
        fail(`${relativeHtmlPath} references missing script: hero/${relativePath}`);
      }
      match = regex.exec(html);
    }
  }

  ok("All locally referenced script files exist");
}

function main() {
  checkRequiredFiles();
  checkSyntax();
  checkIntroPage();
  checkHtmlAndDomWiring();
  checkAnimationWiring();
  checkReferencedLocalScripts();

  console.log("Hero sanity check");
  console.log("=================");

  for (const message of passes) {
    console.log(`PASS ${message}`);
  }

  if (failures.length) {
    console.log("");
    for (const message of failures) {
      console.error(`FAIL ${message}`);
    }
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }

  console.log(`\nAll ${passes.length} checks passed.`);
}

main();
