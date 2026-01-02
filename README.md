# bookmark_export_extension

This is a Chrome extension popup script for exporting Twitter/X bookmarks. 
Original code: 

Twitter Bookmark Exporter - Chrome Web Store => 
https://chromewebstore.google.com/detail/twitter-bookmark-exporter/aggiedibmjnhcjlngcffegdhfdmfjodc


# code in popup.js

## Main Components

### **Export Button Handler** (`popup.js:1-33`)
- Validates the user is on Twitter/X bookmarks page
- Disables the button and shows progress UI
- Injects [startBookmarkExport](popup.js:68:0-196:1) function into the active tab using Chrome's scripting API

### **Message Listener** (`popup.js:36-64`)
Receives messages from the injected content script:
- **`progressUpdate`**: Updates status text and progress bar
- **`complete`**: Creates a JSON blob of bookmarks and triggers download via Chrome's downloads API

## Injected Function: startBookmarkExport

### **collectAllBookmarks()** (`popup.js:71-145`)
Main collection logic that:
1. **Scrolls to top** and waits 2 seconds
2. **Loops up to 500 times**, each iteration:
   - Collects visible bookmarks via [collectVisibleBookmarks()](popup.js:146:4-192:5)
   - Scrolls down 2000px
   - Waits 1.5 seconds for content to load
   - Tracks if new bookmarks were found
3. **Exit conditions**:
   - No new bookmarks found for 10+ consecutive scrolls AND reached bottom
   - Page height unchanged AND at bottom (does a final scroll-to-top-then-bottom to ensure all loaded)
   - 500 scroll attempts reached
4. Sends progress updates and final completion message

### **collectVisibleBookmarks()** (`popup.js:147-193`)
Extracts bookmark data from DOM:
- Finds all `article[data-testid="tweet"]` elements
- For each tweet, extracts:
  - **Text**: from `[data-testid="tweetText"]`
  - **Timestamp**: from `<time>` element's `datetime` attribute
  - **Author**: from `[data-testid="User-Name"]`
  - **Link & ID**: from the time element's parent link (extracts ID from URL pattern `/status/(\d+)`)
- Uses tweet ID as key to deduplicate bookmarks
- Returns object with tweet IDs as keys

## Key Features

- **Deduplication**: Uses object with tweet IDs as keys to avoid duplicates
- **Infinite scroll handling**: Automatically scrolls and waits for content to load
- **Progress tracking**: Updates UI with bookmark count and progress percentage
- **Smart exit**: Multiple conditions to detect when all bookmarks are loaded
- **Download**: Saves as `twitter_bookmarks.json` with pretty-printed JSON


