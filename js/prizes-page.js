/* ============================================================
   prizes-page.js — Win Analytics Page Controller for The Pattern
   ============================================================ */

(function () {
  'use strict';

  let _gameFilter = null; // selected gameNum — the pattern is per-game ONLY
  let _chartType = 'freq'; // 'freq' | 'amt'
  let _chartInstance = null;
  let _personalTickets = [];
  let _communityTickets = [];
  let _currentScope = 'personal'; // 'personal' | 'community'

  function getActiveTickets() {
    return _currentScope === 'personal' ? _personalTickets : _communityTickets;
  }

  document.addEventListener('DOMContentLoaded', () => {
    /* 1. Check Firebase Config */
    if (!isFirebaseConfigured()) {
      window.location.href = 'index.html';
      return;
    }

    /* 2. Init Auth Listener */
    Auth.init(async (user) => {
      if (!user) {
        window.location.href = 'index.html';
        return;
      }

      /* Update nav user display */
      const nameEl = document.getElementById('user-display');
      const stateEl = document.getElementById('user-state-badge');
      if (nameEl) nameEl.textContent = user.displayName || user.email;
      if (stateEl) stateEl.textContent = user.state || 'TX';

      /* Show/hide admin link */
      const adminLink = document.getElementById('nav-admin');
      if (adminLink) {
        adminLink.style.display = Auth.isAdmin() ? '' : 'none';
      }

      /* Show/hide scope toggle for viewers/admins */
      const isViewerOrAdmin = Auth.isViewer() || Auth.isAdmin();
      const scopeCard = document.getElementById('scope-toggle-card');
      if (scopeCard) {
        scopeCard.style.display = isViewerOrAdmin ? 'flex' : 'none';
      }

      /* Load tickets for analytics */
      try {
        _personalTickets = await Tracker.loadTickets(user.uid, user.state || 'TX');
      } catch (e) {
        console.error('Failed to load tickets:', e);
      }

      refreshDashboard(user.state);
      hideLoading();
    });

    /* 3. Wire Events */
    wireEvents();
  });

  /* ── Loading ─────────────────────────────────────────────── */
  function hideLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.add('hidden');
  }

  /* ── Dashboard Refreshing ────────────────────────────────── */
  function refreshDashboard(stateCode) {
    const tickets = getActiveTickets();
    // We now analyze the frequency of ALL logged ticket numbers (wins AND losses).
    const numbered = tickets.filter(t => (t.ticketNumber || '').trim());
    const noTicketsEl = document.getElementById('no-tickets-msg');
    const gridEl = document.getElementById('analytics-grid');
    const gameCardEl = document.getElementById('game-select-card');
    const hotCardEl = document.getElementById('hot-numbers-card');

    const show = numbered.length > 0;
    if (!show && noTicketsEl) {
      noTicketsEl.querySelector('p').textContent = _currentScope === 'personal'
        ? 'No ticket numbers logged yet. Start recording your scratch-offs (with their ticket numbers) in the Tracker to unlock analytics!'
        : 'No community ticket numbers logged yet for this state.';
      const goBtn = noTicketsEl.querySelector('.add-btn');
      if (goBtn) goBtn.style.display = _currentScope === 'personal' ? 'inline-block' : 'none';
    }
    if (noTicketsEl) noTicketsEl.style.display = show ? 'none' : '';
    if (gridEl) gridEl.style.display = show ? '' : 'none';
    if (gameCardEl) gameCardEl.style.display = show ? '' : 'none';
    if (hotCardEl) hotCardEl.style.display = show ? '' : 'none';

    buildGameBoxes();
    updateDashboard();
  }

  function buildGameBoxes() {
    const container = document.getElementById('anal-game-boxes');
    if (!container) return;

    const tickets = getActiveTickets();
    // One box per game that has at least one logged ticket NUMBER (wins or losses).
    const numbered = tickets.filter(t => (t.ticketNumber || '').trim());

    const byGame = {};
    for (const t of numbered) {
      const num = t.gameNum;
      if (!byGame[num]) byGame[num] = { num, name: t.gameName, price: t.price, count: 0 };
      byGame[num].count += 1;
    }

    const games = Object.values(byGame).sort((a, b) => b.count - a.count);

    if (games.length === 0) {
      container.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;">No ticket numbers to analyze yet.</p>';
      _gameFilter = null;
      return;
    }

    // Keep current selection if still valid, otherwise default to the most-logged game.
    if (!_gameFilter || !byGame[_gameFilter]) {
      _gameFilter = games[0].num;
    }

    container.innerHTML = games.map(g => `
      <div class="game-box${g.num === _gameFilter ? ' active' : ''}" data-game="${esc(g.num)}">
        <div class="game-box-name" title="${esc(g.name)}">${esc(g.name)}</div>
        <div class="game-box-meta">
          <span>$${g.price} ticket</span>
          <span class="game-box-count">${g.count} logged</span>
        </div>
      </div>
    `).join('');
  }

  /* ── Update Dashboard Metrics & Visuals ──────────────────── */
  function updateDashboard() {
    const tickets = getActiveTickets();

    /* ── Top metric cards = OVERALL totals across ALL games (a summary that
          does NOT change when you switch the selected game). ── */
    const allWins = tickets.filter(t => t.outcome === 'win');
    const overallWon = allWins.reduce((sum, t) => sum + (t.winAmt || 0), 0);
    const overallSpent = tickets.reduce((sum, t) => sum + (t.price || 0), 0);
    const overallMax = allWins.length ? Math.max(...allWins.map(t => parseFloat(t.winAmt) || 0)) : 0;
    const net = overallWon - overallSpent;
    document.getElementById('m-wins').textContent = allWins.length;
    document.getElementById('m-lucky').textContent = tickets.length;   // total tickets logged
    document.getElementById('m-max').textContent = fmt(overallMax);
    document.getElementById('m-total-won').textContent = fmt(overallWon);
    document.getElementById('m-spent').textContent = fmt(overallSpent);
    const netEl = document.getElementById('m-net');
    if (netEl) {
      netEl.textContent = (net >= 0 ? '+' : '-') + fmt(Math.abs(net));
      netEl.className = 'metric-val ' + (net >= 0 ? 'g' : 'r');
    }

    /* ── Everything else is for the SELECTED game only. ── */
    const gameTickets = _gameFilter ? tickets.filter(t => t.gameNum === _gameFilter) : [];
    const filteredWins = gameTickets.filter(t => t.outcome === 'win');

    const sel = gameTickets[0] || tickets.find(t => t.gameNum === _gameFilter);
    const selName = sel ? '· ' + sel.gameName : '';
    const labelEl = document.getElementById('chart-game-label');
    if (labelEl) labelEl.textContent = selName;
    const hotLabel = document.getElementById('hot-game-label');
    if (hotLabel) hotLabel.textContent = selName;

    renderWinsTable(filteredWins);
    renderFreqTable(gameTickets);
    buildHotNumbers(gameTickets);
    renderGamePerf(gameTickets, filteredWins);
  }

  /* ── Per-game win-rate / ROI ─────────────────────────────── */
  function renderGamePerf(gameTickets, wins) {
    const card = document.getElementById('game-perf-card');
    const grid = document.getElementById('perf-grid');
    if (!card || !grid) return;

    if (!_gameFilter || gameTickets.length === 0) {
      card.style.display = 'none';
      return;
    }

    const played = gameTickets.length;
    const winCount = wins.length;
    const winRate = played ? (winCount / played * 100) : 0;
    const spent = gameTickets.reduce((s, t) => s + (t.price || 0), 0);
    const won = wins.reduce((s, t) => s + (parseFloat(t.winAmt) || 0), 0);
    const net = won - spent;
    const roiPct = spent > 0 ? (net / spent * 100) : 0;

    const label = document.getElementById('perf-game-label');
    if (label) label.textContent = gameTickets[0] ? '· ' + gameTickets[0].gameName : '';

    const netCls = net >= 0 ? 'g' : 'r';
    const tiles = [
      { v: String(played), l: 'Played' },
      { v: winCount + ' · ' + winRate.toFixed(0) + '%', l: 'Wins (rate)' },
      { v: fmt(spent), l: 'Spent' },
      { v: fmt(won), l: 'Won' },
      { v: (net >= 0 ? '+' : '-') + fmt(Math.abs(net)), l: 'Net', cls: netCls },
      { v: (roiPct >= 0 ? '+' : '') + roiPct.toFixed(0) + '%', l: 'ROI', cls: netCls }
    ];
    grid.innerHTML = tiles.map(t =>
      `<div class="perf-tile"><div class="perf-val ${t.cls || ''}">${t.v}</div><div class="perf-lbl">${t.l}</div></div>`
    ).join('');
    card.style.display = '';
  }

  /* ── Render wins historical list ─────────────────────────── */
  function renderWinsTable(wins) {
    const tbody = document.getElementById('wins-table-body');
    if (!tbody) return;

    if (!wins.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px;">No wins matching filters.</td></tr>';
      return;
    }

    tbody.innerHTML = wins.map(t => {
      const dateStr = t.date
        ? new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', {
            month: 'short', day: 'numeric'
          })
        : '';
      return `<tr>
        <td><span class="ticket-badge">#${esc(t.ticketNumber || '—')}</span></td>
        <td><div style="font-weight:600;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(t.gameName)}">${esc(t.gameName)}</div></td>
        <td class="g" style="font-family:'Outfit',sans-serif;font-weight:700;">+${fmtPrize(t.winAmt)}</td>
        <td style="color:var(--muted);font-size:0.8rem;">${dateStr}</td>
      </tr>`;
    }).join('');
  }

  /* ── Render the per-number breakdown table — ONE row per ticket number ── */
  function renderFreqTable(rows) {
    const tbody = document.getElementById('freq-table-body');
    if (!tbody) return;

    // One row per ticket number. Track how many times it was seen, and a
    // breakdown of the amounts it hit (so $40/$50/$100 collapse into one row).
    const byNum = {};
    for (const t of rows) {
      const num = (t.ticketNumber || '').trim();
      if (!num) continue;
      const amt = parseFloat(t.winAmt) || 0;
      if (!byNum[num]) byNum[num] = { num, total: 0, amts: {} };
      byNum[num].total += 1;
      byNum[num].amts[amt] = (byNum[num].amts[amt] || 0) + 1;
    }

    const list = Object.values(byNum).sort((a, b) => {
      const na = parseInt(a.num, 10), nb = parseInt(b.num, 10);
      if (isNaN(na) || isNaN(nb)) return a.num.localeCompare(b.num);
      return na - nb;
    });

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px;">No ticket numbers logged for this game yet.</td></tr>';
      return;
    }

    const maxC = Math.max(...list.map(r => r.total));

    tbody.innerHTML = list.map(r => {
      const w = Math.round((r.total / maxC) * 100);
      const badges = Object.keys(r.amts).map(Number).sort((a, b) => b - a).map(amt => {
        const cnt = r.amts[amt];
        const label = amt > 0 ? '$' + fmtPrize(amt) : 'no win';
        const cls = amt > 0 ? 'pb-win' : 'pb-loss';
        return `<span class="prize-badge ${cls}">${label}${cnt > 1 ? ' ×' + cnt : ''}</span>`;
      }).join('');
      return `<tr>
        <td><span class="ticket-badge">#${esc(r.num)}</span></td>
        <td><div class="prize-badges">${badges}</div></td>
        <td>
          <div class="freq-cell">
            <span class="freq-bar" style="width:${w}%"></span>
            <span class="freq-count">${r.total}×</span>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  /* ── Hot Numbers ─────────────────────────────────────────── */
  function buildHotNumbers(tickets) {
    const section = document.getElementById('hot-numbers-section');
    if (!section) return;

    // Filter to tickets that have a ticketNumber
    const withNums = tickets.filter(t => (t.ticketNumber || '').trim());
    if (withNums.length === 0) {
      section.innerHTML = '<p style="color:var(--muted); font-size:0.85rem;">No ticket number data yet. Start logging ticket numbers to reveal patterns!</p>';
      return;
    }

    // Group by gameNum → winAmt → ticketNumber
    const games = {};
    for (const t of withNums) {
      const gKey = t.gameNum;
      if (!games[gKey]) games[gKey] = { name: t.gameName, price: t.price, prizes: {} };
      const prizeKey = t.winAmt || 0;
      if (!games[gKey].prizes[prizeKey]) games[gKey].prizes[prizeKey] = {};
      const num = t.ticketNumber.trim();
      games[gKey].prizes[prizeKey][num] = (games[gKey].prizes[prizeKey][num] || 0) + 1;
    }

    let html = '';
    for (const [gameNum, gameData] of Object.entries(games)) {
      html += `<div class="hot-game-block">`;
      html += `<div class="hot-game-title">${esc(gameData.name)} · $${gameData.price} ticket</div>`;
      
      // Sort prize tiers descending
      const prizeTiers = Object.keys(gameData.prizes).map(Number).sort((a,b) => b - a);
      for (const prize of prizeTiers) {
        const nums = gameData.prizes[prize];
        const sorted = Object.entries(nums).sort((a,b) => b[1] - a[1]);
        const prizeLabel = prize > 0 ? `$${fmtPrize(prize)}` : 'No Win';
        
        html += `<div class="hot-prize-row">`;
        html += `<span class="hot-prize-label">${prizeLabel} →</span>`;
        for (const [num, count] of sorted) {
          const isFire = count >= 3;
          html += `<span class="hot-num${isFire ? ' fire' : ''}">#${esc(num)} (×${count}${isFire ? ' <span class="fire-icon">🔥</span>' : ''})</span>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    }

    section.innerHTML = html;
  }

  /* ── Wire events ─────────────────────────────────────────── */
  function wireEvents() {
    /* Scope Toggles */
    const personalBtn = document.getElementById('scope-personal');
    const communityBtn = document.getElementById('scope-community');

    if (personalBtn && communityBtn) {
      personalBtn.addEventListener('click', () => {
        if (_currentScope === 'personal') return;
        _currentScope = 'personal';
        personalBtn.classList.add('active');
        communityBtn.classList.remove('active');
        refreshDashboard(Auth.currentUser.state);
      });

      communityBtn.addEventListener('click', async () => {
        if (_currentScope === 'community') return;
        _currentScope = 'community';
        communityBtn.classList.add('active');
        personalBtn.classList.remove('active');

        if (_communityTickets.length === 0) {
          const loading = document.getElementById('loading-overlay');
          if (loading) loading.classList.remove('hidden');
          try {
            // Cap the read so this doesn't pull the entire collection as data grows.
            const snap = await db.collectionGroup('tickets')
              .orderBy('createdAt', 'desc')
              .limit(3000)
              .get();
            _communityTickets = snap.docs.map(doc => ({
              id: doc.id,
              userId: doc.ref.parent.parent.id,
              ...doc.data()
            })).filter(t => (t.state || 'TX') === (Auth.currentUser.state || 'TX') && t.status === 'approved');
          } catch (e) {
            console.error('Failed to load community tickets:', e);
            showToast('Failed to load community data.', 'e');
          } finally {
            if (loading) loading.classList.add('hidden');
          }
        }
        refreshDashboard(Auth.currentUser.state);
      });
    }

    /* Logout */
    document.getElementById('logout-btn').addEventListener('click', async () => {
      try {
        await Auth.signOut();
        window.location.href = 'index.html';
      } catch (e) {
        showToast('Sign out failed.', 'e');
      }
    });

    /* Game box selection */
    const gameBoxes = document.getElementById('anal-game-boxes');
    if (gameBoxes) {
      gameBoxes.addEventListener('click', (e) => {
        const box = e.target.closest('.game-box');
        if (!box) return;
        _gameFilter = box.dataset.game;
        gameBoxes.querySelectorAll('.game-box').forEach(b => b.classList.remove('active'));
        box.classList.add('active');
        updateDashboard();
      });
    }

    /* Profile Modal triggers */
    const badgeEl = document.getElementById('user-state-badge');
    if (badgeEl) {
      badgeEl.addEventListener('click', () => openProfileModal());
    }

    const dispEl = document.getElementById('user-display');
    if (dispEl) {
      dispEl.addEventListener('click', () => openProfileModal());
    }

    const closeEl = document.getElementById('profile-modal-close');
    if (closeEl) {
      closeEl.addEventListener('click', () => closeProfileModal());
    }

    window.addEventListener('click', (e) => {
      const modal = document.getElementById('profile-modal');
      if (e.target === modal) {
        closeProfileModal();
      }
    });

    const saveBtn = document.getElementById('profile-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('profile-name').value.trim();
        const state = document.getElementById('profile-state').value;
        if (!name) {
          showToast('Please enter your name.', 'e');
          return;
        }
        try {
          document.getElementById('loading-overlay').classList.remove('hidden');
          await Auth.updateProfile({ displayName: name, state: state });
          closeProfileModal();
          window.location.reload(); // Reload to refresh all analytics for the new state!
        } catch (err) {
          console.error('Failed to update profile:', err);
          showToast('Failed to save profile. Try again.', 'e');
          document.getElementById('loading-overlay').classList.add('hidden');
        }
      });
    }
  }

  function openProfileModal() {
    const user = Auth.currentUser;
    if (!user) return;

    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-name').value = user.displayName || '';
    
    const stateSel = document.getElementById('profile-state');
    if (stateSel) {
      if (!stateSel.options.length) {
        stateSel.innerHTML = US_STATES.map(s =>
          `<option value="${s.code}">${s.name} (${s.code})</option>`
        ).join('');
      }
      stateSel.value = user.state || 'TX';
    }

    document.getElementById('profile-modal').style.display = 'flex';
  }

  function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.style.display = 'none';
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function fmt(n) {
    return '$' + Number(n).toFixed(2);
  }

  function fmtPrize(n) {
    if (n >= 1000000) {
      const millions = n / 1000000;
      return (Number.isInteger(millions) ? millions : millions.toFixed(1)) + "M";
    }
    if (n >= 1000) {
      const thousands = n / 1000;
      return (Number.isInteger(thousands) ? thousands : thousands.toFixed(1)) + "K";
    }
    return n;
  }

  function showToast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + (type || '');
    setTimeout(() => t.className = 'toast', 2800);
  }

})();
