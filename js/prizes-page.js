/* ============================================================
   prizes-page.js — Win Analytics Page Controller
   ============================================================ */

(function () {
  'use strict';

  let _priceFilter = 'all';
  let _gameFilter = 'all';
  let _chartType = 'freq'; // 'freq' | 'amt'
  let _chartInstance = null;

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

      /* Load tickets for analytics */
      try {
        await Tracker.loadTickets(user.uid, user.state || 'TX');
      } catch (e) {
        console.error('Failed to load tickets:', e);
      }

      const wins = Tracker.tickets.filter(t => t.outcome === 'win');
      if (wins.length === 0) {
        // Show empty analytics message
        document.getElementById('no-tickets-msg').style.display = '';
        document.getElementById('analytics-grid').style.display = 'none';
        document.getElementById('price-filter').style.display = 'none';
        document.getElementById('anal-game-filter').parentElement.style.display = 'none';
      } else {
        document.getElementById('no-tickets-msg').style.display = 'none';
        document.getElementById('analytics-grid').style.display = '';
      }

      buildPriceFilter();
      buildGameFilter(user.state);
      updateDashboard();
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

  /* ── Build filters ───────────────────────────────────────── */
  function buildPriceFilter() {
    const prices = [...new Set(Tracker.tickets.map(g => g.price))].sort((a, b) => a - b);
    const container = document.getElementById('price-filter');
    if (!container) return;

    let html = '<button class="price-chip active" data-price="all">All</button>';
    for (const p of prices) {
      if (p) html += `<button class="price-chip" data-price="${p}">$${p}</button>`;
    }
    container.innerHTML = html;
  }

  function buildGameFilter(stateCode) {
    const select = document.getElementById('anal-game-filter');
    if (!select) return;

    const stateGames = getGamesForState(stateCode);
    let html = '<option value="all">All Games</option>';

    // Get unique games played by user in tickets
    const playedGameNums = [...new Set(Tracker.tickets.map(t => t.gameNum))];
    const playedGamesList = [];

    for (const num of playedGameNums) {
      const g = stateGames.find(sg => sg.num === num);
      if (g) {
        playedGamesList.push(g);
      } else {
        const ticket = Tracker.tickets.find(t => t.gameNum === num);
        if (ticket) {
          playedGamesList.push({ num: ticket.gameNum, name: ticket.gameName, price: ticket.price });
        }
      }
    }

    // Sort by name
    playedGamesList.sort((a, b) => a.name.localeCompare(b.name));

    for (const g of playedGamesList) {
      html += `<option value="${g.num}">${esc(g.name)} ($${g.price})</option>`;
    }
    select.innerHTML = html;
  }

  /* ── Update Dashboard Metrics & Visuals ──────────────────── */
  function updateDashboard() {
    let filteredWins = Tracker.tickets.filter(t => t.outcome === 'win');

    /* Filter by Price */
    if (_priceFilter !== 'all') {
      filteredWins = filteredWins.filter(t => t.price === _priceFilter);
    }

    /* Filter by Game */
    if (_gameFilter !== 'all') {
      filteredWins = filteredWins.filter(t => t.gameNum === _gameFilter);
    }

    /* 1. Calculate Metrics */
    const totalWins = filteredWins.length;
    const totalCashWon = filteredWins.reduce((sum, t) => sum + (t.winAmt || 0), 0);
    const maxWin = totalWins ? Math.max(...filteredWins.map(t => parseFloat(t.winAmt) || 0)) : 0;

    // Find luckiest ticket number (most occurrences among winning tickets)
    let luckyNum = '—';
    let maxOccur = 0;
    const frequencies = {};

    for (const t of filteredWins) {
      const num = (t.ticketNumber || '').trim();
      if (!num) continue;
      frequencies[num] = (frequencies[num] || 0) + 1;
      if (frequencies[num] > maxOccur) {
        maxOccur = frequencies[num];
        luckyNum = '#' + num;
      }
    }
    if (luckyNum !== '—' && maxOccur > 1) {
      luckyNum += ` (${maxOccur}x)`;
    }

    /* Render Metrics */
    document.getElementById('m-wins').textContent = totalWins;
    document.getElementById('m-lucky').textContent = luckyNum;
    document.getElementById('m-max').textContent = fmt(maxWin);
    document.getElementById('m-total-won').textContent = fmt(totalCashWon);

    /* 2. Render Historical Table */
    renderWinsTable(filteredWins);

    /* 3. Render Chart */
    renderChart(filteredWins);

    /* 4. Update Recommendations */
    updateRecommendations(filteredWins, _gameFilter);
  }

  /* ── Update Recommendations ──────────────────────────────── */
  function updateRecommendations(wins, gameFilter) {
    const recCard = document.getElementById('smart-recommendations-card');
    const recContent = document.getElementById('recommendations-content');
    if (!recCard || !recContent) return;

    if (wins.length === 0) {
      recCard.style.display = 'none';
      return;
    }

    const stats = {};
    let totalWinsWithNum = 0;
    
    for (const t of wins) {
      const num = (t.ticketNumber || '').trim();
      if (!num) continue;
      if (!stats[num]) {
        stats[num] = { freq: 0, amt: 0 };
      }
      stats[num].freq += 1;
      stats[num].offsetPrice = t.price || 0;
      stats[num].amt += parseFloat(t.winAmt) || 0;
      totalWinsWithNum += 1;
    }

    if (totalWinsWithNum === 0) {
      recCard.style.display = 'none';
      return;
    }

    const sortedByFreq = Object.keys(stats).sort((a, b) => stats[b].freq - stats[a].freq);
    const sortedByAmt = Object.keys(stats).sort((a, b) => stats[b].amt - stats[a].amt);

    const bestFreqNum = sortedByFreq[0];
    const bestFreqVal = stats[bestFreqNum].freq;
    const bestFreqPct = ((bestFreqVal / totalWinsWithNum) * 100).toFixed(1);

    const bestAmtNum = sortedByAmt[0];
    const bestAmtVal = stats[bestAmtNum].amt;

    let gameText = gameFilter === 'all' ? 'across all games' : 'for the selected game';
    
    let html = `
      <p style="margin-bottom: 8px;">Based on your logging history ${gameText}:</p>
      <ul style="margin-left: 20px; margin-bottom: 12px; list-style-type: disc;">
        <li style="margin-bottom: 6px;">
          🎯 <strong>Ticket Number #${bestFreqNum}</strong> has the <strong>highest win probability</strong>. It won <strong>${bestFreqVal} times</strong>, representing <strong>${bestFreqPct}%</strong> of your winning tickets.
        </li>
        ${bestAmtNum !== bestFreqNum ? `
        <li style="margin-bottom: 6px;">
          💰 <strong>Ticket Number #${bestAmtNum}</strong> has the <strong>highest cash yield</strong>, returning a total of <strong>${fmt(bestAmtVal)}</strong>.
        </li>` : `
        <li style="margin-bottom: 6px;">
          💰 It is also your <strong>highest cash yield</strong> ticket number, returning a total of <strong>${fmt(bestAmtVal)}</strong>.
        </li>`}
      </ul>
      <p style="font-weight: 500; color: var(--gold); background: rgba(255, 215, 0, 0.04); border: 1px dashed rgba(255, 215, 0, 0.25); padding: 10px 14px; border-radius: 8px;">
        💡 <strong>Next Purchase Advice:</strong> When buying this scratch-off next time, look for ticket <strong>#${bestFreqNum}</strong> to maximize your probability of winning!
      </p>
    `;

    recContent.innerHTML = html;
    recCard.style.display = '';
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
        <td class="g" style="font-family:'Black Ops One',cursive;">+${fmtPrize(t.winAmt)}</td>
        <td style="color:var(--muted);font-size:0.8rem;">${dateStr}</td>
      </tr>`;
    }).join('');
  }

  /* ── Render Chart.js Bar Chart ───────────────────────────── */
  function renderChart(wins) {
    const ctx = document.getElementById('analytics-chart');
    if (!ctx) return;

    // Aggregate statistics by ticket number
    const dataMap = {};
    for (const t of wins) {
      const num = (t.ticketNumber || '').trim();
      if (!num) continue;
      if (!dataMap[num]) {
        dataMap[num] = { freq: 0, amt: 0 };
      }
      dataMap[num].freq += 1;
      dataMap[num].amt += parseFloat(t.winAmt) || 0;
    }

    // Sort ticket numbers numerically
    const sortedKeys = Object.keys(dataMap).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (isNaN(na) || isNaN(nb)) return a.localeCompare(b);
      return na - nb;
    });

    const labels = sortedKeys.map(k => '#' + k);
    const dataValues = sortedKeys.map(k => _chartType === 'freq' ? dataMap[k].freq : dataMap[k].amt);

    if (_chartInstance) {
      _chartInstance.destroy();
    }

    if (labels.length === 0) {
      // Draw empty placeholder text on canvas
      const canvas = document.getElementById('analytics-chart');
      const canvasCtx = canvas.getContext('2d');
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      canvasCtx.fillStyle = '#777';
      canvasCtx.font = '16px Barlow';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText('Add tickets with winning numbers to see the distribution chart.', canvas.width / 2, canvas.height / 2);
      return;
    }

    const valueLabel = _chartType === 'freq' ? 'Wins Frequency' : 'Total Amount Won ($)';

    _chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: valueLabel,
          data: dataValues,
          backgroundColor: 'rgba(255, 215, 0, 0.75)',
          borderColor: '#FFD700',
          borderWidth: 1.5,
          borderRadius: 6,
          hoverBackgroundColor: '#FFD700',
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
            titleColor: '#FFD700',
            titleFont: { family: 'Black Ops One', size: 14 },
            bodyColor: '#F0F0F0',
            bodyFont: { family: 'Barlow', size: 13 },
            borderColor: '#252525',
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              label: function (context) {
                const val = context.parsed.y;
                return _chartType === 'freq' ? `${val} wins` : `$${val.toFixed(2)}`;
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
              font: { family: 'Barlow Condensed', size: 12, weight: '600' }
            }
          },
          y: {
            grid: {
              color: '#222'
            },
            ticks: {
              color: '#777',
              font: { family: 'Barlow', size: 11 },
              callback: function (value) {
                return _chartType === 'freq' ? value : '$' + value;
              }
            }
          }
        }
      }
    });
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
      updateDashboard();
    });

    /* Game filter selection */
    document.getElementById('anal-game-filter').addEventListener('change', (e) => {
      _gameFilter = e.target.value;
      updateDashboard();
    });

    /* Chart toggles */
    document.getElementById('toggle-freq').addEventListener('click', (e) => {
      _chartType = 'freq';
      document.getElementById('toggle-freq').classList.add('active');
      document.getElementById('toggle-amt').classList.remove('active');
      updateDashboard();
    });

    document.getElementById('toggle-amt').addEventListener('click', (e) => {
      _chartType = 'amt';
      document.getElementById('toggle-amt').classList.add('active');
      document.getElementById('toggle-freq').classList.remove('active');
      updateDashboard();
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
