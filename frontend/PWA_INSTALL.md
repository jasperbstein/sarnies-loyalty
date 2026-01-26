# 📱 Install Sarnies Loyalty as PWA

Your web app is now a **Progressive Web App (PWA)**! Users can install it on their phones like a native app.

## ✨ Benefits:

- ✅ **Install to Home Screen** - No App Store needed
- ✅ **Works Offline** - Service worker caching
- ✅ **Native Camera Access** - QR scanner works great
- ✅ **Faster Loading** - Cached resources
- ✅ **Push Notifications** (can be added later)
- ✅ **Updates Instantly** - No app store review delays

---

## 📲 How to Install on iPhone:

1. Open Safari and go to: `https://fef750da8248.ngrok-free.app`
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"**
5. App icon appears on home screen!

---

## 🤖 How to Install on Android:

### Chrome:
1. Open Chrome and go to: `https://fef750da8248.ngrok-free.app`
2. Tap the **menu** (3 dots)
3. Tap **"Install app"** or **"Add to Home screen"**
4. Tap **"Install"**
5. Done!

### Alternative (Any Browser):
1. Open the website
2. Look for the **"Install"** banner at the bottom
3. Tap **"Install"**

---

## 🎨 App Features:

When installed, the app:
- Opens in **fullscreen** (no browser UI)
- Has a **custom splash screen**
- Uses **Sarnies branding colors**
- Works **offline**
- **Camera QR scanner** works natively
- Can receive **push notifications** (future feature)

---

## 🚀 For Production:

### Replace ngrok URL with your domain:

1. Update `/frontend/.env.local`:
   ```
   NEXT_PUBLIC_API_URL=/api
   ```

2. Update `/frontend/next.config.js` rewrites to point to your production API

3. Update `/frontend/public/manifest.json`:
   - Change `start_url` if needed
   - Add your actual app icons (replace icon-*.png files)

4. Deploy to Vercel/Netlify/etc.

### Custom App Icons:

Create and replace these files in `/public`:
- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels)

Use tools like:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

---

## 🛠 Development vs Production:

**Development Mode:**
- PWA features are **disabled** (faster hot reload)
- Service worker won't register

**Production Mode:**
- PWA features **enabled**
- Service worker caches assets
- Offline support active

To test PWA locally:
```bash
npm run build
npm start
# Visit http://localhost:3000
```

---

## 📊 Testing PWA:

### Chrome DevTools (Desktop):

1. Open DevTools (F12)
2. Go to **"Application"** tab
3. Check:
   - **Manifest** - Should show app details
   - **Service Workers** - Should be registered
   - **Cache Storage** - Should have cached files

### Lighthouse Audit:

1. Open DevTools (F12)
2. Go to **"Lighthouse"** tab
3. Check **"Progressive Web App"**
4. Click **"Analyze"**
5. Aim for 90+ score

---

## 🎯 What's Next:

Your app is now installable! For a truly native experience, consider:

1. **Better Icons** - Design proper app icons
2. **Splash Screens** - Custom splash screen images
3. **Push Notifications** - Alert users about voucher expiry, special offers
4. **Offline Mode** - Full offline functionality with IndexedDB
5. **App Store** - Eventually publish to App Store/Play Store (optional)

---

## 💡 Quick Facts:

- **No App Store Review** - Deploy instantly
- **Cross-Platform** - Works on iOS, Android, Desktop
- **Same Codebase** - One code for all platforms
- **Fast Updates** - Changes go live immediately
- **Better SEO** - Still accessible via web

Enjoy your new PWA! 🎉
