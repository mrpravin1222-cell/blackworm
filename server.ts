import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { BLACKWORM_USER_UPLOADED_LOGO_BASE64 } from './src/assets/logoBase64';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cross-Origin headers for API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Database path & structure
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial fallback data
const initialCompanyDetails = {
  name: 'Blackworm Agritech Pvt Ltd',
  tagline: 'Agriculture with new perspective',
  logoUrl: BLACKWORM_USER_UPLOADED_LOGO_BASE64 || '',
  cin: 'U01409PN2022PTC217246',
  gstNo: '27AALCB3069J1ZC',
  address: 'Gat No. 17 Vijaynagar (Mhaisal), Tal - Miraj, Dist - Sangli. 416409.',
  taluka: 'Miraj',
  district: 'Sangli',
  pincode: '416409',
  phone: '+91 7798716201',
  email: 'blackwormagritechpvtltd@gmail.com',
  bankDetails: {
    bankName: 'Rajarambapu Sahakari Bank Limited, Miraj',
    accountNo: '035330268109560',
    ifsc: 'RRBP0000035',
    accountHolder: 'Blackworm Agritech Pvt Ltd',
    branch: 'Miraj Main Branch, Sangli',
  },
};

const initialUsers = [
  {
    id: 'USR-001',
    fullName: 'Shreedhar Balkrushna Shinde',
    name: 'Shreedhar Balkrushna Shinde',
    designation: 'Owner',
    village: 'Vijaynagar (Mhaisal)',
    address: 'Sangli',
    phone: '+91 7798716201',
    email: 'blackwormagritechpvtltd@gmail.com',
    bloodGroup: 'O+',
    loginId: 'admin',
    password: '123',
    role: 'admin',
    territory: 'Head Office (Sangli)',
  },
  {
    id: 'USR-PRAVIN',
    fullName: 'Pravin Kumar Waghmare',
    name: 'Pravin Kumar Waghmare',
    designation: 'Sr.Sales Officer',
    village: 'Tasgaon',
    address: 'Tasgaon, Dist - Sangli',
    phone: '+91 9822012345',
    email: 'pravin.waghmare@blackworm.com',
    bloodGroup: 'B+',
    loginId: 'pravin',
    password: '123',
    role: 'sales-officer',
    territory: 'Tasgaon, Palus, Kadegaon, Khanapur (Vita )',
  },
];

const initialPriceList = [
  {
    id: 'PROD-01',
    code: 'BW-VC-50K',
    nameMr: 'ब्लॅकवर्म प्रीमियम गांडूळखत (Vermicompost)',
    nameEn: 'Blackworm Premium Vermicompost',
    category: 'Organic Fertilizers',
    packing: '50 Kg Bag',
    mrp: 950,
    dealerPrice: 680,
    distributorPrice: 620,
    gstRate: 5,
    hsnCode: '31010099',
    inStock: true,
    minOrderQty: 20,
    descriptionMr: 'उच्च प्रतीचे नैसर्गिक जिवाणूयुक्त सेंद्रिय गांडूळखत.',
    descriptionEn: 'High quality microbial rich natural organic vermicompost.',
  },
  {
    id: 'PROD-02',
    code: 'BW-VW-1L',
    nameMr: 'ब्लॅकवर्म व्हर्मी-वॉश टॉनिक (Vermi-Wash)',
    nameEn: 'Blackworm Vermi-Wash Tonic',
    category: 'Bio-Stimulants',
    packing: '1 Litre Bottle',
    mrp: 650,
    dealerPrice: 420,
    distributorPrice: 380,
    gstRate: 12,
    hsnCode: '31010091',
    inStock: true,
    minOrderQty: 10,
    descriptionMr: 'पिकांच्या वाढीसाठी संजीवके आणि एन्झाइम्सने समृद्ध द्रव खत.',
    descriptionEn: 'Rich liquid extract with plant growth hormones & enzymes.',
  },
  {
    id: 'PROD-03',
    code: 'BW-NPK-1L',
    nameMr: 'ब्लॅकवर्म बायो-एनपीके कंसोर्टियम (Bio NPK)',
    nameEn: 'Blackworm Bio-NPK Consortium',
    category: 'Organic Fertilizers',
    packing: '1 Litre Bottle',
    mrp: 750,
    dealerPrice: 480,
    distributorPrice: 440,
    gstRate: 12,
    hsnCode: '31051000',
    inStock: true,
    minOrderQty: 10,
    descriptionMr: 'नायट्रोजन, फॉस्फरस व पोटॅश उपलब्ध करून देणारे उपयुक्त जिवाणू.',
    descriptionEn: 'Liquid bacterial consortium for N, P, and K availability.',
  },
  {
    id: 'PROD-04',
    code: 'BW-HR-10K',
    nameMr: 'ब्लॅकवर्म ह्युमिक ग्रॅन्युल्स (Humic Gold)',
    nameEn: 'Blackworm Humic Gold Granules',
    category: 'Soil Conditioners',
    packing: '10 Kg Bucket',
    mrp: 1250,
    dealerPrice: 850,
    distributorPrice: 780,
    gstRate: 12,
    hsnCode: '38249900',
    inStock: true,
    minOrderQty: 5,
    descriptionMr: 'पांढऱ्या मुळ्यांची भरघोस वाढ व मातीची सुपीकता वाढवणारे खत.',
    descriptionEn: 'Enhances white root development and soil carbon buffer.',
  },
  {
    id: 'PROD-05',
    code: 'BW-MIC-5K',
    nameMr: 'ब्लॅकवर्म मायक्रोरिच ग्रेड-२ (Micronutrients)',
    nameEn: 'Blackworm MicroRich Grade-II',
    category: 'Micronutrients',
    packing: '5 Kg Bag',
    mrp: 850,
    dealerPrice: 580,
    distributorPrice: 530,
    gstRate: 12,
    hsnCode: '38089910',
    inStock: true,
    minOrderQty: 8,
    descriptionMr: 'झिंक, फेरस, कॉपर, बोरॉन व मॅग्नेशियम युक्त सूक्ष्म अन्नद्रव्ये.',
    descriptionEn: 'Balanced trace elements for flowering and chlorophyll boost.',
  },
  {
    id: 'PROD-06',
    code: 'BW-NP-1L',
    nameMr: 'ब्लॅकवर्म नीम प्रोटेक्ट बायो-अर्क (Neem Protect)',
    nameEn: 'Blackworm Neem Protect Bio-Extract',
    category: 'Pest Care',
    packing: '1 Litre Can',
    mrp: 890,
    dealerPrice: 590,
    distributorPrice: 540,
    gstRate: 12,
    hsnCode: '38089190',
    inStock: true,
    minOrderQty: 10,
    descriptionMr: 'अझाडिराक्टिनयुक्त १००% सेंद्रिय कीड व रसशोषक कीटक प्रतिबंधक.',
    descriptionEn: 'Natural azadirachtin repellent for sucking pests and thrips.',
  },
  {
    id: 'PROD-07',
    code: 'BW-POT-25K',
    nameMr: 'ब्लॅकवर्म बायो-पोटॅश ग्रॅन्युल्स (Bio Potash)',
    nameEn: 'Blackworm Bio Potash Granules',
    category: 'Organic Fertilizers',
    packing: '25 Kg Bag',
    mrp: 1100,
    dealerPrice: 790,
    distributorPrice: 740,
    gstRate: 5,
    hsnCode: '31049000',
    inStock: true,
    minOrderQty: 10,
    descriptionMr: 'फळांचा आकार, वजन व चमक वाढवणारे सेंद्रिय पोटॅश खत.',
    descriptionEn: 'Organic potash for fruit size, weight, and harvest luster.',
  },
];

interface DatabaseSchema {
  version: number;
  lastUpdated: string;
  companyDetails: any;
  priceList: any[];
  targets: any[];
  dealerApplications: any[];
  travelExpenses: any[];
  users: any[];
  activities: any[];
  dealerOrders: any[];
  dealerCollections: any[];
  dailyActivities?: any[];
  travelSheets?: Record<string, any>;
}

const BACKUP_DB_FILE = path.join(DATA_DIR, 'db_backup.json');

function loadDatabase(): DatabaseSchema {
  let primaryData: any = null;
  let backupData: any = null;

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      primaryData = JSON.parse(raw);
    } catch (err) {
      console.error('Failed to read db.json:', err);
    }
  }

  if (fs.existsSync(BACKUP_DB_FILE)) {
    try {
      const backupRaw = fs.readFileSync(BACKUP_DB_FILE, 'utf-8');
      backupData = JSON.parse(backupRaw);
    } catch (bErr) {
      console.error('Failed to read db_backup.json:', bErr);
    }
  }

  const base: DatabaseSchema = primaryData || backupData || {
    version: 1,
    lastUpdated: new Date().toISOString(),
    companyDetails: initialCompanyDetails,
    priceList: initialPriceList,
    targets: [],
    dealerApplications: [],
    travelExpenses: [],
    users: initialUsers,
    activities: [],
    dealerOrders: [],
    dealerCollections: [],
    dailyActivities: [],
  };

  // Bidirectional merge of primary & backup arrays so no records are lost
  if (primaryData && backupData) {
    const keys: (keyof DatabaseSchema)[] = [
      'users',
      'dealerApplications',
      'targets',
      'priceList',
      'travelExpenses',
      'dealerOrders',
      'dealerCollections',
      'activities',
      'dailyActivities',
    ];

    keys.forEach((key) => {
      const pArr = Array.isArray(primaryData[key]) ? primaryData[key] : [];
      const bArr = Array.isArray(backupData[key]) ? backupData[key] : [];
      const map = new Map<string, any>();
      pArr.forEach((item: any) => { if (item && item.id) map.set(item.id, item); });
      bArr.forEach((item: any) => { if (item && item.id && !map.has(item.id)) map.set(item.id, item); });
      (base as any)[key] = Array.from(map.values());
    });
  }

  // Ensure default system users are present if missing
  base.users = base.users || [];
  if (!base.users.some((u: any) => u.loginId === 'admin' || u.id === 'USR-001')) {
    base.users.unshift(initialUsers[0]);
  }
  if (!base.users.some((u: any) => u.loginId === 'pravin' || u.id === 'USR-PRAVIN')) {
    base.users.push(initialUsers[1]);
  }

  base.companyDetails = base.companyDetails || initialCompanyDetails;
  if (base.companyDetails && !base.companyDetails.logoUrl) {
    base.companyDetails.logoUrl = BLACKWORM_USER_UPLOADED_LOGO_BASE64;
  }
  base.priceList = (base.priceList && base.priceList.length > 0) ? base.priceList : initialPriceList;
  base.targets = base.targets || [];
  base.dealerApplications = base.dealerApplications || [];
  base.travelExpenses = base.travelExpenses || [];
  base.dealerOrders = base.dealerOrders || [];
  base.dealerCollections = base.dealerCollections || [];
  base.activities = base.activities || [];
  base.dailyActivities = base.dailyActivities || [];
  base.travelSheets = base.travelSheets || {};

  saveDatabase(base);
  return base;
}

function saveDatabase(data: DatabaseSchema) {
  try {
    data.lastUpdated = new Date().toISOString();
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, serialized, 'utf-8');
    // Mirror secondary backup file to guarantee zero data loss
    fs.writeFileSync(BACKUP_DB_FILE, serialized, 'utf-8');
    // Ensure data directory has an extra timestamped snapshot backup if needed
    const permanentBackup = path.join(DATA_DIR, 'db_permanent_backup.json');
    if (!fs.existsSync(permanentBackup) || Math.random() < 0.05) {
      fs.writeFileSync(permanentBackup, serialized, 'utf-8');
    }
  } catch (err) {
    console.error('Failed to write db.json:', err);
  }
}

let dbState = loadDatabase();

// Connected SSE clients for instant broadcast
const sseClients = new Set<express.Response>();

function broadcastChange(type: string, payload: any, senderId?: string) {
  const message = JSON.stringify({
    type,
    data: payload,
    sender: senderId || 'server',
    timestamp: new Date().toISOString(),
    version: dbState.version,
  });

  for (const client of sseClients) {
    try {
      client.write(`event: sync\ndata: ${message}\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Keep-alive heartbeat for SSE
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(`: heartbeat\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}, 20000);

// ================= API ROUTES =================

// SSE real-time stream endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`: connected\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Full database snapshot
app.get('/api/data', (req, res) => {
  res.json({
    status: 'ok',
    data: dbState,
    serverTimestamp: new Date().toISOString(),
  });
});

// Generic Sync / Mutation endpoint
app.post('/api/sync', (req, res) => {
  const { type, data, sender } = req.body;
  dbState.version = (dbState.version || 1) + 1;

  if (data.companyDetails) dbState.companyDetails = data.companyDetails;
  if (data.priceList) dbState.priceList = data.priceList;
  if (data.targets) dbState.targets = data.targets;
  if (data.dealerApplications) dbState.dealerApplications = data.dealerApplications;
  if (data.travelExpenses) dbState.travelExpenses = data.travelExpenses;
  if (data.users && Array.isArray(data.users)) {
    // Non-destructive merge of users to prevent accidental user deletion on sync
    const userMap = new Map<string, any>();
    (dbState.users || []).forEach((u: any) => { if (u && u.id) userMap.set(u.id, u); });
    data.users.forEach((u: any) => { if (u && u.id) userMap.set(u.id, u); });
    dbState.users = Array.from(userMap.values());
  }
  if (data.activities) dbState.activities = data.activities;
  if (data.dealerOrders) dbState.dealerOrders = data.dealerOrders;
  if (data.dealerCollections) dbState.dealerCollections = data.dealerCollections;
  if (data.dailyActivities && Array.isArray(data.dailyActivities)) {
    // Non-destructive merge of daily activities so site visits/meetings are never lost
    const actMap = new Map<string, any>();
    (dbState.dailyActivities || []).forEach((a: any) => { if (a && a.id) actMap.set(a.id, a); });
    data.dailyActivities.forEach((a: any) => { if (a && a.id) actMap.set(a.id, a); });
    dbState.dailyActivities = Array.from(actMap.values());
  }
  if (data.travelSheets && typeof data.travelSheets === 'object') {
    dbState.travelSheets = { ...(dbState.travelSheets || {}), ...data.travelSheets };
  }

  saveDatabase(dbState);
  broadcastChange(type || 'SYNC_ALL', data, sender);

  res.json({
    status: 'ok',
    version: dbState.version,
    lastUpdated: dbState.lastUpdated,
  });
});

// --- Daily Activities API (Site visits, Dealer meetings, Farmer interactions) ---
app.get('/api/daily-activities', (req, res) => {
  res.json(dbState.dailyActivities || []);
});

app.post('/api/daily-activities', (req, res) => {
  const item = req.body;
  const newActivity = {
    ...item,
    id: item.id || `ACT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbState.dailyActivities = [
    newActivity,
    ...(dbState.dailyActivities || []).filter((a: any) => a.id !== newActivity.id),
  ];
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('DAILY_ACTIVITY_UPDATE', { dailyActivities: dbState.dailyActivities }, req.body.sender);

  res.json({ status: 'ok', data: newActivity });
});

app.put('/api/daily-activities/:id', (req, res) => {
  const { id } = req.params;
  const patch = req.body;

  dbState.dailyActivities = (dbState.dailyActivities || []).map((a: any) => {
    if (a.id === id) {
      return { ...a, ...patch, updatedAt: new Date().toISOString() };
    }
    return a;
  });

  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('DAILY_ACTIVITY_UPDATE', { dailyActivities: dbState.dailyActivities }, req.body.sender);

  res.json({ status: 'ok', data: (dbState.dailyActivities || []).find((a: any) => a.id === id) });
});

app.delete('/api/daily-activities/:id', (req, res) => {
  const { id } = req.params;
  dbState.dailyActivities = (dbState.dailyActivities || []).filter((a: any) => a.id !== id);
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('DAILY_ACTIVITY_UPDATE', { dailyActivities: dbState.dailyActivities }, req.body?.sender);

  res.json({ status: 'ok', id });
});

// --- Dealer Applications API ---
app.get('/api/dealers', (req, res) => {
  res.json(dbState.dealerApplications || []);
});

app.post('/api/dealers', (req, res) => {
  const appData = req.body;
  const newApp = {
    ...appData,
    id: appData.id || `DLR-APP-${Date.now().toString().slice(-6)}`,
    applicationDate: appData.applicationDate || new Date().toISOString().split('T')[0],
    status: appData.status || 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbState.dealerApplications = [newApp, ...(dbState.dealerApplications || []).filter((d: any) => d.id !== newApp.id)];
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('DEALER_UPDATE', { dealerApplications: dbState.dealerApplications }, req.body.sender);

  res.json({ status: 'ok', data: newApp });
});

app.put('/api/dealers/:id', (req, res) => {
  const { id } = req.params;
  const patch = req.body;

  dbState.dealerApplications = (dbState.dealerApplications || []).map((d: any) => {
    if (d.id === id) {
      return { ...d, ...patch, updatedAt: new Date().toISOString() };
    }
    return d;
  });

  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('DEALER_UPDATE', { dealerApplications: dbState.dealerApplications }, req.body.sender);

  res.json({ status: 'ok', data: dbState.dealerApplications.find((d: any) => d.id === id) });
});

app.delete('/api/dealers/:id', (req, res) => {
  const { id } = req.params;
  dbState.dealerApplications = (dbState.dealerApplications || []).filter((d: any) => d.id !== id);
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('DEALER_UPDATE', { dealerApplications: dbState.dealerApplications }, req.body?.sender);

  res.json({ status: 'ok', id });
});

// --- Users API ---
app.get('/api/users', (req, res) => {
  res.json(dbState.users || []);
});

app.post('/api/users', (req, res) => {
  const userData = req.body;
  const newUser = {
    ...userData,
    id: userData.id || `USR-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbState.users = [newUser, ...(dbState.users || []).filter((u: any) => u.id !== newUser.id)];
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('USER_UPDATE', { users: dbState.users }, req.body.sender);

  res.json({ status: 'ok', data: newUser });
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const patch = req.body;

  dbState.users = (dbState.users || []).map((u: any) => {
    if (u.id === id) {
      return { ...u, ...patch, updatedAt: new Date().toISOString() };
    }
    return u;
  });

  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('USER_UPDATE', { users: dbState.users }, req.body.sender);

  res.json({ status: 'ok', data: dbState.users.find((u: any) => u.id === id) });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const userToDelete = (dbState.users || []).find((u: any) => u.id === id);
  if (
    userToDelete &&
    (userToDelete.role === 'admin' ||
      userToDelete.loginId === 'admin' ||
      userToDelete.loginId === 'pravin' ||
      userToDelete.id === 'USR-001' ||
      userToDelete.id === 'USR-PRAVIN')
  ) {
    return res.status(403).json({ status: 'error', message: 'Admin account cannot be deleted under any circumstances!' });
  }

  dbState.users = (dbState.users || []).filter((u: any) => u.id !== id);
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('USER_UPDATE', { users: dbState.users }, req.body?.sender);

  res.json({ status: 'ok', id });
});

// --- Targets API ---
app.get('/api/targets', (req, res) => {
  res.json(dbState.targets || []);
});

app.post('/api/targets', (req, res) => {
  const targetData = req.body;
  const newTarget = {
    ...targetData,
    id: targetData.id || `TGT-${Date.now().toString().slice(-5)}`,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  dbState.targets = [newTarget, ...(dbState.targets || []).filter((t: any) => t.id !== newTarget.id)];
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('TARGET_UPDATE', { targets: dbState.targets }, req.body.sender);

  res.json({ status: 'ok', data: newTarget });
});

app.put('/api/targets/:id', (req, res) => {
  const { id } = req.params;
  const patch = req.body;

  dbState.targets = (dbState.targets || []).map((t: any) => {
    if (t.id === id) {
      return { ...t, ...patch, lastUpdated: new Date().toISOString() };
    }
    return t;
  });

  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('TARGET_UPDATE', { targets: dbState.targets }, req.body.sender);

  res.json({ status: 'ok', data: dbState.targets.find((t: any) => t.id === id) });
});

app.delete('/api/targets/:id', (req, res) => {
  const { id } = req.params;
  dbState.targets = (dbState.targets || []).filter((t: any) => t.id !== id);
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('TARGET_UPDATE', { targets: dbState.targets }, req.body?.sender);

  res.json({ status: 'ok', id });
});

// --- Travel Expenses API ---
app.get('/api/expenses', (req, res) => {
  res.json(dbState.travelExpenses || []);
});

app.post('/api/expenses', (req, res) => {
  const expenseData = req.body;
  const newExpense = {
    ...expenseData,
    id: expenseData.id || `EXP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    submittedAt: new Date().toISOString(),
  };

  dbState.travelExpenses = [newExpense, ...(dbState.travelExpenses || []).filter((e: any) => e.id !== newExpense.id)];
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('EXPENSE_UPDATE', { travelExpenses: dbState.travelExpenses }, req.body.sender);

  res.json({ status: 'ok', data: newExpense });
});

app.put('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  const patch = req.body;

  dbState.travelExpenses = (dbState.travelExpenses || []).map((e: any) => {
    if (e.id === id) {
      return { ...e, ...patch, updatedAt: new Date().toISOString() };
    }
    return e;
  });

  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('EXPENSE_UPDATE', { travelExpenses: dbState.travelExpenses }, req.body.sender);

  res.json({ status: 'ok', data: dbState.travelExpenses.find((e: any) => e.id === id) });
});

app.delete('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  dbState.travelExpenses = (dbState.travelExpenses || []).filter((e: any) => e.id !== id);
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('EXPENSE_UPDATE', { travelExpenses: dbState.travelExpenses }, req.body?.sender);

  res.json({ status: 'ok', id });
});

// --- Price List API ---
app.get('/api/prices', (req, res) => {
  res.json(dbState.priceList || []);
});

app.post('/api/prices/bulk', (req, res) => {
  const { priceList, sender } = req.body;
  if (Array.isArray(priceList)) {
    dbState.priceList = priceList;
    dbState.version = (dbState.version || 1) + 1;
    saveDatabase(dbState);
    broadcastChange('PRICE_UPDATE', { priceList: dbState.priceList }, sender);
  }
  res.json({ status: 'ok', count: priceList?.length || 0 });
});

app.post('/api/prices', (req, res) => {
  const item = req.body;
  const newItem = {
    ...item,
    id: item.id || `PROD-${Date.now().toString().slice(-4)}`,
  };

  dbState.priceList = [newItem, ...(dbState.priceList || []).filter((p: any) => p.id !== newItem.id)];
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('PRICE_UPDATE', { priceList: dbState.priceList }, req.body.sender);

  res.json({ status: 'ok', data: newItem });
});

app.put('/api/prices/:id', (req, res) => {
  const { id } = req.params;
  const patch = req.body;

  dbState.priceList = (dbState.priceList || []).map((p: any) => {
    if (p.id === id) {
      return { ...p, ...patch };
    }
    return p;
  });

  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('PRICE_UPDATE', { priceList: dbState.priceList }, req.body.sender);

  res.json({ status: 'ok', data: dbState.priceList.find((p: any) => p.id === id) });
});

app.delete('/api/prices/:id', (req, res) => {
  const { id } = req.params;
  dbState.priceList = (dbState.priceList || []).filter((p: any) => p.id !== id);
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('PRICE_UPDATE', { priceList: dbState.priceList }, req.body?.sender);

  res.json({ status: 'ok', id });
});

// --- Reset Database API (Protected) ---
app.post('/api/reset', (req, res) => {
  // Preserve full backup before any reset attempt
  try {
    const backupSnapshot = path.join(DATA_DIR, `db_safety_archive_${Date.now()}.json`);
    fs.writeFileSync(backupSnapshot, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to create emergency snapshot before reset:', e);
  }

  // Preserve existing users, targets, and daily activities to protect customer data
  const preservedUsers = dbState.users && dbState.users.length > 0 ? dbState.users : initialUsers;
  const preservedTargets = dbState.targets || [];
  const preservedDailyActivities = dbState.dailyActivities || [];

  dbState = {
    version: (dbState.version || 1) + 1,
    lastUpdated: new Date().toISOString(),
    companyDetails: dbState.companyDetails || initialCompanyDetails,
    priceList: dbState.priceList || initialPriceList,
    targets: preservedTargets,
    dealerApplications: dbState.dealerApplications || [],
    dealerOrders: dbState.dealerOrders || [],
    dealerCollections: dbState.dealerCollections || [],
    travelExpenses: dbState.travelExpenses || [],
    users: preservedUsers,
    activities: dbState.activities || [],
    dailyActivities: preservedDailyActivities,
    travelSheets: dbState.travelSheets || {},
  };

  saveDatabase(dbState);
  broadcastChange('SYNC_ALL', dbState, req.body.sender);

  res.json({ status: 'ok', message: 'Data safeguarded. Default values restored.' });
});

// ================= VITE / STATIC SERVING =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Blackworm Centralized Real-Time Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
