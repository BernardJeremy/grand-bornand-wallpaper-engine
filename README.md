# Grand-Bornand Live Panorama

Two ways to enjoy the Grand-Bornand live webcam panorama with dynamic panning:

1. **PowerShell Desktop Wallpaper** (`gb_live_wallpaper_daemon.ps1`) - Windows desktop wallpaper
2. **Web Viewer** (`index.html`) - Full-screen browser display

Both automatically:
- Find and display the most recent panorama (searches back up to 48 hours)
- Smoothly pan across the image from right to left, then reverse
- Auto-refresh to check for new panoramas
- Provide pause/resume controls

Source images come from:
https://data.skaping.com/le-grand-bornand/village/YYYY/MM/DD/HH-mm.jpg

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
2. Checks for new panoramas every 15 minutes
3. Continuously pans using smooth 60fps animation
4. Shows panorama timestamp in bottom-left corner
5. Provides pause/reset controls in bottom-right

---

## 🌐 Web Viewer

### Quick Start

Simply open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).

### Features

- **Pure HTML/CSS/JavaScript** - No dependencies or installation needed
- **Smooth 60fps animation** - Uses requestAnimationFrame for fluid panning
- **Auto-refresh** - Checks for new panoramas every 15 minutes
- **Responsive** - Adapts to any screen size
- **Interactive Controls**:
  - Pause/Resume button
  - Reset position button
  - Panorama timestamp display (bottom-left)
- **Smart Discovery** - Searches back up to 48 hours for latest image
- **Full-screen display** - Perfect for displays or kiosks

### Customization

Edit these constants in the `<script>` section:

```javascript
const LOOKBACK_HOURS = 48;           // How far back to search
const PAN_DURATION = 180;            // Seconds for full traversal
const RELOAD_INTERVAL = 15 * 60 * 1000;  // Check interval (15 min)
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
- **Pause**: Stops panning and downloads (wallpaper stays at current position)
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
| Refresh Rate | 30 minutes | 15 minutes |
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
- Shows panorama timestamp in local format
- Responsive to window resizing

---

## Stop the Script

Right-click the green tray icon and select **Exit**, or close the PowerShell window.

---

## License

Personal use only. Webcam images belong to their respective owners.
