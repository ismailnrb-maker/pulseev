/* ============================================================
   EV LIFECYCLE MANAGEMENT — BATTERY RECALLS VIEW
   Recall campaign performance metrics and quick recalls logs
   ============================================================ */

const BatteryView = (() => {
  let activeFilter = 'All';

  function render(container) {
    const vehicles = Store.getVehicles();
    const affected = vehicles.filter(v => v.batteryReplacement && v.batteryReplacement.affected);
    
    // Stats
    const totalAffected = affected.length;
    const completed = affected.filter(v => v.batteryReplacement.status === 'completed').length;
    const inProgress = affected.filter(v => v.batteryReplacement.status === 'in_progress').length;
    const pending = totalAffected - completed - inProgress;

    const completionRate = totalAffected > 0 ? Math.round((completed / totalAffected) * 100) : 0;

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Battery Recall Campaigns</h1>
          <p class="page-subtitle">Track recall upgrades, serial swaps, and customer confirmations</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary btn-sm" onclick="BatteryView.launchBulkCampaign()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            <span>Flag Recall Target</span>
          </button>
        </div>
      </div>

      <!-- Campaign KPI Metrics Card Grid -->
      <div class="grid-4 mb-6">
        <div class="card" style="display: flex; flex-direction: column; gap: var(--space-1); border-left: 3px solid var(--primary);">
          <span class="detail-label">Campaign Completion Rate</span>
          <span class="font-bold text-primary" style="font-size: var(--text-2xl); font-family: var(--font-mono);">${completionRate}%</span>
          <div class="progress-bar mt-2" style="height: 6px;">
            <div class="progress-bar-fill" style="width: ${completionRate}%"></div>
          </div>
        </div>
        <div class="card" style="display: flex; flex-direction: column; gap: var(--space-1); border-left: 3px solid var(--status-overdue);">
          <span class="detail-label">Pending Action</span>
          <span class="font-bold text-rose" style="font-size: var(--text-2xl); font-family: var(--font-mono);">${pending} EVs</span>
        </div>
        <div class="card" style="display: flex; flex-direction: column; gap: var(--space-1); border-left: 3px solid var(--status-upcoming);">
          <span class="detail-label">Replacement In Progress</span>
          <span class="font-bold text-amber" style="font-size: var(--text-2xl); font-family: var(--font-mono);">${inProgress} EVs</span>
        </div>
        <div class="card" style="display: flex; flex-direction: column; gap: var(--space-1); border-left: 3px solid var(--status-completed);">
          <span class="detail-label">Upgraded Handbacks</span>
          <span class="font-bold text-emerald" style="font-size: var(--text-2xl); font-family: var(--font-mono);">${completed} EVs</span>
        </div>
      </div>

      <!-- Filter Controls & Target Table List -->
      <div class="card">
        <div class="toolbar">
          <span class="text-secondary font-semibold">Active Recall Status:</span>
          <div class="filter-group">
            <button class="filter-btn ${activeFilter === 'All' ? 'active' : ''}" onclick="BatteryView.setFilter('All')">All Recall Target (${totalAffected})</button>
            <button class="filter-btn ${activeFilter === 'pending' ? 'active' : ''}" onclick="BatteryView.setFilter('pending')">Pending (${pending})</button>
            <button class="filter-btn ${activeFilter === 'in_progress' ? 'active' : ''}" onclick="BatteryView.setFilter('in_progress')">In Progress (${inProgress})</button>
            <button class="filter-btn ${activeFilter === 'completed' ? 'active' : ''}" onclick="BatteryView.setFilter('completed')">Completed (${completed})</button>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="table table-clickable">
            <thead>
              <tr>
                <th>Customer / VIN</th>
                <th>Spec Model</th>
                <th>Campaign ID</th>
                <th>Original Serial</th>
                <th>New Serial</th>
                <th>Recall Stage</th>
                <th>Handback Confirmed</th>
              </tr>
            </thead>
            <tbody>
              ${getFilteredRecalls(affected).map(v => `
                <tr onclick="App.navigateTo('vehicles', '${v.id}')">
                  <td>
                    <div class="font-semibold">${v.customerName}</div>
                    <div class="text-muted mono truncate" style="max-width: 200px; font-size: var(--text-xs);">${v.vin}</div>
                  </td>
                  <td>${v.model}</td>
                  <td class="mono font-semibold">${v.batteryReplacement.campaignId}</td>
                  <td class="mono">${v.batteryReplacement.oldSerial || v.batteryPackNo}</td>
                  <td class="mono">${v.batteryReplacement.newSerial || '—'}</td>
                  <td>
                    <span class="badge ${
                      v.batteryReplacement.status === 'completed' ? 'badge-completed' :
                      v.batteryReplacement.status === 'in_progress' ? 'badge-upcoming' : 'badge-overdue'
                    }">${v.batteryReplacement.status.toUpperCase()}</span>
                  </td>
                  <td>
                    <span class="badge ${v.batteryReplacement.customerConfirmed ? 'badge-completed' : 'badge-overdue'}">
                      ${v.batteryReplacement.customerConfirmed ? 'SIGNED' : 'PENDING'}
                    </span>
                  </td>
                </tr>
              `).join('')}
              ${totalAffected === 0 ? '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: var(--space-10);">No vehicles flagged in recall campaign logs.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function getFilteredRecalls(recalls) {
    if (activeFilter === 'All') return recalls;
    return recalls.filter(v => v.batteryReplacement.status === activeFilter);
  }

  function setFilter(filter) {
    activeFilter = filter;
    App.refreshApp();
  }

  function launchBulkCampaign() {
    const vin = prompt('Enter the 17-digit VIN of the EV to add to this recall Campaign:');
    if (!vin) return;
    
    const vehicles = Store.getVehicles();
    const target = vehicles.find(v => v.vin === vin.trim().toUpperCase());

    if (!target) {
      App.showToast('VIN not found in active fleet database. Please register EV profile first.', 'error');
      return;
    }

    const campaignId = prompt('Enter Campaign Recall ID (e.g. BC-2024-001):', 'BC-2024-001');
    if (!campaignId) return;

    Store.updateBattery(target.id, {
      affected: true,
      campaignId: campaignId.trim(),
      status: 'pending',
      oldSerial: target.batteryPackNo,
      newSerial: '',
      replacementDate: '',
      technician: '',
      customerConfirmed: false
    });

    App.showToast(`Vehicle ${target.vin} flagged in Recall Campaign ${campaignId}`, 'success');
    App.refreshApp();
  }

  return {
    render,
    setFilter,
    launchBulkCampaign
  };
})();
