#!/bin/sh

# Fetch latest panorama URLs from Skaping website and save to JSON

OUTPUT_FILE="panoramas_cache.json"

# Define the locations and their HTML URLs (name:url pairs)
LOCATIONS="
village https://www.skaping.com/le-grand-bornand/village
station https://www.skaping.com/le-grand-bornand/chinaillon
maroly https://www.skaping.com/le-grand-bornand/terresrouges
lachat https://www.skaping.com/le-grand-bornand/mont-lachat
"

# Start JSON output
echo "{" > "$OUTPUT_FILE"

first=true
echo "$LOCATIONS" | while read -r location url; do
    # Skip empty lines
    [ -z "$location" ] && continue
    
    echo "Fetching $location from $url..."
    
    # Fetch the HTML page
    html=$(curl -s "$url")
    
    # Extract og:image content using sed (POSIX-compatible)
    image_url=$(echo "$html" | sed -n 's/.*<meta[^>]*property="og:image"[^>]*content="\([^"]*\)".*/\1/p' | head -1)
    
    if [ -z "$image_url" ]; then
        echo "  Warning: Could not find og:image for $location"
        image_url="null"
    else
        echo "  Found: $image_url"
    fi
    
    # Add comma separator after first entry
    if [ "$first" = true ]; then
        first=false
    else
        echo "," >> "$OUTPUT_FILE"
    fi
    
    # Write to JSON file
    if [ "$image_url" = "null" ]; then
        echo -n "  \"$location\": null" >> "$OUTPUT_FILE"
    else
        echo -n "  \"$location\": \"$image_url\"" >> "$OUTPUT_FILE"
    fi
done

# Close JSON
echo "" >> "$OUTPUT_FILE"
echo "}" >> "$OUTPUT_FILE"

echo ""
echo "Panorama URLs saved to $OUTPUT_FILE"
