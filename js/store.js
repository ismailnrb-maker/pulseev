/* ============================================================
   EV LIFECYCLE MANAGEMENT — DATA STORE (API CLIENT)
   Interfaces with FastAPI backend server via fetch requests
   ============================================================ */

const Store = (() => {
  // In-memory cache synced with backend
  const cache = {
    vehicles: []
  };

  // --- Auth Utilities ---

  function getHeaders() {
    const token = localStorage.getItem('ev_auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  function handleUnauthorized() {
    localStorage.removeItem('ev_auth_token');
    localStorage.removeItem('ev_auth_username');
    document.getElementById('login-screen').classList.add('active');
  }

  // --- Sync with Backend ---

  async function sync() {
    const token = localStorage.getItem('ev_auth_token');
    if (!token) {
      handleUnauthorized();
      return false;
    }

    try {
      const res = await fetch('/api/vehicles', {
        headers: getHeaders()
      });
      
      if (res.status === 401) {
        handleUnauthorized();
        return false;
      }
      
      if (!res.ok) {
        throw new Error('Failed to retrieve vehicle fleet from database');
      }

      cache.vehicles = await res.json();
      return true;
    } catch (e) {
      console.error('Store: Sync failure', e);
      return false;
    }
  }

  // --- Core CRUD ---

  function getVehicles() {
    return cache.vehicles;
  }

  function getVehicle(id) {
    return cache.vehicles.find(v => v.id === id) || null;
  }

  async function addVehicle(vehicle) {
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(vehicle)
      });

      if (res.status === 401) return handleUnauthorized();
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create EV profile');
      }

      const created = await res.json();
      await sync(); // Refresh cache
      return created;
    } catch (e) {
      console.error('Store: addVehicle failure', e);
      throw e;
    }
  }

  async function updateVehicle(id, updates) {
    try {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      });

      if (res.status === 401) return handleUnauthorized();
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to update EV profile');
      }

      const updated = await res.json();
      await sync(); // Refresh cache
      return updated;
    } catch (e) {
      console.error('Store: updateVehicle failure', e);
      throw e;
    }
  }

  async function deleteVehicle(id) {
    try {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (res.status === 401) return handleUnauthorized();
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to delete EV profile');
      }

      await sync(); // Refresh cache
      return true;
    } catch (e) {
      console.error('Store: deleteVehicle failure', e);
      throw e;
    }
  }

  // --- Search ---

  function searchVehicles(query) {
    if (!query || query.trim() === '') return getVehicles();
    const q = query.toLowerCase().trim();
    return getVehicles().filter(v => {
      return (
        (v.vin && v.vin.toLowerCase().includes(q)) ||
        (v.chassisNo && v.chassisNo.toLowerCase().includes(q)) ||
        (v.customerName && v.customerName.toLowerCase().includes(q)) ||
        (v.customerPhone && v.customerPhone.includes(q)) ||
        (v.model && v.model.toLowerCase().includes(q)) ||
        (v.batteryPackNo && v.batteryPackNo.toLowerCase().includes(q))
      );
    });
  }

  // --- Service Helpers ---

  function getServiceStatus(vehicle, serviceIndex) {
    const service = vehicle.services[serviceIndex];
    if (!service) return 'not_due';
    if (service.completedKm && service.completedKm > 0) return 'completed';
    if (vehicle.currentKm > service.dueKm) return 'overdue';
    if (vehicle.currentKm >= service.dueKm - 500) return 'upcoming';
    return 'not_due';
  }

  async function updateService(vehicleId, serviceIndex, serviceData) {
    const vehicle = getVehicle(vehicleId);
    if (!vehicle) return null;
    vehicle.services[serviceIndex] = { ...vehicle.services[serviceIndex], ...serviceData };
    return await updateVehicle(vehicleId, { services: vehicle.services });
  }

  // --- Battery Helpers ---

  async function updateBattery(vehicleId, batteryData) {
    const vehicle = getVehicle(vehicleId);
    if (!vehicle) return null;
    vehicle.batteryReplacement = { ...vehicle.batteryReplacement, ...batteryData };
    return await updateVehicle(vehicleId, { batteryReplacement: vehicle.batteryReplacement });
  }

  function getAffectedVehicles() {
    return getVehicles().filter(v => v.batteryReplacement && v.batteryReplacement.affected);
  }

  // --- Registration Helpers ---

  async function updateRegistration(vehicleId, status, notes) {
    const vehicle = getVehicle(vehicleId);
    if (!vehicle) return null;
    const dates = vehicle.registrationDates || {};
    dates[status] = new Date().toISOString().split('T')[0];
    
    const registrationNotes = vehicle.registrationNotes || {};
    if (notes !== undefined) {
      registrationNotes[status] = notes;
    }

    return await updateVehicle(vehicleId, {
      registrationStatus: status,
      registrationDates: dates,
      registrationNotes: registrationNotes
    });
  }

  // --- KM Helpers ---

  async function updateKm(vehicleId, km) {
    const vehicle = getVehicle(vehicleId);
    if (!vehicle) return null;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const log = vehicle.kmLog || [];
    const existing = log.find(e => e.month === monthKey);
    if (existing) {
      existing.km = km;
    } else {
      log.push({ month: monthKey, km: km });
    }
    log.sort((a, b) => a.month.localeCompare(b.month));
    return await updateVehicle(vehicleId, { currentKm: km, kmLog: log });
  }

  // --- Stats ---

  function getStats() {
    const vehicles = getVehicles();
    const total = vehicles.length;

    // Service stats
    let servicesCompleted = 0;
    let servicesDue = 0;
    let servicesOverdue = 0;
    vehicles.forEach(v => {
      if (v.services && Array.isArray(v.services)) {
        v.services.forEach((s, i) => {
          const status = getServiceStatus(v, i);
          if (status === 'completed') servicesCompleted++;
          else if (status === 'upcoming') servicesDue++;
          else if (status === 'overdue') servicesOverdue++;
        });
      }
    });

    // Battery stats
    const batteryAffected = vehicles.filter(v => v.batteryReplacement?.affected).length;
    const batteryCompleted = vehicles.filter(v => v.batteryReplacement?.status === 'completed').length;
    const batteryPending = batteryAffected - batteryCompleted;

    // Registration stats
    const regDelivered = vehicles.filter(v => v.registrationStatus === 'delivered').length;
    const regPending = vehicles.filter(v => v.registrationStatus === 'documents_pending').length;
    const regSubmitted = vehicles.filter(v => v.registrationStatus === 'submitted').length;
    const regCompleted = vehicles.filter(v => v.registrationStatus === 'completed').length;

    // Lifecycle visibility
    const withVisibility = vehicles.filter(v => {
      return v.vin && v.customerName && v.deliveryDate;
    }).length;
    const visibilityPct = total > 0 ? Math.round((withVisibility / total) * 100) : 0;

    return {
      total,
      servicesCompleted,
      servicesDue,
      servicesOverdue,
      totalServices: total * 4,
      batteryAffected,
      batteryCompleted,
      batteryPending,
      regDelivered,
      regPending,
      regSubmitted,
      regCompleted,
      visibilityPct
    };
  }

  // --- Import / Export ---

  function exportData() {
    // Generate JSON backup of the active synced cache
    const data = { version: "1.0.0", vehicles: cache.vehicles, updatedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ev-lifecycle-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const isCsv = file.name.endsWith('.csv');
      const token = localStorage.getItem('ev_auth_token');

      const endpoint = isCsv ? '/api/import' : '/api/import-json'; // Fallback endpoint for JSON imports if created later

      if (isCsv) {
        fetch('/api/import', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })
        .then(async res => {
          if (res.status === 401) return handleUnauthorized();
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'CSV Import processing failed');
          }
          const result = await res.json();
          await sync(); // Reload cache
          resolve(result);
        })
        .catch(err => reject(err));
      } else {
        // Original JSON backup restore logic (send JSON body to API backup override if desired, or parse locally and update DB)
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target.result);
            if (!data.vehicles || !Array.isArray(data.vehicles)) {
              reject(new Error('Invalid backup file format'));
              return;
            }
            
            // Loop and upload each vehicle
            for (const v of data.vehicles) {
              // Standard upload
              const exists = cache.vehicles.find(ev => ev.vin === v.vin);
              if (exists) {
                await updateVehicle(exists.id, v);
              } else {
                await addVehicle(v);
              }
            }
            await sync();
            resolve({ type: 'json' });
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read backup file'));
        reader.readAsText(file);
      }
    });
  }

  function downloadCsvTemplate() {
    const a = document.createElement('a');
    a.href = '/ev_lifecycle_template.csv';
    a.download = 'ev_lifecycle_template.csv';
    a.click();
  }

  // Legacy local check fallbacks
  function isSeeded() {
    return cache.vehicles.length > 0;
  }

  function clearAll() {
    cache.vehicles = [];
  }

  function _defaultServices() {
    return [
      { serviceNumber: 1, dueKm: 1000, completedKm: 0, date: '', technician: '', issues: '' },
      { serviceNumber: 2, dueKm: 5000, completedKm: 0, date: '', technician: '', issues: '' },
      { serviceNumber: 3, dueKm: 10000, completedKm: 0, date: '', technician: '', issues: '' },
      { serviceNumber: 4, dueKm: 20000, completedKm: 0, date: '', technician: '', issues: '' }
    ];
  }

  function _defaultBattery() {
    return {
      affected: false,
      campaignId: '',
      status: 'not_affected',
      oldSerial: '',
      newSerial: '',
      replacementDate: '',
      technician: '',
      customerConfirmed: false
    };
  }

  // Public API
  return {
    sync,
    getVehicles,
    getVehicle,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    searchVehicles,
    getServiceStatus,
    updateService,
    updateBattery,
    getAffectedVehicles,
    updateRegistration,
    updateKm,
    getStats,
    exportData,
    importData,
    downloadCsvTemplate,
    clearAll,
    isSeeded,
    _defaultServices,
    _defaultBattery
  };
})();
