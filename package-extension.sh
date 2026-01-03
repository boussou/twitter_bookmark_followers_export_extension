#!/bin/bash

# Package Chrome Extension for Web Store Submission
# This script creates a ZIP file ready for Chrome Web Store upload

EXTENSION_NAME="twitter-bookmark-and-followers-exporter"
VERSION="1.0"
OUTPUT_FILE="publish/${EXTENSION_NAME}-v${VERSION}.zip"

echo "Packaging Chrome Extension..."
echo "================================"

# Remove old package if exists
if [ -f "$OUTPUT_FILE" ]; then
    echo "Removing old package: $OUTPUT_FILE"
    rm "$OUTPUT_FILE"
fi

# Create ZIP package excluding unnecessary files
zip -r "$OUTPUT_FILE" \
    manifest.json \
    popup.html \
    popup.js \
    background.js \
    followersExport.js \
    icons/ \
    LICENSE \
    -x "*.git*" \
    -x "*.md" \
    -x "*.sh" \
    -x ".gitignore"

echo ""
echo "================================"
echo "✓ Package created: $OUTPUT_FILE"
echo ""
echo "Next steps:"
echo "1. Go to: https://chrome.google.com/webstore/devconsole"
echo "2. Register as a developer (\$5 one-time fee)"
echo "3. Click 'New Item' and upload: $OUTPUT_FILE"
echo "4. Complete the store listing (see CHROME_WEB_STORE_GUIDE.md)"
echo ""
echo "Don't forget to:"
echo "- Create and host a privacy policy"
echo "- Take screenshots of your extension"
echo "- Fill in all required store listing information"
