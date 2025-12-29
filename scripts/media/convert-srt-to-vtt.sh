#!/bin/bash

# Convert SRT subtitle files to WebVTT format for web video
# Usage: ./scripts/convert-srt-to-vtt.sh input.srt [output.vtt]

set -e

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: FFmpeg is not installed"
    echo "Install with: brew install ffmpeg"
    exit 1
fi

# Check arguments
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <input.srt> [output.vtt]"
    echo "Example: $0 ~/Downloads/movie-en.srt movie-en.vtt"
    echo ""
    echo "If output file is not specified, it will be named the same as input with .vtt extension"
    exit 1
fi

INPUT_FILE="$1"

# Determine output file
if [ "$#" -eq 2 ]; then
    OUTPUT_FILE="$2"
else
    # Replace .srt extension with .vtt
    OUTPUT_FILE="${INPUT_FILE%.srt}.vtt"
fi

# Validate input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found"
    exit 1
fi

# Validate input file has .srt extension
if [[ ! "$INPUT_FILE" =~ \.srt$ ]]; then
    echo "Warning: Input file does not have .srt extension"
    echo "Proceeding anyway..."
fi

echo "Converting: $INPUT_FILE"
echo "Output: $OUTPUT_FILE"
echo ""

# Convert SRT to VTT using FFmpeg
# FFmpeg automatically handles the format conversion
ffmpeg -i "$INPUT_FILE" "$OUTPUT_FILE" -y

echo ""
echo "✅ Conversion complete!"
echo ""
echo "WebVTT file: $OUTPUT_FILE"
echo ""
echo "Next steps:"
echo "1. Upload the .vtt file to your video server or CDN"
echo "2. Add the subtitle track via the admin panel or API"
echo "3. The subtitle will be available in the video player"
