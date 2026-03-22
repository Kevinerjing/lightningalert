export const WEATHER_CITIES = [
  { city: "Ottawa", latitude: 45.4215, longitude: -75.6972 },
];

export const RSS_SOURCES = {
  extremeWeather: [
    { source: "BBC Science & Environment", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml" },
    { source: "The Guardian Environment", url: "https://www.theguardian.com/environment/rss" },
    { source: "UN Climate", url: "https://news.un.org/feed/subscribe/en/news/topic/climate-change/feed/rss.xml" }
  ],
  climate: [
    { source: "BBC Science & Environment", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml" },
    { source: "The Guardian Environment", url: "https://www.theguardian.com/environment/rss" },
    { source: "UN Climate", url: "https://news.un.org/feed/subscribe/en/news/topic/climate-change/feed/rss.xml" }
  ],
  weatherTech: [
    { source: "TechCrunch", url: "https://techcrunch.com/feed/" },
    { source: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
    { source: "BBC Science & Environment", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml" },
    { source: "The Guardian Environment", url: "https://www.theguardian.com/environment/rss" },
    { source: "UN Climate", url: "https://news.un.org/feed/subscribe/en/news/topic/climate-change/feed/rss.xml" }
  ],
  universityNews: [
    { source: "Carleton News", url: "https://carleton.ca/news/feed/" },
    { source: "Carleton Sustainability", url: "https://carleton.ca/sustainability/feed/" },
    { source: "Waterloo Environment", url: "https://uwaterloo.ca/environment/news/news.xml" },
    {
      source: "uOttawa News",
      url: "https://www.uottawa.ca/en/news-all",
      type: "html",
      baseUrl: "https://www.uottawa.ca",
      linkPattern: "/en/news-all/"
    },
    { source: "Harvard Gazette", url: "https://news.harvard.edu/gazette/feed/" },
    { source: "Berkeley News", url: "https://news.berkeley.edu/feed/" },
    { source: "UBC Climate News", url: "https://news.ubc.ca/category/climate-change/feed/" },
    { source: "UBC News", url: "https://news.ubc.ca/feed/" },
    { source: "MIT Climate & Sustainability", url: "https://news.mit.edu/rss/topic/climate-change-and-sustainability" },
    { source: "MIT Earth & Atmospheric Sciences", url: "https://news.mit.edu/rss/topic/earth-and-atmospheric-sciences" }
  ]
};
