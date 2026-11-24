let weatherCodesData = null;
let panoramasCache = null;

const PANORAMAS = {
    village: {
        name: 'Village',
        latitude: 45.9385,
        longitude: 6.4203
    },
    taverne: {
        name: 'Taverne',
        latitude: 45.9496,
        longitude: 6.4511
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
const PAN_DURATION = 180; // seconds for one full image traversal
const RELOAD_INTERVAL = 60 * 1000; // 1 minute
const BOOST_SPEED_MULTIPLIER = 5; // Speed while an arrow key is held (labeled as x10 in UI)

let currentPanorama = 'village'; // Default to Village
let speedMultiplier = 0.5; // Default speed (labeled as x1 in UI)
let panDirection = 1; // 1 = default direction, -1 = reversed
let boostHeldKey = null; // Arrow key currently held down for the speed boost, if any
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
        throw new Error(`Aucun panorama trouvé pour ${PANORAMAS[currentPanorama].name}`);
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
        // Holding an arrow key overrides the selected speed
        const effectiveSpeed = boostHeldKey ? BOOST_SPEED_MULTIPLIER : speedMultiplier;

        // Skip movement if speed is 0
        if (effectiveSpeed > 0) {
            const step = baseStep * effectiveSpeed;
            position -= step * panDirection;

            // Seamlessly wrap around when leaving the [startOffset, startOffset + maxOffset] range
            // The two images are identical, so shifting by one image width is invisible
            if (position <= startOffset) {
                position += maxOffset;
            } else if (position > maxOffset + startOffset) {
                position -= maxOffset;
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

// Change panning direction
function changeDirection() {
    const selector = document.getElementById('directionSelector');
    panDirection = parseInt(selector.value, 10);

    // No need to restart animation, it will pick up the new direction on next frame
}

// Hide all UI overlays, leaving only the panorama
function hideUI() {
    document.body.classList.add('ui-hidden');
    document.activeElement?.blur();
}

// Bring the UI overlays back
function showUI() {
    document.body.classList.remove('ui-hidden');
}

// Show or hide the UI overlays
function toggleUI() {
    if (document.body.classList.contains('ui-hidden')) {
        showUI();
    } else {
        hideUI();
    }
}

// Pause the panning (x0), unless it is already paused
function pausePanning() {
    const selector = document.getElementById('speedSelector');
    if (speedMultiplier === 0) return;
    selector.value = '0';
    changeSpeed();
}

// Set the panning direction (1 = left, -1 = right) and sync the selector
function setDirection(direction) {
    document.getElementById('directionSelector').value = String(direction);
    changeDirection();
}

// Resume at x1 when the panning is paused (x0)
function resumePanning() {
    if (speedMultiplier !== 0) return;
    document.getElementById('speedSelector').value = '0.5';
    changeSpeed();
}

// Move the speed selector by one step among the available options (+1 = faster, -1 = slower)
function stepSpeed(delta) {
    const selector = document.getElementById('speedSelector');
    const index = Math.min(Math.max(selector.selectedIndex + delta, 0), selector.options.length - 1);
    if (index === selector.selectedIndex) return;
    selector.selectedIndex = index;
    changeSpeed();
}

// H toggles the UI, Space pauses the panning, Left/Right arrows set the direction
// (and resume from x0), holding them boosts the speed, Up/Down arrows change the speed
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'h' || e.key === 'H') {
        if (!e.repeat) toggleUI();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Keep the arrows from also moving the selection of a focused select
        e.preventDefault();
        document.activeElement?.blur();
        setDirection(e.key === 'ArrowLeft' ? 1 : -1);

        if (e.repeat) {
            boostHeldKey = e.key;
        } else {
            resumePanning();
        }
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Keep the arrows from also moving the selection of a focused select or scrolling
        e.preventDefault();
        document.activeElement?.blur();
        stepSpeed(e.key === 'ArrowUp' ? 1 : -1);
    } else if (e.code === 'Space') {
        // Keep Space from opening a focused select or clicking a focused button
        e.preventDefault();
        document.activeElement?.blur();
        pausePanning();
    }
});

// Releasing the held arrow key (or leaving the window) restores the selected speed
document.addEventListener('keyup', (e) => {
    if (e.key === boostHeldKey) boostHeldKey = null;
});
window.addEventListener('blur', () => {
    boostHeldKey = null;
});

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
        
        // Extract timestamps from both URLs to compare
        const extractTimestamp = (url) => {
            const match = url.match(/(\d{4})\/(\d{2})\/(\d{2})\/(?:large\/)?(\d{2})-(\d{2})/);
            if (match) {
                return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`;
            }
            return null;
        };
        
        const currentTimestamp = extractTimestamp(panoramaUrl);
        const newTimestamp = extractTimestamp(newUrl);
        
        // Compare timestamps instead of full URLs (hostname can change)
        if (newTimestamp && currentTimestamp !== newTimestamp) {
            console.log(`New panorama found, reloading... (${currentTimestamp} -> ${newTimestamp})`);
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
        } else {
            console.log('No new panorama available');
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
        tempText += ` (${elevation}m)`;
    }
    weatherTemp.textContent = tempText;
}

// Debug: Cycle through all weather icons (localhost only)
let weatherCycleInterval = null;
let currentWeatherIndex = 0;
let weatherCodesList = [];

function startWeatherIconCycle() {
    if (weatherCycleInterval) {
        stopWeatherIconCycle();
        return;
    }
    
    // Get all weather codes
    weatherCodesList = Object.keys(weatherCodesData).map(code => parseInt(code));
    currentWeatherIndex = 0;
    
    console.log(`Starting weather icon cycle through ${weatherCodesList.length} codes`);
    
    // Cycle through each weather code every 2 seconds
    weatherCycleInterval = setInterval(() => {
        const isDay = Math.random() > 0.5; // Random day/night
        const weatherCode = weatherCodesList[currentWeatherIndex];
        const fakeTemp = Math.floor(Math.random() * 30) - 5; // -5 to 25°C
        const fakeElevation = 1000 + Math.floor(Math.random() * 1000); // 1000-2000m
        
        console.log(`Weather code ${weatherCode} (${isDay ? 'day' : 'night'}): ${fakeTemp}°C`);
        updateWeatherDisplay(fakeTemp, weatherCode, isDay, fakeElevation);
        
        currentWeatherIndex = (currentWeatherIndex + 1) % weatherCodesList.length;
    }, 2000);
}

function stopWeatherIconCycle() {
    if (weatherCycleInterval) {
        clearInterval(weatherCycleInterval);
        weatherCycleInterval = null;
        console.log('Stopped weather icon cycle');
        // Refresh real weather
        fetchWeather();
    }
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
        
        // Add keyboard shortcut for weather icon cycling (W key)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'w' || e.key === 'W') {
                startWeatherIconCycle();
            }
        });
        
        console.log('Debug mode: Press W to cycle through weather icons');
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
