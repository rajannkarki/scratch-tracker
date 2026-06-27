/* ============================================================
   admin.js — Admin Dashboard Page Controller
   ============================================================ */

(function () {
  'use strict';

  let _chartType = 'freq'; // 'freq' | 'amt'
  let _chartInstance = null;
  let _allUsers = [];
  let _allTickets = [];
  let _gameFilter = null; // selected gameNum — community pattern is per-game ONLY
  let _detailUid = null;  // user currently open in the drilldown modal

  function approvedWins() {
    return _allTickets.filter(t => (t.status === 'approved' || !t.status) && t.outcome === 'win');
  }

  // Approved community tickets that carry a ticket number (wins AND losses) —
  // used for the per-game frequency chart, since all logged numbers matter.
  function approvedNumbered() {
    return _allTickets.filter(t => (t.status === 'approved' || !t.status) && (t.ticketNumber || '').trim());
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

      /* 3. Check admin role */
      const isAdmin = await checkAdmin(user.uid);
      if (!isAdmin) {
        window.location.href = 'index.html';
        return;
      }

      /* 4. Load all data and render */
      try {
        _allUsers = await loadAllUsers();
        _allTickets = await loadAllTickets();

        renderAllAdminUI();
      } catch (e) {
        console.error('Admin data load failed:', e);
        showToast('Failed to load admin data.', 'e');
      }

      hideLoading();
    });

    /* 5. Wire Events */
    wireEvents();
  });

  /* ── Loading ─────────────────────────────────────────────── */
  function hideLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.add('hidden');
  }

  /* ── Check Admin Role ────────────────────────────────────── */
  async function checkAdmin(uid) {
    try {
      const doc = await db.collection('users').doc(uid).get();
      if (!doc.exists) return false;
      const data = doc.data();
      return data.role === 'admin';
    } catch (e) {
      console.error('Admin check failed:', e);
      return false;
    }
  }

  /* ── Load All Users ──────────────────────────────────────── */
  async function loadAllUsers() {
    const snap = await db.collection('users').get();
    return snap.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  }

  /* ── Load All Tickets (Collection Group) ─────────────────── */
  async function loadAllTickets() {
    const snap = await db.collectionGroup('tickets')
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(doc => ({
      id: doc.id,
      userId: doc.ref.parent.parent.id,
      ...doc.data()
    }));
  }

  /* ── Toggle Role ─────────────────────────────────────────── */
  async function toggleRole(uid, currentRole) {
    const newRole = currentRole === 'viewer' ? '' : 'viewer';
    try {
      await db.collection('users').doc(uid).update({ role: newRole });

      // Update local cache
      const user = _allUsers.find(u => u.uid === uid);
      if (user) user.role = newRole;

      renderUserTable(_allUsers);
      showToast(newRole ? 'Granted viewer role.' : 'Revoked viewer role.', 's');
    } catch (e) {
      console.error('Role toggle failed:', e);
      showToast('Failed to update role.', 'e');
    }
  }

  /* ── Moderation Queue Logic ──────────────────────────────── */
  function renderAllAdminUI() {
    // Treat tickets with no status or 'approved' status as approved
    const approvedTickets = _allTickets.filter(t => t.status === 'approved' || !t.status);
    const pendingTickets = _allTickets.filter(t => t.status === 'pending');

    renderSystemStats(_allUsers, approvedTickets);
    renderUserTable(_allUsers);
    renderModerationTable(pendingTickets);
    buildGameBoxes();
    renderCommunityChart();
    renderCommunityTable();
  }

  /* ── Build per-game selector boxes (community wins) ──────────── */
  function buildGameBoxes() {
    const container = document.getElementById('anal-game-boxes');
    if (!container) return;

    const numbered = approvedNumbered();
    const byGame = {};
    for (const t of numbered) {
      const num = t.gameNum;
      if (!byGame[num]) byGame[num] = { num, name: t.gameName, price: t.price, count: 0 };
      byGame[num].count += 1;
    }
    const games = Object.values(byGame).sort((a, b) => b.count - a.count);

    if (games.length === 0) {
      container.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;">No community ticket numbers to analyze yet.</p>';
      _gameFilter = null;
      return;
    }

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

  function renderModerationTable(pendingTickets) {
    const tbody = document.getElementById('moderation-table-body');
    if (!tbody) return;

    if (!pendingTickets.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:20px;">No tickets pending moderation.</td></tr>';
      return;
    }

    tbody.innerHTML = pendingTickets.map(t => {
      const user = _allUsers.find(u => u.uid === t.userId);
      const userLabel = user ? (user.displayName || user.email) : 'Unknown';
      const outcomeLabel = t.outcome === 'win'
        ? `<span class="status-badge approved">+${fmtPrize(t.winAmt)}</span>`
        : `<span class="status-badge" style="color:var(--muted);background:rgba(255,255,255,0.05);border:1px solid var(--border);">Loss</span>`;

      const dateStr = t.date
        ? new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', {
            month: 'short', day: 'numeric'
          })
        : '—';

      return `<tr>
        <td style="font-weight:600;font-size:0.85rem;">${esc(userLabel)}</td>
        <td><span class="user-state-badge" style="cursor:default;">${esc(t.state || 'TX')}</span></td>
        <td><div style="font-weight:600;max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(t.gameName)}">${esc(t.gameName)} (${esc(t.gameNum)})</div></td>
        <td>$${t.price}</td>
        <td>${outcomeLabel}</td>
        <td><span class="ticket-badge">#${esc(t.ticketNumber || '—')}</span></td>
        <td style="color:var(--muted);font-size:0.8rem;">${dateStr}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="toggle-btn approve-ticket-btn" data-uid="${t.userId}" data-tid="${t.id}" style="padding:4px 10px;font-size:0.75rem;background:#10B981;color:#fff;border:none;border-radius:4px;">Approve</button>
            <button class="toggle-btn reject-ticket-btn" data-uid="${t.userId}" data-tid="${t.id}" style="padding:4px 10px;font-size:0.75rem;background:#EF476F;color:#fff;border:none;border-radius:4px;">Reject</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  async function approveTicket(userId, ticketId) {
    try {
      await db.collection('users').doc(userId).collection('tickets').doc(ticketId).update({ status: 'approved' });
      
      const ticket = _allTickets.find(t => t.id === ticketId && t.userId === userId);
      if (ticket) ticket.status = 'approved';

      renderAllAdminUI();
      showToast('Ticket approved successfully.', 's');
    } catch (e) {
      console.error('Approve ticket failed:', e);
      showToast('Failed to approve ticket.', 'e');
    }
  }

  async function rejectTicket(userId, ticketId) {
    try {
      await db.collection('users').doc(userId).collection('tickets').doc(ticketId).update({ status: 'rejected' });
      
      const ticket = _allTickets.find(t => t.id === ticketId && t.userId === userId);
      if (ticket) ticket.status = 'rejected';

      renderAllAdminUI();
      showToast('Ticket rejected successfully.', 's');
    } catch (e) {
      console.error('Reject ticket failed:', e);
      showToast('Failed to reject ticket.', 'e');
    }
  }

  /* ── Render System Stats ─────────────────────────────────── */
  function renderSystemStats(users, tickets) {
    const totalUsers = users.length;
    const totalTickets = tickets.length;
    const totalSpent = tickets.reduce((sum, t) => sum + (t.price || 0), 0);
    const totalWon = tickets.reduce((sum, t) => sum + (t.winAmt || 0), 0);

    document.getElementById('m-total-users').textContent = totalUsers;
    document.getElementById('m-total-tickets').textContent = totalTickets;
    document.getElementById('m-total-spent').textContent = fmt(totalSpent);
    document.getElementById('m-total-won').textContent = fmt(totalWon);
  }

  /* ── Render User Management Table ────────────────────────── */
  function renderUserTable(users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px;">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => {
      const role = u.role || '—';
      const isViewer = u.role === 'viewer';
      const isAdmin = u.role === 'admin';

      // Don't show role toggle for admin users
      const roleBtn = isAdmin
        ? '<span style="color:var(--gold);font-size:0.8rem;font-weight:600;">Admin</span>'
        : `<button class="toggle-btn role-toggle-btn ${isViewer ? 'active' : ''}" data-uid="${u.uid}" data-role="${u.role || ''}" style="font-size:0.75rem;padding:4px 12px;">${isViewer ? 'Revoke Viewer' : 'Grant Viewer'}</button>`;

      const ticketCount = _allTickets.filter(t => t.userId === u.uid).length;
      const viewBtn = `<button class="toggle-btn view-user-btn" data-uid="${u.uid}" style="font-size:0.75rem;padding:4px 12px;">👁 View Tickets (${ticketCount})</button>`;

      return `<tr>
        <td style="font-size:0.85rem;">${esc(u.email || '—')}</td>
        <td style="font-weight:600;">${esc(u.displayName || '—')}</td>
        <td><span class="user-state-badge" style="cursor:default;">${esc(u.state || '—')}</span></td>
        <td style="font-size:0.85rem;text-transform:capitalize;">${esc(role)}</td>
        <td><div style="display:flex;gap:6px;flex-wrap:wrap;">${roleBtn}${viewBtn}</div></td>
      </tr>`;
    }).join('');
  }

  /* ── Render Community Chart (per-game ticket # distribution) ── */
  function renderCommunityChart() {
    const tbody = document.getElementById('freq-table-body');
    if (!tbody) return;

    // Only the selected game's numbered tickets (wins AND losses) — the pattern is per-game.
    const rows = approvedNumbered().filter(t => _gameFilter && t.gameNum === _gameFilter);

    // Update label with the game name
    const labelEl = document.getElementById('chart-game-label');
    if (labelEl) labelEl.textContent = rows[0] ? '· ' + rows[0].gameName : '';

    // Group by ticket number + amount won, and count how often that combo appears.
    const map = {};
    for (const t of rows) {
      const num = (t.ticketNumber || '').trim();
      if (!num) continue;
      const amt = parseFloat(t.winAmt) || 0;
      const key = num + '|' + amt;
      if (!map[key]) map[key] = { num, amt, count: 0 };
      map[key].count += 1;
    }

    const list = Object.values(map).sort((a, b) =>
      b.count - a.count || b.amt - a.amt || a.num.localeCompare(b.num)
    );

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px;">No community ticket numbers for this game yet.</td></tr>';
      return;
    }

    const maxC = Math.max(...list.map(r => r.count));

    tbody.innerHTML = list.map(r => {
      const w = Math.round((r.count / maxC) * 100);
      const wonStr = r.amt > 0 ? '$' + fmtPrize(r.amt) : 'No win';
      const wonStyle = r.amt > 0
        ? "font-family:'Outfit',sans-serif;font-weight:700;color:var(--gold);"
        : 'color:var(--muted);';
      return `<tr>
        <td><span class="ticket-badge">#${esc(r.num)}</span></td>
        <td style="${wonStyle}">${wonStr}</td>
        <td>
          <div class="freq-cell">
            <span class="freq-bar" style="width:${w}%"></span>
            <span class="freq-count">${r.count}×</span>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  /* ── Render Community Wins Table (selected game) ──────────── */
  function renderCommunityTable() {
    const tbody = document.getElementById('community-wins-body');
    if (!tbody) return;

    const wins = approvedWins().filter(t => _gameFilter && t.gameNum === _gameFilter);

    if (!wins.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px;">No winning tickets for this game.</td></tr>';
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

  /* ── Wire Events ─────────────────────────────────────────── */
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

    /* Game box selection (community activity) */
    const gameBoxes = document.getElementById('anal-game-boxes');
    if (gameBoxes) {
      gameBoxes.addEventListener('click', (e) => {
        const box = e.target.closest('.game-box');
        if (!box) return;
        _gameFilter = box.dataset.game;
        gameBoxes.querySelectorAll('.game-box').forEach(b => b.classList.remove('active'));
        box.classList.add('active');
        renderCommunityChart();
        renderCommunityTable();
      });
    }

    /* User table buttons — delegated (role toggle + view tickets) */
    document.getElementById('users-table-body').addEventListener('click', (e) => {
      const viewBtn = e.target.closest('.view-user-btn');
      if (viewBtn) {
        openUserDetail(viewBtn.dataset.uid);
        return;
      }
      const btn = e.target.closest('.role-toggle-btn');
      if (!btn) return;
      toggleRole(btn.dataset.uid, btn.dataset.role);
    });

    /* User detail modal close */
    const udClose = document.getElementById('user-detail-close');
    if (udClose) udClose.addEventListener('click', closeUserDetail);
    window.addEventListener('click', (e) => {
      const modal = document.getElementById('user-detail-modal');
      if (e.target === modal) closeUserDetail();
    });

    /* Delete ticket — delegated inside user detail modal */
    const udBody = document.getElementById('user-detail-body');
    if (udBody) {
      udBody.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.del-ticket-btn');
        if (!delBtn) return;
        const uid = delBtn.dataset.uid;
        const tid = delBtn.dataset.tid;
        if (confirm('Permanently delete this logged ticket? This cannot be undone.')) {
          deleteTicket(uid, tid);
        }
      });
    }

    /* Ticket moderation — delegated */
    const modBody = document.getElementById('moderation-table-body');
    if (modBody) {
      modBody.addEventListener('click', (e) => {
        const approveBtn = e.target.closest('.approve-ticket-btn');
        if (approveBtn) {
          const uid = approveBtn.dataset.uid;
          const tid = approveBtn.dataset.tid;
          approveTicket(uid, tid);
          return;
        }

        const rejectBtn = e.target.closest('.reject-ticket-btn');
        if (rejectBtn) {
          const uid = rejectBtn.dataset.uid;
          const tid = rejectBtn.dataset.tid;
          rejectTicket(uid, tid);
          return;
        }
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
          window.location.reload();
        } catch (err) {
          console.error('Failed to update profile:', err);
          showToast('Failed to save profile. Try again.', 'e');
          document.getElementById('loading-overlay').classList.add('hidden');
        }
      });
    }
  }

  /* ── Profile Modal ───────────────────────────────────────── */
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

  /* ── User Detail Drilldown (admin) ───────────────────────── */
  function openUserDetail(uid) {
    _detailUid = uid;
    const user = _allUsers.find(u => u.uid === uid);
    const title = document.getElementById('user-detail-title');
    const sub = document.getElementById('user-detail-sub');
    if (title) title.textContent = '👤 ' + (user ? (user.displayName || user.email || 'User') : 'User');
    if (sub) sub.textContent = user ? `${user.email || ''} · ${user.state || '—'}` : '';
    renderUserDetailBody();
    document.getElementById('user-detail-modal').style.display = 'flex';
  }

  function closeUserDetail() {
    _detailUid = null;
    const modal = document.getElementById('user-detail-modal');
    if (modal) modal.style.display = 'none';
  }

  function renderUserDetailBody() {
    const tbody = document.getElementById('user-detail-body');
    if (!tbody) return;

    const tickets = _allTickets
      .filter(t => t.userId === _detailUid)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (!tickets.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px;">This user has not logged any tickets.</td></tr>';
      return;
    }

    tbody.innerHTML = tickets.map(t => {
      const outcome = t.outcome === 'win'
        ? `<span class="status-badge approved">+${fmtPrize(t.winAmt)}</span>`
        : `<span style="color:var(--muted);">Loss</span>`;
      const dateStr = t.date
        ? new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
        : '—';
      const status = t.status || 'approved';
      return `<tr>
        <td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(t.gameName)}">${esc(t.gameName)} <span style="color:var(--muted);">(${esc(t.gameNum)})</span></td>
        <td><span class="ticket-badge">#${esc(t.ticketNumber || '—')}</span></td>
        <td>${outcome}</td>
        <td style="color:var(--muted);font-size:0.8rem;">${dateStr}</td>
        <td style="text-transform:capitalize;font-size:0.8rem;color:var(--muted);">${esc(status)}</td>
        <td><button class="del-ticket-btn" data-uid="${esc(t.userId)}" data-tid="${esc(t.id)}">Delete</button></td>
      </tr>`;
    }).join('');
  }

  async function deleteTicket(userId, ticketId) {
    try {
      await db.collection('users').doc(userId).collection('tickets').doc(ticketId).delete();

      // Remove from local cache
      _allTickets = _allTickets.filter(t => !(t.id === ticketId && t.userId === userId));

      renderUserDetailBody();   // refresh the open modal
      renderAllAdminUI();       // refresh stats, charts, tables, user counts
      showToast('Ticket deleted.', 's');
    } catch (e) {
      console.error('Delete ticket failed:', e);
      showToast('Failed to delete ticket.', 'e');
    }
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
