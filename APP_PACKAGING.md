# Turning The Pattern into a phone app

Your site is already an installable app (a PWA). This guide covers three levels,
cheapest/easiest first. For "just me," level 1 is honestly all you need.

Your live URL: **https://rajannkarki.github.io/scratch-tracker/**

---

## Level 1 — Install it on your phone now (free, 30 seconds, recommended)

No app store, no fees, no Mac. It gets its own icon, opens full-screen, works offline.

**iPhone (Safari):**
1. Open the live URL in **Safari** (must be Safari, not Chrome).
2. Tap the **Share** button (square with an up-arrow).
3. Scroll down → **Add to Home Screen** → **Add**.

**Android (Chrome):**
1. Open the live URL in **Chrome**.
2. Tap the **⋮** menu → **Install app** (or **Add to Home screen**).
3. Confirm.

That's a real app on your phone. If that's enough, you're done.

---

## Level 2 — A real Android `.apk` you install directly (free, no Play Store)

This makes an actual installable Android app file. Uses PWABuilder (a free Microsoft tool).

1. Push your latest changes so the live site has the manifest + PNG icons.
2. Go to **https://www.pwabuilder.com** and paste your live URL. Let it analyze —
   it should pass (manifest ✓, service worker ✓, icons ✓). Fix anything it flags red.
3. Click **Package For Stores → Android**.
4. Options to set:
   - **Package ID:** `com.rajannkarki.thepattern` (any unique reverse-domain string)
   - **App name:** The Pattern
   - Leave "Signing key" on **Create new** the first time.
5. Download the zip. **IMPORTANT: keep the `signing.keystore` + the passwords it shows.**
   You need the exact same key to push updates later — lose it and you start over.
6. Inside the zip is an `.apk` (and an `.aab` for the Play Store). Email/AirDrop/USB the
   **`.apk`** to your Android phone.
7. On the phone, tap the file → allow "Install unknown apps" for your file manager → Install.

### Make it open clean (no browser bar) — optional but worth it
PWABuilder's Android app is a "Trusted Web Activity" — a thin wrapper around your live
site. To hide the browser address bar it needs one verification file:

1. In the PWABuilder Android options (or the downloaded zip's readme) copy the
   **`assetlinks.json`** content — it contains your app's SHA-256 fingerprint.
2. In your repo, create the file **`.well-known/assetlinks.json`** with that content.
3. Push. Reinstall the app. It now opens full-screen with no URL bar.

(Skip this and the app still works — it may just show a thin address bar at the top.)

### Putting it on the Play Store (only if you want others to get it)
Upload the `.aab` to **Google Play Console** ($25 one-time). Not needed for personal use.

---

## Level 3 — A real iPhone app (this is the hard/expensive one)

Apple does not allow installing real native apps without going through their tools.
Be realistic about what it takes:

- **You need a Mac** (or a rented cloud Mac like MacinCloud) with **Xcode**.
- **You need an Apple ID:**
  - *Free Apple ID:* you can sideload the app to your own iPhone, but it **expires every
    7 days** — you must re-install it weekly from Xcode. Annoying but free.
  - *Apple Developer ($99/year):* clean install via TestFlight, lasts a year, and is the
    only route to the App Store.

Steps (with a Mac):
1. On PWABuilder, **Package For Stores → iOS**. Download the Xcode project.
2. Open it in **Xcode**, set your Apple ID under Signing & Capabilities.
3. Plug in your iPhone, select it as the target, press **Run** to install.

**My honest recommendation for iPhone:** unless you already have a Mac and want to pay
the $99, just use **Level 1** (Add to Home Screen). The installed PWA looks and behaves
almost identically to a store app for daily personal use.

---

## Summary
| Goal | Best path | Cost |
|------|-----------|------|
| Use it on my iPhone | Level 1 (Add to Home Screen) | Free |
| Use it on my Android | Level 1, or Level 2 for a real `.apk` | Free |
| Real Android store app | Level 2 → Play Console | $25 once |
| Real iPhone store app | Level 3 (Mac + Xcode) | $99/year |
