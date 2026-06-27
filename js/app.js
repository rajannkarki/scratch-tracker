/* ============================================================
   app.js — Main app orchestration for The Pattern
   ============================================================ */

(function () {
  'use strict';

  /* ── Module-level state ─────────────────────────────────── */
  window._currentFilter = 'all';
  window._searchQuery = '';
  let _searchDebounce = null;
  let _firstAuthCheck = true;

  /* ── Boot ────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    /* 1. Check Firebase config */
    if (!isFirebaseConfigured()) {
      UI.showSetupScreen();
      return;
    }

    /* 2. Populate state dropdown for sign-up */
    UI.populateStateDropdown();

    /* 3. Set today's date */
    document.getElementById('f-date').value = today();

    /* 4. Wire events */
    wireAuthEvents();
    wireTrackerEvents();

    /* 5. Init auth listener */
    Auth.init(async (user) => {
      if (user) {
        UI.showLoading();
        try {
          await Tracker.loadTickets(user.uid, user.state || 'TX');
        } catch (e) {
          console.error('Failed to load tickets:', e);
        }
        UI.showAppScreen();
        UI.updateUserDisplay();
        UI.renderAll();
        UI.filterGames('');
      } else {
        UI.showAuthScreen();
      }
      if (_firstAuthCheck) {
        UI.hideLoading();
        _firstAuthCheck = false;
      }
    });
  });

  /* ── Date helper ─────────────────────────────────────────── */
  function today() {
    return new Date().toISOString().split('T')[0];
  }

  /* ── Image compression — shrink the photo to a small JPEG data URL
        so it fits comfortably inside a Firestore document. ── */
  function compressImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > h && w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
          else if (h >= w && h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ── Auth events ─────────────────────────────────────────── */
  function wireAuthEvents() {
    /* Form submit */
    document.getElementById('auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      UI.clearAuthError();

      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;

      if (!email || !password) {
        UI.showAuthError('Please fill in all fields.');
        return;
      }

      if (UI.isSignUp) {
        const name = document.getElementById('auth-name').value.trim();
        const state = document.getElementById('auth-state').value;
        const confirm = document.getElementById('auth-confirm-password').value;

        if (!name) { UI.showAuthError('Please enter your name.'); return; }
        if (password.length < 6) { UI.showAuthError('Password must be at least 6 characters.'); return; }
        if (password !== confirm) { UI.showAuthError('Passwords do not match.'); return; }

        try {
          document.getElementById('auth-submit').disabled = true;
          await Auth.signUp(email, password, name, state);
          // onAuthStateChanged will handle the rest
        } catch (err) {
          UI.showAuthError(friendlyError(err));
        } finally {
          document.getElementById('auth-submit').disabled = false;
        }
      } else {
        try {
          document.getElementById('auth-submit').disabled = true;
          await Auth.signIn(email, password);
        } catch (err) {
          UI.showAuthError(friendlyError(err));
        } finally {
          document.getElementById('auth-submit').disabled = false;
        }
      }
    });

    /* Toggle sign-in / sign-up */
    document.getElementById('auth-toggle').addEventListener('click', (e) => {
      e.preventDefault();
      UI.toggleAuthMode();
    });

    /* Logout */
    document.getElementById('logout-btn').addEventListener('click', async () => {
      try {
        await Auth.signOut();
      } catch (err) {
        UI.showToast('Sign out failed.', 'e');
      }
    });

    /* Google Login */
    const googleBtn = document.getElementById('google-btn');
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        UI.clearAuthError();
        try {
          UI.showLoading();
          await Auth.signInWithGoogle();
        } catch (err) {
          console.error(err);
          UI.showAuthError(friendlyError(err));
        } finally {
          UI.hideLoading();
        }
      });
    }
  }

  /* ── Tracker events ──────────────────────────────────────── */
  function wireTrackerEvents() {
    /* Game search input */
    const searchInput = document.getElementById('game-search');
    searchInput.addEventListener('input', () => UI.filterGames(searchInput.value));
    searchInput.addEventListener('focus', () => UI.openDrop());
    searchInput.addEventListener('blur', () => UI.closeDrop());
    searchInput.addEventListener('keydown', (e) => UI.dropKey(e));

    /* Game dropdown — pick via click */
    document.getElementById('game-drop').addEventListener('mousedown', (e) => {
      const opt = e.target.closest('.game-opt');
      if (opt && opt.dataset.idx !== undefined) {
        UI.pickGame(parseInt(opt.dataset.idx, 10));
        if (UI.selectedGame) loadCommunityTip(UI.selectedGame.num);
      }
    });

    /* Game dropdown — hover */
    document.getElementById('game-drop').addEventListener('mouseover', (e) => {
      const opt = e.target.closest('.game-opt');
      if (opt && opt.dataset.idx !== undefined) {
        UI.hoverOpt(parseInt(opt.dataset.idx, 10));
      }
    });

    /* Change game button */
    document.getElementById('change-game-btn').addEventListener('click', () => UI.resetGame());

    /* Custom Game Handlers */
    const customCancel = document.getElementById('custom-game-cancel');
    if (customCancel) {
      customCancel.addEventListener('click', () => UI.resetGame());
    }

    const cgPrice = document.getElementById('custom-game-price');
    if (cgPrice) {
      cgPrice.addEventListener('input', (e) => {
        UI.updateCustomGamePrizeChips(e.target.value);
      });
    }

    const cgName = document.getElementById('custom-game-name');
    if (cgName) {
      cgName.addEventListener('input', () => UI.syncCustomGameData());
    }

    const cgNum = document.getElementById('custom-game-num');
    if (cgNum) {
      cgNum.addEventListener('input', () => UI.syncCustomGameData());
    }

    /* Prize chip clicks */
    document.getElementById('prize-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const val = chip.dataset.val;
      UI.selectChip(chip, val === 'loss' ? 'loss' : parseFloat(val));
    });

    /* Custom amount input */
    document.getElementById('custom-amt').addEventListener('input', (e) => {
      UI.onCustomInput(e.target.value);
    });

    /* "I don't have the number" checkbox */
    const noNumChk = document.getElementById('no-ticket-num');
    if (noNumChk) {
      noNumChk.addEventListener('change', () => UI.toggleNoNumber(noNumChk.checked));
    }

    /* Ticket photo: compress on selection + show a removable preview */
    const photoInput = document.getElementById('ticket-photo');
    if (photoInput) {
      photoInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          UI._pendingPhoto = await compressImage(file, 800, 0.5);
          const pv = document.getElementById('photo-preview');
          if (pv) pv.innerHTML = '<img src="' + UI._pendingPhoto + '" class="photo-thumb" alt="preview"><button type="button" class="photo-remove" id="photo-remove" title="Remove">✕</button>';
        } catch (err) {
          UI.showToast('Could not read that image.', 'e');
        }
      });
    }

    const photoPreview = document.getElementById('photo-preview');
    if (photoPreview) {
      photoPreview.addEventListener('click', (e) => {
        if (e.target.id === 'photo-remove') {
          UI._pendingPhoto = null;
          photoPreview.innerHTML = '';
          if (photoInput) photoInput.value = '';
        }
      });
    }

    /* Photo thumbnails in the records list open a lightbox */
    document.getElementById('records').addEventListener('click', (e) => {
      const thumb = e.target.closest('.rec-photo');
      if (!thumb) return;
      const lb = document.getElementById('photo-lightbox');
      const img = document.getElementById('photo-lightbox-img');
      if (lb && img) { img.src = thumb.src; lb.style.display = 'flex'; }
    });

    const lightbox = document.getElementById('photo-lightbox');
    if (lightbox) {
      lightbox.addEventListener('click', () => { lightbox.style.display = 'none'; });
    }

    /* Add ticket button */
    document.getElementById('add-btn').addEventListener('click', async () => {
      if (!UI.selectedGame) {
        UI.showToast('Pick a game first!', 'e');
        return;
      }

      UI.syncCustomGameData();

      if (UI.selectedGame.isCustom) {
        if (!UI.selectedGame.name) {
          UI.showToast('Enter a custom game name!', 'e');
          return;
        }
        if (UI.selectedGame.price <= 0) {
          UI.showToast('Enter a valid ticket price!', 'e');
          return;
        }
      }

      const customVal = document.getElementById('custom-amt').value;
      const winAmt = parseFloat(customVal);
      const isWin = !isNaN(winAmt) && winAmt > 0;
      const date = document.getElementById('f-date').value;
      const noNumberEl = document.getElementById('no-ticket-num');
      const noNumber = noNumberEl && noNumberEl.checked;
      const ticketNum = noNumber ? '' : document.getElementById('ticket-num').value.trim();

      if (!date) {
        UI.showToast('Pick a date!', 'e');
        return;
      }

      /* Ticket number is required — the whole point is tracking numbers.
         The only exception is when the user explicitly has no number. */
      if (!noNumber && !ticketNum) {
        UI.showToast('Enter the ticket number, or check “I don\'t have the number”.', 'e');
        return;
      }

      const ticketData = {
        gameNum: UI.selectedGame.num || 'Custom',
        gameName: UI.selectedGame.name,
        price: UI.selectedGame.price,
        winAmt: isNaN(winAmt) ? 0 : winAmt,
        outcome: isWin ? 'win' : 'loss',
        ticketNumber: ticketNum,
        date: date,
        photo: UI._pendingPhoto || ''
      };

      const sameGameName = UI.selectedGame.name;

      try {
        document.getElementById('add-btn').disabled = true;
        await Tracker.addTicket(Auth.currentUser.uid, ticketData);
        UI.renderAll();
        UI.showToast(
          (isWin ? `🏆 +${UI.fmt(winAmt)} logged! ` : '❌ Loss logged. ') + 'Ready for the next ' + sameGameName + ' ticket.',
          isWin ? 's' : ''
        );
        // One-tap re-log: keep the same game selected, just clear the entry fields.
        UI.resetForNextTicket();
      } catch (err) {
        console.error('Failed to add ticket:', err);
        UI.showToast('Failed to save ticket. Try again.', 'e');
      } finally {
        document.getElementById('add-btn').disabled = false;
      }
    });

    /* Filter buttons — event delegation */
    document.getElementById('filter-row').addEventListener('click', (e) => {
      const btn = e.target.closest('.f-btn');
      if (!btn) return;

      window._currentFilter = btn.dataset.filter;
      document.querySelectorAll('#filter-row .f-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      UI.renderList(window._currentFilter, window._searchQuery);
    });

    /* Search input — debounced */
    document.getElementById('search-input').addEventListener('input', (e) => {
      clearTimeout(_searchDebounce);
      _searchDebounce = setTimeout(() => {
        window._searchQuery = e.target.value.trim().toLowerCase();
        UI.renderList(window._currentFilter, window._searchQuery);
      }, 200);
    });

    /* Delete buttons — event delegation on records container */
    document.getElementById('records').addEventListener('click', async (e) => {
      const btn = e.target.closest('.del-btn');
      if (!btn) return;

      const id = btn.dataset.id;
      try {
        await Tracker.deleteTicket(Auth.currentUser.uid, id);
        UI.renderAll();
        UI.showToast('Record deleted.', '');
      } catch (err) {
        console.error('Failed to delete:', err);
        UI.showToast('Failed to delete. Try again.', 'e');
      }
    });

    /* Profile Modal triggers */
    const badgeEl = document.getElementById('user-state-badge');
    if (badgeEl) {
      badgeEl.addEventListener('click', () => UI.openProfileModal());
    }

    const dispEl = document.getElementById('user-display');
    if (dispEl) {
      dispEl.addEventListener('click', () => UI.openProfileModal());
    }

    const closeEl = document.getElementById('profile-modal-close');
    if (closeEl) {
      closeEl.addEventListener('click', () => UI.closeProfileModal());
    }

    // Close modal when clicking outside of it
    window.addEventListener('click', (e) => {
      const modal = document.getElementById('profile-modal');
      if (e.target === modal) {
        UI.closeProfileModal();
      }
    });

    // Save profile settings
    const saveBtn = document.getElementById('profile-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('profile-name').value.trim();
        const state = document.getElementById('profile-state').value;
        if (!name) {
          UI.showToast('Please enter your name.', 'e');
          return;
        }
        try {
          UI.showLoading();
          const oldState = Auth.currentUser.state;
          await Auth.updateProfile({ displayName: name, state: state });
          UI.closeProfileModal();
          UI.updateUserDisplay();
          UI.showToast('Profile updated!', 's');
          
          // If state changed, reload tickets for that state
          if (state !== oldState) {
            await Tracker.loadTickets(Auth.currentUser.uid, state);
            UI.filterGames('');
            UI.renderAll();
          }
        } catch (err) {
          console.error('Failed to update profile:', err);
          UI.showToast('Failed to save profile. Try again.', 'e');
        } finally {
          UI.hideLoading();
        }
      });
    }
  }

  /* ── Community Tip ──────────────────────────────────────── */
  async function loadCommunityTip(gameNum) {
    const tipEl = document.getElementById('community-tip');
    if (!tipEl || !db) return;
    try {
      const snap = await db.collectionGroup('tickets')
        .where('gameNum', '==', gameNum)
        .where('status', '==', 'approved')
        .get();
      const counts = {};
      snap.docs.forEach(doc => {
        const d = doc.data();
        if (d.ticketNumber) {
          counts[d.ticketNumber] = (counts[d.ticketNumber] || 0) + 1;
        }
      });
      const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
      if (sorted.length > 0) {
        const [num, cnt] = sorted[0];
        tipEl.innerHTML = `💡 <strong>Community tip:</strong> Ticket #${num} has been logged ${cnt} time${cnt>1?'s':''} for this game.`;
        tipEl.style.display = '';
      } else {
        tipEl.style.display = 'none';
      }
    } catch(e) {
      tipEl.style.display = 'none';
    }
  }

  /* ── Friendly Firebase errors ────────────────────────────── */
  function friendlyError(err) {
    const code = err.code || '';
    if (code.includes('email-already-in-use')) return 'This email is already registered. Try signing in.';
    if (code.includes('wrong-password') || code.includes('invalid-credential'))
      return 'Invalid email or password.';
    if (code.includes('user-not-found')) return 'No account found with this email.';
    if (code.includes('weak-password')) return 'Password is too weak. Use at least 6 characters.';
    if (code.includes('invalid-email')) return 'Please enter a valid email address.';
    if (code.includes('too-many-requests')) return 'Too many attempts. Please wait a moment.';
    if (code.includes('network-request-failed')) return 'Network error. Check your connection.';
    return err.message || 'Something went wrong. Please try again.';
  }

})();
