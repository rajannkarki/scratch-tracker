/* ============================================================
   prizes-page.js — Prize Ranges page controller
   ============================================================ */

(function () {
  'use strict';

  let _priceFilter = 'all';
  let _searchQuery = '';
  let _searchDebounce = null;
  let _playedNums = new Set();
  let _allGames = [];

  document.addEventListener('DOMContentLoaded', () => {
    /* 1. Check Firebase */
    if (!isFirebaseConfigured()) {
      window.location.href = 'index.html';
      return;
    }

    /* 2. Auth init */
    Auth.init(async (user) => {
      if (!user) {
        window.location.href = 'index.html';
        return;
      }

      /* Update nav user display */
      const nameEl = document.getElementById('user-display');
      const stateEl = document.getElementById('user-state-badge');
      if (nameEl) nameEl.textContent = user.displayName || user.email;
      if (stateEl) stateEl.textContent = user.state || '—';

      /* Load tickets for "played" highlighting */
      try {
        await Tracker.loadTickets(user.uid);
        _playedNums = Tracker.getPlayedGameNums();
      } catch (e) {
        console.error('Failed to load tickets:', e);
      }

      /* Load games */
      _allGames = getGamesForState(user.state);

      if (!_allGames.length) {
        document.getElementById('no-games-msg').style.display = '';
        document.getElementById('price-filter').style.display = 'none';
        document.getElementById('prizes-search').style.display = 'none';
      }

      buildPriceFilter();
      renderCatalog();
      hideLoading();
    });

    /* 3. Wire events */
    wireEvents();
  });

  /* ── Loading ─────────────────────────────────────────────── */
  function hideLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.add('hidden');
  }

  /* ── Price filter chips ──────────────────────────────────── */
  function buildPriceFilter() {
    const prices = [...new Set(_allGames.map(g => g.price))].sort((a, b) => a - b);
    const container = document.getElementById('price-filter');

    let html = '<button class="price-chip active" data-price="all">All</button>';
    for (const p of prices) {
      html += `<button class="price-chip" data-price="${p}">$${p}</button>`;
    }
    container.innerHTML = html;
  }

  /* ── Render game catalog ─────────────────────────────────── */
  function renderCatalog() {
    let games = [..._allGames];

    /* Price filter */
    if (_priceFilter !== 'all') {
      games = games.filter(g => g.price === _priceFilter);
    }

    /* Search filter */
    if (_searchQuery) {
      const q = _searchQuery.toLowerCase();
      games = games.filter(g =>
        g.name.toLowerCase().includes(q) || g.num.includes(q)
      );
    }

    /* Sort: played games first, then alphabetical */
    games.sort((a, b) => {
      const aPlayed = _playedNums.has(a.num);
      const bPlayed = _playedNums.has(b.num);
      if (aPlayed && !bPlayed) return -1;
      if (!aPlayed && bPlayed) return 1;
      return a.name.localeCompare(b.name);
    });

    const container = document.getElementById('game-catalog');

    if (!games.length) {
      container.innerHTML = '<div class="empty"><div class="empty-icon">🎰</div><p>No games match your filter.</p></div>';
      return;
    }

    container.innerHTML = games.map(g => {
      const isPlayed = _playedNums.has(g.num);
      const playCount = isPlayed
        ? Tracker.tickets.filter(t => t.gameNum === g.num).length
        : 0;
      const closing = g.close ? `<span>Ends ${esc(g.close)}</span>` : '';
      const topPrize = g.prizes[g.prizes.length - 1];

      /* Prize rows */
      const prizeRows = g.prizes.map((p, i) => {
        const isTop = i === g.prizes.length - 1;
        return `<tr${isTop ? ' class="top-prize"' : ''}>
          <td>${isTop ? '⭐ ' : ''}${fmtPrize(p)}</td>
          <td>${isTop ? 'TOP PRIZE' : 'Prize Tier ' + (i + 1)}</td>
        </tr>`;
      }).join('');

      return `<div class="catalog-card${isPlayed ? ' played' : ''}" data-num="${g.num}">
        <div class="catalog-header">
          <div class="catalog-info">
            <div class="catalog-name">${esc(g.name)}</div>
            <div class="catalog-meta">
              <span>Game #${g.num}</span>
              ${closing}
              ${isPlayed ? `<span class="played-badge">✓ PLAYED (${playCount})</span>` : ''}
            </div>
          </div>
          <span class="catalog-price-badge">$${g.price}</span>
          <span class="catalog-arrow">▼</span>
        </div>
        <div class="catalog-body">
          <table class="prize-table">
            <thead><tr><th>Prize Amount</th><th>Tier</th></tr></thead>
            <tbody>${prizeRows}</tbody>
          </table>
          <div class="catalog-footer">
            Top Prize: ${fmtPrize(topPrize)} · Ticket Price: $${g.price}
          </div>
        </div>
      </div>`;
    }).join('');
  }

  /* ── Wire events ─────────────────────────────────────────── */
  function wireEvents() {
    /* Logout */
    document.getElementById('logout-btn').addEventListener('click', async () => {
      try {
        await Auth.signOut();
        window.location.href = 'index.html';
      } catch (e) {
        showToast('Sign out failed.', 'e');
      }
    });

    /* Price filter clicks */
    document.getElementById('price-filter').addEventListener('click', (e) => {
      const chip = e.target.closest('.price-chip');
      if (!chip) return;

      const val = chip.dataset.price;
      _priceFilter = val === 'all' ? 'all' : parseInt(val, 10);

      document.querySelectorAll('.price-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderCatalog();
    });

    /* Search */
    document.getElementById('prizes-search').addEventListener('input', (e) => {
      clearTimeout(_searchDebounce);
      _searchDebounce = setTimeout(() => {
        _searchQuery = e.target.value.trim();
        renderCatalog();
      }, 200);
    });

    /* Expand/collapse cards */
    document.getElementById('game-catalog').addEventListener('click', (e) => {
      const header = e.target.closest('.catalog-header');
      if (!header) return;
      const card = header.closest('.catalog-card');
      if (!card) return;
      card.classList.toggle('open');
    });
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function showToast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + (type || '');
    setTimeout(() => t.className = 'toast', 2800);
  }

})();
