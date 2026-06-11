# 🎰 The Pattern

*"Track scratch-off ticket numbers. Find the pattern. Buy smarter."*

---

## How It Works

Every scratch-off lottery ticket has a unique ticket number printed on it. By logging which ticket numbers win — and at which prize tier — you start to see that certain ticket numbers consistently hit specific prizes. **The Pattern** helps you track, analyze, and act on these patterns so you can make smarter purchasing decisions.

---

## Features

- 🎟️ **Log Any Ticket** — Record any scratch-off ticket (win or loss) with its ticket number
- 🔥 **Hot Numbers** — See which ticket numbers keep winning per game and prize tier
- 💡 **Community Tips** — Get real-time suggestions based on crowdsourced data
- 📊 **Win Analytics** — Interactive charts showing ticket number distributions
- 🔮 **Smart Recommendations** — AI-powered buying advice based on your data
- 👥 **Community Data** — Toggle between your personal data and community-wide patterns
- 🛡️ **Admin Dashboard** — Manage users, roles, and moderate submitted tickets
- 🎮 **50+ Games** — Texas Lottery scratch-off games pre-loaded
- 🔒 **Firebase Auth** — Email/Password + Google sign-in
- 📱 **Fully Responsive** — Works on mobile, tablet, and desktop

---

## Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and **create a new project**
2. Navigate to **Authentication → Sign-in method** and enable **Email/Password** and **Google** providers
3. Create a **Firestore Database** in **production mode**
4. Go to **Project Settings → General → Your apps → Web app → Register**
5. Copy the config object into `js/firebase-config.js`

---

## Firestore Security Rules

Paste these rules in **Firestore → Rules**:

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

---

## Running Locally

- Open `index.html` directly in your browser, or
- Use the [VS Code Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension for hot reloading

---

## File Structure

```
the-pattern/
├── index.html          # Main tracker page
├── prizes.html         # Win analytics & hot numbers
├── admin.html          # Admin dashboard
├── css/
│   └── style.css       # Dark Pattern theme
├── js/
│   ├── firebase-config.js  # Firebase credentials
│   ├── games.js            # Game catalog (TX lottery)
│   ├── auth.js             # Authentication module
│   ├── tracker.js          # Ticket CRUD operations
│   ├── ui.js               # UI rendering engine
│   ├── app.js              # Main app orchestration
│   ├── prizes-page.js      # Analytics page controller
│   └── admin.js            # Admin page controller
└── README.md
```

---

## License

MIT
