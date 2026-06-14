/* ============================================================
   EV LIFECYCLE MANAGEMENT — SERVICE CENTER VIEW
   Overdue alerts, upcoming milestones logs, and technician details
   ============================================================ */

const ServicesView = (() => {
  let activeFilter = 'All'; // All | completed | upcoming | overdue

  function render(container) {
    const vehicles = Store.getVehicles();
    const stats = Store.getStats();

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Service Center</h1>
          <p class="page-subtitle">Track periodic EV maintenance milestones and diagnostic issues</p>
        </div>
      </div>

      <!-- Service Filter Toolbar Controls -->
      <div class="card mb-6">
        <div class="toolbar">
          <span class="text-secondary font-semibold">Service Log Status:</span>
          <div class="filter-group">
            <button class="filter-btn ${activeFilter === 'All' ? 'active' : ''}" onclick="ServicesView.setFilter('All')">All Scheduled</button>
            <button class="filter-btn ${activeFilter === 'completed' ? 'active' : ''}" onclick="ServicesView.setFilter('completed')">Completed (${stats.servicesCompleted})</button>
            <button class="filter-btn ${activeFilter === 'upcoming' ? 'active' : ''}" onclick="ServicesView.setFilter('upcoming')">Upcoming (${stats.servicesDue})</button>
            <button class="filter-btn ${activeFilter === 'overdue' ? 'active' : ''}" onclick="ServicesView.setFilter('overdue')">Overdue (${stats.servicesOverdue})</button>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="table table-clickable">
            <thead>
              <tr>
                <th>Customer / Contact</th>
                <th>Spec Variant</th>
                <th>Service Milestone</th>
                <th>Odometer Target</th>
                <th>Odometer Current</th>
                <th>Status</th>
                <th>Technician</th>
                <th>Log Action</th>
              </tr>
            </thead>
            <tbody>
              ${getFilteredServices(vehicles).map(item => `
                <tr onclick="App.navigateTo('vehicles', '${item.vehicle.id}')">
                  <td>
                    <div class="font-semibold">${item.vehicle.customerName}</div>
                    <div class="text-muted" style="font-size: var(--text-xs);">${item.vehicle.customerPhone}</div>
                  </td>
                  <td>${item.vehicle.model}</td>
                  <td class="font-semibold">Service Milestone #${item.service.serviceNumber}</td>
                  <td class="mono font-semibold">${item.service.dueKm.toLocaleString()} KM</td>
                  <td class="mono">${item.vehicle.currentKm.toLocaleString()} KM</td>
                  <td>
                    <span class="badge ${
                      item.status === 'completed' ? 'badge-completed' :
                      item.status === 'overdue' ? 'badge-overdue' :
                      item.status === 'upcoming' ? 'badge-upcoming' : 'badge-pending'
                    }">${item.status.toUpperCase()}</span>
                  </td>
                  <td>${item.service.technician || '—'}</td>
                  <td onclick="event.stopPropagation()">
                    ${item.status !== 'completed' ? `
                      <button class="btn btn-secondary btn-sm" onclick="App.openServiceLogModal('${item.vehicle.id}', ${item.index})">
                        Log Completion
                      </button>
                    ` : `
                      <span class="text-emerald" style="font-size: var(--text-xs); font-weight: 600;">Completed</span>
                    `}
                  </td>
                </tr>
              `).join('')}
              ${vehicles.length === 0 ? '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: var(--space-10);">No fleet services logged.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function getFilteredServices(vehicles) {
    const list = [];
    vehicles.forEach(v => {
      v.services.forEach((s, idx) => {
        const status = Store.getServiceStatus(v, idx);
        list.push({
          vehicle: v,
          service: s,
          index: idx,
          status: status
        });
      });
    });

    if (activeFilter === 'All') return list;
    return list.filter(item => item.status === activeFilter);
  }

  function setFilter(filter) {
    activeFilter = filter;
    App.refreshApp();
  }

  return {
    render,
    setFilter
  };
})();
