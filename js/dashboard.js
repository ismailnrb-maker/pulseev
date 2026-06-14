/* ============================================================
   EV LIFECYCLE MANAGEMENT — DASHBOARD VIEW
   KPI Metrics, progress visualization charts, and recent events
   ============================================================ */

const DashboardView = (() => {

  function render(container) {
    const stats = Store.getStats();
    const vehicles = Store.getVehicles();

    // Calculate progress percentages
    const serviceProgress = stats.totalServices > 0 ? Math.round((stats.servicesCompleted / stats.totalServices) * 100) : 0;
    const batteryProgress = stats.batteryAffected > 0 ? Math.round((stats.batteryCompleted / stats.batteryAffected) * 100) : 0;

    // Render HTML shell
    container.innerHTML = `
      <!-- KPI Metric Row -->
      <div class="grid-4 mb-6">
        
        <!-- Metric 1: Total Fleet -->
        <div class="kpi-card" style="--kpi-color: var(--primary); --kpi-bg: var(--primary-bg);">
          <div class="kpi-card-header">
            <span class="kpi-card-label">Active EV Fleet</span>
            <div class="kpi-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            </div>
          </div>
          <div class="kpi-card-value">${stats.total}</div>
          <div class="kpi-card-trend up">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            <span>Target: 95%+ Visibility</span>
          </div>
        </div>

        <!-- Metric 2: Service Overdue -->
        <div class="kpi-card" style="--kpi-color: var(--accent-rose); --kpi-bg: var(--accent-rose-bg);">
          <div class="kpi-card-header">
            <span class="kpi-card-label">Overdue Services</span>
            <div class="kpi-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
          </div>
          <div class="kpi-card-value" style="color: ${stats.servicesOverdue > 0 ? 'var(--accent-rose-light)' : 'inherit'};">${stats.servicesOverdue}</div>
          <div class="kpi-card-trend ${stats.servicesOverdue > 0 ? 'down' : 'up'}">
            <span>Upcoming: ${stats.servicesDue} due soon</span>
          </div>
        </div>

        <!-- Metric 3: Battery Campaigns -->
        <div class="kpi-card" style="--kpi-color: var(--accent-emerald); --kpi-bg: var(--accent-emerald-bg);">
          <div class="kpi-card-header">
            <span class="kpi-card-label">Battery Upgrades</span>
            <div class="kpi-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="16" height="10" rx="2" ry="2"></rect><line x1="22" y1="11" x2="22" y2="13"></line></svg>
            </div>
          </div>
          <div class="kpi-card-value">${stats.batteryCompleted} / ${stats.batteryAffected}</div>
          <div class="kpi-card-trend up">
            <span>${stats.batteryPending} pending replacement</span>
          </div>
        </div>

        <!-- Metric 4: Pending RTO -->
        <div class="kpi-card" style="--kpi-color: var(--accent-amber); --kpi-bg: var(--accent-amber-bg);">
          <div class="kpi-card-header">
            <span class="kpi-card-label">RTO Registration</span>
            <div class="kpi-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            </div>
          </div>
          <div class="kpi-card-value">${stats.regCompleted} / ${stats.total}</div>
          <div class="kpi-card-trend">
            <span>Pending stages: ${stats.regPending + stats.regSubmitted} vehicles</span>
          </div>
        </div>

      </div>

      <!-- Charts & Visual Summaries -->
      <div class="grid-2 mb-6">
        
        <!-- Left: Service Milestones Progress -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Fleet Service Completion</h3>
              <p class="card-subtitle">Scheduled services successfully done across the fleet</p>
            </div>
            <span class="badge badge-primary">${serviceProgress}% Done</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-around; padding: var(--space-4) 0; gap: var(--space-4);">
            <div class="donut-chart" style="background: conic-gradient(var(--accent-emerald) 0% ${serviceProgress}%, var(--bg-elevated) ${serviceProgress}% 100%);">
              <div class="donut-chart-center">
                <span class="donut-chart-value">${stats.servicesCompleted}</span>
                <span class="donut-chart-label">Logged</span>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: var(--space-2); flex: 1; max-width: 200px;">
              <div class="flex-between">
                <span class="text-secondary font-medium" style="font-size: var(--text-sm);">Completed</span>
                <span class="text-emerald font-semibold" style="font-size: var(--text-sm);">${stats.servicesCompleted}</span>
              </div>
              <div class="flex-between">
                <span class="text-secondary font-medium" style="font-size: var(--text-sm);">Due Soon</span>
                <span class="text-amber font-semibold" style="font-size: var(--text-sm);">${stats.servicesDue}</span>
              </div>
              <div class="flex-between">
                <span class="text-secondary font-medium" style="font-size: var(--text-sm);">Overdue</span>
                <span class="text-rose font-semibold" style="font-size: var(--text-sm);">${stats.servicesOverdue}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Battery Upgrade Campaign -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Battery Replacement Tracker</h3>
              <p class="card-subtitle">Recall & upgrade progress of target battery systems</p>
            </div>
            <span class="badge ${batteryProgress === 100 ? 'badge-completed' : 'badge-upcoming'}">${batteryProgress}% Complete</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: var(--space-4); margin-top: var(--space-2);">
            <div>
              <div class="flex-between mb-2">
                <span class="text-secondary font-medium" style="font-size: var(--text-sm);">Campaign Upgrade Target</span>
                <span class="font-bold text-primary" style="font-size: var(--text-sm);">${stats.batteryCompleted} / ${stats.batteryAffected} EVs</span>
              </div>
              <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${batteryProgress}%"></div>
              </div>
            </div>
            <div class="grid-2">
              <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3); text-align: center;">
                <div class="text-muted font-semibold" style="font-size: var(--text-xs); text-transform: uppercase;">In Progress / Scheduled</div>
                <div class="font-bold text-amber mt-1" style="font-size: var(--text-lg);">${stats.batteryPending} EVs</div>
              </div>
              <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3); text-align: center;">
                <div class="text-muted font-semibold" style="font-size: var(--text-xs); text-transform: uppercase;">Replacement Complete</div>
                <div class="font-bold text-emerald mt-1" style="font-size: var(--text-lg);">${stats.batteryCompleted} EVs</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Quick Directory Shortcuts -->
      <div class="card mb-6">
        <div class="card-header">
          <div>
            <h3 class="card-title">Recent Customer Handovers</h3>
            <p class="card-subtitle">Last 5 vehicles added to the digital ledger</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="App.navigateTo('vehicles')">View Directory</button>
        </div>
        <div class="table-wrapper">
          <table class="table table-clickable">
            <thead>
              <tr>
                <th>Customer / VIN</th>
                <th>Spec Model</th>
                <th>Handover Date</th>
                <th>Registration Stage</th>
                <th>Odometer</th>
              </tr>
            </thead>
            <tbody>
              ${vehicles.slice(-5).reverse().map(v => `
                <tr onclick="App.navigateTo('vehicles', '${v.id}')">
                  <td>
                    <div class="font-semibold">${v.customerName}</div>
                    <div class="text-muted mono truncate" style="max-width: 200px;">${v.vin}</div>
                  </td>
                  <td>${v.model}</td>
                  <td>${v.deliveryDate}</td>
                  <td>
                    <span class="badge ${
                      v.registrationStatus === 'completed' ? 'badge-completed' :
                      v.registrationStatus === 'submitted' ? 'badge-primary' :
                      v.registrationStatus === 'documents_pending' ? 'badge-upcoming' : 'badge-pending'
                    }">${v.registrationStatus.replace('_', ' ').toUpperCase()}</span>
                  </td>
                  <td class="mono font-semibold">${v.currentKm.toLocaleString()} KM</td>
                </tr>
              `).join('')}
              ${vehicles.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: var(--space-6);">No registered vehicles</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return { render };
})();
