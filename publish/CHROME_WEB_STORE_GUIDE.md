# Chrome Web Store Publishing Guide

## Prerequisites

1. **Google Account**: You need a Google account to access the Chrome Web Store Developer Dashboard
2. **Developer Fee**: One-time $5 registration fee
3. **Extension Package**: A ZIP file containing all extension files

## Required Assets for Submission

### 1. Extension Files (Already Complete ✓)
- `manifest.json` ✓
- `popup.html` ✓
- `popup.js` ✓
- `background.js` ✓
- `followersExport.js` ✓
- Icons (16x16, 32x32, 48x48, 128x128) ✓

### 2. Store Listing Assets (You Need to Prepare)

#### **Screenshots** (REQUIRED - at least 1, maximum 5)
- Size: 1280x800 or 640x400 pixels
- Format: PNG or JPEG
- Show your extension in action on Twitter/X
- Recommended screenshots:
  1. Extension popup showing export options
  2. Export in progress with progress bar
  3. Successfully exported bookmarks
  4. Exported JSON file preview

#### **Promotional Images** (OPTIONAL but recommended)

**Small Promotional Tile** (440x280 pixels)
- Used in Chrome Web Store search results
- PNG or JPEG format

**Marquee Promotional Tile** (1400x560 pixels)
- Featured placement (if selected by Chrome Web Store)
- PNG or JPEG format

### 3. Store Listing Information

**Extension Name**: Twitter Bookmark & Followers Exporter

**Summary** (132 characters max):
Export your Twitter/X bookmarks and followers/following lists to JSON files with one click.

**Description** (Detailed):
```
Export your Twitter/X bookmarks and followers/following lists that are missing from the official Twitter data export.

FEATURES:
• Export all your Twitter/X bookmarks to JSON format
• Export your followers list
• Export your following list
• One-click export with progress tracking
• Automatic scrolling and data collection
• Deduplicated results
• No data sent to external servers - all processing happens locally

HOW TO USE:
1. Navigate to your Twitter/X bookmarks page (twitter.com/i/bookmarks or x.com/i/bookmarks)
2. Click the extension icon
3. Choose what to export (Bookmarks, Followers, or Following)
4. Wait for the export to complete
5. Your data will be downloaded as a JSON file

PRIVACY:
This extension processes all data locally in your browser. No data is sent to external servers.

EXTRACTED DATA:
For bookmarks:
- Tweet text
- Author information
- Timestamp
- Tweet URL and ID

For followers/following:
- User profiles and metadata

This is the export functionality missing from Twitter's official data archive (Settings → Your account → Download an archive of your data).
```

**Category**: Productivity

**Language**: English

**Privacy Policy**: You'll need to create one (see below)

## Step-by-Step Publishing Process

### Step 1: Create Extension ZIP Package

Run this command in your extension directory:
```bash
zip -r twitter-bookmark-and-followers-exporter-v1.0.zip . -x "*.git*" -x "*.md" -x "CHROME_WEB_STORE_GUIDE.md"
```

Or manually:
1. Select all necessary files (manifest.json, popup.html, popup.js, background.js, followersExport.js, icons/)
2. Create a ZIP archive
3. Do NOT include: .git, .gitignore, README.md, or this guide

### Step 2: Register as Chrome Web Store Developer

1. Go to: https://chrome.google.com/webstore/devconsole
2. Sign in with your Google account
3. Pay the one-time $5 developer registration fee
4. Accept the developer agreement

### Step 3: Create Privacy Policy

You MUST host a privacy policy. Here's a template:

```
Privacy Policy for Twitter Bookmark & Followers Exporter

Last Updated: [Current Date]

This extension processes all data locally in your browser. We do not collect, store, or transmit any personal data to external servers.

Data Processing:
- All bookmark and follower data is processed locally in your browser
- Exported data is saved directly to your computer
- No analytics or tracking is performed
- No data is sent to third-party services

Permissions:
- activeTab: Required to access Twitter/X page content
- downloads: Required to save exported files
- scripting: Required to inject export functionality
- host_permissions (twitter.com, x.com): Required to interact with Twitter/X pages

Contact:
[Your Email Address]
```

Host this on:
- GitHub Pages (free)
- Your personal website
- Google Sites (free)
- Any web hosting service

### Step 4: Upload Extension

1. Go to Chrome Web Store Developer Dashboard
2. Click "New Item"
3. Upload your ZIP file
4. Wait for automated checks to complete

### Step 5: Complete Store Listing

Fill in all required fields:
- **Product Details**
  - Extension name
  - Summary (132 chars max)
  - Detailed description
  - Category: Productivity
  - Language: English

- **Graphic Assets**
  - Icon (already in manifest.json)
  - Screenshots (at least 1, up to 5)
  - Small promotional tile (optional)
  - Marquee tile (optional)

- **Privacy**
  - Privacy policy URL (required)
  - Single purpose description: "Export Twitter/X bookmarks and followers/following lists"
  - Permission justifications (auto-filled from manifest)
  - Data usage disclosure

- **Distribution**
  - Visibility: Public
  - Regions: All regions (or select specific ones)
  - Pricing: Free

### Step 6: Submit for Review

1. Review all information
2. Click "Submit for Review"
3. Review typically takes 1-3 business days
4. You'll receive email notifications about the review status

## Common Rejection Reasons to Avoid

1. **Missing Privacy Policy**: Must be publicly accessible
2. **Unclear Permissions**: Explain why each permission is needed
3. **Misleading Description**: Be accurate about functionality
4. **Poor Quality Screenshots**: Use clear, high-resolution images
5. **Single Purpose Violation**: Extension should have one clear purpose
6. **Trademark Issues**: Don't use "Twitter" or "X" logos without permission

## After Approval

- Your extension will be live on Chrome Web Store
- Users can install it directly from the store
- You can update it by uploading new versions
- Monitor user reviews and feedback

## Updating Your Extension

1. Update version number in `manifest.json`
2. Create new ZIP package
3. Upload to existing item in Developer Dashboard
4. Submit for review again

## Support & Resources

- Chrome Web Store Developer Documentation: https://developer.chrome.com/docs/webstore/
- Developer Dashboard: https://chrome.google.com/webstore/devconsole
- Chrome Web Store Program Policies: https://developer.chrome.com/docs/webstore/program-policies/

## Quick Checklist

- [ ] Register as Chrome Web Store developer ($5 fee)
- [ ] Create privacy policy and host it online
- [ ] Take 1-5 screenshots of extension in action
- [ ] Create ZIP package of extension files
- [ ] Upload to Chrome Web Store Developer Dashboard
- [ ] Fill in all store listing information
- [ ] Add privacy policy URL
- [ ] Submit for review
- [ ] Wait for approval (1-3 business days)

## Need Help?

If you encounter issues during submission:
1. Check Chrome Web Store developer documentation
2. Review rejection email carefully for specific issues
3. Update and resubmit
