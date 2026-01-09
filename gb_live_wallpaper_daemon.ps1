# gb_wallpaper_daemon.ps1
# - Every hour: downloads latest available panorama (10-min slots, up to 48h back)
# - Every 10 seconds: pans wallpaper by cropping a screen-sized window across the panorama
# - Starts each new downloaded panorama from the BEGINNING (left side)
# - Wallpaper mode: FILL

$ErrorActionPreference = "Stop"

# ----------------------- SETTINGS -----------------------
$base = "https://data.skaping.com/le-grand-bornand/village"

$outDir = Join-Path $env:USERPROFILE "Pictures\Grand-Bornand"
$panoramaPath = Join-Path $outDir "panorama.jpg"
$framePath    = Join-Path $outDir "frame.jpg"
$rawTmpPath   = Join-Path $env:TEMP "gb_panorama_tmp.jpg"

$panIntervalSeconds = 10
$downloadInterval   = [TimeSpan]::FromMinutes(30)

# Look back for latest image across midnight/outages
$lookbackHours = 48

# Full right->left traversal duration in "steps" (each step happens every $panIntervalSeconds)
# Example: 60 steps @5s = 5 minutes to go right->left (then it bounces back)
$fullTraverseSteps = 180
# -------------------------------------------------------

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

Write-Host "=== GB Wallpaper Daemon ==="
Write-Host "Output folder: $outDir"
Write-Host "Pan every $panIntervalSeconds seconds"
Write-Host "Download every $($downloadInterval.TotalMinutes) minutes"
Write-Host "Start: $(Get-Date)"

# Assemblies
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Wallpaper API (load once)
Add-Type @"
using System.Runtime.InteropServices;
public class Wallpaper {
    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@

function Apply-WallpaperFill([string]$path) {
    # 10 = Fill
    Set-ItemProperty "HKCU:\Control Panel\Desktop" -Name WallPaper      -Value $path
    Set-ItemProperty "HKCU:\Control Panel\Desktop" -Name WallpaperStyle -Value "10"
    Set-ItemProperty "HKCU:\Control Panel\Desktop" -Name TileWallpaper  -Value "0"
    [Wallpaper]::SystemParametersInfo(20, 0, $path, 3) | Out-Null
}

function Download-LatestPanorama([int]$lookbackHours) {
    $now = Get-Date
    $roundedMinute = [int]([math]::Floor($now.Minute / 10) * 10)
    $start = [datetime]::new($now.Year, $now.Month, $now.Day, $now.Hour, $roundedMinute, 0)

    $maxAttempts = $lookbackHours * 6  # 6 per hour

    Write-Host ""
    Write-Host "Download check at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') (start slot $($start.ToString('yyyy-MM-dd HH:mm')))"

    for ($i = 0; $i -lt $maxAttempts; $i++) {
        $dt = $start.AddMinutes(-10 * $i)
        $path = $dt.ToString("yyyy/MM/dd/HH-mm")  # MM=month, mm=minutes
        $url  = "$base/$path.jpg"

        Write-Host "Trying URL: $url"

        try {
            Invoke-WebRequest -Uri $url -OutFile $rawTmpPath -TimeoutSec 20 -ErrorAction Stop

            # sanity: avoid tiny error pages
            $len = (Get-Item $rawTmpPath).Length
            if ($len -lt 50000) { throw "Downloaded file too small ($len bytes) - likely invalid." }

            Move-Item -Force $rawTmpPath $panoramaPath
            Write-Host "SUCCESS: Downloaded panorama for $($dt.ToString('yyyy-MM-dd HH:mm')) -> $panoramaPath"
            return @{ Ok = $true; Dt = $dt }
        } catch {
            Write-Host "Not available"
        }
    }

    Write-Host "WARNING: No panorama found in last $lookbackHours hours. Keeping previous panorama if any."
    return @{ Ok = $false; Dt = $null }
}

function Render-FrameFromPanorama(
    [string]$panoramaFile,
    [string]$frameFile,
    [int]$xOffset,
    [int]$targetW,
    [int]$targetH
) {
    $img = $null
    $scaledBmp = $null
    $dstBmp = $null
    $gfxScale = $null
    $gfxOut = $null

    try {
        $img = [System.Drawing.Image]::FromFile($panoramaFile)

        # Scale the FULL panorama so that its HEIGHT == screen HEIGHT (keeps full vertical content)
        $scale = $targetH / $img.Height
        $scaledW = [int]([math]::Round($img.Width * $scale))
        $scaledH = $targetH

        if ($scaledW -lt $targetW) {
            throw "Scaled panorama width ($scaledW) is smaller than screen width ($targetW)."
        }

        $scaledBmp = New-Object System.Drawing.Bitmap($scaledW, $scaledH)
        $gfxScale = [System.Drawing.Graphics]::FromImage($scaledBmp)
        $gfxScale.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gfxScale.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $gfxScale.CompositingQuality= [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $gfxScale.DrawImage($img, 0, 0, $scaledW, $scaledH)

        # Now crop a screen-sized window from the scaled panorama (no vertical crop needed)
        $maxX = $scaledW - $targetW
        if ($xOffset -lt 0) { $xOffset = 0 }
        if ($xOffset -gt $maxX) { $xOffset = $maxX }

        $srcRect  = New-Object System.Drawing.Rectangle($xOffset, 0, $targetW, $targetH)
        $destRect = New-Object System.Drawing.Rectangle(0, 0, $targetW, $targetH)

        $dstBmp = New-Object System.Drawing.Bitmap($targetW, $targetH)
        $gfxOut = [System.Drawing.Graphics]::FromImage($dstBmp)
        $gfxOut.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gfxOut.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $gfxOut.CompositingQuality= [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

        # Draw the crop into the full output frame
        $gfxOut.DrawImage($scaledBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

        $dstBmp.Save($frameFile, [System.Drawing.Imaging.ImageFormat]::Jpeg)

        return @{ ScaledW = $scaledW; ScaledH = $scaledH; MaxX = $maxX }
    }
    finally {
        if ($gfxOut)   { $gfxOut.Dispose() }
        if ($dstBmp)   { $dstBmp.Dispose() }
        if ($gfxScale) { $gfxScale.Dispose() }
        if ($scaledBmp){ $scaledBmp.Dispose() }
        if ($img)      { $img.Dispose() }
    }
}



# Screen size (primary) – best match for Fill mode
$targetW = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width
$targetH = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height
Write-Host "Primary screen: ${targetW}x${targetH}"

# Initial download
try {
    $dl = Download-LatestPanorama -lookbackHours $lookbackHours
} catch {
    Write-Host "WARNING: initial download failed: $($_.Exception.Message)"
}

# Pan state
$x = 0
$dir = 1
$lastDownload = Get-Date

# Show right side immediately if file exists
if (Test-Path $panoramaPath) {
    try {
        # First render to get maxX
        $info = Render-FrameFromPanorama -panoramaFile $panoramaPath -frameFile $framePath -xOffset 0 -targetW $targetW -targetH $targetH
        $x = [int]$info.MaxX
        $dir = -1
        # Render again at right side
        $info = Render-FrameFromPanorama -panoramaFile $panoramaPath -frameFile $framePath -xOffset $x -targetW $targetW -targetH $targetH
        Apply-WallpaperFill $framePath
        Write-Host "Displayed panorama right side (will pan left)."
    } catch {
        Write-Host "WARNING: render/apply failed: $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "Running... (Ctrl+C to stop)"
Write-Host ""

while ($true) {
    # Hourly download + reset to beginning
    if ((Get-Date) - $lastDownload -ge $downloadInterval) {
        try {
            $dl = Download-LatestPanorama -lookbackHours $lookbackHours
            $lastDownload = Get-Date

            if ((Test-Path $panoramaPath)) {
                # Get new panorama dimensions and adjust x if needed
                $info = Render-FrameFromPanorama -panoramaFile $panoramaPath -frameFile $framePath -xOffset 0 -targetW $targetW -targetH $targetH
                $maxX = [int]$info.MaxX
                
                # Keep current position and direction, but clamp x to new bounds
                if ($x -gt $maxX) { $x = $maxX }
                if ($x -lt 0) { $x = 0 }
                
                # Render at current position
                $info = Render-FrameFromPanorama -panoramaFile $panoramaPath -frameFile $framePath -xOffset $x -targetW $targetW -targetH $targetH
                Apply-WallpaperFill $framePath
                Write-Host "New panorama loaded, continuing pan $(if ($dir -eq -1) {'left'} else {'right'})."
            }
        } catch {
            Write-Host "WARNING: download cycle error: $($_.Exception.Message)"
            $lastDownload = Get-Date
        }
    }

    # Pan update
    if (Test-Path $panoramaPath) {
        try {
            $info = Render-FrameFromPanorama -panoramaFile $panoramaPath -frameFile $framePath -xOffset $x -targetW $targetW -targetH $targetH
            Apply-WallpaperFill $framePath

            $maxX = [int]$info.MaxX
            $step = 0
            if ($maxX -gt 0) {
                $step = [int]([math]::Max(1, [math]::Floor($maxX / $fullTraverseSteps)))
            }

            $x = $x + ($dir * $step)
            if ($x -ge $maxX) { $x = $maxX; $dir = -1 }
            if ($x -le 0)     { $x = 0;     $dir = 1 }
        } catch {
            Write-Host "WARNING: pan update error: $($_.Exception.Message)"
        }
    }

    Start-Sleep -Seconds $panIntervalSeconds
}
