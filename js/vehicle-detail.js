/* ============================================================
   EV LIFECYCLE MANAGEMENT — DETAILED EV VIEW
   Sub-tab navigations for General Details, RTO workflow pipelines,
   milestones logging, and battery recalls.
   ============================================================ */

const VehicleDetailView = (() => {
  let activeTab = 'general';

  function render(container, vehicleId) {
    const v = Store.getVehicle(vehicleId);
    if (!v) {
      container.innerHTML = `<div class="empty-state"><h4 class="empty-state-title">EV Profile Not Found</h4></div>`;
      return;
    }

    container.innerHTML = `
      <div class="page-header" style="margin-bottom: var(--space-4);">
        <div class="page-header-left">
          <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
            <h1 class="page-title">${v.customerName}</h1>
            <span class="badge badge-primary mono" style="font-size: var(--text-sm);">${v.model}</span>
            <span class="badge ${
              v.registrationStatus === 'completed' ? 'badge-completed' :
              v.registrationStatus === 'submitted' ? 'badge-primary' :
              v.registrationStatus === 'documents_pending' ? 'badge-upcoming' : 'badge-pending'
            }">${v.registrationStatus.toUpperCase()}</span>
          </div>
          <p class="page-subtitle mono" style="margin-top: var(--space-1); letter-spacing: 0.02em;">VIN: ${v.vin}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="App.navigateTo('vehicles')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Back to Fleet</span>
          </button>
          <button class="btn btn-primary" onclick="App.openVehicleFormModal('${v.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      <!-- Tab Buttons Navigation -->
      <div class="tabs">
        <div class="tab ${activeTab === 'general' ? 'active' : ''}" onclick="VehicleDetailView.switchTab('${v.id}', 'general')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <span>General Specs</span>
        </div>
        <div class="tab ${activeTab === 'services' ? 'active' : ''}" onclick="VehicleDetailView.switchTab('${v.id}', 'services')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
          <span>Services Logs</span>
        </div>
        <div class="tab ${activeTab === 'registration' ? 'active' : ''}" onclick="VehicleDetailView.switchTab('${v.id}', 'registration')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>Registration Stages</span>
        </div>
        <div class="tab ${activeTab === 'battery' ? 'active' : ''}" onclick="VehicleDetailView.switchTab('${v.id}', 'battery')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="16" height="10" rx="2" ry="2"></rect><line x1="22" y1="11" x2="22" y2="13"></line></svg>
          <span>Battery Status</span>
        </div>
      </div>

      <!-- Tab Content Cards -->
      <div id="detail-tab-contents">
        <!-- Rendered dynamically -->
      </div>
    `;

    renderTabContent(document.getElementById('detail-tab-contents'), v);
  }

  function renderTabContent(container, v) {
    if (activeTab === 'general') {
      container.innerHTML = `
        <div class="grid-2">
          <!-- Column 1: Customer Details -->
          <div class="card">
            <h3 class="card-title mb-4">Customer Handover Info</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Name</span>
                <span class="detail-value">${v.customerName}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Phone</span>
                <span class="detail-value">${v.customerPhone}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Location / City</span>
                <span class="detail-value">${v.customerLocation}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Handover Date</span>
                <span class="detail-value">${v.deliveryDate}</span>
              </div>
            </div>
          </div>

          <!-- Column 2: Component Specs -->
          <div class="card">
            <h3 class="card-title mb-4">Automotive Specifications</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">VIN</span>
                <span class="detail-value mono">${v.vin}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Chassis Serial</span>
                <span class="detail-value mono">${v.chassisNo}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Motor Serial</span>
                <span class="detail-value mono">${v.motorNo}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Controller Serial</span>
                <span class="detail-value mono">${v.controllerNo || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Battery Serial</span>
                <span class="detail-value mono">${v.batteryPackNo || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Mfg. Date</span>
                <span class="detail-value">${v.manufacturingDate}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Odometer Updates -->
        <div class="card mt-6">
          <h3 class="card-title mb-4">Kilometer Intelligence</h3>
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4);">
            <div style="display: flex; align-items: center; gap: var(--space-6);">
              <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-4) var(--space-6);">
                <div class="detail-label">Current Odometer</div>
                <div class="font-bold text-primary" style="font-size: var(--text-2xl); font-family: var(--font-mono); margin-top: 4px;">
                  ${v.currentKm.toLocaleString()} KM
                </div>
              </div>
              <div>
                <div class="detail-label">Kilometer Utilization</div>
                <div class="text-secondary" style="font-size: var(--text-sm); margin-top: 4px;">
                  Average: <strong>${Math.round(v.currentKm / Math.max(1, ((new Date() - new Date(v.deliveryDate)) / (1000 * 60 * 60 * 24 * 30.4)) || 1))} KM</strong> / month
                </div>
              </div>
            </div>
            
            <div class="inline-edit" style="width: 100%; max-width: 350px;">
              <input type="number" id="detail-odo-input" class="form-input" min="${v.currentKm}" placeholder="Enter new odometer reading..." style="height: 38px;">
              <button class="btn btn-primary btn-sm" style="height: 38px;" onclick="VehicleDetailView.updateOdo('${v.id}')">Update Odometer</button>
            </div>
          </div>
        </div>
      `;
    } 
    
    else if (activeTab === 'services') {
      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Service Maintenance Ledger</h3>
              <p class="card-subtitle">Detailed records of the 4 standard periodic service milestones</p>
            </div>
          </div>
          
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Milestone</th>
                  <th>Target Km</th>
                  <th>Status</th>
                  <th>Date Completed</th>
                  <th>Actual Odometer</th>
                  <th>Technician</th>
                  <th>Actions / Customer Issues</th>
                </tr>
              </thead>
              <tbody>
                ${v.services.map((s, idx) => {
                  const status = Store.getServiceStatus(v, idx);
                  const isDone = status === 'completed';
                  return `
                    <tr>
                      <td class="font-semibold">Service #${s.serviceNumber}</td>
                      <td class="mono font-semibold">${s.dueKm.toLocaleString()} KM</td>
                      <td>
                        <span class="badge ${
                          status === 'completed' ? 'badge-completed' :
                          status === 'overdue' ? 'badge-overdue' :
                          status === 'upcoming' ? 'badge-upcoming' : 'badge-pending'
                        }">${status.toUpperCase()}</span>
                      </td>
                      <td>${s.date || '—'}</td>
                      <td class="mono">${s.completedKm ? `${s.completedKm.toLocaleString()} KM` : '—'}</td>
                      <td>${s.technician || '—'}</td>
                      <td>
                        ${isDone ? `
                          <div style="max-width: 250px;" class="truncate text-secondary" title="${s.issues || 'No issues recorded'}">
                            ${s.issues || '<em>No issues recorded</em>'}
                          </div>
                        ` : `
                          <button class="btn btn-secondary btn-sm" onclick="App.openServiceLogModal('${v.id}', ${idx})">
                            Log Completion
                          </button>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } 
    
    else if (activeTab === 'registration') {
      const dates = v.registrationDates || {};
      const notes = v.registrationNotes || {};
      const statusOrder = ['delivered', 'documents_pending', 'submitted', 'completed'];
      const activeIdx = statusOrder.indexOf(v.registrationStatus);

      container.innerHTML = `
        <div class="card">
          <h3 class="card-title mb-6">RTO Registration Workflow Progress</h3>
          
          <!-- Horizontal Progress Stepper -->
          <div class="stepper mb-12" style="max-width: 800px; margin: 0 auto;">
            ${statusOrder.map((step, idx) => {
              const label = step.replace('_', ' ').toUpperCase();
              let stepClass = '';
              if (idx < activeIdx) stepClass = 'completed';
              else if (idx === activeIdx) stepClass = 'active';
              return `
                <div class="stepper-step ${stepClass}">
                  <div class="stepper-dot">${idx + 1}</div>
                  <div class="stepper-label font-semibold">${label}</div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Workflow Stage Detail Panels -->
          <div class="grid-2 mt-6">
            <div class="card" style="background: var(--bg-secondary);">
              <h4 class="text-secondary font-semibold mb-4">Stage Log Dates</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Vehicle Delivered</span>
                  <span class="detail-value">${dates.delivered || '—'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Documents Collected</span>
                  <span class="detail-value">${dates.documents_pending || '—'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">RTO Submission</span>
                  <span class="detail-value">${dates.submitted || '—'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Completed RTO</span>
                  <span class="detail-value">${dates.completed || '—'}</span>
                </div>
              </div>
            </div>

            <div class="card" style="background: var(--bg-secondary);">
              <h4 class="text-secondary font-semibold mb-4">Work Stage Execution Actions</h4>
              
              <!-- Next Stage Advance Action -->
              ${v.registrationStatus !== 'completed' ? `
                <div class="form-group mb-4">
                  <label class="form-label" for="detail-reg-notes">Stage transition notes/comments</label>
                  <input type="text" id="detail-reg-notes" class="form-input" placeholder="e.g. Received customer signatures, paid RTO tax fees...">
                </div>
                <div class="flex-between">
                  <span class="text-secondary font-medium">Advance to next pipeline stage:</span>
                  <button class="btn btn-primary btn-sm" onclick="VehicleDetailView.advanceRegistration('${v.id}')">
                    Advance to ${statusOrder[activeIdx + 1].replace('_', ' ').toUpperCase()}
                  </button>
                </div>
              ` : `
                <div class="empty-state" style="padding: var(--space-4) 0;">
                  <div class="empty-state-icon" style="width: 48px; height: 48px; font-size: 20px; background: var(--accent-emerald-bg); color: var(--accent-emerald);">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <h4 class="empty-state-title">Registration Fully Completed</h4>
                  <p class="empty-state-text" style="font-size: var(--text-xs);">Registration Number: <strong>${v.registrationNumber || 'Pending entry'}</strong></p>
                </div>
              `}
            </div>
          </div>
        </div>
      `;
    } 
    
    else if (activeTab === 'battery') {
      const bat = v.batteryReplacement || Store._defaultBattery();
      
      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Battery Safety & Upgrade Recall Status</h3>
              <p class="card-subtitle">Recall campaigns matching this battery pack serial number</p>
            </div>
            <span class="badge ${
              !bat.affected ? 'badge-completed' :
              bat.status === 'completed' ? 'badge-completed' :
              bat.status === 'in_progress' ? 'badge-upcoming' : 'badge-overdue'
            }">
              ${!bat.affected ? 'NO ACTION REQUIRED' : bat.status.toUpperCase()}
            </span>
          </div>

          ${bat.affected ? `
            <div class="grid-2 mt-4">
              <!-- Left: Recall Details -->
              <div class="card" style="background: var(--bg-secondary);">
                <h4 class="text-secondary font-semibold mb-4">Replacement Recall Details</h4>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">Campaign ID</span>
                    <span class="detail-value mono">${bat.campaignId || 'N/A'}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Original Serial Number</span>
                    <span class="detail-value mono">${bat.oldSerial || v.batteryPackNo}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Upgraded Battery Serial</span>
                    <span class="detail-value mono">${bat.newSerial || '—'}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Replacement Date</span>
                    <span class="detail-value">${bat.replacementDate || '—'}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Executing Technician</span>
                    <span class="detail-value">${bat.technician || '—'}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Customer Signed Handback</span>
                    <span class="detail-value font-bold ${bat.customerConfirmed ? 'text-emerald' : 'text-rose'}">
                      ${bat.customerConfirmed ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Right: Complete Recall Form -->
              <div class="card" style="background: var(--bg-secondary);">
                <h4 class="text-secondary font-semibold mb-4">Complete Battery Handback</h4>
                ${bat.status !== 'completed' ? `
                  <form id="detail-battery-action-form" onsubmit="event.preventDefault(); VehicleDetailView.completeBatteryUpgrade('${v.id}')">
                    <div class="form-group mb-3">
                      <label class="form-label" for="bat-new-serial">New Battery Serial Number<span class="required">*</span></label>
                      <input type="text" id="bat-new-serial" class="form-input mono" placeholder="BP-XXXXXX" required>
                    </div>
                    <div class="form-row mb-3">
                      <div class="form-group">
                        <label class="form-label" for="bat-date">Replacement Date<span class="required">*</span></label>
                        <input type="date" id="bat-date" class="form-input" required>
                      </div>
                      <div class="form-group">
                        <label class="form-label" for="bat-tech">Technician Name<span class="required">*</span></label>
                        <input type="text" id="bat-tech" class="form-input" placeholder="Technician" required>
                      </div>
                    </div>
                    <div class="form-group mb-4">
                      <label class="form-checkbox">
                        <input type="checkbox" id="bat-confirm" required>
                        <span>Confirm customer signed off receipt of upgraded pack</span>
                      </label>
                    </div>
                    <button type="submit" class="btn btn-success w-100" style="width: 100%;">Mark Replacement Complete</button>
                  </form>
                ` : `
                  <div class="empty-state" style="padding: var(--space-4) 0;">
                    <div class="empty-state-icon" style="width: 48px; height: 48px; font-size: 20px; background: var(--accent-emerald-bg); color: var(--accent-emerald);">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <h4 class="empty-state-title">Campaign Completed</h4>
                    <p class="empty-state-text" style="font-size: var(--text-xs);">Battery upgrade recall has been fully completed and closed for this EV profile.</p>
                  </div>
                `}
              </div>
            </div>
          ` : `
            <div class="empty-state" style="padding: var(--space-12) 0;">
              <div class="empty-state-icon" style="background: var(--accent-emerald-bg); color: var(--accent-emerald);">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h4 class="empty-state-title">All Systems Safe</h4>
              <p class="empty-state-text">This vehicle's battery pack serial number does not match any active recalls or battery campaigns.</p>
              <button class="btn btn-secondary btn-sm mt-2" onclick="VehicleDetailView.toggleCampaignTarget('${v.id}', true)">Mark as Campaign Target</button>
            </div>
          `}
        </div>
      `;
      
      // Auto fill date
      if (bat.affected && bat.status !== 'completed') {
        document.getElementById('bat-date').value = new Date().toISOString().split('T')[0];
      }
    }
  }

  function switchTab(vehicleId, tab) {
    activeTab = tab;
    App.refreshApp();
  }

  function updateOdo(vehicleId) {
    const input = document.getElementById('detail-odo-input');
    const odo = parseInt(input.value);
    if (isNaN(odo)) {
      App.showToast('Please enter a valid odometer reading', 'error');
      return;
    }
    const v = Store.getVehicle(vehicleId);
    if (odo < v.currentKm) {
      App.showToast('Odometer cannot be decreased', 'error');
      return;
    }
    Store.updateKm(vehicleId, odo);
    App.showToast('Odometer logged successfully', 'success');
    App.refreshApp();
  }

  function advanceRegistration(vehicleId) {
    const v = Store.getVehicle(vehicleId);
    const notesInput = document.getElementById('detail-reg-notes');
    const notes = notesInput ? notesInput.value.trim() : '';

    const statusOrder = ['delivered', 'documents_pending', 'submitted', 'completed'];
    const activeIdx = statusOrder.indexOf(v.registrationStatus);
    const nextStatus = statusOrder[activeIdx + 1];

    if (!nextStatus) return;

    Store.updateRegistration(vehicleId, nextStatus, notes || `Advanced to ${nextStatus}`);
    
    // If completing registration, prompt for registration number entry if missing
    if (nextStatus === 'completed' && !v.registrationNumber) {
      const regNum = prompt('Please enter the assigned RTO registration plate number:');
      if (regNum) {
        Store.updateVehicle(vehicleId, { registrationNumber: regNum.trim().toUpperCase() });
      }
    }

    App.showToast(`Registration workflow updated to: ${nextStatus.toUpperCase()}`, 'success');
    App.refreshApp();
  }

  function toggleCampaignTarget(vehicleId, target) {
    const campaignId = target ? prompt('Enter Campaign Recall Campaign ID (e.g. BC-2024-001):', 'BC-2024-001') : '';
    if (target && !campaignId) return;

    Store.updateBattery(vehicleId, {
      affected: target,
      campaignId: campaignId,
      status: target ? 'pending' : 'not_affected'
    });

    App.showToast(target ? 'EV added to recall target list' : 'EV removed from recalls', 'info');
    App.refreshApp();
  }

  function completeBatteryUpgrade(vehicleId) {
    const newSerial = document.getElementById('bat-new-serial').value.trim();
    const date = document.getElementById('bat-date').value;
    const tech = document.getElementById('bat-tech').value.trim();
    const confirmed = document.getElementById('bat-confirm').checked;

    if (!newSerial || !date || !tech || !confirmed) {
      App.showToast('Please complete all form fields', 'error');
      return;
    }

    // Complete the upgrade
    Store.updateBattery(vehicleId, {
      status: 'completed',
      newSerial,
      replacementDate: date,
      technician: tech,
      customerConfirmed: confirmed
    });

    // Also update the active battery serial on vehicle profile info
    Store.updateVehicle(vehicleId, { batteryPackNo: newSerial });

    App.showToast('Battery replacement upgrade logged successfully!', 'success');
    App.refreshApp();
  }

  return {
    render,
    switchTab,
    updateOdo,
    advanceRegistration,
    toggleCampaignTarget,
    completeBatteryUpgrade
  };
})();
