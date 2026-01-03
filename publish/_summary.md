
# To publish in the Chrome Web Store


## 📦 Package 

There is a simple script `package-extension.sh` to package the extension.  
The extension is packaged as **`twitter-bookmark-and-followers-exporter-v1.0.zip`**  - ready for upload

## 📄 Files

1. **`CHROME_WEB_STORE_GUIDE.md`** - Complete step-by-step publishing guide
2. **`STORE_LISTING_CONTENT.md`** - content for your store listing (descriptions, summaries, permission justifications)
3. **`PRIVACY_POLICY.md`** - Privacy policy template (you need to host this online)
4. **`package-extension.sh`** - Script to repackage the extension for future updates

## 🚀 Quick Start Steps

### 1. Register as Developer
- Go to: https://chrome.google.com/webstore/devconsole
- Pay the one-time $5 registration fee

### 2. Host Your Privacy Policy
You **must** host the privacy policy online. Quick options:
- **GitHub Pages** (free): Create a `gh-pages` branch or use your repo's README
- **Google Sites** (free): Create a simple site
- Your personal website

### 3. Take Screenshots
You need **at least 1 screenshot** (max 5):
- Size: 1280x800 or 640x400 pixels
- Show the extension popup, export in progress, etc.
- See `STORE_LISTING_CONTENT.md:72-92` for recommendations

### 4. Upload & Submit
1. Click "New Item" in the developer dashboard
2. Upload **`twitter-bookmark-exporter-v1.0.zip`**
3. Fill in the store listing using content from `STORE_LISTING_CONTENT.md`
4. Add your privacy policy URL
5. Submit for review (typically 1-3 business days)

## ⚠️ Important Notes

- **Update contact info**: Add your email in `PRIVACY_POLICY.md:56`
- **Add GitHub URL**: Update the repository URL in the privacy policy and store listing
- **Screenshots are required**: Chrome Web Store won't accept submissions without them
- **Privacy policy must be live**: Host it before submitting

