// Store collected bookmarks globally so save button can access them
let collectedBookmarks = [];

// Initialize: Check if there's existing data in storage on popup load
(async function initializePopup() {
    try {
        const result = await chrome.storage.local.get(['bookmarksData', 'exportInProgress']);
        
        // Check if an export is currently in progress
        if (result.exportInProgress) {
            const exportButton = document.getElementById('exportButton');
            const followersButton = document.getElementById('exportFollowersButton');
            const stopButton = document.getElementById('stopButton');
            const loader = document.getElementById('loaderContainer');
            const status = document.getElementById('status');
            
            exportButton.disabled = true;
            followersButton.disabled = true;
            stopButton.style.display = 'block';
            loader.style.display = 'flex';
            status.textContent = result.exportInProgress.message || 'Export in progress...';
        }
        
        // Check if there's existing bookmarks data
        if (result.bookmarksData && result.bookmarksData.length > 0) {
            collectedBookmarks = result.bookmarksData;
            const saveButton = document.getElementById('saveButton');
            const clearButton = document.getElementById('clearButton');
            const status = document.getElementById('status');
            
            saveButton.style.display = 'block';
            // Only show clear button if no export is in progress
            if (!result.exportInProgress) {
                clearButton.style.display = 'block';
            }
            
            // Only update status if no export is in progress
            if (!result.exportInProgress) {
                status.textContent = `Found ${collectedBookmarks.length} bookmarks in storage. Ready to save.`;
            }
        }
    } catch (err) {
        console.error('Error checking storage on initialization:', err);
    }
})()

// Export Button Handler - validates user is on Twitter/X bookmarks page and injects the export script
document.getElementById('exportButton').addEventListener('click', async() => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Validate the user is on Twitter/X
    if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) {
        document.getElementById('status').textContent = 'Please navigate to Twitter/X first';
        return;
    }

    // Validate the user is on the bookmarks page
    if (!tab.url.includes('/i/bookmarks')) {
        document.getElementById('status').textContent = 'Please go to your bookmarks page first';
        return;
    }

    const button = document.getElementById('exportButton');
    const followersButton = document.getElementById('exportFollowersButton');
    const saveButton = document.getElementById('saveButton');
    const clearButton = document.getElementById('clearButton');
    const stopButton = document.getElementById('stopButton');
    const status = document.getElementById('status');
    const loader = document.getElementById('loaderContainer');

    // Disable both buttons and show loader
    button.disabled = true;
    followersButton.disabled = true;
    saveButton.style.display = 'none';
    clearButton.style.display = 'none';
    stopButton.style.display = 'block';
    collectedBookmarks = [];
    status.textContent = 'Starting export...';
    loader.style.display = 'flex';
    
    // Set export in progress flag
    await chrome.storage.local.set({ exportInProgress: { type: 'bookmarks', message: 'Starting export...' } });

    // Inject the content script into the active tab using Chrome's scripting API
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: startBookmarkExport
        });
    } catch (err) {
        status.textContent = 'Error: ' + err.message;
        button.disabled = false;
        followersButton.disabled = false;
        stopButton.style.display = 'none';
        loader.style.display = 'none';
        await chrome.storage.local.remove('exportInProgress');
    }
});

// Save Button Handler - triggers download of collected bookmarks
document.getElementById('saveButton').addEventListener('click', async () => {
    const saveButton = document.getElementById('saveButton');
    const clearButton = document.getElementById('clearButton');
    const status = document.getElementById('status');
    const button = document.getElementById('exportButton');
    const followersButton = document.getElementById('exportFollowersButton');
    
    if (collectedBookmarks.length > 0) {
        try {
            status.textContent = `Preparing to save ${collectedBookmarks.length} bookmarks...`;
            
            // For large datasets, create JSON string in chunks to avoid memory issues
            let jsonString;
            try {
                jsonString = JSON.stringify(collectedBookmarks, null, 2);
            } catch (err) {
                // If pretty print fails, try without formatting
                status.textContent = 'Large dataset detected, using compact format...';
                jsonString = JSON.stringify(collectedBookmarks);
            }
            
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            chrome.downloads.download({
                url: url,
                filename: 'twitter_bookmarks.json',
                saveAs: true
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    status.textContent = `Error: ${chrome.runtime.lastError.message}`;
                } else {
                    status.textContent = `Download started! Saving ${collectedBookmarks.length} bookmarks.`;
                    button.disabled = false;
                    followersButton.disabled = false;
                }
                // Clean up the blob URL after a delay
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            });
        } catch (err) {
            status.textContent = `Error preparing download: ${err.message}`;
            console.error('Save error:', err);
        }
    } else {
        status.textContent = 'No bookmarks collected yet.';
    }
});

// Stop Button Handler - stops the current export
document.getElementById('stopButton').addEventListener('click', async () => {
    const stopButton = document.getElementById('stopButton');
    const exportButton = document.getElementById('exportButton');
    const followersButton = document.getElementById('exportFollowersButton');
    const saveButton = document.getElementById('saveButton');
    const clearButton = document.getElementById('clearButton');
    const loader = document.getElementById('loaderContainer');
    const status = document.getElementById('status');
    
    // Set stop flag and clear the export in progress flag
    await chrome.storage.local.set({ stopExport: true });
    await chrome.storage.local.remove('exportInProgress');
    
    // Re-enable buttons and hide loader
    exportButton.disabled = false;
    followersButton.disabled = false;
    stopButton.style.display = 'none';
    loader.style.display = 'none';
    
    // Check if there's data to show save/clear buttons
    const result = await chrome.storage.local.get(['bookmarksData']);
    if (result.bookmarksData && result.bookmarksData.length > 0) {
        collectedBookmarks = result.bookmarksData;
        saveButton.style.display = 'block';
        clearButton.style.display = 'block';
        status.textContent = `Export stopped. Found ${collectedBookmarks.length} bookmarks. Click 'Save Bookmarks Now' to download.`;
    } else {
        status.textContent = 'Export stopped.';
    }
});

// Clear Button Handler - clears bookmarks data from storage
document.getElementById('clearButton').addEventListener('click', async () => {
    const saveButton = document.getElementById('saveButton');
    const clearButton = document.getElementById('clearButton');
    const status = document.getElementById('status');
    const button = document.getElementById('exportButton');
    const followersButton = document.getElementById('exportFollowersButton');
    
    if (confirm(`Are you sure you want to clear ${collectedBookmarks.length} bookmarks from storage?`)) {
        try {
            await chrome.storage.local.remove(['bookmarksData']);
            collectedBookmarks = [];
            saveButton.style.display = 'none';
            clearButton.style.display = 'none';
            status.textContent = 'Bookmarks data cleared successfully.';
            button.disabled = false;
            followersButton.disabled = false;
        } catch (err) {
            status.textContent = `Error clearing data: ${err.message}`;
            console.error('Clear error:', err);
        }
    }
});

// Message Listener - receives messages from the injected content script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    // Only handle bookmark-related messages in this listener
    if (message.type !== 'progressUpdate' && message.type !== 'complete') {
        return; // Let followersExport.js handle other message types
    }

    const status = document.getElementById('status');
    const loader = document.getElementById('loaderContainer');
    const button = document.getElementById('exportButton');
    const followersButton = document.getElementById('exportFollowersButton');
    const saveButton = document.getElementById('saveButton');
    const clearButton = document.getElementById('clearButton');
    const stopButton = document.getElementById('stopButton');

    // Handle progress updates from the content script
    if (message.type === 'progressUpdate') {
        status.textContent = message.message;
        loader.style.display = 'flex';
        stopButton.style.display = 'block';
        // Update export in progress status
        await chrome.storage.local.set({ exportInProgress: { type: 'bookmarks', message: message.message } });
        // For large datasets, retrieve from storage instead of message
        if (message.count > 0) {
            try {
                const result = await chrome.storage.local.get(['bookmarksData']);
                if (result.bookmarksData && result.bookmarksData.length > 0) {
                    collectedBookmarks = result.bookmarksData;
                    saveButton.style.display = 'block';
                    // Don't show clear button during export
                }
            } catch (err) {
                console.error('Error retrieving bookmarks from storage:', err);
            }
        }
    } else if (message.type === 'complete') {
        // Retrieve the final bookmarks from storage
        try {
            const result = await chrome.storage.local.get(['bookmarksData']);
            if (result.bookmarksData) {
                collectedBookmarks = result.bookmarksData;
            }
            // Handle completion - show save button and update status
            if (collectedBookmarks.length > 0) {
                status.textContent = `Export complete! Found ${collectedBookmarks.length} bookmarks. Click 'Save Bookmarks Now' to download.`;
                loader.style.display = 'none';
                stopButton.style.display = 'none';
                saveButton.style.display = 'block';
                clearButton.style.display = 'block';
                // Clear export in progress flag
                await chrome.storage.local.remove('exportInProgress');
            } else {
                status.textContent = 'No bookmarks found. Try refreshing the page.';
                loader.style.display = 'none';
                stopButton.style.display = 'none';
                button.disabled = false;
                followersButton.disabled = false;
                saveButton.style.display = 'none';
                clearButton.style.display = 'none';
                // Clear export in progress flag
                await chrome.storage.local.remove('exportInProgress');
            }
        } catch (err) {
            status.textContent = 'Error retrieving bookmarks: ' + err.message;
            loader.style.display = 'none';
            stopButton.style.display = 'none';
            button.disabled = false;
            followersButton.disabled = false;
            // Clear export in progress flag
            await chrome.storage.local.remove('exportInProgress');
        }
    }
});

// background.js
// Empty file but needed for manifest

// Function to be injected into the Twitter/X bookmarks page
function startBookmarkExport() {
    // Maximum number of scroll attempts before stopping
    const MAX_SCROLL_ATTEMPTS = 5000;

    // Main collection logic - scrolls through bookmarks page and collects all visible bookmarks
    async function collectAllBookmarks() {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        let bookmarks = {}; // Uses tweet IDs as keys for deduplication
        let previousHeight = 0;
        let noNewBookmarksCount = 0;
        let scrollAttempts = 0;
        let lastBookmarkCount = 0;

        // Clear any previous stop flag
        await chrome.storage.local.remove('stopExport');

        // Scroll to top first and wait for content to load
        window.scrollTo(0, 0);
        await delay(2000);

        // Loop up to MAX_SCROLL_ATTEMPTS times to scroll and collect bookmarks
        while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
            // Check if user requested to stop
            const stopCheck = await chrome.storage.local.get(['stopExport']);
            if (stopCheck.stopExport) {
                await chrome.storage.local.remove('stopExport');
                break;
            }
            
            scrollAttempts++;

            // Collect visible bookmarks on the current screen
            const currentBookmarks = collectVisibleBookmarks();
            const prevCount = Object.keys(bookmarks).length;

            // Merge new bookmarks (deduplication happens automatically via object keys)
            Object.assign(bookmarks, currentBookmarks);
            const newCount = Object.keys(bookmarks).length;

            // Send progress update if new bookmarks were found
            if (newCount > lastBookmarkCount) {
                lastBookmarkCount = newCount;
                // Store in chrome.storage for large datasets
                try {
                    await chrome.storage.local.set({ bookmarksData: Object.values(bookmarks) });
                    chrome.runtime.sendMessage({
                        type: 'progressUpdate',
                        message: `Found ${newCount} bookmarks so far...`,
                        progress: Math.min(50+(scrollAttempts / MAX_SCROLL_ATTEMPTS) * 100, 100),
                        count: newCount
                    });
                } catch (err) {
                    // Fallback: just send count without data
                    chrome.runtime.sendMessage({
                        type: 'progressUpdate',
                        message: `Found ${newCount} bookmarks so far...`,
                        progress: Math.min(50+(scrollAttempts / MAX_SCROLL_ATTEMPTS) * 100, 100),
                        count: newCount
                    });
                }
            }

            // Scroll down by viewport height and wait for content to load
            window.scrollBy(0, window.innerHeight);
            await delay(3000);

            const currentHeight = document.documentElement.scrollHeight;
            const scrollPosition = window.scrollY + window.innerHeight;

            // Exit condition 1: No new bookmarks found for 10+ consecutive scrolls AND reached bottom
            if (newCount === prevCount) {
                noNewBookmarksCount++;
                if (noNewBookmarksCount > 10 && (scrollPosition >= currentHeight - 100)) {
                    break;
                }
            } else {
                noNewBookmarksCount = 0;
            }

            // Exit condition 2: Page height unchanged AND at bottom
            // Do a final scroll-to-top-then-bottom to ensure all content is loaded
            if (currentHeight === previousHeight) {
                if (scrollPosition >= currentHeight - 100) {
                    window.scrollTo(0, 0);
                    await delay(2000);
                    window.scrollTo(0, currentHeight);
                    await delay(2000);

                    const finalBookmarks = collectVisibleBookmarks();
                    Object.assign(bookmarks, finalBookmarks);
                    break;
                }
            }
            previousHeight = currentHeight;
        }

        // Convert bookmarks object to array
        const bookmarksArray = Object.values(bookmarks);

        // Store bookmarks in chrome.storage.local to avoid message size limits
        try {
            await chrome.storage.local.set({ bookmarksData: bookmarksArray });
            
            // Send progress update
            chrome.runtime.sendMessage({
                type: 'progressUpdate',
                message: `Collection complete. Processing ${bookmarksArray.length} bookmarks...`,
                progress: 100,
                count: bookmarksArray.length
            });

            await delay(1000);

            // Send final completion message (data is in storage)
            chrome.runtime.sendMessage({
                type: 'complete',
                count: bookmarksArray.length
            });
        } catch (err) {
            chrome.runtime.sendMessage({
                type: 'progressUpdate',
                message: `Error saving bookmarks: ${err.message}`,
                progress: 100
            });
        }
    }

    // Extracts bookmark data from currently visible DOM elements
    function collectVisibleBookmarks() {
        const bookmarks = {};
        // Find all tweet articles on the page
        const bookmarkItems = document.querySelectorAll('article[data-testid="tweet"]');

        bookmarkItems.forEach(item => {
            let tweetText = '';
            let timestamp = '';
            let author = '';
            let tweetLink = '';
            let tweetId = '';

            // Extract tweet text
            const tweetTextElement = item.querySelector('[data-testid="tweetText"]');
            if (tweetTextElement && tweetTextElement.textContent) {
                tweetText = tweetTextElement.textContent.trim();
            }

            // Extract timestamp, link, and ID from the time element
            const timeElement = item.querySelector('time');
            if (timeElement) {
                timestamp = timeElement.getAttribute('datetime') || '';
                const linkElement = timeElement.closest('a');
                if (linkElement) {
                    tweetLink = linkElement.href;
                    // Extract tweet ID from URL pattern /status/(\d+)
                    const matches = tweetLink.match(/status\/(\d+)/);
                    if (matches) {
                        tweetId = matches[1];
                    }
                }
            }

            // Extract author information
            const authorElement = item.querySelector('[data-testid="User-Name"]');
            if (authorElement && authorElement.textContent) {
                author = authorElement.textContent.trim();
            }

            // Only add bookmark if we have a valid tweet ID and either text or author
            // Use tweet ID as key for automatic deduplication
            if (tweetId && (tweetText || author)) {
                bookmarks[tweetId] = {
                    text: tweetText,
                    author: author,
                    timestamp: timestamp,
                    link: tweetLink,
                    id: tweetId
                };
            }
        });

        return bookmarks;
    }

    // Start the collection process
    collectAllBookmarks();
}