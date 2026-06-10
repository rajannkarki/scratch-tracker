# 🎰 Scratch Tracker

A premium, dark-themed lottery scratch-off ticket tracker. Track your wins, record winning ticket numbers, analyze spending, and browse prize ranges for every game.

## ✨ Features

- **🔐 User Authentication** — Sign up / sign in with email & password (Firebase Auth)
- **☁️ Cloud Sync** — Data syncs across all your devices via Firestore
- **🎟️ Ticket Logging** — Log scratch-off tickets with game, prize amount, and date
- **🏆 Winning Ticket Numbers** — Record the exact ticket number for every win
- **📊 Live Stats** — Total tickets, spent, won, and net profit/loss
- **🔍 Filter & Search** — Filter by wins/losses, search by game name, number, or ticket #
- **📱 Fully Responsive** — Works beautifully on phone, tablet, and desktop
- **🏆 Prize Ranges Page** — Browse all games with expandable prize tier tables
- **🗺️ State Selection** — Choose your state (TX data pre-loaded, more states coming)

## 🚀 Setup Guide

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter a project name (e.g., "scratch-tracker")
4. Disable Google Analytics (optional) → Click **"Create project"**

### Step 2: Enable Authentication Providers

1. In your Firebase project, go to **Authentication** (left sidebar)
2. Click **"Get started"** (if not already done)
3. Click the **"Sign-in method"** tab
4. Enable **Email/Password**:
   - Click **"Email/Password"** → Toggle **Enable** → Click **Save**
5. Enable **Google** (Required for Google Login):
   - Click **"Add new provider"** → Select **Google**
   - Toggle **Enable**
   - Select your project support email in the dropdown → Click **Save**

### Step 3: Create Firestore Database

1. Go to **Firestore Database** (left sidebar)
2. Click **"Create database"**
3. Select **"Start in production mode"** → Click **Next**
4. Choose a Cloud Firestore location closest to you → Click **Enable**

### Step 4: Set Firestore Security Rules

1. In Firestore, go to the **"Rules"** tab
2. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /tickets/{ticketId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

3. Click **"Publish"**

### Step 5: Get Your Firebase Config

1. Go to **Project Settings** (gear icon in left sidebar)
2. Scroll down to **"Your apps"** section
3. Click the **Web icon** (`</>`) to add a web app
4. Enter a nickname (e.g., "scratch-tracker-web") → Click **"Register app"**
5. Copy the `firebaseConfig` object values

### Step 6: Add Config to Your App

Open `js/firebase-config.js` and replace the placeholder values:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "your-actual-api-key",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
};
```

---

## 🔒 Firestore Security Rules & Admin Setup

To support the Admin Dashboard and Community Analytics features, you need to configure your Firestore rules and roles as follows:

### Step 1: Update Firestore Security Rules

1. Go to **Firestore Database** in your Firebase Console.
2. Select the **"Rules"** tab.
3. Replace the existing rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if requesting user is an admin
    function isAdmin() {
      return request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Helper function to check if requesting user is a viewer (or admin)
    function isViewer() {
      return request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        (
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'viewer' ||
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
        );
    }

    // Users Collection
    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null && (request.auth.uid == userId || isAdmin());

      // Tickets subcollection
      match /tickets/{ticketId} {
        allow read, write: if request.auth != null && (request.auth.uid == userId || isAdmin());
      }
    }

    // Collection Group rule for tickets
    // This allows query on collectionGroup("tickets") for admins and authorized viewers
    match /{path=**}/tickets/{ticketId} {
      allow read: if request.auth != null && (isViewer() || isAdmin());
    }
  }
}
```

4. Click **"Publish"**.

### Step 2: Set Up Firestore Indexes (Required for Admin and Community Charts)

The app queries tickets across all users (Collection Group query). This requires a composite index:
1. When you first visit the Admin Dashboard or switch to Community Analytics as an authorized user, open your browser console (`F12` key → `Console`).
2. You will see a Firestore warning/error message containing a link starting with `https://console.firebase.google.com/project/...`.
3. **Click the link in the console.** This takes you directly to Firebase Console with index fields auto-populated.
4. Click **"Create Index"** and wait 2-3 minutes for it to build.

### Step 3: Grant Yourself Admin Rights

1. Register or sign in to your Scratch Tracker app.
2. In Firebase Console, go to **Firestore Database** → **Data**.
3. Select the `users` collection, find your user document (match your email/UID).
4. Add a field:
   - Field name: `role`
   - Type: `string`
   - Value: `admin`
5. Click **"Add"** or save.
6. Refresh the app page. An **"Admin"** navigation tab will appear at the top, allowing you to manage other users and grant/revoke viewer access.

---

## 🌐 Deploy to GitHub Pages (Free)

### Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in (or create an account)
2. Click **"New repository"**
3. Name it (e.g., `scratch-tracker`)
4. Set to **Public** → Click **"Create repository"**

### Step 2: Push Your Code

**If this is your FIRST time pushing to GitHub:**
Open a terminal in your project folder and run:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/scratch-tracker.git
git push -u origin main
```

**If you already set up GitHub and just want to push the NEW updates:**
Run this in your terminal:
```bash
git add .
git commit -m "Implement Win Analytics, Google Login, and layout optimizations"
git push
```

### Step 3: Enable GitHub Pages

1. Go to your repo on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select **Deploy from a branch**
4. Select **main** branch → **/ (root)** → Click **Save**
5. Wait ~1 minute

Your site is now live at: `https://YOUR_USERNAME.github.io/scratch-tracker/`

### Step 4: Add Your Domain to Firebase (Required)

1. Go to Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Click **"Add domain"**
3. Add `YOUR_USERNAME.github.io`
4. Click **Add**

---

## 💻 Local Development

Just open `index.html` in your browser. For live reload, use [VS Code Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.

> **Note:** Make sure to add `127.0.0.1` or `localhost` to Firebase Authorized Domains for local testing.

---

## 🛠 Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript   |
| Auth       | Firebase Authentication           |
| Database   | Cloud Firestore                   |
| Hosting    | GitHub Pages (free)               |
| Fonts      | Google Fonts (Black Ops One, Barlow) |

---

## 📁 Project Structure

```
scratchoff/
├── index.html              ← Main tracker (SPA)
├── prizes.html             ← Prize Ranges page
├── css/
│   └── style.css           ← All styles
├── js/
│   ├── firebase-config.js  ← Firebase config (edit this!)
│   ├── games.js            ← Game data by state
│   ├── auth.js             ← Authentication module
│   ├── tracker.js          ← Ticket CRUD module
│   ├── ui.js               ← UI rendering
│   ├── app.js              ← Main app orchestration
│   └── prizes-page.js      ← Prize Ranges page logic
└── README.md               ← This file
```
