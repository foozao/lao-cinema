#!/bin/bash

# Convert trailer to HLS for hero section autoplay
# Extracts first 15 seconds and converts to adaptive HLS
# Usage: ./scripts/media/convert-trailer-to-hls.sh input.mp4 output-name

set -e

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: FFmpeg is not installed"
    echo "Install with: brew install ffmpeg"
    exit 1
fi

# Check arguments
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <input-trailer.mp4> <output-name>"
    echo "Example: $0 ~/Downloads/at-the-horizon-trailer.mp4 at-the-horizon"
    echo ""
    echo "This will:"
    echo "  1. Extract first 15 seconds of the trailer"
    echo "  2. Convert to HLS with multiple quality levels (1080p, 720p, 480p, 360p)"
    echo "  3. Output to video-server/videos/trailers/hls/<output-name>/"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_NAME="$2"
SCRIPT_DIR="$(dirname "$0")"
OUTPUT_DIR="${SCRIPT_DIR}/../../video-server/videos/trailers/hls/${OUTPUT_NAME}"

# Validate input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "Converting trailer: $INPUT_FILE"
echo "Output directory: $OUTPUT_DIR"
echo "Extracting first 15 seconds and converting to HLS..."
echo ""

# Extract first 15 seconds and convert to HLS with multiple bitrates
# This creates:
# - 1080p @ 5000k (max width 1920, height auto to preserve aspect ratio)
# - 720p @ 2800k (max width 1280)
# - 480p @ 1400k (max width 854)
# - 360p @ 800k (max width 640)
#
# Using scale=-2 ensures height is divisible by 2 (required for h264)
# This preserves the original aspect ratio instead of forcing 16:9

ffmpeg -i "$INPUT_FILE" -t 15 \
  -filter_complex \
  "[0:v]split=4[v1][v2][v3][v4]; \
   [v1]scale=w='min(1920,iw)':h=-2[v1out]; \
   [v2]scale=w='min(1280,iw)':h=-2[v2out]; \
   [v3]scale=w='min(854,iw)':h=-2[v3out]; \
   [v4]scale=w='min(640,iw)':h=-2[v4out]" \
  -map "[v1out]" -c:v:0 libx264 -b:v:0 5000k -maxrate:v:0 5350k -bufsize:v:0 7500k -preset medium -g 48 -sc_threshold 0 \
  -map "[v2out]" -c:v:1 libx264 -b:v:1 2800k -maxrate:v:1 2996k -bufsize:v:1 4200k -preset medium -g 48 -sc_threshold 0 \
  -map "[v3out]" -c:v:2 libx264 -b:v:2 1400k -maxrate:v:2 1498k -bufsize:v:2 2100k -preset medium -g 48 -sc_threshold 0 \
  -map "[v4out]" -c:v:3 libx264 -b:v:3 800k -maxrate:v:3 856k -bufsize:v:3 1200k -preset medium -g 48 -sc_threshold 0 \
  -map a:0 -c:a:0 aac -b:a:0 128k -ac 2 \
  -map a:0 -c:a:1 aac -b:a:1 128k -ac 2 \
  -map a:0 -c:a:2 aac -b:a:2 96k -ac 2 \
  -map a:0 -c:a:3 aac -b:a:3 64k -ac 2 \
  -f hls \
  -hls_time 6 \
  -hls_playlist_type vod \
  -hls_flags independent_segments \
  -hls_segment_type mpegts \
  -hls_segment_filename "${OUTPUT_DIR}/stream_%v/data%03d.ts" \
  -master_pl_name master.m3u8 \
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3" \
  "${OUTPUT_DIR}/stream_%v/playlist.m3u8"

# FFmpeg generates master.m3u8 inside stream_0/ with incorrect relative paths
# Move it to the correct location and fix the paths
if [ -f "${OUTPUT_DIR}/stream_0/master.m3u8" ]; then
  # Fix paths: stream_0.m3u8 -> stream_0/playlist.m3u8, etc.
  sed -e 's|stream_0\.m3u8|stream_0/playlist.m3u8|g' \
      -e 's|stream_1\.m3u8|stream_1/playlist.m3u8|g' \
      -e 's|stream_2\.m3u8|stream_2/playlist.m3u8|g' \
      -e 's|stream_3\.m3u8|stream_3/playlist.m3u8|g' \
      "${OUTPUT_DIR}/stream_0/master.m3u8" > "${OUTPUT_DIR}/master.m3u8"
  rm "${OUTPUT_DIR}/stream_0/master.m3u8"
fi

echo ""
echo "✅ Trailer conversion complete!"
echo ""
echo "HLS master playlist: /videos/trailers/hls/${OUTPUT_NAME}/master.m3u8"
echo ""
echo "Generated variants (15 seconds each):"
echo "  - 1080p @ 5000k: /videos/trailers/hls/${OUTPUT_NAME}/stream_0/playlist.m3u8"
echo "  - 720p @ 2800k:  /videos/trailers/hls/${OUTPUT_NAME}/stream_1/playlist.m3u8"
echo "  - 480p @ 1400k:  /videos/trailers/hls/${OUTPUT_NAME}/stream_2/playlist.m3u8"
echo "  - 360p @ 800k:   /videos/trailers/hls/${OUTPUT_NAME}/stream_3/playlist.m3u8"
echo ""
echo "Local URL: http://localhost:3000/videos/trailers/hls/${OUTPUT_NAME}/master.m3u8"
echo ""
echo "Next steps:"
echo "  1. Upload to GCS: ./scripts/upload-to-gcs.sh video-server/videos/trailers/hls/${OUTPUT_NAME}"
echo "  2. Add trailer_url to movie in database"
echo ""
