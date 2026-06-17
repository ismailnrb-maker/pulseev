/* ============================================================
   EV LIFECYCLE MANAGEMENT — APP ORCHESTRATOR
   Page routing, sidebar navigations, modals, global search,
   toast alerts, and initialization.
   ============================================================ */

const App = (() => {
  let currentPage = 'dashboard';
  let activeVehicleId = null;

  // --- Router & Page Loading ---

  async function init() {
    // Register Navigation Click Handlers
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      // Avoid binding navigation to the sign-out item directly here
      if (item.id === 'nav-signout') return;
      item.addEventListener('click', () => {
        const page = item.getAttribute('data-page');
        navigateTo(page);
        if (window.innerWidth <= 1024) {
          toggleMobileSidebar(false);
        }
      });
    });

    // Register Sign-out Handler
    const signoutBtn = document.getElementById('nav-signout');
    if (signoutBtn) {
      signoutBtn.addEventListener('click', () => {
        localStorage.removeItem('ev_auth_token');
        localStorage.removeItem('ev_auth_username');
        localStorage.removeItem('ev_auth_role');
        sessionStorage.removeItem('ev_tracking_session_id');
        Store.clearAll();
        document.getElementById('login-screen').classList.add('active');
        showToast('You have signed out successfully.', 'info');
      });
    }

    // Register Login Form Handler
    const loginForm = document.getElementById('login-form-el');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        // Show loading state on button
        const btn = loginForm.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Connecting...';
        btn.disabled = true;

        try {
          let authSuccess = false;

          // Try API login first
          try {
            const res = await fetch('/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password }),
              signal: AbortSignal.timeout(8000)
            });

            if (res.ok) {
              const auth = await res.json();
              localStorage.setItem('ev_auth_token', auth.token);
              localStorage.setItem('ev_auth_username', auth.username);
              localStorage.setItem('ev_auth_role', auth.role || 'pilot');
              localStorage.setItem('ev_auth_mode', 'api');
              authSuccess = true;
              showToast(`Welcome back, ${auth.username}! (Live Database)`, 'success');
            } else if (res.status === 401) {
              const err = await res.json();
              throw new Error(err.detail || 'Access Denied: Invalid credentials');
            } else {
              // Server error — fall through to offline mode
              throw new Error('server_error');
            }
          } catch (apiErr) {
            if (apiErr.message !== 'server_error' && !apiErr.message.includes('fetch') && !apiErr.message.includes('timeout') && !apiErr.name?.includes('Abort')) {
              throw apiErr; // Re-throw real auth errors (401)
            }
            // Offline fallback: accept master/master or admin/admin locally
            if (username === 'master' && password === 'master') {
              localStorage.setItem('ev_auth_token', 'offline-token-' + Date.now());
              localStorage.setItem('ev_auth_username', 'master');
              localStorage.setItem('ev_auth_role', 'master');
              localStorage.setItem('ev_auth_mode', 'offline');
              authSuccess = true;
              showToast(`Welcome back, master! (Offline Mode — data saved in browser)`, 'warning');
            } else if (username === 'admin' && password === 'admin') {
              localStorage.setItem('ev_auth_token', 'offline-token-' + Date.now());
              localStorage.setItem('ev_auth_username', 'admin');
              localStorage.setItem('ev_auth_role', 'pilot');
              localStorage.setItem('ev_auth_mode', 'offline');
              authSuccess = true;
              showToast(`Welcome back, admin! (Offline Mode — data saved in browser)`, 'warning');
            } else {
              throw new Error('Access Denied: Invalid credentials');
            }
          }

          if (authSuccess) {
            document.getElementById('login-screen').classList.remove('active');
            configureUserRoleUI();
            await Store.sync();
            Store.startTrackingSession();
            navigateTo('dashboard');
          }
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          btn.textContent = originalText;
          btn.disabled = false;
        }
      });
    }

    // Register Global Search Handlers
    const searchInput = document.getElementById('global-search-input');
    const searchResults = document.getElementById('global-search-results');

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value;
      if (query.trim() === '') {
        searchResults.classList.remove('active');
        return;
      }
      const results = Store.searchVehicles(query);
      renderSearchResults(results);
    });

    // Close search dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.remove('active');
      }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // '/' key triggers search focus
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
      // Esc closes active search or modals
      if (e.key === 'Escape') {
        searchResults.classList.remove('active');
        closeAllModals();
      }
    });

    // Header buttons
    document.getElementById('btn-header-add-vehicle').addEventListener('click', () => {
      openVehicleFormModal();
    });

    // Backup & Restore
    document.getElementById('btn-download-template').addEventListener('click', () => {
      Store.downloadCsvTemplate();
      showToast('Downloading CSV Template...', 'info');
    });

    document.getElementById('btn-export-data').addEventListener('click', () => {
      Store.exportData();
      showToast('Data exported successfully!', 'success');
    });

    const fileInput = document.getElementById('import-file-input');
    document.getElementById('btn-trigger-import').addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        Store.importData(file)
          .then((result) => {
            if (result && result.type === 'csv') {
              showToast(`Imported successfully: Added ${result.added} new EVs and updated ${result.updated} profiles.`, 'success');
            } else {
              showToast('Backup restored successfully!', 'success');
            }
            fileInput.value = ''; // clear input
            refreshApp();
          })
          .catch(err => {
            showToast(`Import failed: ${err.message}`, 'error');
            fileInput.value = ''; // clear input
          });
      }
    });

    // Mobile Sidebar Toggles
    const burger = document.getElementById('mobile-menu-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    burger.addEventListener('click', () => toggleMobileSidebar(true));
    overlay.addEventListener('click', () => toggleMobileSidebar(false));

    // Vehicle Form Submission Handler
    document.getElementById('vehicle-form-el').addEventListener('submit', (e) => {
      e.preventDefault();
      handleVehicleFormSubmit();
    });

    // Service Log Form Submission Handler
    document.getElementById('service-form-el').addEventListener('submit', (e) => {
      e.preventDefault();
      handleServiceLogSubmit();
    });

    // Initial navigation & Authentication check
    const token = localStorage.getItem('ev_auth_token');
    if (!token) {
      document.getElementById('login-screen').classList.add('active');
    } else {
      document.getElementById('login-screen').classList.remove('active');
      configureUserRoleUI();
      const synced = await Store.sync();
      if (synced) {
        Store.startTrackingSession();
        navigateTo('dashboard');
      }
    }
  }

  function configureUserRoleUI() {
    const role = localStorage.getItem('ev_auth_role') || 'pilot';
    const analyticsNav = document.getElementById('nav-analytics');
    if (analyticsNav) {
      if (role === 'master') {
        analyticsNav.classList.remove('hidden');
      } else {
        analyticsNav.classList.add('hidden');
      }
    }
  }

  function navigateTo(page, vehicleId = null) {
    const role = localStorage.getItem('ev_auth_role') || 'pilot';
    if (page === 'analytics' && role !== 'master') {
      page = 'dashboard';
    }

    currentPage = page;
    activeVehicleId = vehicleId;

    // Highlight active nav item
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      if (item.getAttribute('data-page') === page) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update Header title
    const titles = {
      dashboard: 'Dashboard Overview',
      vehicles: 'EV Fleet Directory',
      services: 'Service Tracker',
      battery: 'Battery Upgrade Center',
      registration: 'Registration Workflow',
      kilometers: 'Kilometer Intelligence',
      analytics: 'Usage & Pilot Analytics'
    };
    
    document.getElementById('header-page-title').innerText = vehicleId ? 'Vehicle Profile Details' : (titles[page] || 'PulseEV');

    // Load corresponding page layout in DOM
    const container = document.getElementById('main-content-panel');
    container.innerHTML = `<div class="page-enter" id="active-page-view"></div>`;
    const pageView = document.getElementById('active-page-view');

    if (vehicleId) {
      VehicleDetailView.render(pageView, vehicleId);
    } else {
      switch (page) {
        case 'dashboard':
          DashboardView.render(pageView);
          break;
        case 'vehicles':
          VehiclesView.render(pageView);
          break;
        case 'services':
          ServicesView.render(pageView);
          break;
        case 'battery':
          BatteryView.render(pageView);
          break;
        case 'registration':
          RegistrationView.render(pageView);
          break;
        case 'kilometers':
          KilometersView.render(pageView);
          break;
        case 'analytics':
          AnalyticsView.render(pageView);
          break;
        default:
          DashboardView.render(pageView);
      }
    }

    updateGlobalMetrics();
  }

  function toggleMobileSidebar(show) {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (show) {
      sidebar.classList.add('open');
      overlay.classList.add('active');
    } else {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    }
  }

  // --- Search ---

  function renderSearchResults(results) {
    const dropdown = document.getElementById('global-search-results');
    dropdown.innerHTML = '';
    
    if (results.length === 0) {
      dropdown.innerHTML = `<div class="search-result-item" style="color: var(--text-muted); cursor: default;">No matches found</div>`;
      dropdown.classList.add('active');
      return;
    }

    results.slice(0, 5).forEach(v => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `
        <div class="search-result-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        </div>
        <div class="search-result-info">
          <div class="search-result-title truncate">${v.customerName} (${v.model})</div>
          <div class="search-result-meta mono truncate">VIN: ${v.vin} | Phone: ${v.customerPhone}</div>
        </div>
      `;
      item.addEventListener('click', () => {
        navigateTo('vehicles', v.id);
        dropdown.classList.remove('active');
        document.getElementById('global-search-input').value = '';
      });
      dropdown.appendChild(item);
    });
    dropdown.classList.add('active');
  }

  // --- Metrics ---

  function updateGlobalMetrics() {
    const stats = Store.getStats();
    
    // Update Sidebar progress bar & percentage
    document.getElementById('sidebar-visibility-pct').innerText = `${stats.visibilityPct}%`;
    document.getElementById('sidebar-visibility-fill').style.width = `${stats.visibilityPct}%`;

    // Update Service center badge (Overdue count)
    const overdueBadge = document.getElementById('badge-service-overdue');
    if (stats.servicesOverdue > 0) {
      overdueBadge.innerText = stats.servicesOverdue;
      overdueBadge.style.display = 'flex';
    } else {
      overdueBadge.style.display = 'none';
    }

    // Update Battery upgrades badge (Pending battery upgrades count)
    const batteryBadge = document.getElementById('badge-battery-campaigns');
    if (stats.batteryPending > 0) {
      batteryBadge.innerText = stats.batteryPending;
      batteryBadge.style.display = 'flex';
    } else {
      batteryBadge.style.display = 'none';
    }
  }

  // --- Modals ---

  function openModal(id) {
    document.getElementById(id).classList.add('active');
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove('active');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
  }

  // --- EV Profile Modal Forms ---

  function openVehicleFormModal(vehicleId = null) {
    const titleEl = document.getElementById('vehicle-modal-title');
    const form = document.getElementById('vehicle-form-el');
    form.reset();
    
    if (vehicleId) {
      const v = Store.getVehicle(vehicleId);
      if (!v) return;
      titleEl.innerText = `Edit EV Profile: ${v.vin}`;
      document.getElementById('form-vehicle-id').value = v.id;
      document.getElementById('form-vin').value = v.vin || '';
      document.getElementById('form-model').value = v.model || '';
      document.getElementById('form-chassis').value = v.chassisNo || '';
      document.getElementById('form-motor').value = v.motorNo || '';
      document.getElementById('form-controller').value = v.controllerNo || '';
      document.getElementById('form-battery-serial').value = v.batteryPackNo || '';
      document.getElementById('form-mfg-date').value = v.manufacturingDate || '';
      document.getElementById('form-cust-name').value = v.customerName || '';
      document.getElementById('form-cust-phone').value = v.customerPhone || '';
      document.getElementById('form-cust-loc').value = v.customerLocation || '';
      document.getElementById('form-delivery-date').value = v.deliveryDate || '';
      document.getElementById('form-current-km').value = v.currentKm || 0;
      document.getElementById('form-reg-number').value = v.registrationNumber || '';
    } else {
      titleEl.innerText = 'Register New EV Profile';
      document.getElementById('form-vehicle-id').value = '';
      document.getElementById('form-mfg-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('form-delivery-date').value = new Date().toISOString().split('T')[0];
    }
    openModal('modal-vehicle-form');
  }

  async function handleVehicleFormSubmit() {
    const id = document.getElementById('form-vehicle-id').value;
    const vehicleData = {
      vin: document.getElementById('form-vin').value.trim().toUpperCase(),
      model: document.getElementById('form-model').value,
      chassisNo: document.getElementById('form-chassis').value.trim(),
      motorNo: document.getElementById('form-motor').value.trim(),
      controllerNo: document.getElementById('form-controller').value.trim(),
      batteryPackNo: document.getElementById('form-battery-serial').value.trim(),
      manufacturingDate: document.getElementById('form-mfg-date').value,
      customerName: document.getElementById('form-cust-name').value.trim(),
      customerPhone: document.getElementById('form-cust-phone').value.trim(),
      customerLocation: document.getElementById('form-cust-loc').value.trim(),
      deliveryDate: document.getElementById('form-delivery-date').value,
      currentKm: parseInt(document.getElementById('form-current-km').value || 0),
      registrationNumber: document.getElementById('form-reg-number').value.trim()
    };

    try {
      if (id) {
        await Store.updateVehicle(id, vehicleData);
        showToast('EV profile updated successfully', 'success');
      } else {
        await Store.addVehicle(vehicleData);
        showToast('New EV profile registered', 'success');
      }
      closeModal('modal-vehicle-form');
      refreshApp();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
  }

  // --- Service Completion Log Modal ---

  function openServiceLogModal(vehicleId, serviceIndex) {
    const v = Store.getVehicle(vehicleId);
    if (!v) return;
    const s = v.services[serviceIndex];
    if (!s) return;

    document.getElementById('service-vehicle-id').value = vehicleId;
    document.getElementById('service-index').value = serviceIndex;
    document.getElementById('service-display-name').value = `Service milestone #${s.serviceNumber} (Due at ${s.dueKm} KM)`;
    
    document.getElementById('service-completed-km').value = s.completedKm || v.currentKm || s.dueKm;
    document.getElementById('service-completed-km').min = v.currentKm || 0; // cannot log lower than current
    
    document.getElementById('service-date').value = s.date || new Date().toISOString().split('T')[0];
    document.getElementById('service-tech').value = s.technician || '';
    document.getElementById('service-issues').value = s.issues || '';

    openModal('modal-service-log');
  }

  async function handleServiceLogSubmit() {
    const vehicleId = document.getElementById('service-vehicle-id').value;
    const index = parseInt(document.getElementById('service-index').value);
    
    const completedKm = parseInt(document.getElementById('service-completed-km').value);
    const date = document.getElementById('service-date').value;
    const technician = document.getElementById('service-tech').value.trim();
    const issues = document.getElementById('service-issues').value.trim();

    try {
      // Log the service milestone
      await Store.updateService(vehicleId, index, {
        completedKm,
        date,
        technician,
        issues,
        status: 'completed'
      });

      // Propagate the odometer reading to the main profile
      await Store.updateKm(vehicleId, completedKm);

      showToast(`Service milestone #${index + 1} logged successfully!`, 'success');
      closeModal('modal-service-log');
      refreshApp();
    } catch (err) {
      showToast(`Service log failed: ${err.message}`, 'error');
    }
  }

  // --- Global Toast Notification system ---

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>',
      error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
      warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
      info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <div class="toast-message">${message}</div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;
    
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  function refreshApp() {
    navigateTo(currentPage, activeVehicleId);
  }

  // Public Actions
  return {
    init,
    navigateTo,
    openVehicleFormModal,
    openServiceLogModal,
    closeModal,
    showToast,
    refreshApp
  };
})();

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
