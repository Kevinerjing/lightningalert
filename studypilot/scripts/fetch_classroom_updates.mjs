import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const projectRoot = path.resolve(process.cwd());
const secretsPath = path.join(projectRoot, "local-secrets.json");
const outputPath = path.join(projectRoot, "data", "classroom-updates.json");
const profileDir = path.join(projectRoot, ".playwright", "google-classroom-profile");

const classrooms = [
  {
    key: "math",
    name: "Grade 9 Math",
    url: "https://classroom.google.com/w/ODI1MDk4ODUxNTc1/t/all"
  },
  {
    key: "science",
    name: "Science SNC1W",
    url: "https://classroom.google.com/w/ODI0MzQ2MzAwMjMw/t/all"
  }
];

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanTopicText(value) {
  return normalizeText(value)
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTopicHeading(value) {
  return cleanTopicText(value)
    .replace(/^[^\w]+/, "")
    .replace(/[^\w]+$/, "")
    .trim();
}

function isAuthPage(page) {
  const url = page.url();
  return url.includes("accounts.google.com") || url.includes("ServiceLogin");
}

function isUsefulHeading(text) {
  const value = cleanTopicText(text);
  if (!value) {
    return false;
  }

  const blocked = [
    "classwork",
    "upcoming",
    "view all",
    "google classroom",
    "stream",
    "people",
    "grades",
    "turn in",
    "your work",
    "assigned",
    "missing"
  ];

  return !blocked.some((term) => value.toLowerCase() === term);
}

async function pickKnownAccountIfShown(page, email) {
  const bodyText = normalizeText(await page.locator("body").innerText().catch(() => ""));
  if (!bodyText.toLowerCase().includes("choose an account")) {
    return;
  }

  const accountTile = page.getByText(email, { exact: false });
  if (await accountTile.count()) {
    await accountTile.first().click();
    await page.waitForTimeout(2000);
  }
}

async function readSecrets() {
  const raw = await fs.readFile(secretsPath, "utf8");
  return JSON.parse(raw);
}

async function loginIfNeeded(page, email, password) {
  await page.waitForLoadState("domcontentloaded");

  if (isAuthPage(page)) {
    await pickKnownAccountIfShown(page, email);

    const emailBox = page.locator('input[type="email"]');
    if (await emailBox.count()) {
      await emailBox.fill(email);
      await page.getByRole("button", { name: /^next$/i }).click();
      await page.waitForLoadState("domcontentloaded");
    }

    const challengeText = normalizeText(await page.locator("body").innerText().catch(() => ""));
    if (challengeText.toLowerCase().includes("type the text you hear or see")) {
      return { status: "challenge" };
    }

    const passwordBox = page.locator('input[type="password"]:visible');

    if (await passwordBox.count()) {
      await passwordBox.first().fill(password);
      await page.getByRole("button", { name: /^next$/i }).click();
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      return isAuthPage(page) ? { status: "challenge" } : { status: "logged_in" };
    }
  }

  return isAuthPage(page) ? { status: "auth_required" } : { status: "ready" };
}

async function extractClassroom(page, classroom) {
  await page.goto(classroom.url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});

  const pageTitle = await page.title();
  const authRequired = isAuthPage(page);

  if (authRequired) {
    return {
      key: classroom.key,
      name: classroom.name,
      url: classroom.url,
      pageTitle,
      authenticated: false,
      topics: [],
      topicSections: [],
      recentItems: [],
      extractionNotes: [
        "Google Classroom session is not available for this profile.",
        "Run the Classroom session refresh script and complete login once."
      ]
    };
  }

  const pageText = await page.locator("body").innerText().catch(() => "");
  const rawHeadingTexts = await page.evaluate(() =>
    Array.from(document.querySelectorAll("h2")).map((node) => String(node.textContent || ""))
  );

  const topicNames = rawHeadingTexts
    .map(normalizeTopicHeading)
    .filter((value, index, array) => value && array.indexOf(value) === index && isUsefulHeading(value));

  const lines = pageText
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean);

  const topicSet = new Set(topicNames);
  const typeLabels = new Set([
    "Assignment",
    "Completed Assignment",
    "Material",
    "Question",
    "Quiz assignment",
    "Quiz",
    "Test"
  ]);
  const stopLines = new Set([
    "Collapse topic",
    "more_vert",
    "More options",
    "Copy link",
    "View more"
  ]);

  const topicSections = [];

  for (let i = 0; i < lines.length; i += 1) {
    const currentLine = normalizeTopicHeading(lines[i]);
    if (!topicSet.has(currentLine)) {
      continue;
    }

    const items = [];
    let cursor = i + 1;
    while (cursor < lines.length) {
      const line = normalizeText(lines[cursor]);
      const normalizedLine = normalizeTopicHeading(line);

      if (cursor !== i + 1 && topicSet.has(normalizedLine)) {
        break;
      }

      if (stopLines.has(line) || line === currentLine) {
        cursor += 1;
        continue;
      }

      if (typeLabels.has(line)) {
        const title = normalizeText(lines[cursor + 1] || "");
        const metaParts = [];
        let lookahead = cursor + 2;

        while (lookahead < lines.length) {
          const metaLine = normalizeText(lines[lookahead]);
          const normalizedMeta = normalizeTopicHeading(metaLine);

          if (
            !metaLine ||
            typeLabels.has(metaLine) ||
            topicSet.has(normalizedMeta)
          ) {
            break;
          }

          if (!stopLines.has(metaLine) && metaLine !== "Help and Feedback") {
            metaParts.push(metaLine);
          }

          if (/^(Posted|Due|Edited|Assigned|No due date)/i.test(metaLine)) {
            lookahead += 1;
            break;
          }

          lookahead += 1;
        }

        if (
          title &&
          !stopLines.has(title) &&
          title.length > 3 &&
          title.toLowerCase() !== currentLine.toLowerCase()
        ) {
          items.push({
            title,
            meta: cleanTopicText(`${line}${metaParts.length ? ` | ${metaParts.join(" | ")}` : ""}`)
          });
        }

        cursor = lookahead;
        continue;
      }

      cursor += 1;
    }

    if (items.length) {
      topicSections.push({
        topic: currentLine,
        items: items.slice(0, 10)
      });
    }

    i = cursor - 1;
  }

  const recentItems = topicSections.flatMap((section) =>
    section.items.map((item) => `${section.topic}: ${item.title}${item.meta ? ` | ${item.meta}` : ""}`)
  ).slice(0, 12);

  return {
    key: classroom.key,
    name: classroom.name,
    url: classroom.url,
    pageTitle,
    authenticated: true,
    topics: topicSections.map((section) => cleanTopicText(section.topic)),
    topicSections: topicSections.map((section) => ({
      topic: cleanTopicText(section.topic),
      items: section.items.map((item) => ({
        title: cleanTopicText(item.title),
        meta: cleanTopicText(item.meta)
      }))
    })),
    recentItems,
    extractionNotes: recentItems.length ? [] : [
      "Classroom page loaded, but no recent classwork items matched the current extraction rules."
    ]
  };
}

async function main() {
  const secrets = await readSecrets().catch(() => ({}));
  const email = secrets?.googleClassroom?.email || "";
  const password = secrets?.googleClassroom?.password || "";
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.mkdir(profileDir, { recursive: true });
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    channel: "chrome"
  }).catch(() =>
    chromium.launchPersistentContext(profileDir, {
      headless: true
    })
  );
  const page = context.pages()[0] || await context.newPage();

  try {
    await page.goto("https://classroom.google.com", { waitUntil: "domcontentloaded" });
    const loginStatus = email && password
      ? await loginIfNeeded(page, email, password)
      : { status: "auth_required" };

    const results = [];
    for (const classroom of classrooms) {
      results.push(await extractClassroom(page, classroom));
    }

    const output = {
      generatedAt: new Date().toISOString(),
      account: email,
      loginStatus: loginStatus.status,
      profileDir,
      classrooms: results,
      notes: [
        "This file is generated locally by Playwright.",
        "The scheduled task now prefers a saved persistent Google Classroom session.",
        "If Google shows a challenge or sign-in page, refresh the local Classroom session once."
      ]
    };

    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");
    console.log(`Wrote ${outputPath}`);
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
