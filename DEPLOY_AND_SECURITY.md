# Deploy & Security Guide — The Pattern

This covers two things you asked about: (1) how to push these changes to your live GitHub site, and (2) whether your Firebase API key being public is a problem.

---

## 1. Pushing changes to the live site

Your repo is published at `github.com/rajannkarki/scratch-tracker` and served as a static site (GitHub Pages). To put the new changes online, commit and push to the `main` branch:

```bash
cd path/to/scratch-tracker      # the folder on your computer

git add .
git commit -m "Per-game analytics, smarter recommendations, admin user drilldown"
git push origin main
```

GitHub Pages redeploys automatically in about a minute. Then open your site and do a **hard refresh** (`Ctrl+Shift+R`, or `Cmd+Shift+R` on Mac) so the browser loads the new files instead of cached ones. (I already bumped the `?v=6` → `?v=7` cache tags on the changed pages to help force this.)

### A ready-to-paste prompt

If you want an AI assistant to do the deploy for you, paste this:

> I have a static website in a local folder that's published via GitHub Pages from the `main` branch of `github.com/rajannkarki/scratch-tracker`. I've edited some HTML, CSS, and JS files. Please stage all changes, commit them with a clear message describing the update, and push to `origin main`. Then confirm the push succeeded and remind me to hard-refresh the live site. If there are merge conflicts or the push is rejected, walk me through resolving it.

---

## 2. Is your Firebase API key exposed? (short answer: yes, and that's OK)

Your `js/firebase-config.js` is visible to anyone — both on GitHub and in the browser's "View Source." **This is expected and normal for Firebase web apps.** The Firebase `apiKey` is **not a secret**. It's just a public identifier that tells the browser which Firebase project to talk to. It does **not** grant access to your data by itself. Google even documents that this key is safe to include in client-side code.

So you don't need to hide it or delete it from GitHub. What actually protects your data is **Firestore Security Rules** plus **API key restrictions** — not secrecy of the key. Here's what to do:

### a) Lock down your Firestore Security Rules (most important)

Go to **Firebase Console → Firestore Database → Rules** and paste the rules below. These let each user manage only their own data, let signed-in viewers/admins read community data, let **admins delete any ticket** (needed for the new admin drilldown), and block users from promoting themselves to admin:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    function isViewerOrAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['viewer', 'admin'];
    }

    match /users/{userId} {
      allow read:   if isSignedIn() && (request.auth.uid == userId || isViewerOrAdmin());
      // New users may create their own doc, but cannot self-assign the admin role.
      allow create: if request.auth.uid == userId
                    && !( 'role' in request.resource.data && request.resource.data.role == 'admin' );
      // A user can edit their own profile only if they DON'T change their role; admins can edit anyone.
      allow update: if isAdmin()
                    || ( request.auth.uid == userId
                         && request.resource.data.role == resource.data.role );
      allow delete: if isAdmin();

      match /tickets/{ticketId} {
        allow read:                 if isSignedIn() && (request.auth.uid == userId || isViewerOrAdmin());
        allow create, update, delete: if request.auth.uid == userId;
        allow delete, update:       if isAdmin();   // admin moderation + delete
      }
    }

    // Community-wide reads (collectionGroup queries) for viewers and admins.
    match /{path=**}/tickets/{ticketId} {
      allow read: if isViewerOrAdmin();
    }
  }
}
```

Click **Publish**. Without the admin clauses, the new "delete ticket" button would fail with a permission error.

### b) Restrict the API key in Google Cloud

Go to **Google Cloud Console → APIs & Services → Credentials**, click your Browser key, and under **Application restrictions** choose **Websites (HTTP referrers)**, then add your live domain (e.g. `rajannkarki.github.io/*` and your custom domain if any). This stops other websites from reusing your key.

### c) (Optional but recommended) Enable App Check

In **Firebase Console → App Check**, register your web app with reCAPTCHA. This blocks requests that don't come from your real site, adding a strong layer on top of the rules.

### When a key really IS a secret

The above only applies to the Firebase **web config**. If you ever commit a true secret — a service-account JSON, a server/admin SDK key, a Stripe secret key, an API key with no usage restrictions, etc. — then yes, the public can use it, and:

1. **Rotate/revoke it immediately** (generate a new one, disable the old).
2. Remember that deleting it from the latest commit is **not enough** — it stays in your Git history. Either rotate the secret (simplest and safest) or purge history with a tool like `git filter-repo` / BFG.
3. Keep real secrets out of the repo going forward (use a `.gitignore`'d config file or environment variables, never client-side code).

For your current setup, you only have the Firebase web config, so there's nothing to rotate — just apply the rules and restrictions above.
