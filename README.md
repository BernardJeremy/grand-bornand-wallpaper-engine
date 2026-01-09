# Grand-Bornand Live Panorama Wallpaper

This PowerShell script turns the Grand-Bornand live webcam panorama into a dynamic moving desktop wallpaper on Windows 11.

It automatically:
- Downloads the most recent panorama image every 30 minutes
- Displays it as your desktop wallpaper
- Smoothly pans the wallpaper from right to left, then left to right
- Keeps the full vertical content of the original panorama
- Runs continuously in the background
- System tray controls for pause/resume and exit

Source images come from:
https://data.skaping.com/le-grand-bornand/village/YYYY/MM/DD/HH-mm.jpg

---

## Features

- **System Tray Control**: Right-click tray icon to pause/resume or exit
- Automatically finds the most recent available panorama (even across midnight)
- Updates panorama every 30 minutes
- Smooth horizontal panning every 10 seconds
- Starts from right side and pans left, then reverses
- Preserves panning direction when new panorama loads
- Preserves full image height (no vertical cropping)
- Fullscreen wallpaper (1920×1080 and higher supported)
- Works on Windows 11 without third-party software
- Green tray icon for easy access

---

## How It Works

1. The script runs continuously with a system tray icon.
2. Every 30 minutes:
   - It searches backward in 10-minute steps to find the most recent available panorama.
   - Downloads it locally as `panorama.jpg`.
   - Continues panning in the current direction (no reset).
3. Every 10 seconds:
   - The panorama is scaled so its height matches your screen height.
   - A screen-sized window is cropped from the panorama.
   - The window moves horizontally across the image.
   - When it reaches an edge, it reverses direction.
4. Right-click the tray icon to:
   - Pause/Resume panning
   - Exit the script

This simulates a smooth camera pan effect using a static image source.

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

## Output Files

The script creates:

```
Pictures\Grand-Bornand\
  panorama.jpg   (latest downloaded panorama)
  frame.jpg      (current wallpaper frame)
```

---

## Notes

- Wallpaper mode is set to **Fill**
- Uses Windows native wallpaper API
- No third-party tools required
- If the Skaping server is offline, the last image remains active
- Panning direction is preserved when a new panorama is downloaded
- System tray icon is visible when the script is running

---

## Stop the Script

Right-click the green tray icon and select **Exit**, or close the PowerShell window.

---

## License

Personal use only. Webcam images belong to their respective owners.
