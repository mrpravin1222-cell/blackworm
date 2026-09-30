import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { BLACKWORM_USER_UPLOADED_LOGO_BASE64 } from './src/assets/logoBase64';
import {
  initialCompanyDetails,
  initialUsers,
  initialPriceList,
  initialDealerApplications,
  initialDealerOrders,
  initialDealerCollections,
  initialDailyActivities,
  initialTargets,
} from './src/data/initialData';

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
  base.dealerApplications = base.dealerApplications || [];

  // Ensure initial targets, orders, collections are present
  base.targets = (base.targets && base.targets.length > 0) ? base.targets : initialTargets;
  base.dealerOrders = (base.dealerOrders && base.dealerOrders.length > 0) ? base.dealerOrders : initialDealerOrders;
  base.dealerCollections = base.dealerCollections || initialDealerCollections || [];
  base.dailyActivities = base.dailyActivities || initialDailyActivities || [];
  base.travelExpenses = base.travelExpenses || [];
  base.activities = base.activities || [];
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

// Micro-version check endpoint for lightweight cache validation
app.get('/api/version', (req, res) => {
  res.json({
    version: dbState.version || 1,
    lastUpdated: dbState.lastUpdated,
  });
});

// Full database snapshot with conditional 304 ETag caching
app.get('/api/data', (req, res) => {
  const currentVersionTag = `"${dbState.version || 1}"`;
  const clientVersionTag = req.headers['if-none-match'] || (req.query.v ? `"${req.query.v}"` : null);

  res.setHeader('ETag', currentVersionTag);
  res.setHeader('Cache-Control', 'no-cache');

  if (clientVersionTag && clientVersionTag === currentVersionTag) {
    // 304 Not Modified - 0 payload, 0 serialization, instantaneous response
    return res.status(304).end();
  }

  res.json({
    status: 'ok',
    version: dbState.version || 1,
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

// --- Dealer Orders API ---
app.get('/api/dealer-orders', (req, res) => {
  res.json(dbState.dealerOrders || []);
});

app.post('/api/dealer-orders', (req, res) => {
  const orderData = req.body;
  const newOrder = {
    ...orderData,
    id: orderData.id || `ORD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    createdAt: new Date().toISOString(),
  };

  dbState.dealerOrders = [newOrder, ...(dbState.dealerOrders || []).filter((o: any) => o.id !== newOrder.id)];
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('DEALER_ORDERS', { dealerOrders: dbState.dealerOrders }, req.body.sender);

  res.json({ status: 'ok', data: newOrder });
});

app.put('/api/dealer-orders/:id', (req, res) => {
  const { id } = req.params;
  const patch = req.body;

  dbState.dealerOrders = (dbState.dealerOrders || []).map((o: any) => {
    if (o.id === id) {
      return { ...o, ...patch, updatedAt: new Date().toISOString() };
    }
    return o;
  });

  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('DEALER_ORDERS', { dealerOrders: dbState.dealerOrders }, req.body.sender);

  res.json({ status: 'ok', data: dbState.dealerOrders.find((o: any) => o.id === id) });
});

app.delete('/api/dealer-orders/:id', (req, res) => {
  const { id } = req.params;
  dbState.dealerOrders = (dbState.dealerOrders || []).filter((o: any) => o.id !== id);
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('DEALER_ORDERS', { dealerOrders: dbState.dealerOrders }, req.body?.sender);

  res.json({ status: 'ok', id });
});

// --- Dealer Collections API ---
app.get('/api/dealer-collections', (req, res) => {
  res.json(dbState.dealerCollections || []);
});

app.post('/api/dealer-collections', (req, res) => {
  const colData = req.body;
  const newCol = {
    ...colData,
    id: colData.id || `COL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    createdAt: new Date().toISOString(),
  };

  dbState.dealerCollections = [newCol, ...(dbState.dealerCollections || []).filter((c: any) => c.id !== newCol.id)];
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('DEALER_COLLECTIONS', { dealerCollections: dbState.dealerCollections }, req.body.sender);

  res.json({ status: 'ok', data: newCol });
});

app.put('/api/dealer-collections/:id', (req, res) => {
  const { id } = req.params;
  const patch = req.body;

  dbState.dealerCollections = (dbState.dealerCollections || []).map((c: any) => {
    if (c.id === id) {
      return { ...c, ...patch, updatedAt: new Date().toISOString() };
    }
    return c;
  });

  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('DEALER_COLLECTIONS', { dealerCollections: dbState.dealerCollections }, req.body.sender);

  res.json({ status: 'ok', data: dbState.dealerCollections.find((c: any) => c.id === id) });
});

app.delete('/api/dealer-collections/:id', (req, res) => {
  const { id } = req.params;
  dbState.dealerCollections = (dbState.dealerCollections || []).filter((c: any) => c.id !== id);
  dbState.version = (dbState.version || 1) + 1;
  saveDatabase(dbState);
  broadcastChange('DEALER_COLLECTIONS', { dealerCollections: dbState.dealerCollections }, req.body?.sender);

  res.json({ status: 'ok', id });
});

// --- Travel Sheets API ---
app.get('/api/travel-sheets', (req, res) => {
  res.json(dbState.travelSheets || {});
});

app.post('/api/travel-sheets', (req, res) => {
  const { sheetKey, sheetPayload, sender } = req.body;
  if (sheetKey && sheetPayload) {
    dbState.travelSheets = dbState.travelSheets || {};
    dbState.travelSheets[sheetKey] = sheetPayload;
    dbState.version = (dbState.version || 1) + 1;
    saveDatabase(dbState);
    broadcastChange('TRAVEL_SHEET_SYNC', { travelSheets: { [sheetKey]: sheetPayload } }, sender);
  }
  res.json({ status: 'ok' });
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
