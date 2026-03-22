export const WEATHER_CITIES = [
  { city: "Toronto", latitude: 43.6532, longitude: -79.3832 },
  { city: "London", latitude: 51.5072, longitude: -0.1276 },
  { city: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
];

export const RSS_SOURCES = {
  world: [
    { source: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { source: "UN News", url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml" }
  ],
  climate: [
    { source: "BBC Science & Environment", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml" },
    { source: "The Guardian Environment", url: "https://www.theguardian.com/environment/rss" },
    { source: "UN Climate", url: "https://news.un.org/feed/subscribe/en/news/topic/climate-change/feed/rss.xml" }
  ],
  tech: [
    { source: "TechCrunch", url: "https://techcrunch.com/feed/" },
    { source: "The Verge", url: "https://www.theverge.com/rss/index.xml" }
  ]
};
