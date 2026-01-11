# Grand-Bornand Live Panorama

Two ways to enjoy the Grand-Bornand live webcam panoramas with dynamic panning:

1. **PowerShell Desktop Wallpaper** (`gb_live_wallpaper_daemon.ps1`) - Windows desktop wallpaper
2. **Web Viewer** (`website/`) - Full-screen browser display

Both automatically:
- Find and display the most recent panorama from cached URLs
- Smoothly pan across the image from right to left, then reverse
- Auto-refresh to check for new panoramas

### Available Panoramas

- **Village**: https://data.skaping.com/le-grand-bornand/village/ (every 10 min)
- **Station**: https://data3.skaping.com/grand-bornand/chinaillon/ (every 30 min at XX:01 and XX:31)
- **Maroly**: https://data3.skaping.com/grand-bornand/terres-rouges/ (every 10 min)
- **Lachat**: https://data.skaping.com/grand-bornand/la-floria/ (every 10 min)

---

## 🖥️ PowerShell Desktop Wallpaper

### Features

- **System Tray Control**: Right-click tray icon to pause/resume or exit
- **Visual Status**: Green icon when running, yellow when paused
- Automatically finds the most recent available panorama
- Updates panorama every 30 minutes
- Smooth horizontal panning every 10 seconds
- Starts from right side and pans left, then reverses
- Preserves panning direction when new panorama loads
- Fullscreen wallpaper support (all resolutions)
- Works on Windows 11 without third-party software

---

## How It Works

### PowerShell Script
1. Runs continuously with a system tray icon (green = running, yellow = paused)
2. Every 30 minutes:
   - Searches backward in 10-minute slots to find the most recent panorama
   - Downloads it locally as `panorama.jpg`
   - Continues panning in the current direction
3. Every 10 seconds:
   - Crops a screen-sized window from the panorama
   - Moves the window horizontally to create panning effect
   - Reverses direction at edges

### Web Viewer
1. Opens as a full-screen webpage
2. Loads panorama URLs from cached JSON file (`panoramas_cache.json`)
3. Checks for updated panorama URLs every minute (refetches the cache)
4. Continuously pans using smooth 60fps animation
5. Shows panorama timestamp in top box (top-left corner)
6. Shows weather icon, temperature, and elevation in separate box below (top-left corner)
7. Provides panorama selector, speed control, and other controls in bottom-right

---

## 🌐 Web Viewer

### Quick Start

**Important**: Before opening the web viewer, generate the panorama cache:

```bash
cd website
./fetch_panoramas.sh
```

This creates `panoramas_cache.json` with the latest panorama URLs for all locations.

Then, open `website/index.html` in any modern browser (Chrome, Firefox, Edge, Safari).

### Keeping Panoramas Updated

**Recommended**: Set up a CRON job to automatically update the cache every 5-10 minutes:

```bash
# Edit your crontab
crontab -e

# Add this line to run every 10 minutes
*/10 * * * * cd /path/to/grand-bornand-wallpaper-engine/website && ./fetch_panoramas.sh
```

This ensures the web viewer always has access to the most recent panoramas.

### Project Structure

```
website/
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
*/5 * * * * cd /path/to/website && ./fetch_panoramas.sh

# Every 10 minutes (recommended)
*/10 * * * * cd /path/to/website && ./fetch_panoramas.sh

# Every 30 minutes (less frequent)
*/30 * * * * cd /path/to/website && ./fetch_panoramas.sh
```

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

## 🖥️ PowerShell Desktop Wallpaper Setup

---

## Requirements

- Windows 11
- PowerShell 5.1+ (default on Windows 11)
- Screen resolution: tested on 1920×1080 (100% scale)
- Internet connection

---

## Installation

1. Create a folder:
   ```
   C:\Users\YourName\Pictures\Grand-Bornand
   ```

2. Save the script as:
   ```
   gb_wallpaper_daemon.ps1
   ```

3. Allow script execution (once):
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
   ```

---

## Run Manually

Open PowerShell and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\YourName\Pictures\Grand-Bornand\gb_wallpaper_daemon.ps1"
```

A green icon will appear in your system tray. Right-click it to pause/resume or exit.

---

## Run Automatically at Startup (Recommended)

Use Task Scheduler:

1. Open **Task Scheduler**
2. Create Task
3. Trigger: **At log on**
4. Action:
   - Program: `powershell.exe`
   - Arguments:
     ```
     -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\Users\YourName\Pictures\Grand-Bornand\gb_wallpaper_daemon.ps1"
     ```
5. Check **Run only when user is logged on**

Now the wallpaper will start automatically every time you log in.

---

## Customization

Inside the script you can adjust:

### Pan speed and duration
```powershell
$panIntervalSeconds = 10
$fullTraverseSteps = 180
```

Example:
- 10s interval × 180 steps = 30 minutes for a full right→left sweep

### Download frequency
```powershell
$downloadInterval = [TimeSpan]::FromMinutes(30)
```

### Lookback window (if server is delayed)
```powershell
$lookbackHours = 48
```

---

## System Tray Controls

- **Right-click** the green tray icon to access controls
- **Pause**: Stops panning and dPanorama selector dropdown |
| Panoramas | Village only | 4 locations (Village, Station, Maroly, Lachat)er stays at current position)
- **Resume**: Continues panning from where it stopped
- **Exit**: Closes the script and removes tray icon

---

## Output Files (PowerShell Script)

The script creates:

```
Pictures\Grand-Bornand\
  panorama.jpg   (latest downloaded panorama)
  frame.jpg      (current wallpaper frame)
```

---

## Comparison

| Feature | PowerShell Script | Web Viewer |
|---------|------------------|------------|
| Platform | Windows only | Any OS with browser |
| Installation | Script + Task Scheduler | Just open HTML file |
| Integration | Desktop wallpaper | Browser window |
| Performance | System resources | Browser resources |
| Controls | System tray icon | On-screen buttons |
| Auto-start | Task Scheduler | Manual |
| Refresh Rate | 30 minutes | 5 minutes |
| Animation | 10-second steps | 60fps smooth |

---

## Notes

### PowerShell Script
- Wallpaper mode is set to **Fill**
- Uses Windows native wallpaper API
- No third-party tools required
- System tray icon visible when running
- Panning direction preserved across updates

### Web Viewer
- Works in any modern browser
- No server required - runs entirely client-side
- Can be deployed to web hosting for remote access
- Shows panorama timestamp in l
- Modular code structure for easy customization
- Supports multiple panorama sources with different update schedulesocal format
- Responsive to window resizing

---

## Stop the Script

Right-click the green tray icon and select **Exit**, or close the PowerShell window.

---

## License

Personal use only. Webcam images belong to their respective owners.
