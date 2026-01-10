const PANORAMAS = {
    village: {
        name: 'Village',
        url: 'https://data.skaping.com/le-grand-bornand/village'
    },
    station: {
        name: 'Station',
        url: 'https://data3.skaping.com/grand-bornand/chinaillon'
    },
    maroly: {
        name: 'Maroly',
        url: 'https://data3.skaping.com/grand-bornand/terres-rouges'
    },
    lachat: {
        name: 'Lachat',
        url: 'https://data.skaping.com/grand-bornand/la-floria'
    }
};

const LOOKBACK_HOURS = 48;
const PAN_DURATION = 180; // seconds for full right-to-left traversal
const RELOAD_INTERVAL = 15 * 60 * 1000; // 15 minutes

let currentPanorama = 'village'; // Default to Village
let speedMultiplier = 1; // Default speed
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

// Check if image exists
async function checkImageExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok && response.headers.get('content-length') > 50000;
    } catch {
        return false;
    }
}

// Find latest available panorama
async function findLatestPanorama() {
    const now = new Date();
    const isStation = currentPanorama === 'station';
    const startSlot = isStation ? roundToStationTime(now) : roundToTenMinutes(now);
    const interval = isStation ? 30 : 10; // minutes
    const slotsPerHour = isStation ? 2 : 6;
    const maxAttempts = LOOKBACK_HOURS * slotsPerHour;

    const baseUrl = PANORAMAS[currentPanorama].url;

    for (let i = 0; i < maxAttempts; i++) {
        const testDate = new Date(startSlot.getTime() - (i * interval * 60 * 1000));
        const path = formatDateForUrl(testDate);
        const url = `${baseUrl}/${path}.jpg`;

        console.log(`Trying: ${url}`);

        if (await checkImageExists(url)) {
            console.log(`Found: ${url}`);
            lastUpdate = testDate;
            updateDateTime();
            return url;
        }
    }

    throw new Error('No panorama found in the last ' + LOOKBACK_HOURS + ' hours');
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
        
        panoramaUrl = await findLatestPanorama();
        const panoramaImg1 = document.getElementById('panorama-img1');
        const panoramaImg2 = document.getElementById('panorama-img2');
        panoramaImg1.src = panoramaUrl;
        panoramaImg2.src = panoramaUrl;
        
        startPanning();
    } catch (error) {
        console.error('Error loading panorama:', error);
        document.getElementById('loader').style.display = 'none';
    }
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
        }
    }, RELOAD_INTERVAL);
}

// Update date/time display
function updateDateTime() {
    const datetime = document.getElementById('datetime');
    if (lastUpdate) {
        const dateTimeStr = lastUpdate.toLocaleString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        datetime.textContent = dateTimeStr;
    } else {
        datetime.textContent = 'Loading...';
    }
}

// Initialize
window.onload = () => {
    // Add x5 speed option if on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const speedSelector = document.getElementById('speedSelector');
        const x5Option = document.createElement('option');
        x5Option.value = '5';
        x5Option.textContent = 'x5';
        speedSelector.appendChild(x5Option);
    }
    
    loadPanorama();
    scheduleReload();
    updateDateTime();
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
