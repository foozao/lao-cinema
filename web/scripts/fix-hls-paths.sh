#!/bin/bash

# Quick fix for HLS playlists with incorrect segment paths
# Usage: ./scripts/fix-hls-paths.sh the-signal

set -e

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <video-name>"
    echo "Example: $0 the-signal"
    exit 1
fi

VIDEO_NAME="$1"
OUTPUT_DIR="public/videos/hls/${VIDEO_NAME}"

if [ ! -d "$OUTPUT_DIR" ]; then
    echo "Error: Directory '$OUTPUT_DIR' not found"
    exit 1
fi

echo "Fixing HLS playlists for: $VIDEO_NAME"

# Fix each variant playlist
for i in 0 1 2 3; do
    PLAYLIST="${OUTPUT_DIR}/stream_${i}.m3u8"
    if [ -f "$PLAYLIST" ]; then
        echo "Fixing stream_${i}.m3u8..."
        # Replace data000.ts with stream_0/data000.ts (and all other segments)
        sed -i '' "s|^data\([0-9]\{3\}\)\.ts$|stream_${i}/data\1.ts|g" "$PLAYLIST"
    fi
done

echo ""
echo "✅ Fix complete! Playlists updated."
echo ""
echo "Refresh your browser to test: http://localhost:3000/en/test-video"
