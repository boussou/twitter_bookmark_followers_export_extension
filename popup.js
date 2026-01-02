// Store collected bookmarks globally so save button can access them
let collectedBookmarks = [];

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
    const status = document.getElementById('status');
    const progress = document.getElementById('progress');

    // Disable both buttons and show progress UI
    button.disabled = true;
    followersButton.disabled = true;
    saveButton.style.display = 'none';
    collectedBookmarks = [];
    status.textContent = 'Starting export...';
    progress.style.display = 'block';
    progress.value = 0;

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
    }
});

// Save Button Handler - triggers download of collected bookmarks
document.getElementById('saveButton').addEventListener('click', () => {
    const saveButton = document.getElementById('saveButton');
    const status = document.getElementById('status');
    const button = document.getElementById('exportButton');
    const followersButton = document.getElementById('exportFollowersButton');
    
    if (collectedBookmarks.length > 0) {
        const blob = new Blob([JSON.stringify(collectedBookmarks, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: 'twitter_bookmarks.json',
            saveAs: true
        }, () => {
            status.textContent = `Download complete! Saved ${collectedBookmarks.length} bookmarks.`;
            button.disabled = false;
            followersButton.disabled = false;
            saveButton.style.display = 'none';
        });
    } else {
        status.textContent = 'No bookmarks collected yet.';
    }
});

// Message Listener - receives messages from the injected content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Only handle bookmark-related messages in this listener
    if (message.type !== 'progressUpdate' && message.type !== 'complete') {
        return; // Let followersExport.js handle other message types
    }

    const status = document.getElementById('status');
    const progress = document.getElementById('progress');
    const button = document.getElementById('exportButton');
    const followersButton = document.getElementById('exportFollowersButton');
    const saveButton = document.getElementById('saveButton');

    // Handle progress updates from the content script
    if (message.type === 'progressUpdate') {
        status.textContent = message.message;
        if (message.progress) {
            progress.value = message.progress;
        }
        // Store bookmarks and show save button when we have data
        if (message.bookmarks) {
            collectedBookmarks = message.bookmarks;
            if (collectedBookmarks.length > 0) {
                saveButton.style.display = 'block';
            }
        }
    } else if (message.type === 'complete') {
        // Store the final bookmarks
        if (message.bookmarks) {
            collectedBookmarks = message.bookmarks;
        }
        // Handle completion - show save button and update status
        if (collectedBookmarks.length > 0) {
            status.textContent = `Export complete! Found ${collectedBookmarks.length} bookmarks. Click 'Save Bookmarks Now' to download.`;
            saveButton.style.display = 'block';
        } else {
            status.textContent = 'No bookmarks found. Try refreshing the page.';
            button.disabled = false;
            followersButton.disabled = false;
            saveButton.style.display = 'none';
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

        // Scroll to top first and wait for content to load
        window.scrollTo(0, 0);
        await delay(2000);

        // Loop up to MAX_SCROLL_ATTEMPTS times to scroll and collect bookmarks
        while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
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
                chrome.runtime.sendMessage({
                    type: 'progressUpdate',
                    message: `Found ${newCount} bookmarks so far...`,
                    progress: Math.min((scrollAttempts / MAX_SCROLL_ATTEMPTS) * 100, 100),
                    bookmarks: Object.values(bookmarks)
                });
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

        // Send progress update
        chrome.runtime.sendMessage({
            type: 'progressUpdate',
            message: `Collection complete. Processing ${bookmarksArray.length} bookmarks...`,
            progress: 100
        });

        await delay(1000);

        // Send final completion message with all bookmarks
        chrome.runtime.sendMessage({
            type: 'complete',
            bookmarks: bookmarksArray
        });
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