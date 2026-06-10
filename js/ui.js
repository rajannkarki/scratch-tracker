/* ============================================================
   ui.js — UI rendering module for Scratch Tracker
   ============================================================ */

const UI = {
  /* ── Game picker state ──────────────────────────────────── */
  filteredGames: [],
  selectedGame: null,
  selectedPrize: null,
  dropFocusIdx: -1,

  /* ── Game picker methods ────────────────────────────────── */
  filterGames(query) {
    const q = (query || '').trim().toLowerCase();
    const games = Auth.currentUser ? getGamesForState(Auth.currentUser.state) : [];
    UI.filteredGames = q
      ? games.filter(g => g.name.toLowerCase().includes(q) || g.num.includes(q))
      : [...games];
    UI.dropFocusIdx = -1;
    UI.renderDrop();
  },

  renderDrop() {
    const drop = document.getElementById('game-drop');
    if (!drop) return;
    
    let html = '';
    if (!UI.filteredGames.length) {
      html = '<div class="game-opt" style="color:var(--muted);cursor:default;">No games found</div>';
    } else {
      html = UI.filteredGames.map((g, i) => {
        const closing = g.close ? ` · Ends ${g.close}` : '';
        return `<div class="game-opt${i === UI.dropFocusIdx ? ' focused' : ''}" data-idx="${i}">
          <span class="game-opt-name">${UI.esc(g.name)}</span>
          <span class="game-opt-meta">$${g.price}${closing}</span>
        </div>`;
      }).join('');
    }
    
    // Always append Custom Game trigger option
    html += `<div class="game-opt custom-game-trigger" style="color:var(--gold);font-weight:600;border-top:1px solid var(--border);" data-idx="-2">
      <span class="game-opt-name">➕ Custom Game...</span>
      <span class="game-opt-meta">Add manually</span>
    </div>`;
    
    drop.innerHTML = html;
  },

  openDrop() {
    UI.filterGames(document.getElementById('game-search').value);
    document.getElementById('game-drop').classList.add('open');
  },

  closeDrop() {
    setTimeout(() => document.getElementById('game-drop').classList.remove('open'), 150);
  },

  hoverOpt(i) {
    UI.dropFocusIdx = i;
    UI.highlightDrop();
  },

  highlightDrop() {
    document.querySelectorAll('#game-drop .game-opt').forEach((el, i) => {
      el.classList.toggle('focused', i === UI.dropFocusIdx);
    });
  },

  dropKey(e) {
    const drop = document.getElementById('game-drop');
    if (!drop.classList.contains('open')) return;
    if (e.key === 'ArrowDown') {
      UI.dropFocusIdx = Math.min(UI.dropFocusIdx + 1, UI.filteredGames.length - 1);
      UI.highlightDrop(); e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      UI.dropFocusIdx = Math.max(UI.dropFocusIdx - 1, 0);
      UI.highlightDrop(); e.preventDefault();
    } else if (e.key === 'Enter' && UI.dropFocusIdx >= 0) {
      UI.pickGame(UI.dropFocusIdx); e.preventDefault();
    } else if (e.key === 'Escape') {
      drop.classList.remove('open');
    }
  },

  pickGame(index) {
    if (index === -2) {
      UI.showCustomGameFields();
      return;
    }
    UI.selectedGame = UI.filteredGames[index];
    UI.selectedPrize = null;

    document.getElementById('game-search').value = '';
    document.getElementById('game-drop').classList.remove('open');
    document.getElementById('game-picker').style.display = 'none';

    const row = document.getElementById('sel-game-row');
    row.classList.add('show');
    document.getElementById('sel-game-name').textContent = UI.selectedGame.name;
    document.getElementById('sel-game-meta').textContent =
      `$${UI.selectedGame.price} ticket · Game #${UI.selectedGame.num}`;

    UI.buildPrizeChips();
    document.getElementById('custom-amt').value = '';
    document.getElementById('ticket-num').value = '';
    document.getElementById('ticket-num-section').style.display = 'none';
  },

  showCustomGameFields() {
    UI.selectedGame = {
      name: '',
      price: 0,
      num: '',
      prizes: [],
      isCustom: true
    };
    UI.selectedPrize = null;

    document.getElementById('game-search').value = '';
    document.getElementById('game-drop').classList.remove('open');
    document.getElementById('game-picker').style.display = 'none';
    document.getElementById('sel-game-row').classList.remove('show');

    document.getElementById('custom-game-fields').style.display = '';
    document.getElementById('custom-game-name').value = '';
    document.getElementById('custom-game-price').value = '';
    document.getElementById('custom-game-num').value = '';
    document.getElementById('custom-game-name').focus();

    document.getElementById('prize-section').style.display = 'none';
    document.getElementById('prize-chips').innerHTML = '';
    document.getElementById('custom-amt').value = '';
    document.getElementById('ticket-num').value = '';
    document.getElementById('ticket-num-section').style.display = 'none';
  },

  updateCustomGamePrizeChips(price) {
    const p = parseFloat(price) || 0;
    if (p <= 0) {
      document.getElementById('prize-section').style.display = 'none';
      document.getElementById('prize-chips').innerHTML = '';
      return;
    }

    UI.selectedGame = {
      name: document.getElementById('custom-game-name').value.trim() || 'Custom Game',
      price: p,
      num: document.getElementById('custom-game-num').value.trim() || 'Custom',
      prizes: [p, p * 2, p * 5, p * 10, p * 20, p * 50, p * 100, p * 500, p * 1000],
      isCustom: true
    };

    UI.buildPrizeChips();
  },

  syncCustomGameData() {
    if (!UI.selectedGame || !UI.selectedGame.isCustom) return;
    UI.selectedGame.name = document.getElementById('custom-game-name').value.trim() || 'Custom Game';
    UI.selectedGame.price = parseFloat(document.getElementById('custom-game-price').value) || 0;
    UI.selectedGame.num = document.getElementById('custom-game-num').value.trim() || 'Custom';
  },

  resetGame() {
    UI.selectedGame = null;
    UI.selectedPrize = null;

    document.getElementById('sel-game-row').classList.remove('show');
    document.getElementById('custom-game-fields').style.display = 'none';
    document.getElementById('game-picker').style.display = '';
    document.getElementById('game-search').value = '';
    document.getElementById('prize-section').style.display = 'none';
    document.getElementById('prize-chips').innerHTML = '';
    document.getElementById('custom-amt').value = '';
    document.getElementById('ticket-num').value = '';
    document.getElementById('ticket-num-section').style.display = 'none';
    UI.filterGames('');
  },

  buildPrizeChips() {
    const g = UI.selectedGame;
    if (!g) return;
    const sec = document.getElementById('prize-section');
    const chips = document.getElementById('prize-chips');

    let html = '<div class="chip loss-chip" data-val="loss">❌ No Win</div>';
    for (const p of g.prizes) {
      html += `<div class="chip" data-val="${p}">${fmtPrize(p)}</div>`;
    }
    chips.innerHTML = html;
    sec.style.display = '';
  },

  selectChip(el, val) {
    document.querySelectorAll('#prize-chips .chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    UI.selectedPrize = val;

    const customEl = document.getElementById('custom-amt');
    const ticketSection = document.getElementById('ticket-num-section');

    if (val === 'loss') {
      customEl.value = '0';
      ticketSection.style.display = 'none';
    } else {
      customEl.value = val;
      ticketSection.style.display = '';
    }
  },

  onCustomInput(val) {
    document.querySelectorAll('#prize-chips .chip').forEach(c => c.classList.remove('selected'));
    const numVal = parseFloat(val) || 0;
    UI.selectedPrize = numVal;

    // Re-select matching chip
    document.querySelectorAll('#prize-chips .chip').forEach(c => {
      const cv = c.dataset.val;
      if (cv === 'loss' && numVal === 0) c.classList.add('selected');
      else if (parseFloat(cv) === numVal) c.classList.add('selected');
    });

    // Show/hide ticket number input
    const ticketSection = document.getElementById('ticket-num-section');
    if (numVal > 0) {
      ticketSection.style.display = '';
    } else {
      ticketSection.style.display = 'none';
    }
  },

  /* ── Stats & Records ────────────────────────────────────── */
  renderAll() {
    UI.renderStats();
    UI.renderList();
  },

  renderStats() {
    const s = Tracker.getStats();
    document.getElementById('s-total').textContent = s.total;
    document.getElementById('s-spent').textContent = UI.fmt(s.spent);
    document.getElementById('s-won').textContent = UI.fmt(s.won);

    const netEl = document.getElementById('s-net');
    netEl.textContent = (s.net >= 0 ? '+' : '') + UI.fmt(s.net);
    netEl.className = 'stat-val ' + (s.net >= 0 ? 'g' : 'r');
  },

  renderList(filter, search) {
    // Use passed values or fall back to app-level state
    const f = filter !== undefined ? filter : (window._currentFilter || 'all');
    const q = search !== undefined ? search : (window._searchQuery || '');

    const list = Tracker.getFiltered(f, q);
    document.getElementById('rec-count').textContent =
      list.length + ' record' + (list.length !== 1 ? 's' : '');

    const el = document.getElementById('records');
    if (!list.length) {
      el.innerHTML = `<div class="empty">
        <div class="empty-icon">🎟️</div>
        <p>${Tracker.tickets.length === 0
          ? 'No tickets yet.<br>Log your first scratch-off above!'
          : 'No records match your filter.'}</p>
      </div>`;
      return;
    }

    el.innerHTML = list.map(t => {
      const isWin = t.outcome === 'win';
      const dateStr = t.date
        ? new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          })
        : '';
      const ticketBadge = isWin && t.ticketNumber
        ? `<span class="ticket-badge">#${UI.esc(t.ticketNumber)}</span>`
        : '';

      const status = t.status || 'approved';
      const statusBadge = isWin
        ? `<span class="status-badge ${status}">${status}</span>`
        : '';

      return `<div class="rec-card">
        <div class="rec-bar ${t.outcome}"></div>
        <div class="rec-info">
          <div class="rec-name">${UI.esc(t.gameName)}</div>
          <div class="rec-meta">
            ${dateStr ? `<span>📅 ${dateStr}</span>` : ''}
            <span>Game #${t.gameNum}</span>
            <span class="badge ${t.outcome}">${isWin ? 'WIN' : 'NO WIN'}</span>
            ${statusBadge}
            ${ticketBadge}
          </div>
        </div>
        <div class="rec-amt">
          <div class="amt-val ${t.outcome}">${isWin ? '+' + UI.fmt(t.winAmt) : '—'}</div>
          <div class="amt-cost">Cost: ${UI.fmt(t.price)}</div>
        </div>
        <button class="del-btn" data-id="${t.id}" title="Delete">🗑</button>
      </div>`;
    }).join('');
  },

  /* ── Auth screen ────────────────────────────────────────── */
  isSignUp: false,

  populateStateDropdown() {
    const sel = document.getElementById('auth-state');
    if (!sel) return;
    sel.innerHTML = US_STATES.map(s =>
      `<option value="${s.code}"${s.code === 'TX' ? ' selected' : ''}>${s.name} (${s.code})</option>`
    ).join('');
  },

  showAuthScreen() {
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = '';
    document.getElementById('app-screen').style.display = 'none';
    UI.clearAuthError();
  },

  showAppScreen() {
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = '';
  },

  showSetupScreen() {
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('setup-screen').style.display = '';
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'none';
  },

  toggleAuthMode() {
    UI.isSignUp = !UI.isSignUp;
    const title = document.getElementById('auth-title');
    const submit = document.getElementById('auth-submit');
    const toggle = document.getElementById('auth-toggle');
    const signupFields = document.getElementById('signup-fields');
    const confirmRow = document.getElementById('confirm-pw-row');

    if (UI.isSignUp) {
      title.textContent = 'Sign Up';
      submit.textContent = 'Create Account';
      toggle.textContent = 'Sign In';
      toggle.parentElement.childNodes[0].textContent = 'Already have an account? ';
      signupFields.style.display = '';
      confirmRow.style.display = '';
    } else {
      title.textContent = 'Sign In';
      submit.textContent = 'Sign In';
      toggle.textContent = 'Sign Up';
      toggle.parentElement.childNodes[0].textContent = "Don't have an account? ";
      signupFields.style.display = 'none';
      confirmRow.style.display = 'none';
    }
    UI.clearAuthError();
  },

  showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = '';
  },

  clearAuthError() {
    const el = document.getElementById('auth-error');
    el.textContent = '';
    el.style.display = 'none';
  },

  /* ── Utility ────────────────────────────────────────────── */
  showToast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + (type || '');
    setTimeout(() => t.className = 'toast', 2800);
  },

  showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
  },

  hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
  },

  fmt(n) {
    return '$' + Number(n).toFixed(2);
  },

  esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  updateUserDisplay() {
    const user = Auth.currentUser;
    if (!user) return;
    const nameEl = document.getElementById('user-display');
    const stateEl = document.getElementById('user-state-badge');
    if (nameEl) nameEl.textContent = user.displayName || user.email;
    if (stateEl) stateEl.textContent = user.state || 'TX';

    // Show/hide admin link
    const adminLink = document.getElementById('nav-admin');
    if (adminLink) {
      adminLink.style.display = Auth.isAdmin() ? '' : 'none';
    }
  },

  populateProfileStateDropdown() {
    const sel = document.getElementById('profile-state');
    if (!sel) return;
    sel.innerHTML = US_STATES.map(s =>
      `<option value="${s.code}">${s.name} (${s.code})</option>`
    ).join('');
  },

  openProfileModal() {
    const user = Auth.currentUser;
    if (!user) return;

    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-name').value = user.displayName || '';
    
    const stateSel = document.getElementById('profile-state');
    if (stateSel) {
      if (!stateSel.options.length) {
        UI.populateProfileStateDropdown();
      }
      stateSel.value = user.state || 'TX';
    }

    document.getElementById('profile-modal').style.display = 'flex';
  },

  closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.style.display = 'none';
  }
};
