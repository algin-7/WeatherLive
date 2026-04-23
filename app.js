const cityInput = document.getElementById('city-input');
const locationBtn = document.getElementById('location-btn');
const refreshBtn = document.getElementById('refresh-btn');
const weatherContent = document.getElementById('weather-content');
const loadingText = document.getElementById('loading');
const errorText = document.getElementById('error');

let activeState = { name: 'Nagercoil', country: 'India', lat: 8.1833, lon: 77.4119 }; // Defaults to Nagercoil

// WMO Weather code mapping to text and OpenWeather Icons (for that clean look)
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

// Format time
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Fetch coordinates via Geocoding API
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
        
        fetchWeather();
    } catch (e) {
        setLoadingState(false, true);
    }
}

// Fetch complete weather data
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
    
    // Update Main Card
    document.getElementById('current-location').innerText = `${activeState.name}, ${activeState.country}`;
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

    // Update Hourly (Next 8 hours)
    const hourlyContainer = document.getElementById('hourly-forecast');
    hourlyContainer.innerHTML = '';
    
    // Find current hour index
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

    // Update 7-Day Daily
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

// Event Listeners
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
                // Reverse geocode to get city name
                const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${activeState.lat}&longitude=${activeState.lon}&localityLanguage=en`);
                const data = await res.json();
                activeState.name = data.city || data.locality || 'Current Location';
                activeState.country = data.countryName || '';
                fetchWeather();
            },
            () => { alert("Location access denied or unavailable."); setLoadingState(false, false); }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
});

// Auto-update every 5 minutes (300,000 ms)
setInterval(fetchWeather, 300000);

// Initialize with Nagercoil on load
fetchWeather();