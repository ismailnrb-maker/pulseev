/* ============================================================
   EV LIFECYCLE MANAGEMENT — FLEET DIRECTORY VIEW
   Instant vehicle lists, filters, global search integration,
   and creation modals.
   ============================================================ */

const VehiclesView = (() => {
  let activeFilter = 'All';
  let activeSearch = '';

  function render(container) {
    const vehicles = Store.getVehicles();

    // Render filter actions
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">EV Fleet Directory</h1>
          <p class="page-subtitle">Central record of all vehicles registered in the pulse system</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="App.openVehicleFormModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Register New EV</span>
          </button>
        </div>
      </div>

      <div class="card mb-6">
        <div class="toolbar">
          
          <!-- Search box inside directory page too -->
          <div class="form-group" style="flex: 1; min-width: 250px; margin-bottom: 0;">
            <input type="text" id="directory-search-input" class="form-input" placeholder="Filter by Name, VIN, Phone..." value="${activeSearch}">
          </div>

          <!-- Model quick filters -->
          <div class="filter-group">
            <button class="filter-btn ${activeFilter === 'All' ? 'active' : ''}" onclick="VehiclesView.setFilter('All')">All Specs</button>
            <button class="filter-btn ${activeFilter === 'Comet' ? 'active' : ''}" onclick="VehiclesView.setFilter('Comet')">Comet</button>
            <button class="filter-btn ${activeFilter === 'Cosmo' ? 'active' : ''}" onclick="VehiclesView.setFilter('Cosmo')">Cosmo</button>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="table table-clickable" id="directory-table">
            <thead>
              <tr>
                <th>Customer / Contact</th>
                <th>VIN / Identifiers</th>
                <th>Spec Model</th>
                <th>Odometer</th>
                <th>Registration Stage</th>
                <th style="text-align: right;">Profile Actions</th>
              </tr>
            </thead>
            <tbody id="directory-table-body">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Bind page-specific search handler
    const pageSearch = document.getElementById('directory-search-input');
    pageSearch.addEventListener('input', (e) => {
      activeSearch = e.target.value;
      updateTableList();
    });

    updateTableList();
  }

  function updateTableList() {
    const listBody = document.getElementById('directory-table-body');
    if (!listBody) return;

    let filtered = Store.searchVehicles(activeSearch);

    // Apply model quick filters
    if (activeFilter !== 'All') {
      filtered = filtered.filter(v => v.model === activeFilter);
    }

    if (filtered.length === 0) {
      listBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: var(--space-12) 0;">
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
              </div>
              <h4 class="empty-state-title">No Vehicles Found</h4>
              <p class="empty-state-text">No vehicles match your active search terms or model filter criteria.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    listBody.innerHTML = filtered.map(v => `
      <tr onclick="App.navigateTo('vehicles', '${v.id}')">
        <td>
          <div class="font-semibold">${v.customerName}</div>
          <div class="text-muted" style="font-size: var(--text-xs);">${v.customerPhone} | ${v.customerLocation}</div>
        </td>
        <td class="mono">
          <div class="font-semibold" style="letter-spacing: 0.02em;">${v.vin}</div>
          <div class="text-muted" style="font-size: var(--text-xs);">Chassis: ${v.chassisNo}</div>
        </td>
        <td>${v.model}</td>
        <td class="mono font-semibold">${v.currentKm.toLocaleString()} KM</td>
        <td>
          <span class="badge ${
            v.registrationStatus === 'completed' ? 'badge-completed' :
            v.registrationStatus === 'submitted' ? 'badge-primary' :
            v.registrationStatus === 'documents_pending' ? 'badge-upcoming' : 'badge-pending'
          }">${v.registrationStatus.replace('_', ' ').toUpperCase()}</span>
        </td>
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-icon sm" title="Edit Profile" onclick="App.openVehicleFormModal('${v.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn btn-danger btn-icon sm" title="Deregister EV" onclick="VehiclesView.confirmDelete('${v.id}', '${v.customerName}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </td>
      </tr>
    `).join('');
  }

  function setFilter(filter) {
    activeFilter = filter;
    App.refreshApp();
  }

  function confirmDelete(id, name) {
    if (confirm(`Are you absolutely sure you want to delete the EV profile for "${name}"?\nThis action cannot be undone.`)) {
      Store.deleteVehicle(id);
      App.showToast(`Deregistered EV profile for ${name}`, 'info');
      App.refreshApp();
    }
  }

  return {
    render,
    setFilter,
    confirmDelete
  };
})();
