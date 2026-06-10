/* ============================================================
   tracker.js — Ticket tracking module (Firestore compat SDK)
   ============================================================
   Data model — each ticket is stored at:
     users/{userId}/tickets/{ticketId}

   Document shape:
     { gameNum, gameName, price, winAmt, outcome, ticketNumber,
       date, createdAt }
   ============================================================ */

const Tracker = {
  /** In-memory array of loaded tickets (most recent first). */
  tickets: [],

  /**
   * Load all tickets for a user from Firestore, ordered newest-first,
   * and filter them locally by the active state code.
   *
   * @param {string} userId
   * @param {string} stateCode — e.g. 'TX'
   * @returns {Promise<Array>} the loaded tickets
   */
  async loadTickets(userId, stateCode) {
    const snap = await db
      .collection("users").doc(userId)
      .collection("tickets")
      .orderBy("createdAt", "desc")
      .get();

    const all = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter locally by state. Default legacy tickets to TX.
    Tracker.tickets = all.filter(t => (t.state || "TX") === stateCode);

    return Tracker.tickets;
  },

  /**
   * Add a new ticket to Firestore and prepend it to the local array.
   *
   * @param {string} userId
   * @param {Object} ticketData — { gameNum, gameName, price, winAmt,
   *                                 outcome, ticketNumber, date }
   * @returns {Promise<Object>} the new ticket (with Firestore-assigned id)
   */
  async addTicket(userId, ticketData) {
    const docData = {
      gameNum:      ticketData.gameNum,
      gameName:     ticketData.gameName,
      price:        ticketData.price,
      winAmt:       ticketData.winAmt,
      outcome:      ticketData.outcome,       // 'win' | 'loss'
      ticketNumber: ticketData.ticketNumber || "",
      date:         ticketData.date,           // 'YYYY-MM-DD'
      state:        Auth.currentUser.state || "TX",
      status:       "pending",                 // 'pending' | 'approved' | 'rejected'
      createdAt:    firebase.firestore.FieldValue.serverTimestamp()
    };

    const ref = await db
      .collection("users").doc(userId)
      .collection("tickets")
      .add(docData);

    const newTicket = { id: ref.id, ...docData };
    Tracker.tickets.unshift(newTicket);

    return newTicket;
  },

  /**
   * Delete a ticket from Firestore and remove it from the local array.
   *
   * @param {string} userId
   * @param {string} ticketId
   * @returns {Promise<void>}
   */
  async deleteTicket(userId, ticketId) {
    await db
      .collection("users").doc(userId)
      .collection("tickets")
      .doc(ticketId)
      .delete();

    Tracker.tickets = Tracker.tickets.filter(t => t.id !== ticketId);
  },

  /**
   * Compute summary statistics from the currently loaded tickets.
   *
   * @returns {{ total: number, spent: number, won: number, net: number }}
   */
  getStats() {
    let spent = 0;
    let won   = 0;

    for (const t of Tracker.tickets) {
      spent += t.price  || 0;
      won   += t.winAmt || 0;
    }

    return {
      total: Tracker.tickets.length,
      spent,
      won,
      net: won - spent
    };
  },

  /**
   * Return a filtered & searched subset of the loaded tickets.
   *
   * @param {string} filter      — 'all' | 'win' | 'loss'
   * @param {string} searchQuery — free-text search string
   * @returns {Array}
   */
  getFiltered(filter, searchQuery) {
    let results = Tracker.tickets;

    // Outcome filter
    if (filter === "win") {
      results = results.filter(t => t.outcome === "win");
    } else if (filter === "loss") {
      results = results.filter(t => t.outcome === "loss");
    }

    // Free-text search (case-insensitive)
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      results = results.filter(t => {
        const gameName     = (t.gameName     || "").toLowerCase();
        const gameNum      = (t.gameNum      || "").toLowerCase();
        const ticketNumber = (t.ticketNumber || "").toLowerCase();
        return gameName.includes(q) || gameNum.includes(q) || ticketNumber.includes(q);
      });
    }

    return results;
  },

  /**
   * Returns a Set of unique game numbers from the loaded tickets.
   * Useful for the prizes page to highlight games the user has played.
   *
   * @returns {Set<string>}
   */
  getPlayedGameNums() {
    return new Set(Tracker.tickets.map(t => t.gameNum));
  }
};
