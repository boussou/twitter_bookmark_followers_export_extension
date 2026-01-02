// Followers/Following Export Handler - validates user is on followers/following page and injects the export script
document.getElementById('exportFollowersButton').addEventListener('click', async() => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Validate the user is on Twitter/X
    if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) {
        document.getElementById('status').textContent = 'Please navigate to Twitter/X first';
        return;
    }

    // Validate the user is on a followers or following page
    if (!tab.url.includes('/followers') && !tab.url.includes('/following')) {
        document.getElementById('status').textContent = 'Please go to a followers or following page first';
        return;
    }

    const button = document.getElementById('exportFollowersButton');
    const status = document.getElementById('status');
    const progress = document.getElementById('progress');

    // Disable both buttons and show progress UI
    document.getElementById('exportButton').disabled = true;
    button.disabled = true;
    status.textContent = 'Starting export...';
    progress.style.display = 'block';
    progress.value = 0;

    // Determine the export type from URL
    const exportType = tab.url.includes('/followers') ? 'followers' : 'following';

    // Inject the content script into the active tab using Chrome's scripting API
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: startFollowersExport,
            args: [exportType]
        });
    } catch (err) {
        status.textContent = 'Error: ' + err.message;
        button.disabled = false;
        document.getElementById('exportButton').disabled = false;
    }
});

// Message Listener - receives messages from the injected content script for followers/following export
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== 'followersProgressUpdate' && message.type !== 'followersComplete') {
        return; // Ignore messages not related to followers export
    }

    const status = document.getElementById('status');
    const progress = document.getElementById('progress');
    const exportButton = document.getElementById('exportButton');
    const followersButton = document.getElementById('exportFollowersButton');

    // Handle progress updates from the content script
    if (message.type === 'followersProgressUpdate') {
        status.textContent = message.message;
        if (message.progress) {
            progress.value = message.progress;
        }
    } else if (message.type === 'followersComplete') {
        // Handle completion - create JSON blob and trigger download
        if (message.users && message.users.length > 0) {
            const blob = new Blob([JSON.stringify(message.users, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const filename = message.exportType === 'followers' ? 'twitter_followers.json' : 'twitter_following.json';

            // Trigger download via Chrome's downloads API
            chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true
            }, () => {
                status.textContent = `Download complete! Saved ${message.users.length} ${message.exportType}.`;
                followersButton.disabled = false;
                exportButton.disabled = false;
            });
        } else {
            status.textContent = 'No users found. Try refreshing the page.';
            followersButton.disabled = false;
            exportButton.disabled = false;
        }
    }
});

// Function to be injected into the Twitter/X followers/following page
function startFollowersExport(exportType) {
    // Maximum number of scroll attempts before stopping
    const MAX_SCROLL_ATTEMPTS = 500;

    // Main collection logic - scrolls through followers/following page and collects all visible users
    async function collectAllUsers() {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        let users = {}; // Uses user identifiers as keys for deduplication
        let previousHeight = 0;
        let noNewUsersCount = 0;
        let scrollAttempts = 0;
        let lastUserCount = 0;

        // Scroll to top first and wait for content to load
        window.scrollTo(0, 0);
        await delay(2000);

        // Loop up to MAX_SCROLL_ATTEMPTS times to scroll and collect users
        while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
            scrollAttempts++;

            // Collect visible users on the current screen
            const currentUsers = collectVisibleUsers();
            const prevCount = Object.keys(users).length;

            // Merge new users (deduplication happens automatically via object keys)
            Object.assign(users, currentUsers);
            const newCount = Object.keys(users).length;

            // Send progress update if new users were found
            if (newCount > lastUserCount) {
                lastUserCount = newCount;
                chrome.runtime.sendMessage({
                    type: 'followersProgressUpdate',
                    message: `Found ${newCount} users so far...`,
                    progress: Math.min((scrollAttempts / MAX_SCROLL_ATTEMPTS) * 100, 100)
                });
            }

            // Scroll down 2160px and wait for content to load
            window.scrollBy(0, 2160);
            await delay(1000);

            const currentHeight = document.documentElement.scrollHeight;
            const scrollPosition = window.scrollY + window.innerHeight;

            // Exit condition 1: No new users found for 10+ consecutive scrolls AND reached bottom
            if (newCount === prevCount) {
                noNewUsersCount++;
                if (noNewUsersCount > 10 && (scrollPosition >= currentHeight - 100)) {
                    break;
                }
            } else {
                noNewUsersCount = 0;
            }

            // Exit condition 2: Page height unchanged AND at bottom
            // Do a final scroll-to-top-then-bottom to ensure all content is loaded
            if (currentHeight === previousHeight) {
                if (scrollPosition >= currentHeight - 100) {
                    window.scrollTo(0, 0);
                    await delay(2000);
                    window.scrollTo(0, currentHeight);
                    await delay(2000);

                    const finalUsers = collectVisibleUsers();
                    Object.assign(users, finalUsers);
                    break;
                }
            }
            previousHeight = currentHeight;
        }

        // Convert users object to array
        const usersArray = Object.values(users);

        // Send progress update
        chrome.runtime.sendMessage({
            type: 'followersProgressUpdate',
            message: `Collection complete. Processing ${usersArray.length} users...`,
            progress: 100
        });

        await delay(1000);

        // Send final completion message with all users
        chrome.runtime.sendMessage({
            type: 'followersComplete',
            users: usersArray,
            exportType: exportType
        });
    }

    // Extracts user data from currently visible DOM elements
    function collectVisibleUsers() {
        const users = {};
        // Find all user cells on the page
        const userCells = document.querySelectorAll('[data-testid="UserCell"]');

        userCells.forEach(cell => {
            let userName = '';
            let userIdentifier = '';
            let userDescription = '';
            let userLink = '';

            // Extract user identifier from the link (most reliable identifier)
            const linkElements = cell.querySelectorAll('a[href^="/"]');
            for (const link of linkElements) {
                const href = link.getAttribute('href');
                if (href && href.startsWith('/') && !href.includes('/status/') && href.length > 1) {
                    userIdentifier = href.substring(1); // Remove leading '/'
                    userLink = 'https://twitter.com' + href;
                    break;
                }
            }

            // Extract user name - look for the display name in the cell
            // The name appears in a span with specific text content before the @username
            const textElements = cell.querySelectorAll('span');
            for (let i = 0; i < textElements.length; i++) {
                const text = textElements[i].textContent.trim();
                // User name is typically before the @identifier and not empty
                if (text && !text.startsWith('@') && text.length > 0 && text.length < 100) {
                    // Check if next element contains the @identifier
                    if (i + 1 < textElements.length) {
                        const nextText = textElements[i + 1].textContent.trim();
                        if (nextText.startsWith('@' + userIdentifier) || nextText === '@' + userIdentifier) {
                            userName = text;
                            break;
                        }
                    }
                }
            }

            // Extract user description - it's typically in a span at the bottom of the cell
            const descriptionElements = cell.querySelectorAll('span');
            for (const elem of descriptionElements) {
                const text = elem.textContent.trim();
                // Description is usually longer and doesn't start with @ or contain "Following" button text
                if (text && text.length > 20 && !text.startsWith('@') && 
                    !text.includes('Following') && !text.includes('Follow') && 
                    !text.includes('Follows you') && text !== userName) {
                    userDescription = text;
                    break;
                }
            }

            // Only add user if we have a valid identifier
            // Use user identifier as key for automatic deduplication
            if (userIdentifier) {
                users[userIdentifier] = {
                    name: userName,
                    identifier: '@' + userIdentifier,
                    description: userDescription,
                    link: userLink
                };
            }
        });

        return users;
    }

    // Start the collection process
    collectAllUsers();
}
