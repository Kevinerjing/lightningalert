import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RSS_SOURCES, WEATHER_CITIES } from "./wcc-sources.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "wcc", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "today.json");

const WEATHER_CODES = {
  0: "Clear skies",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Cloudy",
  45: "Foggy",
  48: "Foggy with frost",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Heavy rain showers",
  95: "Thunderstorms"
};

function decodeEntities(text) {
  return String(text || "")
    .replaceAll("<![CDATA[", "")
    .replaceAll("]]>", "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripHtml(text) {
  const decoded = decodeEntities(String(text || ""));
  return decodeEntities(decoded.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function normalizeWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function getFirstSentence(text) {
  const clean = normalizeWhitespace(text);
  if (!clean) return "";
  const match = clean.match(/(.+?[.!?])(\s|$)/);
  return match ? match[1].trim() : clean;
}

function shorten(text, maxWords = 28) {
  const words = normalizeWhitespace(text).split(" ").filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function parseRssItems(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  for (const block of blocks) {
    const title = readTag(block, "title");
    const description = readTag(block, "description") || readTag(block, "summary") || readTag(block, "content");
    const pubDate = readTag(block, "pubDate") || readTag(block, "updated") || readTag(block, "published");
    const link = readLink(block);

    if (!title || !link) continue;

    items.push({
      title: stripHtml(title),
      description: stripHtml(description),
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      url: link
    });
  }

  return items;
}

function readTag(block, tagName) {
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = block.match(regex);
  return match ? match[1] : "";
}

function readLink(block) {
  const direct = readTag(block, "link");
  if (direct && !direct.includes("<")) return stripHtml(direct);

  const hrefMatch = block.match(/<link[^>]+href="([^"]+)"/i);
  return hrefMatch ? hrefMatch[1] : "";
}

function dedupeStories(stories) {
  const seen = new Set();
  return stories.filter((story) => {
    const key = story.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferWhyItMatters(category, title, description) {
  const text = `${title} ${description}`.toLowerCase();

  if (category === "world") {
    if (text.includes("election") || text.includes("leader") || text.includes("government")) {
      return "Government decisions can affect laws, safety, education, and daily life for many people.";
    }
    if (text.includes("war") || text.includes("conflict") || text.includes("attack")) {
      return "World conflicts can affect safety, migration, prices, and international relationships.";
    }
    return "World news helps students understand big events that can affect people across countries.";
  }

  if (category === "climate") {
    if (text.includes("storm") || text.includes("flood") || text.includes("heat")) {
      return "Climate and environment stories connect science to real issues like safety, health, and extreme weather.";
    }
    return "Climate news shows how science connects to weather, energy, nature, and communities.";
  }

  if (category === "tech") {
    if (text.includes("ai") || text.includes("robot")) {
      return "Technology changes how students learn, communicate, and prepare for future jobs.";
    }
    return "Technology news matters because new tools can change school, work, and everyday life.";
  }

  return "This story matters because it helps students understand changes happening in the world.";
}

function inferKeyWord(category, title, description) {
  const text = `${title} ${description}`.toLowerCase();

  if (category === "world") {
    if (text.includes("summit")) return "summit: a meeting where leaders discuss important issues";
    if (text.includes("ceasefire")) return "ceasefire: an agreement to stop fighting for a period of time";
    return "global: connected to many countries around the world";
  }

  if (category === "climate") {
    if (text.includes("emissions")) return "emissions: gases released into the air";
    if (text.includes("renewable")) return "renewable energy: energy from sources that can be used again, like sun or wind";
    return "climate: the usual pattern of weather over a long period of time";
  }

  if (category === "tech") {
    if (text.includes("chip")) return "chip: a small electronic part that helps devices process information";
    if (text.includes("algorithm")) return "algorithm: a set of steps a computer follows to solve a problem";
    return "innovation: a new idea, method, or tool";
  }

  return "topic: an important idea in the story";
}

function rewriteForTeens(category, sourceName, item) {
  const baseText = item.description || item.title;
  const firstSentence = getFirstSentence(baseText) || item.title;

  return {
    title: item.title,
    whatHappened: shorten(firstSentence, 26),
    whyItMatters: inferWhyItMatters(category, item.title, baseText),
    keyWord: inferKeyWord(category, item.title, baseText),
    source: sourceName,
    url: item.url,
    publishedAt: item.publishedAt
  };
}

async function fetchWeather(city) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", city.latitude);
  url.searchParams.set("longitude", city.longitude);
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather fetch failed for ${city.city}`);
  }

  const data = await response.json();
  const code = Number(data?.current?.weather_code);
  return {
    city: city.city,
    temperatureC: Math.round(Number(data?.current?.temperature_2m) || 0),
    maxC: Math.round(Number(data?.daily?.temperature_2m_max?.[0]) || 0),
    minC: Math.round(Number(data?.daily?.temperature_2m_min?.[0]) || 0),
    summary: WEATHER_CODES[code] || "Weather update available"
  };
}

async function fetchCategory(category) {
  const sources = RSS_SOURCES[category] || [];
  const collected = [];

  for (const source of sources) {
    try {
      const response = await fetch(source.url, {
        headers: {
          "User-Agent": "WCC-Daily-Board/1.0"
        }
      });

      if (!response.ok) continue;
      const xml = await response.text();
      const items = parseRssItems(xml)
        .slice(0, 8)
        .map((item) => rewriteForTeens(category, source.source, item));

      collected.push(...items);
    } catch (error) {
      console.warn(`Could not load ${source.source}:`, error.message);
    }
  }

  return dedupeStories(collected)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 6);
}

async function generateBoard() {
  const [weather, world, climate, tech] = await Promise.all([
    Promise.all(WEATHER_CITIES.map(fetchWeather)),
    fetchCategory("world"),
    fetchCategory("climate"),
    fetchCategory("tech")
  ]);

  const board = {
    boardDate: new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    sourceCount:
      RSS_SOURCES.world.length +
      RSS_SOURCES.climate.length +
      RSS_SOURCES.tech.length,
    weather,
    world,
    climate,
    tech
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(board, null, 2)}\n`, "utf8");
  console.log(`Wrote daily board to ${OUTPUT_FILE}`);
}

generateBoard().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
