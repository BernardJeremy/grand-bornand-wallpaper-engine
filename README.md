# Grand-Bornand Live Panorama Web Viewer

A full-screen web application displaying live webcam panoramas from Grand-Bornand with smooth panning animation and real-time weather information.

> **Project Evolution**: This project initially started as a PowerShell desktop wallpaper script for Windows, but evolved into a cross-platform web-based application for better accessibility and user experience.

Automatically:
- Displays the most recent panorama from cached URLs
- Smoothly pans across the image in a seamless 360° loop
- Shows real-time weather with temperature, icon, and elevation
- Auto-refreshes every minute to check for new panoramas

### Available Panoramas

- **Village**: https://data.skaping.com/le-grand-bornand/village/ (every 10 min)
- **Station**: https://data3.skaping.com/grand-bornand/chinaillon/ (every 30 min at XX:01 and XX:31)
- **Maroly**: https://data3.skaping.com/grand-bornand/terres-rouges/ (every 10 min)
- **Lachat**: https://data.skaping.com/grand-bornand/la-floria/ (every 10 min)

---
## How It Works

### Web Application
1. Opens as a full-screen webpage
2. Loads panorama URLs from cached JSON file (`panoramas_cache.json`)
3. Checks for updated panorama URLs every minute (refetches the cache)
4. Compares panorama timestamps (not full URLs) to detect new images
5. Continuously pans using smooth 60fps animation
6. Shows panorama timestamp in top box (top-left corner)
7. Shows weather icon, temperature, and elevation in separate box below (top-left corner)
8. Provides panorama selector, speed control, and other controls in bottom-right

---

## 🌐 Quick Start

**Important**: Before opening the web viewer, generate the panorama cache:

```bash
cd /path/to/grand-bornand-wallpaper-engine
./fetch_panoramas.sh
```

This creates `panoramas_cache.json` with the latest panorama URLs for all locations.

Then, open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).

### Keeping Panoramas Updated

**Recommended**: Set up a CRON job to automatically update the cache every 5-10 minutes:

```bash
# Edit your crontab
crontab -e

# Add this line to run every 10 minutes
*/10 * * * * cd /path/to/grand-bornand-wallpaper-engine && ./fetch_panoramas.sh
```

This ensures the web viewer always has access to the most recent panoramas.

### Project Structure

```
grand-bornand-wallpaper-engine/
  ├── index.html              # Main HTML structure
  ├── styles.css              # Styling and animations
  ├── script.js               # Panorama loading and panning logic
  ├── fetch_panoramas.sh      # Script to fetch latest panorama URLs
  ├── panoramas_cache.json    # Generated cache file with panorama URLs
  └── weather_codes_data.json # Weather icon mappings
```

### Features

- **Modular Architecture** - Separate HTML, CSS, and JavaScript files for easy maintenance
- **Multiple Panoramas** - Switch between 4 different Grand-Bornand viewpoints:
  - Village (default)
  - Station (Chinaillon)
  - Maroly (Terres Rouges)
  - Lachat (La Floria)
- **Variable Speed Control** - Adjust panning speed on the fly:
  - x0 (pause/frozen)
  - x0.25 (very slow)
  - x0.5 (default)
  - x1 (normal)
  - x2 (fast)
  - x2.5 (debug speed, only on localhost)
- **Seamless 360° Loop** - Continuous panning with no jarring jumps or direction changes
- **Cached Panorama URLs** - Fast loading from pre-fetched panorama cache
- **Smooth 60fps animation** - Uses requestAnimationFrame for fluid panning
- **Auto-refresh** - Checks for new panoramas every minute
- **Weather Display** - Shows current temperature, weather icon, and elevation in a separate lean box
- **Fully Responsive** - Adapts seamlessly to window resizing and zoom changes
- **Clean Interface**:
  - Panorama selector and speed control (bottom-right)
  - Timestamp display in top box (top-left)
  - Weather info in separate box below timestamp (top-left)
- **Full-screen display** - Perfect for displays or kiosks

### Customization

Edit these constants in `script.js`:

```javascript
const PAN_DURATION = 180;              // Seconds for full traversal
const RELOAD_INTERVAL = 60 * 1000;     // Check interval (1 min)
let speedMultiplier = 0.5;             // Default speed (x0.5, changed via UI)
```

#### Updating Panorama Cache Frequency

The `fetch_panoramas.sh` script fetches the latest panorama URLs from the Skaping website. Adjust your CRON schedule based on how frequently you want updates:

```bash
# Every 5 minutes (very frequent)
*/5 * * * * cd /path/to/grand-bornand-wallpaper-engine && ./fetch_panoramas.sh

# Every 10 minutes (recommended)
*/10 * * * * cd /path/to/grand-bornand-wallpaper-engine && ./fetch_panoramas.sh

# Every 30 minutes (less frequent)
*/30 * * * * cd /path/to/grand-bornand-wallpaper-engine && ./fetch_panoramas.sh
```

#### Debug Features (Localhost Only)

When running on localhost, additional debug features are available:

- **x2.5 Speed**: Extra fast speed option for testing
- **Weather Icon Cycle**: Press `W` key to cycle through all available weather icons with random temperatures and elevations (2-second intervals). Press `W` again to stop and return to real weather data.

These features help test the UI without waiting for real weather updates or panorama changes.

To add more panoramas, update the `PANORAMAS` object in `script.js`:

```javascript
const PANORAMAS = {
    village: {
        name: 'Village',
        url: 'https://data.skaping.com/le-grand-bornand/village',
        latitude: 45.9385,
        longitude: 6.4203
    },
    // Add more...
};
```

And add the corresponding entry in `fetch_panoramas.sh`:

```bash
declare -A LOCATIONS=(
    ["village"]="https://www.skaping.com/le-grand-bornand/village"
    # Add more...
)
```

---

## Notes
- Works in any modern browser
- No server required - runs entirely client-side
- Can be deployed to web hosting for remote access
- Shows panorama timestamp in l
- Modular code structure for easy customization
- Supports multiple panorama sources with different update schedulesocal format
- Responsive to window resizing

---

## License

Personal use only. Webcam images belong to their respective owners.
