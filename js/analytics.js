/* ============================================================
   EV LIFECYCLE MANAGEMENT — USAGE ANALYTICS (MASTER ONLY)
   Site opens, geolocation checks, active usage duration telemetry logs.
   ============================================================ */

const AnalyticsView = (() => {

  async function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Usage & Pilot Analytics</h1>
          <p class="page-subtitle">Track pilot deployments: access times, active usage sessions, and team locations</p>
        </div>
      </div>
      <div style="display: flex; align-items: center; justify-content: center; height: 150px; color: var(--text-secondary);">
        <div class="spinner">Loading analytics records...</div>
      </div>
    `;

    try {
      const stats = await Store.getTrackingStats();
      renderStats(container, stats);
    } catch (err) {
      container.innerHTML = `
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">Usage & Pilot Analytics</h1>
            <p class="page-subtitle">Track pilot deployments: access times, active usage sessions, and team locations</p>
          </div>
        </div>
        <div class="card" style="border-left: 4px solid var(--accent-rose);">
          <h3 class="card-title text-rose mb-2">Access Restrained</h3>
          <p class="text-secondary mb-4">${err.message || 'Failed to fetch analytics statistics.'}</p>
          <button class="btn btn-primary" onclick="App.navigateTo('dashboard')">Back to Dashboard</button>
        </div>
      `;
    }
  }

  function renderStats(container, stats) {
    const totalOpens = stats.totalOpens || 0;
    const activeSessions = stats.activeSessions || 0;
    const totalHours = stats.totalUsageHours || 0;
    const locationsCount = stats.locations ? stats.locations.length : 0;

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Usage & Pilot Analytics</h1>
          <p class="page-subtitle">Track pilot deployments: access times, active usage sessions, and team locations</p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-secondary btn-icon" id="btn-refresh-analytics" title="Refresh Analytics" onclick="AnalyticsView.render(document.getElementById('active-page-view'))">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
          </button>
        </div>
      </div>

      <!-- Telemetry cards grid -->
      <div class="grid-4 mb-6">
        <div class="card" style="display: flex; flex-direction: column; gap: var(--space-1); border-left: 3px solid var(--primary);">
          <span class="detail-label">Total Site Opens</span>
          <span class="font-bold text-primary" style="font-size: var(--text-2xl); font-family: var(--font-mono);">${totalOpens.toLocaleString()}</span>
          <span class="text-secondary" style="font-size: var(--text-xs); margin-top: 4px;">Number of times database has been opened</span>
        </div>
        <div class="card" style="display: flex; flex-direction: column; gap: var(--space-1); border-left: 3px solid var(--accent-emerald);">
          <span class="detail-label">Active Users Online</span>
          <span class="font-bold text-emerald" style="font-size: var(--text-2xl); font-family: var(--font-mono);">${activeSessions}</span>
          <span class="text-secondary" style="font-size: var(--text-xs); margin-top: 4px;">Sessions active in the last 90 seconds</span>
        </div>
        <div class="card" style="display: flex; flex-direction: column; gap: var(--space-1); border-left: 3px solid var(--accent-violet);">
          <span class="detail-label">Cumulative Session Usage</span>
          <span class="font-bold text-brand" style="font-size: var(--text-2xl); font-family: var(--font-mono);">${totalHours} Hours</span>
          <span class="text-secondary" style="font-size: var(--text-xs); margin-top: 4px;">Total active time across all sessions</span>
        </div>
        <div class="card" style="display: flex; flex-direction: column; gap: var(--space-1); border-left: 3px solid var(--accent-amber);">
          <span class="detail-label">Covered Locations</span>
          <span class="font-bold text-amber" style="font-size: var(--text-2xl); font-family: var(--font-mono);">${locationsCount} Regions</span>
          <span class="text-secondary" style="font-size: var(--text-xs); margin-top: 4px;">Unique geolocations of access</span>
        </div>
      </div>

      <div class="grid-3 mb-6">
        <!-- Team usage summary table -->
        <div class="card col-span-1" style="grid-column: span 1;">
          <h3 class="card-title mb-4">Team Utilization Rank</h3>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Opens</th>
                  <th>Total Time</th>
                </tr>
              </thead>
              <tbody>
                ${stats.userActivity && stats.userActivity.length > 0 ? stats.userActivity.map(item => `
                  <tr>
                    <td><span class="font-semibold text-primary">${item.username}</span></td>
                    <td class="mono font-semibold">${item.opens}</td>
                    <td class="mono">${formatDuration(item.durationMinutes * 60)}</td>
                  </tr>
                `).join('') : '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No activity logs.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Access locations coverage map -->
        <div class="card col-span-2" style="grid-column: span 2;">
          <h3 class="card-title mb-4">Geographic Access Summary</h3>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Connection Location / Region</th>
                  <th style="text-align: right;">Access Counts</th>
                </tr>
              </thead>
              <tbody>
                ${stats.locations && stats.locations.length > 0 ? stats.locations.map(item => `
                  <tr>
                    <td><span class="font-semibold text-emerald">${item.location}</span></td>
                    <td style="text-align: right;" class="mono font-semibold">${item.count} opens</td>
                  </tr>
                `).join('') : '<tr><td colspan="2" style="text-align: center; color: var(--text-muted);">No geolocation registers.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Recent Sessions Log Table -->
      <div class="card">
        <h3 class="card-title mb-4">Recent Access Sessions Logs</h3>
        <p class="card-subtitle mb-4">Chronological log of the last 20 connections made by your team members</p>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>IP Address</th>
                <th>Resolved Location</th>
                <th>Time Opened (UTC)</th>
                <th>Active Session Duration</th>
              </tr>
            </thead>
            <tbody>
              ${stats.recentSessions && stats.recentSessions.length > 0 ? stats.recentSessions.map(s => `
                <tr>
                  <td>
                    <span class="badge ${s.username === 'master' ? 'badge-completed' : 'badge-submitted'}">${s.username}</span>
                  </td>
                  <td class="mono" style="font-size: var(--text-xs);">${s.ipAddress || 'unknown'}</td>
                  <td><span class="font-semibold text-emerald">${s.location || 'Localhost Network'}</span></td>
                  <td class="mono" style="font-size: var(--text-xs);">${formatTimestamp(s.startedAt)}</td>
                  <td>
                    <span class="font-semibold mono text-brand">${formatDuration(s.durationSeconds)}</span>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: var(--space-8);">No sessions logged yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0s (Pinged)';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    let parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
  }

  function formatTimestamp(isoString) {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return isoString;
    }
  }

  return {
    render
  };
})();
