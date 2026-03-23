import { test, expect } from "playwright/test";

const WORKER_URL = "https://element-heroes-worker.jingkevin0408.workers.dev";

async function stubWorkerApi(page) {
  await page.route(`${WORKER_URL}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname.endsWith("/rooms")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ rooms: [] }),
      });
      return;
    }

    if (pathname.endsWith("/analytics-track")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    if (pathname.endsWith("/teacher-summary")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

async function collectPageErrors(page) {
  const messages = [];
  page.on("pageerror", (error) => {
    messages.push(`pageerror: ${error.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      messages.push(`console: ${msg.text()}`);
    }
  });
  return messages;
}

async function gotoHero(page) {
  await page.goto("/index.html");
  await expect(page.locator("#lobbyPanel")).toBeVisible();
}

async function startPractice(page) {
  await page.getByRole("button", { name: "Practice Mode vs Computer" }).click();
  await expect(page.locator("#gamePanel")).toBeVisible();
  await expect(page.locator("#playerRoleText")).toContainText("Computer");
  await expect(page.locator("#roomStateText")).toContainText("Your turn.");
}

async function patchHeroVfxCounter(page, key) {
  await page.evaluate((counterKey) => {
    window.__heroE2E = window.__heroE2E || {};
    window.__heroE2E[counterKey] = 0;
    const original = window.HeroVfx[counterKey];
    window.HeroVfx[counterKey] = async (...args) => {
      window.__heroE2E[counterKey] += 1;
      return original(...args);
    };
  }, key);
}

async function getHeroVfxCounter(page, key) {
  return page.evaluate((counterKey) => window.__heroE2E?.[counterKey] || 0, key);
}

async function scanHandCards(page) {
  const cards = page.locator("#p1Hand .card");
  const count = await cards.count();
  const result = [];

  for (let i = 0; i < count; i += 1) {
    const card = cards.nth(i);
    result.push({
      index: i,
      name: (await card.locator(".card-name").textContent())?.trim() || "",
      type: (await card.locator(".card-type").textContent())?.trim() || "",
      zoneIndex: await card.getAttribute("data-index"),
    });
  }

  return result;
}

async function findPlayableHandCard(page, allowedTypes = null) {
  const cards = await scanHandCards(page);

  for (const card of cards) {
    if (allowedTypes && !allowedTypes.includes(card.type)) {
      continue;
    }

    await page.locator(`#p1Hand .card[data-index="${card.zoneIndex}"]`).click({ force: true });
    const playButton = page.locator("#playCardBtn");
    const enabled = await playButton.isEnabled();
    if (enabled) {
      return card;
    }
  }

  return null;
}

async function waitForPlayerTurn(page) {
  await expect.poll(async () => {
    return (await page.locator("#roomStateText").textContent())?.trim() || "";
  }, {
    timeout: 15_000,
  }).toContain("Your turn.");
}

async function playSelectedCard(page) {
  const playButton = page.locator("#playCardBtn");
  await expect(playButton).toBeEnabled();
  await playButton.click({ force: true });
}

async function endTurn(page) {
  const endTurnButton = page.locator("#endTurnBtn");
  await expect(endTurnButton).toBeEnabled();
  await endTurnButton.click({ force: true });
}

async function dismissActionRejectedDialog(page) {
  const okButton = page.getByRole("button", { name: "OK" });
  if (await okButton.isVisible().catch(() => false)) {
    await okButton.click({ force: true });
  }
}

async function preparePlayableAttackOrReaction(page, maxRounds = 3) {
  for (let round = 0; round < maxRounds; round += 1) {
    await dismissActionRejectedDialog(page);

    const directCandidate = await findPlayableHandCard(page, ["ATTACK", "REACTION"]);
    if (directCandidate) {
      return directCandidate;
    }

    for (let setupCount = 0; setupCount < 2; setupCount += 1) {
      const setupCard = await findPlayableHandCard(page, ["ELEMENT", "COMPOUND"]);
      if (!setupCard) {
        break;
      }

      await playSelectedCard(page);
      await dismissActionRejectedDialog(page);

      const unlockedCandidate = await findPlayableHandCard(page, ["ATTACK", "REACTION"]);
      if (unlockedCandidate) {
        return unlockedCandidate;
      }
    }

    if (round < maxRounds - 1) {
      await endTurn(page);
      await waitForPlayerTurn(page);
    }
  }

  return null;
}

test.beforeEach(async ({ page }) => {
  await stubWorkerApi(page);
});

test("lobby boots cleanly with core controls", async ({ page }) => {
  const errors = await collectPageErrors(page);
  await gotoHero(page);

  await expect(page.getByText("Element Heroes Online")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Room" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Practice Mode vs Computer" })).toBeVisible();
  await expect(page.locator("#roomList")).toContainText("No open rooms");

  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});

test("practice mode renders the playable board state", async ({ page }) => {
  await gotoHero(page);
  await startPractice(page);

  await expect(page.locator("#enemyPlayerName")).toContainText("Computer");
  await expect(page.locator("#selfPlayerName")).toContainText("Practice Deck");
  await expect(page.locator("#p1Hand .card")).toHaveCount(5);
  await expect(page.locator("#floatingTurnUi")).toBeVisible();
  await expect(page.locator("#statusHint")).toContainText("Select a card");
});

test("playing a hand card triggers the curved travel animation and updates board state", async ({ page }) => {
  await gotoHero(page);
  await startPractice(page);
  await patchHeroVfxCounter(page, "animatePlayCard");

  const initialHandCount = await page.locator("#p1Hand .card").count();
  const initialFieldCount = await page.locator("#p1Field .card").count();
  const initialDiscardCount = Number((await page.locator("#p1DiscardCount").textContent()) || "0");
  const playableCard = await findPlayableHandCard(page);

  expect(playableCard).not.toBeNull();

  await playSelectedCard(page);

  await expect.poll(async () => page.locator("#p1Hand .card").count()).toBeLessThan(initialHandCount);
  await expect.poll(async () => {
    const fieldCount = await page.locator("#p1Field .card").count();
    const discardCount = Number((await page.locator("#p1DiscardCount").textContent()) || "0");
    return (fieldCount > initialFieldCount) || (discardCount > initialDiscardCount);
  }).toBeTruthy();
  await expect.poll(async () => getHeroVfxCounter(page, "animatePlayCard")).toBeGreaterThan(0);
});

test("playing an attack or reaction card triggers the forward push and recoil motion", async ({ page }) => {
  await gotoHero(page);
  await startPractice(page);
  await patchHeroVfxCounter(page, "animateAttack");

  const candidate = await preparePlayableAttackOrReaction(page);

  expect(candidate).not.toBeNull();

  await playSelectedCard(page);

  await expect.poll(async () => getHeroVfxCounter(page, "animateAttack")).toBeGreaterThan(0);
});
