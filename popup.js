document.getElementById('exportButton').addEventListener('click', async() => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) {
        document.getElementById('status').textContent = 'Please navigate to Twitter/X first';
        return;
    }

    if (!tab.url.includes('/i/bookmarks')) {
        document.getElementById('status').textContent = 'Please go to your bookmarks page first';
        return;
    }

    const button = document.getElementById('exportButton');
    const status = document.getElementById('status');
    const progress = document.getElementById('progress');

    button.disabled = true;
    status.textContent = 'Starting export...';
    progress.style.display = 'block';
    progress.value = 0;

    // Inject the content script
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: startBookmarkExport
        });
    } catch (err) {
        status.textContent = 'Error: ' + err.message;
        button.disabled = false;
    }
});

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const status = document.getElementById('status');
    const progress = document.getElementById('progress');
    const button = document.getElementById('exportButton');

    if (message.type === 'progressUpdate') {
        status.textContent = message.message;
        if (message.progress) {
            progress.value = message.progress;
        }
    } else if (message.type === 'complete') {
        if (message.bookmarks && message.bookmarks.length > 0) {
            const blob = new Blob([JSON.stringify(message.bookmarks, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            chrome.downloads.download({
                url: url,
                filename: 'twitter_bookmarks.json',
                saveAs: true
            }, () => {
                status.textContent = `Download complete! Saved ${message.bookmarks.length} bookmarks.`;
                button.disabled = false;
            });
        } else {
            status.textContent = 'No bookmarks found. Try refreshing the page.';
            button.disabled = false;
        }
    }
});

// background.js
// Empty file but needed for manifest

// Function to be injected
function startBookmarkExport() {
    async function collectAllBookmarks() {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        let bookmarks = {};
        let previousHeight = 0;
        let noNewBookmarksCount = 0;
        let scrollAttempts = 0;
        let lastBookmarkCount = 0;

        // Scroll to top first
        window.scrollTo(0, 0);
        await delay(2000);

        while (scrollAttempts < 500) {
            scrollAttempts++;

            const currentBookmarks = collectVisibleBookmarks();
            const prevCount = Object.keys(bookmarks).length;

            Object.assign(bookmarks, currentBookmarks);
            const newCount = Object.keys(bookmarks).length;

            if (newCount > lastBookmarkCount) {
                lastBookmarkCount = newCount;
                chrome.runtime.sendMessage({
                    type: 'progressUpdate',
                    message: `Found ${newCount} bookmarks so far...`,
                    progress: Math.min((scrollAttempts / 200) * 100, 100)
                });
            }

            window.scrollBy(0, 2000);
            await delay(1500);

            const currentHeight = document.documentElement.scrollHeight;
            const scrollPosition = window.scrollY + window.innerHeight;

            if (newCount === prevCount) {
                noNewBookmarksCount++;
                if (noNewBookmarksCount > 10 && (scrollPosition >= currentHeight - 100)) {
                    break;
                }
            } else {
                noNewBookmarksCount = 0;
            }

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

        const bookmarksArray = Object.values(bookmarks);

        chrome.runtime.sendMessage({
            type: 'progressUpdate',
            message: `Collection complete. Processing ${bookmarksArray.length} bookmarks...`,
            progress: 100
        });

        await delay(1000);

        chrome.runtime.sendMessage({
            type: 'complete',
            bookmarks: bookmarksArray
        });
    }

    function collectVisibleBookmarks() {
        const bookmarks = {};
        const bookmarkItems = document.querySelectorAll('article[data-testid="tweet"]');

        bookmarkItems.forEach(item => {
            let tweetText = '';
            let timestamp = '';
            let author = '';
            let tweetLink = '';
            let tweetId = '';

            const tweetTextElement = item.querySelector('[data-testid="tweetText"]');
            if (tweetTextElement && tweetTextElement.textContent) {
                tweetText = tweetTextElement.textContent.trim();
            }

            const timeElement = item.querySelector('time');
            if (timeElement) {
                timestamp = timeElement.getAttribute('datetime') || '';
                const linkElement = timeElement.closest('a');
                if (linkElement) {
                    tweetLink = linkElement.href;
                    const matches = tweetLink.match(/status\/(\d+)/);
                    if (matches) {
                        tweetId = matches[1];
                    }
                }
            }

            const authorElement = item.querySelector('[data-testid="User-Name"]');
            if (authorElement && authorElement.textContent) {
                author = authorElement.textContent.trim();
            }

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