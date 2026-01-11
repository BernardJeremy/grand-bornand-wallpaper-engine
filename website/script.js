let weatherCodesData = null;
let panoramasCache = null;

const PANORAMAS = {
    village: {
        name: 'Village',
        latitude: 45.9385,
        longitude: 6.4203
    },
    station: {
        name: 'Station',
        latitude: 45.972,
        longitude: 6.4594
    },
    maroly: {
        name: 'Maroly',
        latitude: 45.9630,
        longitude: 6.4876
    },
    lachat: {
        name: 'Lachat',
        latitude: 45.959,
        longitude: 6.4765
    }
};

const LOOKBACK_HOURS = 48;
const PAN_DURATION = 180; // seconds for full right-to-left traversal
const RELOAD_INTERVAL = 5 * 60 * 1000; // 5 minutes

let currentPanorama = 'village'; // Default to Village
let speedMultiplier = 0.5; // Default speed (labeled as x1 in UI)
let currentAnimation = null;
let panoramaUrl = null;
let lastUpdate = null;
let currentPosition = 0; // Track current panning position

// Round time to nearest 10-minute slot
function roundToTenMinutes(date) {
    const minutes = Math.floor(date.getMinutes() / 10) * 10;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 
                  date.getHours(), minutes, 0, 0);
}

// Round time to Station panorama schedule (XX:01 and XX:31)
function roundToStationTime(date) {
    const minutes = date.getMinutes();
    let roundedMinutes;
    
    if (minutes < 16) {
        roundedMinutes = 1;
    } else if (minutes < 46) {
        roundedMinutes = 31;
    } else {
        // Go to next hour at XX:01
        const nextHour = new Date(date.getTime() + 60 * 60 * 1000);
        return new Date(nextHour.getFullYear(), nextHour.getMonth(), nextHour.getDate(), 
                      nextHour.getHours(), 1, 0, 0);
    }
    
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 
                  date.getHours(), roundedMinutes, 0, 0);
}

// Format date for URL path
function formatDateForUrl(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day}/${hours}-${minutes}`;
}

// Format date for display
function formatDateForDisplay(date) {
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Load panoramas cache from JSON file
async function loadPanoramasCache() {
    try {
        const response = await fetch('panoramas_cache.json');
        if (!response.ok) {
            throw new Error('panoramas_cache.json file not found');
        }
        panoramasCache = await response.json();
        console.log('Loaded panoramas cache:', panoramasCache);
    } catch (error) {
        console.error('Error loading panoramas cache:', error);
        throw error;
    }
}

// Find latest available panorama from cache
async function findLatestPanorama() {
    // Always reload cache to get latest panorama URLs
    await loadPanoramasCache();
    
    const imageUrl = panoramasCache[currentPanorama];
    
    if (!imageUrl || imageUrl === null) {
        throw new Error(`No panorama URL found for ${PANORAMAS[currentPanorama].name} in cache. Please run fetch_panoramas.sh script.`);
    }
    
    console.log(`Using cached panorama URL: ${imageUrl}`);
    
    // Extract timestamp from URL if possible (format: YYYY/MM/DD/HH-MM or YYYY/MM/DD/large/HH-MM)
    const timestampMatch = imageUrl.match(/(\d{4})\/(\d{2})\/(\d{2})\/(?:large\/)?(\d{2})-(\d{2})/);
    if (timestampMatch) {
        const [, year, month, day, hour, minute] = timestampMatch;
        lastUpdate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), 0, 0);
        console.log(`Extracted timestamp from URL: ${year}-${month}-${day} ${hour}:${minute}`);
        console.log(`Created Date object: ${lastUpdate}`);
    } else {
        console.warn('Could not extract timestamp from URL, using current time');
        lastUpdate = new Date(); // Fallback to current time if timestamp not found
    }
    
    updateDateTime();
    return imageUrl;
}

// Start panning animation
function startPanning(preservePosition = false) {
    const panorama = document.getElementById('panorama');
    const panoramaImg1 = document.getElementById('panorama-img1');
    const panoramaImg2 = document.getElementById('panorama-img2');
    const container = document.getElementById('panorama-container');

    // Function to initialize panning
    const initPanning = () => {
        document.getElementById('loader').style.display = 'none';
        
        // Calculate dimensions
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const imageAspect = panoramaImg1.naturalWidth / panoramaImg1.naturalHeight;

        // Scale image to fill height and calculate width
        const imageWidth = containerHeight * imageAspect;
        const maxOffset = imageWidth; // Pan one full image width before wrapping
        const containerVisibleWidth = imageWidth - containerWidth; // Right-most position

        if (imageWidth <= containerWidth) {
            console.warn('Panorama is not wider than screen');
            return;
        }

        // Start from preserved position or right side
        if (preservePosition && currentPosition > 0) {
            panorama.style.transform = `translateX(-${currentPosition}px)`;
        } else {
            panorama.style.transform = `translateX(-${containerVisibleWidth + maxOffset}px)`;
            currentPosition = containerVisibleWidth + maxOffset;
        }

        // Animate panning
        setTimeout(() => {
            animatePanning(maxOffset, containerVisibleWidth, preservePosition ? currentPosition : (containerVisibleWidth + maxOffset));
        }, 100);
    };

    // Wait for image to load if not loaded yet
    if (panoramaImg1.complete && panoramaImg1.naturalWidth > 0) {
        initPanning();
    } else {
        panoramaImg1.onload = initPanning;
    }
}

// Animate smooth panning
function animatePanning(maxOffset, startOffset = 0, initialPosition = null) {
    const panorama = document.getElementById('panorama');
    let position = initialPosition !== null ? initialPosition : (maxOffset + startOffset); // Use provided position or start at right end
    const duration = PAN_DURATION * 1000; // Convert to milliseconds
    const baseStep = (maxOffset / duration) * 16; // Base step per frame (60fps)

    function animate() {
        // Skip movement if speed is 0
        if (speedMultiplier > 0) {
            const step = baseStep * speedMultiplier;
            position -= step; // Move left

            // Seamlessly wrap around when reaching the left edge
            // Reset position when we've panned one full image width
            if (position <= startOffset) {
                position = maxOffset + startOffset;
            }

            panorama.style.transform = `translateX(-${position}px)`;
            panorama.style.transition = 'none';
        }

        // Save current position for reload
        currentPosition = position;

        currentAnimation = requestAnimationFrame(animate);
    }

    currentAnimation = requestAnimationFrame(animate);
}

// Change panorama
function changePanorama() {
    const selector = document.getElementById('panoramaSelector');
    currentPanorama = selector.value;
    
    // Stop current animation
    if (currentAnimation) {
        cancelAnimationFrame(currentAnimation);
    }
    
    // Reload with new panorama
    loadPanorama();
}

// Change panning speed
function changeSpeed() {
    const selector = document.getElementById('speedSelector');
    speedMultiplier = parseFloat(selector.value);
    
    // No need to restart animation, it will pick up the new speed on next frame
}

// Load panorama
async function loadPanorama() {
    try {
        document.getElementById('loader').style.display = 'block';
        hideError();
        
        panoramaUrl = await findLatestPanorama();
        const panoramaImg1 = document.getElementById('panorama-img1');
        const panoramaImg2 = document.getElementById('panorama-img2');
        panoramaImg1.src = panoramaUrl;
        panoramaImg2.src = panoramaUrl;
        
        startPanning();
        
        // Fetch weather when panorama is loaded
        fetchWeather();
    } catch (error) {
        console.error('Error loading panorama:', error);
        document.getElementById('loader').style.display = 'none';
        showError(error.message || 'Failed to load panorama');
    }
}

// Show error message
function showError(message) {
    const errorEl = document.getElementById('error-message');
    errorEl.textContent = message;
    errorEl.classList.add('visible');
}

// Hide error message
function hideError() {
    const errorEl = document.getElementById('error-message');
    errorEl.classList.remove('visible');
}

// Reload panorama periodically
function scheduleReload() {
    setInterval(async () => {
        console.log('Checking for new panorama...');
        const newUrl = await findLatestPanorama();
        
        if (newUrl !== panoramaUrl) {
            console.log('New panorama found, reloading...');
            panoramaUrl = newUrl;
            
            if (currentAnimation) {
                cancelAnimationFrame(currentAnimation);
            }
            
            const panoramaImg1 = document.getElementById('panorama-img1');
            const panoramaImg2 = document.getElementById('panorama-img2');
            panoramaImg1.src = panoramaUrl;
            panoramaImg2.src = panoramaUrl;
            startPanning(true); // Preserve position on auto-reload
            
            // Fetch weather when new panorama is loaded
            fetchWeather();
        }
    }, RELOAD_INTERVAL);
}

// Load weather codes data
async function loadWeatherCodes() {
    try {
        const response = await fetch('weather_codes_data.json');
        weatherCodesData = await response.json();
    } catch (error) {
        console.error('Error loading weather codes:', error);
    }
}

// Get weather icon URL based on weather code
function getWeatherIcon(weatherCode, isDay) {
    if (!weatherCodesData) return null;
    
    const codeStr = String(weatherCode);
    const timeOfDay = isDay ? 'day' : 'night';
    
    if (weatherCodesData[codeStr] && weatherCodesData[codeStr][timeOfDay]) {
        return weatherCodesData[codeStr][timeOfDay].image;
    }
    
    return null;
}

// Fetch current weather from Open-Meteo API
async function fetchWeather() {
    try {
        const panorama = PANORAMAS[currentPanorama];
        const latitude = panorama.latitude;
        const longitude = panorama.longitude;
        
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.current) {
            const temperature = Math.round(data.current.temperature_2m);
            const weatherCode = data.current.weather_code;
            const isDay = data.current.is_day === 1;
            const elevation = data.elevation ? Math.round(data.elevation) : null;
            
            updateWeatherDisplay(temperature, weatherCode, isDay, elevation);
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
    }
}

// Update weather display
function updateWeatherDisplay(temperature, weatherCode, isDay, elevation) {
    const weatherIcon = document.getElementById('weather-icon');
    const weatherTemp = document.getElementById('weather-temp');
    
    const iconUrl = getWeatherIcon(weatherCode, isDay);
    if (iconUrl) {
        weatherIcon.src = iconUrl;
        weatherIcon.classList.add('loaded');
    }
    
    let tempText = `${temperature}°C`;
    if (elevation !== null) {
        tempText += ` (LIVE - ${elevation}m)`;
    } else {
        tempText += ' (LIVE)';
    }
    weatherTemp.textContent = tempText;
}

// Update date/time display
function updateDateTime() {
    const panoramaTime = document.getElementById('panorama-time');
    if (lastUpdate) {
        const dateTimeStr = lastUpdate.toLocaleString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        panoramaTime.textContent = dateTimeStr;
    } else {
        panoramaTime.textContent = 'Loading...';
    }
}

// Initialize
window.onload = async () => {
    // Add x2.5 speed option if on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const speedSelector = document.getElementById('speedSelector');
        const x25Option = document.createElement('option');
        x25Option.value = '2.5';
        x25Option.textContent = 'x2.5';
        speedSelector.appendChild(x25Option);
    }
    
    // Load weather codes data
    await loadWeatherCodes();
    
    // Initialize panorama (which will also fetch weather and update datetime)
    loadPanorama();
    scheduleReload();
};

// Handle window resize
let resizeTimeout;
window.onresize = () => {
    // Cancel any pending resize handling
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    
    // Cancel current animation
    if (currentAnimation) {
        cancelAnimationFrame(currentAnimation);
        currentAnimation = null;
    }
    
    // Debounce resize handling
    resizeTimeout = setTimeout(() => {
        const panorama = document.getElementById('panorama');
        // Reset transform and transition to recalculate
        panorama.style.transition = 'none';
        panorama.style.transform = 'translateX(0)';
        
        // Restart panning after a brief moment
        requestAnimationFrame(() => {
            startPanning();
        });
    }, 150);
};
