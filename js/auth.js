/* ============================================================
   auth.js — Authentication module (Firebase Auth compat SDK)
   ============================================================ */

const Auth = {
  /** Currently signed-in user or null */
  currentUser: null,

  /**
   * Initialise the auth listener. Fires `onAuthChange(user)` whenever
   * the auth state changes (sign-in, sign-out, page reload).
   *
   * When a user signs in, their Firestore profile (`users/{uid}`) is
   * fetched and merged with the Firebase Auth data.
   *
   * @param {Function} onAuthChange — callback receiving the merged user or null
   */
  init(onAuthChange) {
    if (!auth) return;

    auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const doc = await db.collection("users").doc(firebaseUser.uid).get();
          const profile = doc.exists ? doc.data() : {};

          Auth.currentUser = {
            uid:         firebaseUser.uid,
            email:       firebaseUser.email,
            displayName: profile.displayName || firebaseUser.displayName || "",
            state:       profile.state || ""
          };
        } catch (err) {
          // Fallback to auth-only data if Firestore read fails
          Auth.currentUser = {
            uid:         firebaseUser.uid,
            email:       firebaseUser.email,
            displayName: firebaseUser.displayName || "",
            state:       ""
          };
        }
      } else {
        Auth.currentUser = null;
      }

      if (typeof onAuthChange === "function") {
        onAuthChange(Auth.currentUser);
      }
    });
  },

  /**
   * Create a new account and store a profile document in Firestore.
   *
   * @param {string} email
   * @param {string} password
   * @param {string} displayName
   * @param {string} state — two-letter state code
   * @returns {Promise<Object>} the merged user object
   */
  async signUp(email, password, displayName, state) {
    const cred = await auth.createUserWithEmailAndPassword(email, password);

    await db.collection("users").doc(cred.user.uid).set({
      email,
      displayName,
      state,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    Auth.currentUser = {
      uid:         cred.user.uid,
      email,
      displayName,
      state
    };

    return Auth.currentUser;
  },

  /**
   * Sign in with email & password. The `onAuthStateChanged` listener
   * set up by `init()` handles profile loading automatically.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} Firebase UserCredential
   */
  async signIn(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
  },

  /**
   * Sign out the current user.
   * @returns {Promise<void>}
   */
  async signOut() {
    Auth.currentUser = null;
    return auth.signOut();
  },

  /**
   * Update the user's selected state in Firestore and locally.
   *
   * @param {string} stateCode — two-letter state code
   * @returns {Promise<void>}
   */
  async updateState(stateCode) {
    if (!Auth.currentUser) throw new Error("No user signed in");

    await db.collection("users").doc(Auth.currentUser.uid).update({
      state: stateCode
    });

    Auth.currentUser.state = stateCode;
  },

  /**
   * Update profile fields (displayName and/or state) in Firestore.
   *
   * @param {Object} updates — e.g. { displayName: '...', state: 'TX' }
   * @returns {Promise<void>}
   */
  async updateProfile(updates) {
    if (!Auth.currentUser) throw new Error("No user signed in");

    const allowed = {};
    if (updates.displayName !== undefined) allowed.displayName = updates.displayName;
    if (updates.state !== undefined)       allowed.state       = updates.state;

    await db.collection("users").doc(Auth.currentUser.uid).update(allowed);

    // Mirror changes locally
    if (allowed.displayName !== undefined) Auth.currentUser.displayName = allowed.displayName;
    if (allowed.state !== undefined)       Auth.currentUser.state       = allowed.state;
  }
};
