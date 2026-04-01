const OTTAWA = {
  name: "Ottawa, Ontario",
  latitude: 45.4215,
  longitude: -75.6972,
  timezone: "America/Toronto",
};

const WEATHER_CODES = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Strong thunderstorm with hail",
};

const currentTempEl = document.getElementById("current-temp");
const currentSummaryEl = document.getElementById("current-summary");
const feelsLikeEl = document.getElementById("feels-like");
const windSpeedEl = document.getElementById("wind-speed");
const todayRangeEl = document.getElementById("today-range");
const updatedAtEl = document.getElementById("updated-at");
const statusMessageEl = document.getElementById("status-message");
const dailyForecastEl = document.getElementById("daily-forecast");
const refreshButton = document.getElementById("refresh-button");

function weatherLabel(code) {
  return WEATHER_CODES[code] ?? "Conditions unavailable";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-CA", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDay(timestamp, index) {
  const date = new Date(timestamp);

  if (index === 0) {
    return "Today";
  }

  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatUpdated(timestamp) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function renderLoadingState() {
  statusMessageEl.textContent = "Loading live data...";
  dailyForecastEl.innerHTML = '<div class="loading-state">Fetching Ottawa forecast...</div>';
}

function renderErrorState(message) {
  statusMessageEl.textContent = "Weather data unavailable";
  dailyForecastEl.innerHTML = `<div class="error-state">${message}</div>`;
}

function renderCurrentWeather(data) {
  const current = data.current;
  const high = data.daily.temperature_2m_max[0];
  const low = data.daily.temperature_2m_min[0];

  currentTempEl.textContent = formatNumber(current.temperature_2m);
  currentSummaryEl.textContent = `${weatherLabel(current.weather_code)} in ${OTTAWA.name}`;
  feelsLikeEl.textContent = `${formatNumber(current.apparent_temperature)} deg C`;
  windSpeedEl.textContent = `${formatNumber(current.wind_speed_10m)} km/h`;
  todayRangeEl.textContent = `${formatNumber(low)} to ${formatNumber(high)} deg C`;
  updatedAtEl.textContent = formatUpdated(current.time);
}

function renderDailyForecast(data) {
  const entries = data.daily.time.map((time, index) => ({
    time,
    max: data.daily.temperature_2m_max[index],
    min: data.daily.temperature_2m_min[index],
    code: data.daily.weather_code[index],
    precipitation: data.daily.precipitation_probability_max[index],
  }));

  if (entries.length === 0) {
    renderErrorState("No daily forecast was returned for Ottawa.");
    return;
  }

  const temperatures = entries.flatMap((entry) => [entry.min, entry.max]);
  const minTemp = Math.min(...temperatures);
  const maxTemp = Math.max(...temperatures);
  const spread = Math.max(maxTemp - minTemp, 1);

  dailyForecastEl.innerHTML = entries
    .map((entry, index) => {
      const lowWidth = ((entry.min - minTemp) / spread) * 100;
      const highWidth = ((entry.max - minTemp) / spread) * 100;
      const barWidth = Math.max(highWidth - lowWidth, 12);
      const precipitationText = Number.isFinite(entry.precipitation)
        ? `${Math.round(entry.precipitation)}%`
        : "Unavailable";
      return `
        <article class="day-card">
          <span class="day-time">${formatDay(entry.time, index)}</span>
          <p class="day-condition">${weatherLabel(entry.code)}</p>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="margin-left: ${lowWidth}%; width: ${barWidth}%"></div>
          </div>
          <p class="day-range">${formatNumber(entry.min)} to ${formatNumber(entry.max)} deg C</p>
          <span class="day-precip">Precipitation risk: ${precipitationText}</span>
        </article>
      `;
    })
    .join("");

  statusMessageEl.textContent = "Showing the next 7 daily readings.";
}

async function loadWeather() {
  renderLoadingState();
  refreshButton.disabled = true;
  refreshButton.textContent = "Refreshing...";

  const params = new URLSearchParams({
    latitude: OTTAWA.latitude.toString(),
    longitude: OTTAWA.longitude.toString(),
    current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    forecast_days: "7",
    timezone: OTTAWA.timezone,
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }

    const data = await response.json();
    renderCurrentWeather(data);
    renderDailyForecast(data);
  } catch (error) {
    currentTempEl.textContent = "--";
    currentSummaryEl.textContent = "Unable to load current conditions.";
    feelsLikeEl.textContent = "-- deg C";
    windSpeedEl.textContent = "-- km/h";
    todayRangeEl.textContent = "--";
    updatedAtEl.textContent = "--";
    renderErrorState(`Could not fetch Ottawa weather right now. ${error.message}`);
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "Refresh data";
  }
}

refreshButton.addEventListener("click", loadWeather);
loadWeather();
