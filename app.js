// --- DOM Elements ---
const cityInput = document.getElementById('city-input');
const locationBtn = document.getElementById('location-btn');
const refreshBtn = document.getElementById('refresh-btn');
const weatherContent = document.getElementById('weather-content');
const loadingText = document.getElementById('loading');
const errorText = document.getElementById('error');

// SPA Elements
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const historyView = document.getElementById('history-view');
const loginForm = document.getElementById('login-form');
const openHistoryBtn = document.getElementById('open-history-btn');
const closeHistoryBtn = document.getElementById('close-history-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const logoutBtn = document.getElementById('logout-btn');

let activeState = { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 };

// --- SPA & History Logic ---
function showView(view) {
    loginView.classList.add('hidden');
    dashboardView.classList.add('hidden');
    historyView.classList.add('hidden');
    view.classList.remove('hidden');
}

function initApp() {
    const user = localStorage.getItem('weatherUser');
    if (user) {
        document.getElementById('user-display-name').innerText = user;
        showView(dashboardView);
        
        // Load last searched city from history, else use default
        const history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
        if (history.length > 0) {
            searchCity(history[0]);
        } else {
            fetchWeather(); 
        }
    } else {
        showView(loginView);
    }
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username-input').value.trim();
    localStorage.setItem('weatherUser', username);
    initApp();
});

openHistoryBtn.addEventListener('click', () => {
    renderHistory();
    showView(historyView);
});

closeHistoryBtn.addEventListener('click', () => showView(dashboardView));

clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('weatherHistory');
    renderHistory();
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('weatherUser');
    showView(loginView);
});

function addToHistory(city) {
    if (!city) return;
    let history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    // Remove if already exists so it jumps to top
    history = history.filter(c => c.toLowerCase() !== city.toLowerCase());
    history.unshift(city);
    // Keep max 5 items
    if (history.length > 5) history.pop(); 
    localStorage.setItem('weatherHistory', JSON.stringify(history));
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    if (history.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 10px;">No recent searches.</p>';
        return;
    }

    history.forEach(city => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `<span>${city}</span> <i class="fa-solid fa-chevron-right" style="font-size: 12px; color: var(--text-muted);"></i>`;
        li.addEventListener('click', () => {
            showView(dashboardView);
            searchCity(city);
        });
        list.appendChild(li);
    });
}

// --- Original Weather Logic ---
function getWeatherMeta(code, isDay = 1) {
    const timeCode = isDay ? 'd' : 'n';
    const map = {
        0: { text: "Clear sky", icon: `01${timeCode}` },
        1: { text: "Mainly clear", icon: `02${timeCode}` },
        2: { text: "Partly cloudy", icon: `03${timeCode}` },
        3: { text: "Overcast", icon: `04${timeCode}` },
        45: { text: "Fog", icon: `50${timeCode}` },
        48: { text: "Depositing rime fog", icon: `50${timeCode}` },
        51: { text: "Light drizzle", icon: `09${timeCode}` },
        53: { text: "Moderate drizzle", icon: `09${timeCode}` },
        55: { text: "Dense drizzle", icon: `09${timeCode}` },
        61: { text: "Slight rain", icon: `10${timeCode}` },
        63: { text: "Moderate rain", icon: `10${timeCode}` },
        65: { text: "Heavy rain", icon: `10${timeCode}` },
        71: { text: "Slight snow", icon: `13${timeCode}` },
        73: { text: "Moderate snow", icon: `13${timeCode}` },
        75: { text: "Heavy snow", icon: `13${timeCode}` },
        77: { text: "Snow grains", icon: `13${timeCode}` },
        80: { text: "Slight rain showers", icon: `09${timeCode}` },
        81: { text: "Moderate rain showers", icon: `09${timeCode}` },
        82: { text: "Violent rain showers", icon: `09${timeCode}` },
        85: { text: "Slight snow showers", icon: `13${timeCode}` },
        86: { text: "Heavy snow showers", icon: `13${timeCode}` },
        95: { text: "Thunderstorm", icon: `11${timeCode}` },
        96: { text: "Thunderstorm with light hail", icon: `11${timeCode}` },
        99: { text: "Thunderstorm with heavy hail", icon: `11${timeCode}` }
    };
    return map[code] || { text: "Unknown", icon: `03${timeCode}` };
}

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

async function searchCity(city) {
    if (!city) return;
    setLoadingState(true);
    
    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`);
        const data = await res.json();
        
        if (!data.results || data.results.length === 0) throw new Error('City not found');
        
        activeState = {
            name: data.results[0].name,
            country: data.results[0].country,
            lat: data.results[0].latitude,
            lon: data.results[0].longitude
        };
        
        addToHistory(activeState.name); // Save to history
        fetchWeather();
    } catch (e) {
        setLoadingState(false, true);
    }
}

async function fetchWeather() {
    setLoadingState(true);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${activeState.lat}&longitude=${activeState.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        updateUI(data);
    } catch (e) {
        setLoadingState(false, true);
    }
}

function updateUI(data) {
    const current = data.current;
    const meta = getWeatherMeta(current.weather_code, current.is_day);
    
    document.getElementById('current-location').innerText = `${activeState.name}, ${activeState.country || ''}`;
    document.getElementById('current-time').innerText = formatTime(current.time);
    document.getElementById('current-condition').innerText = meta.text;
    document.getElementById('current-temp').innerText = `${Math.round(current.temperature_2m)}°`;
    document.getElementById('feels-like').innerText = `${Math.round(current.apparent_temperature)}°`;
    document.getElementById('humidity').innerText = `${current.relative_humidity_2m}%`;
    document.getElementById('wind-speed').innerText = current.wind_speed_10m;
    document.getElementById('pressure').innerText = Math.round(current.surface_pressure);
    document.getElementById('current-icon').src = `https://openweathermap.org/img/wn/${meta.icon}@4x.png`;
    
    const now = new Date();
    document.getElementById('last-updated').innerText = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const hourlyContainer = document.getElementById('hourly-forecast');
    hourlyContainer.innerHTML = '';
    
    const currentHourISO = current.time.substring(0, 14) + "00";
    let startIndex = data.hourly.time.findIndex(t => t.startsWith(currentHourISO));
    if(startIndex === -1) startIndex = 0;

    for (let i = startIndex; i < startIndex + 8; i++) {
        const timeLabel = i === startIndex ? 'Now' : formatTime(data.hourly.time[i]).replace(':00 ', ' ');
        const hMeta = getWeatherMeta(data.hourly.weather_code[i], data.hourly.is_day[i]);
        const precip = data.hourly.precipitation_probability[i];
        const temp = Math.round(data.hourly.temperature_2m[i]);

        hourlyContainer.innerHTML += `
            <div class="hourly-item">
                <span style="color: ${i === startIndex ? '#4facfe' : '#fff'}">${timeLabel}</span>
                <img src="https://openweathermap.org/img/wn/${hMeta.icon}.png" class="small-icon">
                <span>${temp}°</span>
                <span class="precip-chance"><i class="fa-solid fa-droplet"></i> ${precip}%</span>
            </div>
        `;
    }

    const dailyContainer = document.getElementById('daily-forecast');
    dailyContainer.innerHTML = '';
    
    for (let i = 0; i < 7; i++) {
        let dayLabel = "";
        if (i === 0) dayLabel = "Today";
        else if (i === 1) dayLabel = "Tomorrow";
        else {
            const dateObj = new Date(data.daily.time[i]);
            dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }

        const dMeta = getWeatherMeta(data.daily.weather_code[i], 1);
        const minTemp = Math.round(data.daily.temperature_2m_min[i]);
        const maxTemp = Math.round(data.daily.temperature_2m_max[i]);
        const precipDaily = data.daily.precipitation_probability_max[i];

        dailyContainer.innerHTML += `
            <div class="daily-item">
                <span class="daily-day">${dayLabel}</span>
                <div class="daily-icon-group">
                    <img src="https://openweathermap.org/img/wn/${dMeta.icon}.png" width="30">
                    <span class="precip-chance">${precipDaily}%</span>
                </div>
                <span>${minTemp}°</span>
                <div class="temp-bar"></div>
                <span>${maxTemp}°</span>
            </div>
        `;
    }

    setLoadingState(false, false);
}

function setLoadingState(isLoading, isError = false) {
    if (isLoading) {
        weatherContent.classList.add('hidden');
        errorText.classList.add('hidden');
        loadingText.classList.remove('hidden');
    } else {
        loadingText.classList.add('hidden');
        if (isError) {
            errorText.classList.remove('hidden');
        } else {
            weatherContent.classList.remove('hidden');
        }
    }
}

// --- Event Listeners ---
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchCity(cityInput.value.trim());
});

refreshBtn.addEventListener('click', fetchWeather);

locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        setLoadingState(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                activeState.lat = position.coords.latitude;
                activeState.lon = position.coords.longitude;
                const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${activeState.lat}&longitude=${activeState.lon}&localityLanguage=en`);
                const data = await res.json();
                activeState.name = data.city || data.locality || 'Current Location';
                activeState.country = data.countryName || '';
                addToHistory(activeState.name);
                fetchWeather();
            },
            () => { alert("Location access denied or unavailable."); setLoadingState(false, false); }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
});

setInterval(fetchWeather, 300000);

// Start the App
initApp();