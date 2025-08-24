// API Configuration
const API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your OpenWeatherMap API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEOCODING_API = 'http://api.openweathermap.org/geo/1.0/direct';
const AIR_POLLUTION_API = 'http://api.openweathermap.org/data/2.5/air_pollution';

// DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const cityName = document.getElementById('city-name');
const currentDate = document.getElementById('current-date');
const weatherIcon = document.getElementById('weather-icon');
const temperature = document.getElementById('temperature');
const weatherDescription = document.getElementById('weather-description');
const humidity = document.getElementById('humidity');
const wind = document.getElementById('wind');
const pressure = document.getElementById('pressure');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const feelsLike = document.getElementById('feels-like');
const hourlyForecast = document.getElementById('hourly-forecast');
const dailyForecast = document.getElementById('daily-forecast');
const airQualityIndex = document.getElementById('air-quality-index');
const pm25 = document.getElementById('pm25');
const pm10 = document.getElementById('pm10');
const o3 = document.getElementById('o3');
const no2 = document.getElementById('no2');
const weatherMap = document.getElementById('weather-map');
const enableLocationBtn = document.getElementById('enable-location');
const recentList = document.getElementById('recent-list');
const loadingOverlay = document.getElementById('loading');

// State
let currentLocation = null;
let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];

// Initialize the app
function init() {
    // Set current date
    updateCurrentDate();
    
    // Load recent searches
    updateRecentSearches();
    
    // Set up event listeners
    setupEventListeners();
    
    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                currentLocation = { lat: latitude, lon: longitude };
                getWeatherByCoords(latitude, longitude);
                updateWeatherMap(latitude, longitude);
            },
            error => {
                console.error('Error getting location:', error);
                // Default to London if location access is denied
                getWeatherData('London');
            }
        );
    } else {
        // Default to London if geolocation is not supported
        getWeatherData('London');
    }
}

// Set up event listeners
function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    enableLocationBtn.addEventListener('click', requestLocationAccess);
}

// Handle search
function handleSearch() {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherData(city);
        addToRecentSearches(city);
    }
}

// Get weather data by city name
async function getWeatherData(city) {
    try {
        showLoading(true);
        
        // Get coordinates for the city
        const geoResponse = await fetch(`${GEOCODING_API}?q=${city}&limit=1&appid=${API_KEY}`);
        const [location] = await geoResponse.json();
        
        if (!location) {
            throw new Error('City not found');
        }
        
        const { lat, lon, name, country } = location;
        currentLocation = { lat, lon };
        
        // Get current weather
        const weatherResponse = await fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
        const weatherData = await weatherResponse.json();
        
        // Get forecast
        const forecastResponse = await fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
        const forecastData = await forecastResponse.json();
        
        // Get air quality data
        const airQualityResponse = await fetch(`${AIR_POLLUTION_API}?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        const airQualityData = await airQualityResponse.json();
        
        // Update UI
        updateCurrentWeather(weatherData, name, country);
        updateHourlyForecast(forecastData);
        updateDailyForecast(forecastData);
        updateAirQuality(airQualityData);
        updateWeatherMap(lat, lon);
        
        // Update recent searches
        addToRecentSearches(name);
        
    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert('Error fetching weather data. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Get weather by coordinates
async function getWeatherByCoords(lat, lon) {
    try {
        showLoading(true);
        
        // Get current weather
        const weatherResponse = await fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
        const weatherData = await weatherResponse.json();
        
        // Get forecast
        const forecastResponse = await fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
        const forecastData = await forecastResponse.json();
        
        // Get air quality data
        const airQualityResponse = await fetch(`${AIR_POLLUTION_API}?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        const airQualityData = await airQualityResponse.json();
        
        // Update UI
        updateCurrentWeather(weatherData, weatherData.name, weatherData.sys.country);
        updateHourlyForecast(forecastData);
        updateDailyForecast(forecastData);
        updateAirQuality(airQualityData);
        updateWeatherMap(lat, lon);
        
    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert('Error fetching weather data. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Update current weather UI
function updateCurrentWeather(data, name, country) {
    cityName.textContent = `${name}, ${country}`;
    currentDate.textContent = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const iconCode = data.weather[0].icon;
    weatherIcon.className = `wi wi-owm-${data.weather[0].icon}`;
    temperature.textContent = `${Math.round(data.main.temp)}`;
    weatherDescription.textContent = data.weather[0].description;
    humidity.textContent = `${data.main.humidity}%`;
    wind.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
    pressure.textContent = `${data.main.pressure} hPa`;
    sunrise.textContent = formatTime(data.sys.sunrise, data.timezone);
    sunset.textContent = formatTime(data.sys.sunset, data.timezone);
    feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
}

// Update hourly forecast
function updateHourlyForecast(data) {
    hourlyForecast.innerHTML = '';
    const now = new Date();
    const currentHour = now.getHours();
    
    // Get next 24 hours of forecast (3-hour intervals for 8 periods)
    const hourlyData = data.list.filter((_, index) => index < 8);
    
    hourlyData.forEach(item => {
        const time = new Date(item.dt * 1000);
        const hour = time.getHours();
        const temp = Math.round(item.main.temp);
        const icon = item.weather[0].icon;
        
        const hourItem = document.createElement('div');
        hourItem.className = 'hourly-item';
        hourItem.innerHTML = `
            <div class="hourly-time">${formatHour(hour)}</div>
            <i class="wi wi-owm-${icon} hourly-icon"></i>
            <div class="hourly-temp">${temp}°</div>
        `;
        
        hourlyForecast.appendChild(hourItem);
    });
}

// Update daily forecast
function updateDailyForecast(data) {
    dailyForecast.innerHTML = '';
    
    // Group forecast by day
    const dailyData = {};
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        if (!dailyData[day]) {
            dailyData[day] = {
                temp_min: item.main.temp_min,
                temp_max: item.main.temp_max,
                icon: item.weather[0].icon,
                description: item.weather[0].description
            };
        } else {
            if (item.main.temp_min < dailyData[day].temp_min) {
                dailyData[day].temp_min = item.main.temp_min;
            }
            if (item.main.temp_max > dailyData[day].temp_max) {
                dailyData[day].temp_max = item.main.temp_max;
            }
        }
    });
    
    // Display next 5 days
    const days = Object.keys(dailyData).slice(0, 5);
    days.forEach(day => {
        const dayData = dailyData[day];
        const dayItem = document.createElement('div');
        dayItem.className = 'daily-item';
        dayItem.innerHTML = `
            <div class="daily-day">${day}</div>
            <i class="wi wi-owm-${dayData.icon} daily-icon"></i>
            <div class="daily-description">${dayData.description}</div>
            <div class="daily-temp">
                <span class="temp-max">${Math.round(dayData.temp_max)}°</span>
                <span class="temp-min">${Math.round(dayData.temp_min)}°</span>
            </div>
        `;
        dailyForecast.appendChild(dayItem);
    });
}

// Update air quality
function updateAirQuality(data) {
    const aqi = data.list[0].main.aqi;
    const components = data.list[0].components;
    
    // Set AQI value and color
    airQualityIndex.textContent = aqi;
    airQualityIndex.style.color = getAqiColor(aqi);
    
    // Set pollutant values
    pm25.textContent = `${components.pm2_5} µg/m³`;
    pm10.textContent = `${components.pm10} µg/m³`;
    o3.textContent = `${components.o3} µg/m³`;
    no2.textContent = `${components.no2} µg/m³`;
}

// Update weather map
function updateWeatherMap(lat, lon) {
    const zoom = 8;
    weatherMap.src = `https://maps.openweathermap.org/maps/2.0/weather/TA2/${zoom}/${lat}/${lon}?appid=${API_KEY}&opacity=0.9&fill_bound=true&palette=-65:821cca;-55:9c8cfc;-42:769cff;-28:76cff0;-10:89e3ce;10:95f0a3;32:f6ff8e;43:ffc140;54:ff6b6b;66:d837f5;70:8b2fcc`;
    weatherMap.style.display = 'block';
    document.querySelector('.map-overlay').style.display = 'none';
}

// Request location access
function requestLocationAccess() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                currentLocation = { lat: latitude, lon: longitude };
                getWeatherByCoords(latitude, longitude);
                updateWeatherMap(latitude, longitude);
            },
            error => {
                console.error('Error getting location:', error);
                alert('Unable to access your location. Please enable location access in your browser settings.');
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }
}

// Add to recent searches
function addToRecentSearches(city) {
    // Remove if already exists
    recentSearches = recentSearches.filter(item => item.toLowerCase() !== city.toLowerCase());
    
    // Add to beginning of array
    recentSearches.unshift(city);
    
    // Keep only last 5 searches
    if (recentSearches.length > 5) {
        recentSearches = recentSearches.slice(0, 5);
    }
    
    // Save to localStorage
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    
    // Update UI
    updateRecentSearches();
}

// Update recent searches UI
function updateRecentSearches() {
    recentList.innerHTML = '';
    recentSearches.forEach(city => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.textContent = city;
        item.addEventListener('click', () => {
            cityInput.value = city;
            getWeatherData(city);
        });
        recentList.appendChild(item);
    });
}

// Helper functions
function formatTime(timestamp, timezone) {
    const date = new Date((timestamp + timezone) * 1000);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'UTC'
    });
}

function formatHour(hour) {
    return new Date().setHours(hour, 0, 0, 0).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        hour12: true 
    });
}

function getAqiColor(aqi) {
    const colors = {
        1: '#00e400', // Good
        2: '#ffff00', // Fair
        3: '#ff7e00', // Moderate
        4: '#ff0000', // Poor
        5: '#8f3f97'  // Very Poor
    };
    return colors[aqi] || '#666';
}

function updateCurrentDate() {
    const now = new Date();
    currentDate.textContent = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Run the app
init();
