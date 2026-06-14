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

  // --- Seed Data (offline fallback) ---

  function getSeedData() {
    const now = new Date().toISOString();
    function mkServices(c1=0,d1='',t1='',i1='', c2=0,d2='',t2='',i2='', c3=0,d3='',t3='',i3='', c4=0,d4='',t4='',i4='') {
      return [
        {serviceNumber:1,dueKm:1000,completedKm:c1,date:d1,technician:t1,issues:i1},
        {serviceNumber:2,dueKm:5000,completedKm:c2,date:d2,technician:t2,issues:i2},
        {serviceNumber:3,dueKm:10000,completedKm:c3,date:d3,technician:t3,issues:i3},
        {serviceNumber:4,dueKm:20000,completedKm:c4,date:d4,technician:t4,issues:i4}
      ];
    }
    function mkBattery(affected=false,campaignId='',status='not_affected',oldSerial='',newSerial='',replacementDate='',technician='',customerConfirmed=false) {
      return {affected,campaignId,status,oldSerial,newSerial,replacementDate,technician,customerConfirmed};
    }
    return [
      {id:'seed-01',vin:'MAT45678901234501',model:'Comet',chassisNo:'CH-2024-0001',motorNo:'MT-ZF-78001',controllerNo:'CT-INV-44001',batteryPackNo:'BP-LFP-96001',manufacturingDate:'2024-01-10',customerName:'Rajesh Mehra',customerPhone:'+91-9876543201',customerLocation:'Mumbai, MH',deliveryDate:'2024-02-15',currentKm:12500,registrationStatus:'completed',registrationNumber:'MH-02-XX-1234',registrationDates:{delivered:'2024-02-15',documents_pending:'2024-02-17',submitted:'2024-02-22',completed:'2024-03-15'},registrationNotes:{completed:'MH-02-XX-1234'},services:mkServices(1050,'2024-03-20','Vikram Singh','None',5200,'2024-06-15','Rajesh Kumar','Minor brake pad adjustment',10100,'2024-10-05','Vikram Singh','Tyre rotation done'),batteryReplacement:mkBattery(true,'BC-2024-001','completed','BP-LFP-96001','BP-LFP-96001-R','2024-07-20','Arjun Patel',true),kmLog:[{month:'2024-03',km:1200},{month:'2024-06',km:5200},{month:'2024-10',km:10100}],createdAt:'2024-02-15T10:00:00Z',updatedAt:now},
      {id:'seed-02',vin:'MAT45678901234502',model:'Comet',chassisNo:'CH-2024-0002',motorNo:'MT-ZF-78002',controllerNo:'CT-INV-44002',batteryPackNo:'BP-LFP-96002',manufacturingDate:'2024-02-05',customerName:'Priya Sharma',customerPhone:'+91-9876543202',customerLocation:'Delhi, DL',deliveryDate:'2024-03-01',currentKm:8700,registrationStatus:'completed',registrationNumber:'DL-3C-AB-5678',registrationDates:{delivered:'2024-03-01',documents_pending:'2024-03-03',submitted:'2024-03-08',completed:'2024-04-01'},registrationNotes:{completed:'DL-3C-AB-5678'},services:mkServices(1020,'2024-04-10','Sanjay Verma','None',5100,'2024-08-15','Sanjay Verma','Software update applied'),batteryReplacement:mkBattery(true,'BC-2024-001','pending','BP-LFP-96002'),kmLog:[{month:'2024-04',km:1100},{month:'2024-08',km:5100}],createdAt:'2024-03-01T10:00:00Z',updatedAt:now},
      {id:'seed-03',vin:'MAT45678901234503',model:'Comet',chassisNo:'CH-2024-0003',motorNo:'MT-ZF-78003',controllerNo:'CT-INV-44003',batteryPackNo:'BP-LFP-96003',manufacturingDate:'2024-03-12',customerName:'Amit Joshi',customerPhone:'+91-9876543203',customerLocation:'Bengaluru, KA',deliveryDate:'2024-04-10',currentKm:6200,registrationStatus:'submitted',registrationNumber:'',registrationDates:{delivered:'2024-04-10',documents_pending:'2024-04-12',submitted:'2024-04-18'},registrationNotes:{submitted:'Submitted to RTO Bengaluru East'},services:mkServices(950,'2024-05-20','Manoj Sharma','None',5050,'2024-09-10','Manoj Sharma','AC gas top-up'),batteryReplacement:mkBattery(),kmLog:[{month:'2024-05',km:800},{month:'2024-09',km:5050}],createdAt:'2024-04-10T10:00:00Z',updatedAt:now},
      {id:'seed-04',vin:'MAT45678901234504',model:'Cosmo',chassisNo:'CH-2024-0004',motorNo:'MT-ZF-78004',controllerNo:'CT-INV-44004',batteryPackNo:'BP-NMC-72004',manufacturingDate:'2024-04-20',customerName:'Sneha Kulkarni',customerPhone:'+91-9876543204',customerLocation:'Pune, MH',deliveryDate:'2024-05-25',currentKm:3800,registrationStatus:'completed',registrationNumber:'MH-12-YZ-9012',registrationDates:{delivered:'2024-05-25',documents_pending:'2024-05-27',submitted:'2024-06-01',completed:'2024-06-28'},registrationNotes:{completed:'MH-12-YZ-9012'},services:mkServices(1080,'2024-07-05','Amit Yadav','None'),batteryReplacement:mkBattery(true,'BC-2024-001','in_progress','BP-NMC-72004','','','Arjun Patel'),kmLog:[{month:'2024-07',km:1080}],createdAt:'2024-05-25T10:00:00Z',updatedAt:now},
      {id:'seed-05',vin:'MAT45678901234505',model:'Comet',chassisNo:'CH-2024-0005',motorNo:'MT-ZF-78005',controllerNo:'CT-INV-44005',batteryPackNo:'BP-LFP-96005',manufacturingDate:'2024-05-15',customerName:'Vikash Gupta',customerPhone:'+91-9876543205',customerLocation:'Hyderabad, TS',deliveryDate:'2024-06-20',currentKm:2100,registrationStatus:'documents_pending',registrationNumber:'',registrationDates:{delivered:'2024-06-20',documents_pending:'2024-06-22'},registrationNotes:{documents_pending:'Waiting for address proof from customer'},services:mkServices(1050,'2024-08-10','Rajesh Kumar','None'),batteryReplacement:mkBattery(),kmLog:[{month:'2024-08',km:1050}],createdAt:'2024-06-20T10:00:00Z',updatedAt:now},
      {id:'seed-06',vin:'MAT45678901234506',model:'Cosmo',chassisNo:'CH-2024-0006',motorNo:'MT-ZF-78006',controllerNo:'CT-INV-44006',batteryPackNo:'BP-NMC-72006',manufacturingDate:'2024-06-01',customerName:'Ananya Reddy',customerPhone:'+91-9876543206',customerLocation:'Chennai, TN',deliveryDate:'2024-07-10',currentKm:1500,registrationStatus:'completed',registrationNumber:'TN-09-CD-3456',registrationDates:{delivered:'2024-07-10',documents_pending:'2024-07-12',submitted:'2024-07-18',completed:'2024-08-10'},registrationNotes:{completed:'TN-09-CD-3456'},services:mkServices(1020,'2024-09-05','Vikram Singh','None'),batteryReplacement:mkBattery(),kmLog:[{month:'2024-09',km:1020}],createdAt:'2024-07-10T10:00:00Z',updatedAt:now},
      {id:'seed-07',vin:'MAT45678901234507',model:'Cosmo',chassisNo:'CH-2024-0007',motorNo:'MT-ZF-78007',controllerNo:'CT-INV-44007',batteryPackNo:'BP-LFP-96007',manufacturingDate:'2024-07-01',customerName:'Deepak Nair',customerPhone:'+91-9876543207',customerLocation:'Ahmedabad, GJ',deliveryDate:'2024-08-05',currentKm:5800,registrationStatus:'completed',registrationNumber:'GJ-01-EF-7890',registrationDates:{delivered:'2024-08-05',documents_pending:'2024-08-07',submitted:'2024-08-12',completed:'2024-09-05'},registrationNotes:{completed:'GJ-01-EF-7890'},services:mkServices(1100,'2024-09-15','Sanjay Verma','None',5150,'2024-11-20','Sanjay Verma','Wheel alignment'),batteryReplacement:mkBattery(true,'BC-2024-001','pending','BP-LFP-96007'),kmLog:[{month:'2024-09',km:1100},{month:'2024-11',km:5150}],createdAt:'2024-08-05T10:00:00Z',updatedAt:now},
      {id:'seed-08',vin:'MAT45678901234508',model:'Cosmo',chassisNo:'CH-2024-0008',motorNo:'MT-ZF-78008',controllerNo:'CT-INV-44008',batteryPackNo:'BP-NMC-72008',manufacturingDate:'2024-08-10',customerName:'Kavita Singh',customerPhone:'+91-9876543208',customerLocation:'Jaipur, RJ',deliveryDate:'2024-09-15',currentKm:4200,registrationStatus:'submitted',registrationNumber:'',registrationDates:{delivered:'2024-09-15',documents_pending:'2024-09-17',submitted:'2024-09-22'},registrationNotes:{submitted:'Pending RTO appointment'},services:mkServices(1050,'2024-10-20','Manoj Sharma','None'),batteryReplacement:mkBattery(),kmLog:[{month:'2024-10',km:1050}],createdAt:'2024-09-15T10:00:00Z',updatedAt:now},
      {id:'seed-09',vin:'MAT45678901234509',model:'Comet',chassisNo:'CH-2024-0009',motorNo:'MT-ZF-78009',controllerNo:'CT-INV-44009',batteryPackNo:'BP-LFP-96009',manufacturingDate:'2024-09-05',customerName:'Rohit Deshmukh',customerPhone:'+91-9876543209',customerLocation:'Kolkata, WB',deliveryDate:'2024-10-10',currentKm:1800,registrationStatus:'delivered',registrationNumber:'',registrationDates:{delivered:'2024-10-10'},registrationNotes:{},services:mkServices(1050,'2024-11-25','Amit Yadav','None'),batteryReplacement:mkBattery(true,'BC-2024-002','pending','BP-LFP-96009'),kmLog:[{month:'2024-11',km:1050}],createdAt:'2024-10-10T10:00:00Z',updatedAt:now},
      {id:'seed-10',vin:'MAT45678901234510',model:'Comet',chassisNo:'CH-2024-0010',motorNo:'MT-ZF-78100',controllerNo:'CT-INV-44100',batteryPackNo:'BP-NMC-72100',manufacturingDate:'2024-10-01',customerName:'Sunita Patil',customerPhone:'+91-9876543210',customerLocation:'Lucknow, UP',deliveryDate:'2024-11-05',currentKm:600,registrationStatus:'documents_pending',registrationNumber:'',registrationDates:{delivered:'2024-11-05',documents_pending:'2024-11-07'},registrationNotes:{documents_pending:'Insurance documents pending'},services:mkServices(),batteryReplacement:mkBattery(),kmLog:[],createdAt:'2024-11-05T10:00:00Z',updatedAt:now}
    ];
  }

  // --- Offline Mode Helpers ---

  function isOfflineMode() {
    return localStorage.getItem('ev_auth_mode') === 'offline';
  }

  function loadOfflineVehicles() {
    try {
      const stored = localStorage.getItem('ev_offline_vehicles');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return null;
  }

  function saveOfflineVehicles(vehicles) {
    localStorage.setItem('ev_offline_vehicles', JSON.stringify(vehicles));
  }

  // --- Sync with Backend ---

  async function sync() {
    // If in offline mode, load from localStorage
    if (isOfflineMode()) {
      const stored = loadOfflineVehicles();
      if (stored && stored.length > 0) {
        cache.vehicles = stored;
      } else {
        // First time offline — load seed data
        cache.vehicles = getSeedData();
        saveOfflineVehicles(cache.vehicles);
      }
      return true;
    }

    const token = localStorage.getItem('ev_auth_token');
    if (!token) {
      handleUnauthorized();
      return false;
    }

    try {
      const res = await fetch('/api/vehicles', {
        headers: getHeaders(),
        signal: AbortSignal.timeout(8000)
      });
      
      if (res.status === 401) {
        handleUnauthorized();
        return false;
      }
      
      if (!res.ok) {
        // API error — fall back to offline mode with stored data
        console.warn('Store: API unavailable, switching to offline mode');
        localStorage.setItem('ev_auth_mode', 'offline');
        const stored = loadOfflineVehicles();
        cache.vehicles = stored || getSeedData();
        if (!stored) saveOfflineVehicles(cache.vehicles);
        return true;
      }

      cache.vehicles = await res.json();
      return true;
    } catch (e) {
      console.error('Store: Sync failure', e);
      // Network error — use offline data
      localStorage.setItem('ev_auth_mode', 'offline');
      const stored = loadOfflineVehicles();
      cache.vehicles = stored || getSeedData();
      if (!stored) saveOfflineVehicles(cache.vehicles);
      return true;
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
    // Offline mode: save to localStorage
    if (isOfflineMode()) {
      const newV = { ...vehicle, id: 'local-' + Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      cache.vehicles.push(newV);
      saveOfflineVehicles(cache.vehicles);
      return newV;
    }
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
    // Offline mode: update localStorage
    if (isOfflineMode()) {
      const idx = cache.vehicles.findIndex(v => v.id === id);
      if (idx >= 0) {
        cache.vehicles[idx] = { ...cache.vehicles[idx], ...updates, updatedAt: new Date().toISOString() };
        saveOfflineVehicles(cache.vehicles);
        return cache.vehicles[idx];
      }
      return null;
    }
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
    // Offline mode: remove from localStorage
    if (isOfflineMode()) {
      cache.vehicles = cache.vehicles.filter(v => v.id !== id);
      saveOfflineVehicles(cache.vehicles);
      return true;
    }
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
