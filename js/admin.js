/* ============================================================
   admin.js — Admin Dashboard Page Controller
   ============================================================ */

(function () {
  'use strict';

  let _chartType = 'freq'; // 'freq' | 'amt'
  let _chartInstance = null;
  let _allUsers = [];
  let _allTickets = [];

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

        renderSystemStats(_allUsers, _allTickets);
        renderUserTable(_allUsers);
        renderCommunityChart(_allTickets);
        renderCommunityTable(_allTickets);
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

      // Don't show toggle for admin users
      const actionBtn = isAdmin
        ? '<span style="color:var(--gold);font-size:0.8rem;font-weight:600;">Admin</span>'
        : `<button class="toggle-btn role-toggle-btn ${isViewer ? 'active' : ''}" data-uid="${u.uid}" data-role="${u.role || ''}" style="font-size:0.75rem;padding:4px 12px;">${isViewer ? 'Revoke Viewer' : 'Grant Viewer'}</button>`;

      return `<tr>
        <td style="font-size:0.85rem;">${esc(u.email || '—')}</td>
        <td style="font-weight:600;">${esc(u.displayName || '—')}</td>
        <td><span class="user-state-badge" style="cursor:default;">${esc(u.state || '—')}</span></td>
        <td style="font-size:0.85rem;text-transform:capitalize;">${esc(role)}</td>
        <td>${actionBtn}</td>
      </tr>`;
    }).join('');
  }

  /* ── Render Community Chart (Line) ───────────────────────── */
  function renderCommunityChart(tickets) {
    const ctx = document.getElementById('community-chart');
    if (!ctx) return;

    // Aggregate by date
    const dataMap = {};
    for (const t of tickets) {
      const dateKey = t.date || 'Unknown';
      if (!dataMap[dateKey]) {
        dataMap[dateKey] = { freq: 0, amt: 0 };
      }
      dataMap[dateKey].freq += 1;
      dataMap[dateKey].amt += parseFloat(t.winAmt) || 0;
    }

    // Sort by date
    const sortedKeys = Object.keys(dataMap).sort((a, b) => {
      if (a === 'Unknown') return -1;
      if (b === 'Unknown') return 1;
      return a.localeCompare(b);
    });

    const labels = sortedKeys.map(k => {
      if (k === 'Unknown') return k;
      try {
        return new Date(k + 'T12:00:00').toLocaleDateString('en-US', {
          month: 'short', day: 'numeric'
        });
      } catch (_) {
        return k;
      }
    });

    const dataValues = sortedKeys.map(k => _chartType === 'freq' ? dataMap[k].freq : dataMap[k].amt);

    if (_chartInstance) {
      _chartInstance.destroy();
    }

    if (labels.length === 0) {
      const canvas = document.getElementById('community-chart');
      const canvasCtx = canvas.getContext('2d');
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      canvasCtx.fillStyle = '#777';
      canvasCtx.font = '16px Inter';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText('No ticket data available yet.', canvas.width / 2, canvas.height / 2);
      return;
    }

    const valueLabel = _chartType === 'freq' ? 'Tickets Logged' : 'Total Amount Won ($)';

    // Create gradient fill
    const chartCtx = ctx.getContext('2d');
    const gradient = chartCtx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(6, 214, 160, 0.3)');
    gradient.addColorStop(1, 'transparent');

    _chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: valueLabel,
          data: dataValues,
          borderColor: '#06D6A0',
          backgroundColor: gradient,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#06D6A0',
          pointBorderColor: '#0D1117',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#FFD700',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#181818',
            titleColor: '#06D6A0',
            titleFont: { family: 'Outfit', size: 14, weight: '700' },
            bodyColor: '#F0F0F0',
            bodyFont: { family: 'Inter', size: 13 },
            borderColor: '#252525',
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              label: function (context) {
                const val = context.parsed.y;
                return _chartType === 'freq' ? `${val} tickets` : `$${val.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: '#222'
            },
            ticks: {
              color: '#777',
              font: { family: 'Inter', size: 11, weight: '500' },
              maxRotation: 45
            }
          },
          y: {
            grid: {
              color: '#222'
            },
            ticks: {
              color: '#777',
              font: { family: 'Inter', size: 11 },
              callback: function (value) {
                return _chartType === 'freq' ? value : '$' + value;
              }
            }
          }
        }
      }
    });
  }

  /* ── Render Community Wins Table ──────────────────────────── */
  function renderCommunityTable(tickets) {
    const tbody = document.getElementById('community-wins-body');
    if (!tbody) return;

    const wins = tickets.filter(t => t.outcome === 'win');

    if (!wins.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px;">No winning tickets across all users.</td></tr>';
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

    /* Chart toggles */
    document.getElementById('toggle-freq').addEventListener('click', () => {
      _chartType = 'freq';
      document.getElementById('toggle-freq').classList.add('active');
      document.getElementById('toggle-amt').classList.remove('active');
      renderCommunityChart(_allTickets);
    });

    document.getElementById('toggle-amt').addEventListener('click', () => {
      _chartType = 'amt';
      document.getElementById('toggle-amt').classList.add('active');
      document.getElementById('toggle-freq').classList.remove('active');
      renderCommunityChart(_allTickets);
    });

    /* Role toggle buttons — delegated */
    document.getElementById('users-table-body').addEventListener('click', (e) => {
      const btn = e.target.closest('.role-toggle-btn');
      if (!btn) return;
      const uid = btn.dataset.uid;
      const currentRole = btn.dataset.role;
      toggleRole(uid, currentRole);
    });

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
