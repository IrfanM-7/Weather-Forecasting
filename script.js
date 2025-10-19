// Open-Meteo API constants
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';

// DOM elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const weatherIcon = document.getElementById('weather-icon');
const temperature = document.getElementById('temperature');
const description = document.getElementById('description');
const locationLabel = document.querySelector('.location span');
const humidityValue = document.getElementById('humidity-value');
const windValue = document.getElementById('wind-value');
const errorBox = document.getElementById('error-box');
const weatherBox = document.querySelector('.weather-box');

// Add spinner
const spinner = document.createElement('div');
spinner.id = 'spinner';
spinner.style = 'display:none;text-align:center;margin-top:16px;';
spinner.innerHTML = `<span style="font-size:32px;">⏳</span>`;
weatherBox.parentNode.insertBefore(spinner, weatherBox);

// Weather description and image maps
const weatherDescriptions = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing rime fog', 51: 'Light drizzle',
    53: 'Moderate drizzle', 55: 'Dense drizzle', 61: 'Slight rain',
    63: 'Moderate rain', 65: 'Heavy rain', 71: 'Slight snow',
    73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Slight rain showers', 81: 'Moderate rain showers',
    82: 'Violent rain showers', 85: 'Slight snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
};
const weatherImages = {
    0: 'images/clear.png', 1: 'images/clear.png', 2: 'images/cloud.png',
    3: 'images/cloud.png', 45: 'images/mist.png', 48: 'images/mist.png',
    51: 'images/rain.png', 53: 'images/rain.png', 55: 'images/rain.png',
    61: 'images/rain.png', 63: 'images/rain.png', 65: 'images/rain.png',
    71: 'images/snow.png', 73: 'images/snow.png', 75: 'images/snow.png',
    77: 'images/snow.png', 80: 'images/rain.png', 81: 'images/rain.png',
    82: 'images/rain.png', 85: 'images/snow.png', 86: 'images/snow.png',
    95: 'images/rain.png', 96: 'images/rain.png', 99: 'images/rain.png'
};

// Show/hide loading spinner
function showSpinner() {
    spinner.style.display = 'block';
    weatherBox.style.display = 'none';
    errorBox.style.display = 'none';
}
function hideSpinner() {
    spinner.style.display = 'none';
}

// Get coordinates for a given city name
async function getCityCoordinates(cityName) {
    const url = `${GEOCODING_API}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.results || data.results.length === 0) throw new Error('City not found');
    const city = data.results[0];
    return { lat: city.latitude, lon: city.longitude, name: city.name, country: city.country_code || city.country || '' };
}

// Fetch current weather, then update display + call chart
async function getWeatherData(lat, lon, cityName = '', country = '') {
    const url = `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weathercode,windspeed_10m&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather data not available');
    const data = await response.json();
    displayWeatherData(data, cityName, country);
    plotTemperatureChart(lat, lon);
}

// Display weather in UI
function displayWeatherData(data, cityName, country) {
    hideSpinner();
    errorBox.style.display = 'none';
    weatherBox.style.display = 'block';
    const current = data.current;
    const code = current.weathercode;
    temperature.textContent = `${Math.round(current.temperature_2m)}°C`;
    description.textContent = weatherDescriptions[code] || `Code: ${code}`;
    locationLabel.textContent = cityName + (country ? ', ' + country : '');
    humidityValue.textContent = `${Math.round(current.relative_humidity_2m)}%`;
    windValue.textContent = `${Math.round(current.windspeed_10m)} km/h`;
    weatherIcon.src = weatherImages[code] || weatherImages[0];
    weatherIcon.alt = description.textContent;
    weatherIcon.onerror = function() { this.style.display = 'none'; };
    weatherIcon.onload = function() { this.style.display = 'block'; };
}

// Show error message
function showError() {
    hideSpinner();
    weatherBox.style.display = 'none';
    errorBox.style.display = 'block';
}

// MAIN: City search - fetch coordinates, then weather/chart
async function searchWeatherByCity(cityName) {
    try {
        showSpinner();
        const cityData = await getCityCoordinates(cityName);
        await getWeatherData(cityData.lat, cityData.lon, cityData.name, cityData.country);
    } catch (error) {
        hideSpinner();
        showError();
    }
}

// MAIN: Geolocation (browser location or fallback to Mumbai)
function getWeatherByLocation() {
    if (navigator.geolocation) {
        showSpinner();
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                await getWeatherData(position.coords.latitude, position.coords.longitude, 'Your Location', '');
            },
            () => {
                searchWeatherByCity('Mumbai');
            }
        );
    } else {
        searchWeatherByCity('Mumbai');
    }
}

// Plot 24h temp chart below weather info
async function plotTemperatureChart(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&forecast_days=1&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();
    const hours = data.hourly.time.map(t => t.slice(11,16));
    const temps = data.hourly.temperature_2m.map(v => Math.round(v));
    // Destroy previous chart instance if it exists
    if (window.myTempChart) {
        window.myTempChart.destroy();
    }
    window.myTempChart = new Chart(document.getElementById('tempChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: hours,
            datasets: [{
                label: 'Temperature (°C)',
                data: temps,
                backgroundColor: 'rgba(102,126,234,0.2)',
                borderColor: '#667eea',
                borderWidth: 2,
                pointRadius: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#aaa' } }
            }
        }
    });
}

// Event listeners for search
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        searchWeatherByCity(city);
        cityInput.value = '';
    }
});
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            searchWeatherByCity(city);
            cityInput.value = '';
        }
    }
});

// On load
window.addEventListener('load', getWeatherByLocation);

// -------------------------------
// DYNAMIC WEATHER FACTS FOR SIDE PANEL
// -------------------------------
const facts = [
  {
    date: "10-20",
    fact: "On October 20<sup>th</sup>, 1977, Mumbai saw extraordinary rainfall.<br><span style='font-size:15px; color:#16a085;'>Always check the forecast and carry an umbrella in monsoon!</span>",
    icon: "https://cdn-icons-png.flaticon.com/512/414/414927.png"
  },
  {
    date: "10-21",
    fact: "On October 21<sup>st</sup>, 2014, Hurricane Gonzalo hit the UK bringing strong winds and rain.",
    icon: "https://cdn-icons-png.flaticon.com/512/414/414974.png"
  },
  // Add more facts for more dates as you wish
];

function insertTodayFact() {
  const now = new Date();
  const mmdd = ("0" + (now.getMonth() + 1)).slice(-2) + "-" + ("0" + now.getDate()).slice(-2);

  let match = facts.find(f => f.date === mmdd);
  if (!match) {
    match = {
      fact: "Did you know? The highest temperature ever recorded was 56.7°C (134°F) in Death Valley, USA!",
      icon: "https://cdn-icons-png.flaticon.com/512/616/616494.png"
    };
  }
  const h2 = document.querySelector(".side-info h2");
  const p = document.querySelector(".side-info p");
  const img = document.querySelector(".side-info img");
  if(h2 && p && img) {
    h2.innerHTML = "🌈 Today in Weather History";
    p.innerHTML = match.fact;
    img.src = match.icon;
  }
}
window.addEventListener('DOMContentLoaded', insertTodayFact);

// -------------------------------
// THEME SWITCHER (Classic/Dark) for Modal
// -------------------------------
const themeSelect = document.querySelector('.settings-card select');
if (themeSelect) {
    // Restore dark mode on load, if needed
    if (localStorage.getItem('themeMode') === 'Dark') {
        document.body.classList.add('dark-theme');
        themeSelect.value = "Dark";
    }
    themeSelect.addEventListener('change', function () {
        if (this.value === "Dark") {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        localStorage.setItem('themeMode', this.value);
const tempUnitSelect = document.getElementById('temp-unit-select') || document.querySelector('.settings-card select#temp-unit-select');

// Raw temperature in °C (from API), keep updated on every fetch
let currentTemperatureCelsius = null;
// Raw chart temperatures (in °C) from API
let chartTempsCelsius = [];

// Helper functions
function cToF(c) {
  return Math.round(c * 9/5 + 32);
}
function fToC(f) {
  return Math.round((f - 32) * 5/9);
}

// Update displayed temperature based on selected unit
function updateDisplayedTemperature() {
  if (currentTemperatureCelsius === null) return;
  let displayTemp;
  if (tempUnitSelect.value === "F") {
    displayTemp = cToF(currentTemperatureCelsius) + "°F";
  } else {
    displayTemp = currentTemperatureCelsius + "°C";
  }
  temperature.textContent = displayTemp;
}

// Update temperature chart based on selected unit
function updateTemperatureChart() {
  if (!window.myTempChart || chartTempsCelsius.length === 0) return;
  let tempsToPlot;
  if (tempUnitSelect.value === "F") {
    tempsToPlot = chartTempsCelsius.map(cToF);
  } else {
    tempsToPlot = chartTempsCelsius.slice();
  }
  window.myTempChart.data.datasets[0].data = tempsToPlot;
  window.myTempChart.data.datasets[0].label = tempUnitSelect.value === "F" ? "Temperature (°F)" : "Temperature (°C)";
  window.myTempChart.update();
}

// Override your displayWeatherData to save raw temperature
function displayWeatherData(data, cityName, country) {
  hideSpinner();
  errorBox.style.display = 'none';
  weatherBox.style.display = 'block';
  const current = data.current;
  const code = current.weathercode;
  currentTemperatureCelsius = Math.round(current.temperature_2m);
  updateDisplayedTemperature();

  description.textContent = weatherDescriptions[code] || `Code: ${code}`;
  locationLabel.textContent = cityName + (country ? ', ' + country : '');
  humidityValue.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  windValue.textContent = `${Math.round(current.windspeed_10m)} km/h`;
  weatherIcon.src = weatherImages[code] || weatherImages[0];
  weatherIcon.alt = description.textContent;
  weatherIcon.onerror = function() { this.style.display = 'none'; };
  weatherIcon.onload = function() { this.style.display = 'block'; };
}

// Override plotTemperatureChart to save raw temps and handle updates
async function plotTemperatureChart(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&forecast_days=1&timezone=auto`;
  const response = await fetch(url);
  const data = await response.json();
  const hours = data.hourly.time.map(t => t.slice(11,16));
  chartTempsCelsius = data.hourly.temperature_2m.map(v => Math.round(v));

  // Destroy previous chart instance if exists
  if (window.myTempChart) {
    window.myTempChart.destroy();
  }

  // Determine unit and plot accordingly
  let tempsToPlot = chartTempsCelsius;
  let label = "Temperature (°C)";
  if (tempUnitSelect.value === "F") {
    tempsToPlot = chartTempsCelsius.map(cToF);
    label = "Temperature (°F)";
  }

  window.myTempChart = new Chart(document.getElementById('tempChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: hours,
      datasets: [{
        label: label,
        data: tempsToPlot,
        backgroundColor: 'rgba(102,126,234,0.2)',
        borderColor: '#667eea',
        borderWidth: 2,
        pointRadius: 2,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#aaa' } }
      }
    }
  });
}

// Listen for changes in temperature unit select
tempUnitSelect.addEventListener('change', () => {
  updateDisplayedTemperature();
  updateTemperatureChart();
});

    });
}
