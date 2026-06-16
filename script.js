// ============================================
// Weather Dashboard - JavaScript
// Real-time Weather Application using Fetch API
// ============================================

// ============================================
// Configuration
// ============================================

// IMPORTANT: Get a free API key from https://openweathermap.org/api
// Sign up for a free account and create an API key
const API_KEY = 'ad8fe0ba6e6d16e58aac299883a3c8cb'; // Replace with your actual API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// ============================================
// DOM Elements
// ============================================

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const weatherContent = document.getElementById('weatherContent');
const welcomeMessage = document.getElementById('welcomeMessage');
const suggestionsDiv = document.getElementById('suggestions');

// Current weather elements
const cityName = document.getElementById('cityName');
const countryCode = document.getElementById('countryCode');
const temperature = document.getElementById('temperature');
const weatherIcon = document.getElementById('weatherIcon');
const weatherDescription = document.getElementById('weatherDescription');
const feelsLike = document.getElementById('feelsLike');

// Weather details elements
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const feelsLikeValue = document.getElementById('feelsLikeValue');
const windGust = document.getElementById('windGust');
const visibility = document.getElementById('visibility');
const pressure = document.getElementById('pressure');

// Additional info elements
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const cloudiness = document.getElementById('cloudiness');
const uvIndex = document.getElementById('uvIndex');
const lastUpdated = document.getElementById('lastUpdated');

// ============================================
// Event Listeners
// ============================================

searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

searchInput.addEventListener('input', handleSearchInput);

// ============================================
// Main Functions
// ============================================

/**
 * Handles the search button click and Enter key press
 * Validates input and calls the weather fetch function
 */
async function handleSearch() {
    const city = searchInput.value.trim();

    if (!city) {
        showError('Please enter a city name');
        return;
    }

    if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
        showError('⚠️ API Key not configured. Please add your OpenWeatherMap API key in script.js (line 9)');
        return;
    }

    await fetchWeatherByCityName(city);
    suggestionsDiv.innerHTML = '';
}

/**
 * Handles search input for showing suggestions
 * Implements debouncing for better performance
 */
let debounceTimeout;
async function handleSearchInput(e) {
    const input = e.target.value.trim();

    clearTimeout(debounceTimeout);

    if (input.length < 2) {
        suggestionsDiv.innerHTML = '';
        return;
    }

    debounceTimeout = setTimeout(async () => {
        try {
            const suggestions = await fetchCitySuggestions(input);
            displaySuggestions(suggestions);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            suggestionsDiv.innerHTML = '';
        }
    }, 300);
}

/**
 * Fetches city suggestions from API
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of suggested cities
 */
async function fetchCitySuggestions(query) {
    try {
        const response = await fetch(
            `${BASE_URL}/find?q=${encodeURIComponent(query)}&type=like&sort=population&cnt=5&appid=${API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.list || [];
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        return [];
    }
}

/**
 * Displays city suggestions in dropdown
 * @param {Array} suggestions - Array of city suggestions
 */
function displaySuggestions(suggestions) {
    suggestionsDiv.innerHTML = '';

    if (suggestions.length === 0) {
        return;
    }

    suggestions.forEach((city) => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = `${city.name}, ${city.sys.country}`;
        suggestionItem.onclick = () => {
            searchInput.value = city.name;
            suggestionsDiv.innerHTML = '';
            handleSearch();
        };
        suggestionsDiv.appendChild(suggestionItem);
    });
}

/**
 * Fetches weather data by city name using async/await
 * Demonstrates modern async/await pattern for API calls
 * @param {string} city - City name to fetch weather for
 */
async function fetchWeatherByCityName(city) {
    try {
        // Show loading state
        showLoading(true);
        hideError();

        // Construct the API endpoint with query parameters
        // Using geolocation endpoint first to get coordinates, then weather
        const geoUrl = `${BASE_URL}/find?q=${encodeURIComponent(city)}&type=like&sort=population&cnt=1&appid=${API_KEY}`;

        // FETCH REQUEST 1: Get city coordinates
        console.log(`Fetching geolocation data for: ${city}`);
        const geoResponse = await fetch(geoUrl);

        // ERROR HANDLING: Check if response is OK
        if (!geoResponse.ok) {
            throw new Error(`Geolocation API error: ${geoResponse.status}`);
        }

        // PARSING JSON: Parse nested JSON response
        const geoData = await geoResponse.json();

        // Validate response has city data
        if (!geoData.list || geoData.list.length === 0) {
            throw new Error(`City "${city}" not found. Please check the spelling and try again.`);
        }

        // Extract nested coordinates and city info from complex JSON structure
        const cityData = geoData.list[0];
        const { lat, lon } = cityData.coord;
        const { name, sys } = cityData;

        console.log(`Found city: ${name}, ${sys.country} at coordinates (${lat}, ${lon})`);

        // FETCH REQUEST 2: Get complete weather data using coordinates
        const weatherUrl = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
        console.log('Fetching weather data...');
        const weatherResponse = await fetch(weatherUrl);

        // ERROR HANDLING: Check response status
        if (!weatherResponse.ok) {
            throw new Error(`Weather API error: ${weatherResponse.status}`);
        }

        // PARSING JSON: Parse the weather response
        const weatherData = await weatherResponse.json();

        // OPTIONAL: Fetch UV Index (requires separate API call)
        const uvUrl = `${BASE_URL}/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
        const uvResponse = await fetch(uvUrl);
        let uvData = null;

        if (uvResponse.ok) {
            uvData = await uvResponse.json();
        }

        // Combine all data and render
        displayWeatherData(weatherData, uvData);

        // Update last fetched time
        updateLastFetchTime();

    } catch (error) {
        // COMPREHENSIVE ERROR HANDLING
        handleFetchError(error);
    } finally {
        // Always hide loading indicator
        showLoading(false);
    }
}

/**
 * Displays parsed weather data on the dashboard
 * Handles rendering of complex nested JSON structures
 * @param {Object} weatherData - Weather data from API
 * @param {Object} uvData - UV Index data from API
 */
function displayWeatherData(weatherData, uvData) {
    try {
        // Extract nested data from complex JSON structure
        const {
            name,
            sys: { country, sunrise: sunriseTime, sunset: sunsetTime },
            main: { temp, feels_like, humidity: humidityValue, pressure: pressureValue },
            wind: { speed, gust },
            clouds: { all: cloudPercentage },
            visibility: visibilityValue,
            weather: weatherArray,
            dt
        } = weatherData;

        // Extract weather description from nested array
        const { main: weatherMain, description, icon } = weatherArray[0];

        // Update DOM with extracted data
        cityName.textContent = name;
        countryCode.textContent = `${country}`;
        temperature.textContent = Math.round(temp);
        weatherDescription.textContent = description;
        feelsLike.textContent = `Feels like ${Math.round(feels_like)}°C`;
        feelsLikeValue.textContent = `${Math.round(feels_like)}°C`;

        // Update weather details
        humidity.textContent = `${humidityValue}%`;
        windSpeed.textContent = `${speed.toFixed(1)} m/s`;
        windGust.textContent = gust ? `${gust.toFixed(1)} m/s` : 'N/A';
        visibility.textContent = `${(visibilityValue / 1000).toFixed(1)} km`;
        pressure.textContent = `${pressureValue} hPa`;

        // Update additional info
        cloudiness.textContent = cloudPercentage;

        // Convert timestamps to readable format
        sunrise.textContent = formatTime(sunriseTime);
        sunset.textContent = formatTime(sunsetTime);

        // Set weather icon (OpenWeatherMap provides icon IDs)
        const iconUrl = `https://openweathermap.org/img/wn/${icon}@4x.png`;
        weatherIcon.src = iconUrl;
        weatherIcon.alt = description;

        // Display UV Index if available
        if (uvData && uvData.value !== undefined) {
            uvIndex.textContent = `${uvData.value.toFixed(1)} - ${getUVIndexCategory(uvData.value)}`;
        } else {
            uvIndex.textContent = 'N/A';
        }

        // Show weather content and hide welcome message
        weatherContent.classList.remove('hidden');
        welcomeMessage.classList.add('hidden');

        console.log('Weather data successfully rendered');

    } catch (error) {
        console.error('Error displaying weather data:', error);
        showError('Error processing weather data. Please try again.');
    }
}

/**
 * Handles different types of fetch errors
 * Provides user-friendly error messages
 * @param {Error} error - The error object
 */
function handleFetchError(error) {
    console.error('Fetch Error:', error);

    let errorMessage_text = 'An error occurred while fetching weather data.';

    // Categorize errors for better UX
    if (error.message.includes('not found')) {
        errorMessage_text = error.message;
    } else if (error.message.includes('HTTP error')) {
        if (error.message.includes('401')) {
            errorMessage_text = '❌ Invalid API Key. Please check your OpenWeatherMap API key.';
        } else if (error.message.includes('429')) {
            errorMessage_text = '⚠️ Too many requests. Please wait a moment before trying again.';
        } else if (error.message.includes('503')) {
            errorMessage_text = '🔧 Weather service is temporarily unavailable. Please try again later.';
        } else {
            errorMessage_text = `Server error: ${error.message}`;
        }
    } else if (error instanceof TypeError) {
        errorMessage_text = '🌐 Network error. Please check your internet connection.';
    } else {
        errorMessage_text = error.message || errorMessage_text;
    }

    showError(errorMessage_text);
    weatherContent.classList.add('hidden');
    welcomeMessage.classList.remove('hidden');
}

// ============================================
// Utility Functions
// ============================================

/**
 * Converts Unix timestamp to readable time format
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Formatted time string
 */
function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Categorizes UV Index into health risk levels
 * @param {number} uvIndex - UV Index value
 * @returns {string} Risk category
 */
function getUVIndexCategory(uvIndex) {
    if (uvIndex < 3) return 'Low';
    if (uvIndex < 6) return 'Moderate';
    if (uvIndex < 8) return 'High';
    if (uvIndex < 11) return 'Very High';
    return 'Extreme';
}

/**
 * Displays loading indicator
 * @param {boolean} show - Whether to show or hide loading
 */
function showLoading(show) {
    if (show) {
        loadingIndicator.classList.remove('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
    }
}

/**
 * Displays error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

/**
 * Hides error message
 */
function hideError() {
    errorMessage.classList.add('hidden');
}

/**
 * Updates last updated timestamp
 * Demonstrates current time handling
 */
function updateLastFetchTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    const dateString = now.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    lastUpdated.textContent = `Last updated: ${dateString} at ${timeString}`;
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize the application
 * Set up any initial state or event listeners if needed
 */
function initializeApp() {
    console.log('Weather Dashboard initialized');

    if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
        showError('⚠️ Setup Required: Please add your OpenWeatherMap API key in script.js to use this dashboard. Get a free key at https://openweathermap.org/api');
        weatherContent.classList.add('hidden');
        welcomeMessage.classList.remove('hidden');
    }
}

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// ============================================
// Example Usage & Documentation
// ============================================

/*
 * HOW TO GET AN API KEY:
 * 1. Visit: https://openweathermap.org/api
 * 2. Click "Sign Up" and create a free account
 * 3. Go to "API keys" section in your profile
 * 4. Copy your default API key
 * 5. Paste it in line 9 of this file: const API_KEY = 'YOUR_API_KEY_HERE'
 *
 * KEY FEATURES DEMONSTRATED:
 * ✅ Fetch API with async/await syntax
 * ✅ Comprehensive error handling with try/catch blocks
 * ✅ Parsing complex nested JSON structures
 * ✅ Multiple API calls with error checking
 * ✅ User-friendly error messages
 * ✅ Loading states for better UX
 * ✅ Search functionality with suggestions
 * ✅ Real-time data rendering
 */
