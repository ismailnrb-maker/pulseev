/* ============================================================
   EV LIFECYCLE MANAGEMENT — REGISTRATION STAGES KANBAN
   Pipeline workflow tracking vehicles from handover to RTO completion
   ============================================================ */

const RegistrationView = (() => {

  const STATUS_STAGES = ['delivered', 'documents_pending', 'submitted', 'completed'];

  const STAGE_METADATA = {
    delivered: { title: '1. Handover Done', class: 'badge-pending' },
    documents_pending: { title: '2. Docs Pending', class: 'badge-upcoming' },
    submitted: { title: '3. Submitted RTO', class: 'badge-primary' },
    completed: { title: '4. Fully Registered', class: 'badge-completed' }
  };

  function render(container) {
    const vehicles = Store.getVehicles();

    // Map vehicles to stages
    const columnsData = {
      delivered: [],
      documents_pending: [],
      submitted: [],
      completed: []
    };

    vehicles.forEach(v => {
      const stage = v.registrationStatus || 'delivered';
      if (columnsData[stage]) {
        columnsData[stage].push(v);
      }
    });

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">RTO Registration pipeline</h1>
          <p class="page-subtitle">Track registration document collections, submissions, and status closures</p>
        </div>
      </div>

      <!-- Linear Pipeline Kanban board -->
      <div class="kanban">
        ${STATUS_STAGES.map(stage => {
          const colMeta = STAGE_METADATA[stage];
          const list = columnsData[stage] || [];
          return `
            <div class="kanban-column">
              <div class="kanban-column-header">
                <span class="kanban-column-title">
                  <span class="badge badge-dot ${colMeta.class}">${colMeta.title}</span>
                </span>
                <span class="kanban-column-count">${list.length}</span>
              </div>
              
              <div style="display: flex; flex-direction: column; gap: var(--space-3); min-height: 250px;">
                ${list.map(v => `
                  <div class="kanban-card" onclick="App.navigateTo('vehicles', '${v.id}')">
                    <div class="kanban-card-title">${v.customerName}</div>
                    <div class="text-secondary mono truncate" style="font-size: var(--text-xs); margin-bottom: var(--space-2);">${v.vin}</div>
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: var(--text-xs); color: var(--text-muted);">
                      <span>${v.model}</span>
                      <span class="mono">${v.deliveryDate}</span>
                    </div>

                    <!-- Quick Dropdown transition -->
                    <div style="margin-top: var(--space-2); border-top: 1px solid var(--border-subtle); padding-top: var(--space-2);" onclick="event.stopPropagation()">
                      <select class="form-select" style="height: 28px; font-size: var(--text-xs); padding: 2px 20px 2px 8px;" onchange="RegistrationView.moveStage('${v.id}', this.value)">
                        ${STATUS_STAGES.map(st => `
                          <option value="${st}" ${st === stage ? 'selected' : ''}>Move to: ${st.replace('_', ' ').toUpperCase()}</option>
                        `).join('')}
                      </select>
                    </div>
                  </div>
                `).join('')}
                ${list.length === 0 ? `
                  <div style="display: flex; align-items: center; justify-content: center; height: 100%; border: 2px dashed var(--border); border-radius: var(--radius-md); padding: var(--space-4); text-align: center; color: var(--text-muted); font-size: var(--text-xs);">
                    No vehicles at this stage.
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function moveStage(vehicleId, newStage) {
    const v = Store.getVehicle(vehicleId);
    if (!v) return;

    Store.updateRegistration(vehicleId, newStage, `Moved via RTO Kanban Workflow`);
    
    // Auto-prompt registration plate entry
    if (newStage === 'completed' && !v.registrationNumber) {
      const regNum = prompt('Please enter RTO plate number for ' + v.customerName + ':');
      if (regNum) {
        Store.updateVehicle(vehicleId, { registrationNumber: regNum.trim().toUpperCase() });
      }
    }

    App.showToast(`Updated stage for ${v.customerName}`, 'success');
    App.refreshApp();
  }

  return {
    render,
    moveStage
  };
})();
