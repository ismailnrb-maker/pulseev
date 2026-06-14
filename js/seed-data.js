/* ============================================================
   EV LIFECYCLE MANAGEMENT — SEED DATA
   10 realistic demo vehicles for first-load experience
   ============================================================ */

const SeedData = (() => {

  const MODELS = ['Comet', 'Cosmo'];
  const CITIES = ['Mumbai, MH', 'Delhi, DL', 'Bengaluru, KA', 'Pune, MH', 'Hyderabad, TS', 'Chennai, TN', 'Ahmedabad, GJ', 'Jaipur, RJ', 'Kolkata, WB', 'Lucknow, UP'];
  const TECHNICIANS = ['Vikram Singh', 'Rajesh Kumar', 'Arjun Patel', 'Sanjay Verma', 'Manoj Sharma', 'Amit Yadav'];

  const vehicles = [
    {
      vin: 'MAT45678901234501',
      chassisNo: 'CH-2024-0001',
      motorNo: 'MT-ZF-78001',
      controllerNo: 'CT-INV-44001',
      batteryPackNo: 'BP-LFP-96001',
      model: 'Comet',
      manufacturingDate: '2024-01-10',
      customerName: 'Rajesh Mehra',
      customerPhone: '+91-9876543201',
      customerLocation: 'Mumbai, MH',
      deliveryDate: '2024-02-15',
      currentKm: 12500,
      kmLog: [
        { month: '2024-03', km: 1200 }, { month: '2024-04', km: 2500 },
        { month: '2024-05', km: 3800 }, { month: '2024-06', km: 5100 },
        { month: '2024-07', km: 6300 }, { month: '2024-08', km: 7600 },
        { month: '2024-09', km: 8800 }, { month: '2024-10', km: 9900 },
        { month: '2024-11', km: 11000 }, { month: '2024-12', km: 12500 }
      ],
      registrationStatus: 'completed',
      registrationDates: { delivered: '2024-02-15', documents_pending: '2024-02-17', submitted: '2024-02-22', completed: '2024-03-15' },
      registrationNotes: { completed: 'MH-02-XX-1234' },
      registrationNumber: 'MH-02-XX-1234',
      services: [
        { serviceNumber: 1, dueKm: 1000, completedKm: 1050, date: '2024-03-20', technician: 'Vikram Singh', issues: 'None' },
        { serviceNumber: 2, dueKm: 5000, completedKm: 5200, date: '2024-06-15', technician: 'Rajesh Kumar', issues: 'Minor brake pad adjustment' },
        { serviceNumber: 3, dueKm: 10000, completedKm: 10100, date: '2024-10-05', technician: 'Vikram Singh', issues: 'Tyre rotation done' },
        { serviceNumber: 4, dueKm: 20000, completedKm: 0, date: '', technician: '', issues: '' }
      ],
      batteryReplacement: { affected: true, campaignId: 'BC-2024-001', status: 'completed', oldSerial: 'BP-LFP-96001', newSerial: 'BP-LFP-96001-R', replacementDate: '2024-07-20', technician: 'Arjun Patel', customerConfirmed: true }
    },
    {
      vin: 'MAT45678901234502',
      chassisNo: 'CH-2024-0002',
      motorNo: 'MT-ZF-78002',
      controllerNo: 'CT-INV-44002',
      batteryPackNo: 'BP-LFP-96002',
      model: 'Comet',
      manufacturingDate: '2024-02-05',
      customerName: 'Priya Sharma',
      customerPhone: '+91-9876543202',
      customerLocation: 'Delhi, DL',
      deliveryDate: '2024-03-01',
      currentKm: 8700,
      kmLog: [
        { month: '2024-04', km: 1100 }, { month: '2024-05', km: 2300 },
        { month: '2024-06', km: 3500 }, { month: '2024-07', km: 4800 },
        { month: '2024-08', km: 5900 }, { month: '2024-09', km: 7000 },
        { month: '2024-10', km: 8000 }, { month: '2024-11', km: 8700 }
      ],
      registrationStatus: 'completed',
      registrationDates: { delivered: '2024-03-01', documents_pending: '2024-03-03', submitted: '2024-03-08', completed: '2024-04-01' },
      registrationNotes: { completed: 'DL-3C-AB-5678' },
      registrationNumber: 'DL-3C-AB-5678',
      services: [
        { serviceNumber: 1, dueKm: 1000, completedKm: 1020, date: '2024-04-10', technician: 'Sanjay Verma', issues: 'None' },
        { serviceNumber: 2, dueKm: 5000, completedKm: 5100, date: '2024-08-15', technician: 'Sanjay Verma', issues: 'Software update applied' },
        { serviceNumber: 3, dueKm: 10000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 4, dueKm: 20000, completedKm: 0, date: '', technician: '', issues: '' }
      ],
      batteryReplacement: { affected: true, campaignId: 'BC-2024-001', status: 'pending', oldSerial: 'BP-LFP-96002', newSerial: '', replacementDate: '', technician: '', customerConfirmed: false }
    },
    {
      vin: 'MAT45678901234503',
      chassisNo: 'CH-2024-0003',
      motorNo: 'MT-ZF-78003',
      controllerNo: 'CT-INV-44003',
      batteryPackNo: 'BP-LFP-96003',
      model: 'Comet',
      manufacturingDate: '2024-03-12',
      customerName: 'Amit Joshi',
      customerPhone: '+91-9876543203',
      customerLocation: 'Bengaluru, KA',
      deliveryDate: '2024-04-10',
      currentKm: 6200,
      kmLog: [
        { month: '2024-05', km: 800 }, { month: '2024-06', km: 1700 },
        { month: '2024-07', km: 2800 }, { month: '2024-08', km: 3900 },
        { month: '2024-09', km: 5000 }, { month: '2024-10', km: 6200 }
      ],
      registrationStatus: 'submitted',
      registrationDates: { delivered: '2024-04-10', documents_pending: '2024-04-12', submitted: '2024-04-18', completed: null },
      registrationNotes: { submitted: 'Submitted to RTO Bengaluru East' },
      registrationNumber: '',
      services: [
        { serviceNumber: 1, dueKm: 1000, completedKm: 950, date: '2024-05-20', technician: 'Manoj Sharma', issues: 'None' },
        { serviceNumber: 2, dueKm: 5000, completedKm: 5050, date: '2024-09-10', technician: 'Manoj Sharma', issues: 'AC gas top-up' },
        { serviceNumber: 3, dueKm: 10000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 4, dueKm: 20000, completedKm: 0, date: '', technician: '', issues: '' }
      ],
      batteryReplacement: { affected: false, campaignId: '', status: 'not_affected', oldSerial: '', newSerial: '', replacementDate: '', technician: '', customerConfirmed: false }
    },
    {
      vin: 'MAT45678901234504',
      chassisNo: 'CH-2024-0004',
      motorNo: 'MT-ZF-78004',
      controllerNo: 'CT-INV-44004',
      batteryPackNo: 'BP-NMC-72004',
      model: 'Cosmo',
      manufacturingDate: '2024-04-20',
      customerName: 'Sneha Kulkarni',
      customerPhone: '+91-9876543204',
      customerLocation: 'Pune, MH',
      deliveryDate: '2024-05-25',
      currentKm: 3800,
      kmLog: [
        { month: '2024-06', km: 600 }, { month: '2024-07', km: 1400 },
        { month: '2024-08', km: 2100 }, { month: '2024-09', km: 2900 },
        { month: '2024-10', km: 3400 }, { month: '2024-11', km: 3800 }
      ],
      registrationStatus: 'completed',
      registrationDates: { delivered: '2024-05-25', documents_pending: '2024-05-27', submitted: '2024-06-01', completed: '2024-06-28' },
      registrationNotes: { completed: 'MH-12-YZ-9012' },
      registrationNumber: 'MH-12-YZ-9012',
      services: [
        { serviceNumber: 1, dueKm: 1000, completedKm: 1080, date: '2024-07-05', technician: 'Amit Yadav', issues: 'None' },
        { serviceNumber: 2, dueKm: 5000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 3, dueKm: 10000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 4, dueKm: 20000, completedKm: 0, date: '', technician: '', issues: '' }
      ],
      batteryReplacement: { affected: true, campaignId: 'BC-2024-001', status: 'in_progress', oldSerial: 'BP-NMC-72004', newSerial: '', replacementDate: '', technician: 'Arjun Patel', customerConfirmed: false }
    },
    {
      vin: 'MAT45678901234505',
      chassisNo: 'CH-2024-0005',
      motorNo: 'MT-ZF-78005',
      controllerNo: 'CT-INV-44005',
      batteryPackNo: 'BP-LFP-96005',
      model: 'Comet',
      manufacturingDate: '2024-05-15',
      customerName: 'Vikash Gupta',
      customerPhone: '+91-9876543205',
      customerLocation: 'Hyderabad, TS',
      deliveryDate: '2024-06-20',
      currentKm: 2100,
      kmLog: [
        { month: '2024-07', km: 500 }, { month: '2024-08', km: 1000 },
        { month: '2024-09', km: 1500 }, { month: '2024-10', km: 2100 }
      ],
      registrationStatus: 'documents_pending',
      registrationDates: { delivered: '2024-06-20', documents_pending: '2024-06-22', submitted: null, completed: null },
      registrationNotes: { documents_pending: 'Waiting for address proof from customer' },
      registrationNumber: '',
      services: [
        { serviceNumber: 1, dueKm: 1000, completedKm: 1050, date: '2024-08-10', technician: 'Rajesh Kumar', issues: 'None' },
        { serviceNumber: 2, dueKm: 5000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 3, dueKm: 10000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 4, dueKm: 20000, completedKm: 0, date: '', technician: '', issues: '' }
      ],
      batteryReplacement: { affected: false, campaignId: '', status: 'not_affected', oldSerial: '', newSerial: '', replacementDate: '', technician: '', customerConfirmed: false }
    },
    {
      vin: 'MAT45678901234506',
      chassisNo: 'CH-2024-0006',
      motorNo: 'MT-ZF-78006',
      controllerNo: 'CT-INV-44006',
      batteryPackNo: 'BP-NMC-72006',
      model: 'Cosmo',
      manufacturingDate: '2024-06-01',
      customerName: 'Ananya Reddy',
      customerPhone: '+91-9876543206',
      customerLocation: 'Chennai, TN',
      deliveryDate: '2024-07-10',
      currentKm: 1500,
      kmLog: [
        { month: '2024-08', km: 400 }, { month: '2024-09', km: 800 },
        { month: '2024-10', km: 1200 }, { month: '2024-11', km: 1500 }
      ],
      registrationStatus: 'completed',
      registrationDates: { delivered: '2024-07-10', documents_pending: '2024-07-12', submitted: '2024-07-18', completed: '2024-08-10' },
      registrationNotes: { completed: 'TN-09-CD-3456' },
      registrationNumber: 'TN-09-CD-3456',
      services: [
        { serviceNumber: 1, dueKm: 1000, completedKm: 1020, date: '2024-09-05', technician: 'Vikram Singh', issues: 'None' },
        { serviceNumber: 2, dueKm: 5000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 3, dueKm: 10000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 4, dueKm: 20000, completedKm: 0, date: '', technician: '', issues: '' }
      ],
      batteryReplacement: { affected: false, campaignId: '', status: 'not_affected', oldSerial: '', newSerial: '', replacementDate: '', technician: '', customerConfirmed: false }
    },
    {
      vin: 'MAT45678901234507',
      chassisNo: 'CH-2024-0007',
      motorNo: 'MT-ZF-78007',
      controllerNo: 'CT-INV-44007',
      batteryPackNo: 'BP-LFP-96007',
      model: 'Cosmo',
      manufacturingDate: '2024-07-01',
      customerName: 'Deepak Nair',
      customerPhone: '+91-9876543207',
      customerLocation: 'Ahmedabad, GJ',
      deliveryDate: '2024-08-05',
      currentKm: 5800,
      kmLog: [
        { month: '2024-09', km: 1800 }, { month: '2024-10', km: 3500 },
        { month: '2024-11', km: 5200 }, { month: '2024-12', km: 5800 }
      ],
      registrationStatus: 'completed',
      registrationDates: { delivered: '2024-08-05', documents_pending: '2024-08-07', submitted: '2024-08-12', completed: '2024-09-05' },
      registrationNotes: { completed: 'GJ-01-EF-7890' },
      registrationNumber: 'GJ-01-EF-7890',
      services: [
        { serviceNumber: 1, dueKm: 1000, completedKm: 1100, date: '2024-09-15', technician: 'Sanjay Verma', issues: 'None' },
        { serviceNumber: 2, dueKm: 5000, completedKm: 5150, date: '2024-11-20', technician: 'Sanjay Verma', issues: 'Wheel alignment' },
        { serviceNumber: 3, dueKm: 10000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 4, dueKm: 20000, completedKm: 0, date: '', technician: '', issues: '' }
      ],
      batteryReplacement: { affected: true, campaignId: 'BC-2024-001', status: 'pending', oldSerial: 'BP-LFP-96007', newSerial: '', replacementDate: '', technician: '', customerConfirmed: false }
    },
    {
      vin: 'MAT45678901234508',
      chassisNo: 'CH-2024-0008',
      motorNo: 'MT-ZF-78008',
      controllerNo: 'CT-INV-44008',
      batteryPackNo: 'BP-NMC-72008',
      model: 'Cosmo',
      manufacturingDate: '2024-08-10',
      customerName: 'Kavita Singh',
      customerPhone: '+91-9876543208',
      customerLocation: 'Jaipur, RJ',
      deliveryDate: '2024-09-15',
      currentKm: 4200,
      kmLog: [
        { month: '2024-10', km: 1500 }, { month: '2024-11', km: 3000 },
        { month: '2024-12', km: 4200 }
      ],
      registrationStatus: 'submitted',
      registrationDates: { delivered: '2024-09-15', documents_pending: '2024-09-17', submitted: '2024-09-22', completed: null },
      registrationNotes: { submitted: 'Pending RTO appointment' },
      registrationNumber: '',
      services: [
        { serviceNumber: 1, dueKm: 1000, completedKm: 1050, date: '2024-10-20', technician: 'Manoj Sharma', issues: 'None' },
        { serviceNumber: 2, dueKm: 5000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 3, dueKm: 10000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 4, dueKm: 20000, completedKm: 0, date: '', technician: '', issues: '' }
      ],
      batteryReplacement: { affected: false, campaignId: '', status: 'not_affected', oldSerial: '', newSerial: '', replacementDate: '', technician: '', customerConfirmed: false }
    },
    {
      vin: 'MAT45678901234509',
      chassisNo: 'CH-2024-0009',
      motorNo: 'MT-ZF-78009',
      controllerNo: 'CT-INV-44009',
      batteryPackNo: 'BP-LFP-96009',
      model: 'Comet',
      manufacturingDate: '2024-09-05',
      customerName: 'Rohit Deshmukh',
      customerPhone: '+91-9876543209',
      customerLocation: 'Kolkata, WB',
      deliveryDate: '2024-10-10',
      currentKm: 1800,
      kmLog: [
        { month: '2024-11', km: 900 }, { month: '2024-12', km: 1800 }
      ],
      registrationStatus: 'delivered',
      registrationDates: { delivered: '2024-10-10', documents_pending: null, submitted: null, completed: null },
      registrationNotes: {},
      registrationNumber: '',
      services: [
        { serviceNumber: 1, dueKm: 1000, completedKm: 1050, date: '2024-11-25', technician: 'Amit Yadav', issues: 'None' },
        { serviceNumber: 2, dueKm: 5000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 3, dueKm: 10000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 4, dueKm: 20000, completedKm: 0, date: '', technician: '', issues: '' }
      ],
      batteryReplacement: { affected: true, campaignId: 'BC-2024-002', status: 'pending', oldSerial: 'BP-LFP-96009', newSerial: '', replacementDate: '', technician: '', customerConfirmed: false }
    },
    {
      vin: 'MAT45678901234510',
      chassisNo: 'CH-2024-0010',
      motorNo: 'MT-ZF-78010',
      controllerNo: 'CT-INV-44010',
      batteryPackNo: 'BP-NMC-72010',
      model: 'Comet',
      manufacturingDate: '2024-10-01',
      customerName: 'Sunita Patil',
      customerPhone: '+91-9876543210',
      customerLocation: 'Lucknow, UP',
      deliveryDate: '2024-11-05',
      currentKm: 600,
      kmLog: [
        { month: '2024-12', km: 600 }
      ],
      registrationStatus: 'documents_pending',
      registrationDates: { delivered: '2024-11-05', documents_pending: '2024-11-07', submitted: null, completed: null },
      registrationNotes: { documents_pending: 'Insurance documents pending' },
      registrationNumber: '',
      services: [
        { serviceNumber: 1, dueKm: 1000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 2, dueKm: 5000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 3, dueKm: 10000, completedKm: 0, date: '', technician: '', issues: '' },
        { serviceNumber: 4, dueKm: 20000, completedKm: 0, date: '', technician: '', issues: '' }
      ],
      batteryReplacement: { affected: false, campaignId: '', status: 'not_affected', oldSerial: '', newSerial: '', replacementDate: '', technician: '', customerConfirmed: false }
    }
  ];

  function seed() {
    if (Store.isSeeded()) return false;
    const data = Store.getData();
    vehicles.forEach(v => {
      v.id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      v.createdAt = new Date().toISOString();
      v.updatedAt = new Date().toISOString();
      data.vehicles.push(v);
    });
    localStorage.setItem('ev_lifecycle_data', JSON.stringify(data));
    return true;
  }

  return { seed };
})();
