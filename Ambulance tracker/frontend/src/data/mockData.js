// Fictional development seed data for Smart Ambulance academic prototype.
// Used when VITE_USE_MOCK_DATA is enabled or backend API is unavailable.

export const INITIAL_USERS = [
  {
    id: 'USR-PAT-1',
    name: 'Aarav Sharma',
    email: 'patient@smartambulance.demo',
    phone: '+91 98110 24510',
    role: 'patient',
    address: 'Sector 14, Saket Enclave, New Delhi',
    emergencyContact: '+91 98110 99001',
    bloodGroup: 'O+'
  },
  {
    id: 'USR-DRV-1',
    name: 'Vikram Singh',
    email: 'driver@smartambulance.demo',
    phone: '+91 98712 44210',
    role: 'driver',
    driverId: 'DRV-101',
    licenseNumber: 'DL-04-2019004821',
    assignedAmbulanceId: 'AMB-101'
  },
  {
    id: 'USR-ADM-1',
    name: 'Dr. Meera Nair',
    email: 'admin@smartambulance.demo',
    phone: '+91 98100 11220',
    role: 'admin',
    department: 'Central Emergency Dispatch Command'
  }
];

export const INITIAL_HOSPITALS = [
  {
    id: 'HSP-01',
    name: 'Metro Apex Trauma Center',
    shortName: 'Metro Apex',
    address: 'Ring Road, Sector 18, New Delhi',
    contactNumber: '+91 11 4050 1100',
    lat: 28.6185,
    lng: 77.2295
  },
  {
    id: 'HSP-02',
    name: 'St. Jude Cardiac & Emergency Institute',
    shortName: 'St. Jude',
    address: '42 Institutional Area, Janakpuri',
    contactNumber: '+91 11 2554 7800',
    lat: 28.6289,
    lng: 77.1842
  },
  {
    id: 'HSP-03',
    name: 'City Care Multispeciality Hospital',
    shortName: 'City Care',
    address: '19 Mayur Vihar Phase II',
    contactNumber: '+91 11 2277 9040',
    lat: 28.6095,
    lng: 77.2848
  }
];

export const INITIAL_DRIVERS = [
  {
    id: 'DRV-101',
    userId: 'USR-DRV-1',
    name: 'Vikram Singh',
    email: 'driver@smartambulance.demo',
    phone: '+91 98712 44210',
    licenseNumber: 'DL-04-2019004821',
    assignedAmbulanceId: 'AMB-101',
    availability: 'ONLINE',
    verificationStatus: 'VERIFIED',
    gpsSharing: true
  },
  {
    id: 'DRV-102',
    userId: 'USR-DRV-2',
    name: 'Rohan Kulkarni',
    email: 'rohan.k@smartambulance.demo',
    phone: '+91 98223 11894',
    licenseNumber: 'DL-02-2020019283',
    assignedAmbulanceId: 'AMB-102',
    availability: 'ONLINE',
    verificationStatus: 'VERIFIED',
    gpsSharing: true
  },
  {
    id: 'DRV-103',
    userId: 'USR-DRV-3',
    name: 'Suresh Verma',
    email: 'suresh.v@smartambulance.demo',
    phone: '+91 98109 73342',
    licenseNumber: 'DL-07-2018007612',
    assignedAmbulanceId: 'AMB-103',
    availability: 'ONLINE',
    verificationStatus: 'VERIFIED',
    gpsSharing: true
  },
  {
    id: 'DRV-104',
    userId: 'USR-DRV-4',
    name: 'Imran Qureshi',
    email: 'imran.q@smartambulance.demo',
    phone: '+91 99104 65211',
    licenseNumber: 'DL-09-2021003344',
    assignedAmbulanceId: 'AMB-104',
    availability: 'OFF_DUTY',
    verificationStatus: 'PENDING_APPROVAL',
    gpsSharing: false
  }
];

export const INITIAL_AMBULANCES = [
  {
    id: 'AMB-101',
    registrationNumber: 'DL-1A-4401',
    category: 'Advanced Life Support (ALS)',
    driverId: 'DRV-101',
    driverName: 'Vikram Singh',
    status: 'EN_ROUTE',
    currentLocation: 'Near Connaught Place Outer Circle',
    lat: 28.6315,
    lng: 77.2167,
    lastUpdated: '2026-11-26T08:05:00Z'
  },
  {
    id: 'AMB-102',
    registrationNumber: 'DL-1A-7812',
    category: 'Cardiac Care Unit (CCU)',
    driverId: 'DRV-102',
    driverName: 'Rohan Kulkarni',
    status: 'AVAILABLE',
    currentLocation: 'AIIMS Trauma Standby Bay',
    lat: 28.5672,
    lng: 77.2100,
    lastUpdated: '2026-11-26T08:04:00Z'
  },
  {
    id: 'AMB-103',
    registrationNumber: 'DL-1B-2290',
    category: 'Basic Life Support (BLS)',
    driverId: 'DRV-103',
    driverName: 'Suresh Verma',
    status: 'AVAILABLE',
    currentLocation: 'Preet Vihar Dispatch Hub',
    lat: 28.6410,
    lng: 77.2950,
    lastUpdated: '2026-11-26T08:02:00Z'
  },
  {
    id: 'AMB-104',
    registrationNumber: 'DL-1C-9045',
    category: 'Basic Life Support (BLS)',
    driverId: 'DRV-104',
    driverName: 'Imran Qureshi',
    status: 'OUT_OF_SERVICE',
    currentLocation: 'Central Fleet Depot',
    lat: 28.6550,
    lng: 77.1720,
    lastUpdated: '2026-11-26T07:10:00Z'
  }
];

export const INITIAL_REQUESTS = [
  {
    id: 'REQ-2041',
    patientId: 'USR-PAT-1',
    patientName: 'Aarav Sharma',
    contactNumber: '+91 98110 24510',
    category: 'Cardiac',
    pickupAddress: 'B-18, Saket Enclave, New Delhi',
    lat: 28.5985,
    lng: 77.2125,
    details: 'Chest tightness and shortness of breath, patient conscious.',
    status: 'EN_ROUTE',
    assignedAmbulanceId: 'AMB-101',
    createdAt: '2026-11-26T07:52:00Z'
  },
  {
    id: 'REQ-2042',
    patientId: 'USR-PAT-2',
    patientName: 'Neha Kapoor',
    contactNumber: '+91 98182 34012',
    category: 'Trauma',
    pickupAddress: 'Karol Bagh Metro Gate 2',
    lat: 28.6440,
    lng: 77.1888,
    details: 'Two-wheeler minor collision, suspected ankle fracture.',
    status: 'PENDING',
    assignedAmbulanceId: null,
    createdAt: '2026-11-26T08:03:00Z'
  },
  {
    id: 'REQ-2043',
    patientId: 'USR-PAT-3',
    patientName: 'Ramesh Iyer',
    contactNumber: '+91 98991 55219',
    category: 'Respiratory',
    pickupAddress: '45 Patparganj Road, East Delhi',
    lat: 28.6254,
    lng: 77.2895,
    details: 'Severe asthma episode requiring oxygen support.',
    status: 'PENDING',
    assignedAmbulanceId: null,
    createdAt: '2026-11-26T08:06:00Z'
  },
  {
    id: 'REQ-2038',
    patientId: 'USR-PAT-1',
    patientName: 'Aarav Sharma',
    contactNumber: '+91 98110 24510',
    category: 'General',
    pickupAddress: 'Sector 14, Saket Enclave, New Delhi',
    lat: 28.5985,
    lng: 77.2125,
    details: 'High fever and dehydration transfer.',
    status: 'COMPLETED',
    assignedAmbulanceId: 'AMB-102',
    createdAt: '2026-11-22T14:20:00Z'
  },
  {
    id: 'REQ-2034',
    patientId: 'USR-PAT-4',
    patientName: 'Priya Menon',
    contactNumber: '+91 98115 77420',
    category: 'Cardiac',
    pickupAddress: 'Lajpat Nagar Central Market',
    lat: 28.5677,
    lng: 77.2433,
    details: 'False alarm — patient transported privately.',
    status: 'CANCELLED',
    assignedAmbulanceId: null,
    createdAt: '2026-11-21T10:15:00Z'
  }
];

export const INITIAL_ASSIGNMENTS = [
  {
    id: 'ASN-301',
    requestId: 'REQ-2041',
    ambulanceId: 'AMB-101',
    driverId: 'DRV-101',
    hospitalId: 'HSP-01',
    status: 'ACCEPTED',
    assignedAt: '2026-11-26T07:54:00Z'
  }
];

export const INITIAL_TRIPS = [
  {
    id: 'TRP-901',
    requestId: 'REQ-2041',
    assignmentId: 'ASN-301',
    ambulanceId: 'AMB-101',
    driverId: 'DRV-101',
    hospitalId: 'HSP-01',
    pickupAddress: 'B-18, Saket Enclave, New Delhi',
    destinationName: 'Metro Apex Trauma Center',
    status: 'EN_ROUTE',
    startedAt: '2026-11-26T07:55:00Z',
    completedAt: null,
    statusHistory: [
      { status: 'ACCEPTED', time: '2026-11-26T07:55:00Z' },
      { status: 'EN_ROUTE', time: '2026-11-26T07:57:00Z' }
    ]
  },
  {
    id: 'TRP-894',
    requestId: 'REQ-2038',
    assignmentId: 'ASN-295',
    ambulanceId: 'AMB-102',
    driverId: 'DRV-102',
    hospitalId: 'HSP-02',
    pickupAddress: 'Sector 14, Saket Enclave, New Delhi',
    destinationName: 'St. Jude Cardiac & Emergency Institute',
    status: 'COMPLETED',
    startedAt: '2026-11-22T14:24:00Z',
    completedAt: '2026-11-22T14:52:00Z',
    statusHistory: [
      { status: 'ACCEPTED', time: '2026-11-22T14:24:00Z' },
      { status: 'EN_ROUTE', time: '2026-11-22T14:26:00Z' },
      { status: 'ARRIVED', time: '2026-11-22T14:36:00Z' },
      { status: 'IN_TRANSIT', time: '2026-11-22T14:40:00Z' },
      { status: 'COMPLETED', time: '2026-11-22T14:52:00Z' }
    ]
  },
  {
    id: 'TRP-889',
    requestId: 'REQ-2030',
    assignmentId: 'ASN-289',
    ambulanceId: 'AMB-101',
    driverId: 'DRV-101',
    hospitalId: 'HSP-01',
    pickupAddress: 'Hauz Khas Enclave Block C',
    destinationName: 'Metro Apex Trauma Center',
    status: 'COMPLETED',
    startedAt: '2026-11-20T18:10:00Z',
    completedAt: '2026-11-20T18:41:00Z',
    statusHistory: [
      { status: 'ACCEPTED', time: '2026-11-20T18:10:00Z' },
      { status: 'EN_ROUTE', time: '2026-11-20T18:12:00Z' },
      { status: 'ARRIVED', time: '2026-11-20T18:22:00Z' },
      { status: 'IN_TRANSIT', time: '2026-11-20T18:26:00Z' },
      { status: 'COMPLETED', time: '2026-11-20T18:41:00Z' }
    ]
  }
];

export const INITIAL_ACTIVITY = [
  {
    id: 'ACT-1',
    message: 'AMB-101 (DL-1A-4401) marked EN_ROUTE for REQ-2041',
    time: '2026-11-26T07:57:00Z',
    type: 'info'
  },
  {
    id: 'ACT-2',
    message: 'New Trauma request REQ-2042 received from Karol Bagh Metro Gate 2',
    time: '2026-11-26T08:03:00Z',
    type: 'emergency'
  },
  {
    id: 'ACT-3',
    message: 'New Respiratory request REQ-2043 received from Patparganj Road',
    time: '2026-11-26T08:06:00Z',
    type: 'emergency'
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'NTF-1',
    roles: ['admin'],
    title: '2 Pending Emergency Requests',
    message: 'REQ-2042 (Trauma) and REQ-2043 (Respiratory) await ambulance allocation.',
    timeLabel: 'Just now',
    type: 'emergency',
    read: false,
    link: '/admin/requests'
  },
  {
    id: 'NTF-2',
    roles: ['driver'],
    title: 'Active Trip In Progress',
    message: 'Trip TRP-901 to Saket Enclave is active. Keep GPS sharing enabled.',
    timeLabel: '5 mins ago',
    type: 'info',
    read: false,
    link: '/driver/trip/TRP-901'
  },
  {
    id: 'NTF-3',
    roles: ['patient'],
    title: 'Ambulance En Route',
    message: 'DL-1A-4401 (Vikram Singh) is en route to your pickup location.',
    timeLabel: '6 mins ago',
    type: 'success',
    read: false,
    link: '/patient/tracking/REQ-2041'
  }
];
