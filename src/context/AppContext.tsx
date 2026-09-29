import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  CompanyDetails,
  PriceListItem,
  TargetItem,
  DealerApplication,
  TravelExpense,
  User,
  ActivityLog,
  Language,
  NavTab,
  DealerOrderBill,
  DealerCollectionRecord,
  DailyActivity,
} from '../types';
import {
  initialCompanyDetails,
  initialPriceList,
  initialTargets,
  initialDealerApplications,
  initialTravelExpenses,
  initialUsers,
  initialActivities,
  initialDealerOrders,
  initialDealerCollections,
  initialDailyActivities,
} from '../data/initialData';
import { createTargetSheetForUser, getMonthNameFromDate, DEFAULT_MONTH_NAMES } from '../utils/targetHelpers';

interface SyncPayload {
  type: string;
  data: {
    companyDetails?: CompanyDetails;
    priceList?: PriceListItem[];
    targets?: TargetItem[];
    dealerApplications?: DealerApplication[];
    travelExpenses?: TravelExpense[];
    users?: User[];
    activities?: ActivityLog[];
    dealerOrders?: DealerOrderBill[];
    dealerCollections?: DealerCollectionRecord[];
    dailyActivities?: DailyActivity[];
    travelSheets?: Record<string, any>;
  };
  sender: string;
  timestamp: string;
  version?: number;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  companyDetails: CompanyDetails;
  updateCompanyDetails: (details: Partial<CompanyDetails>) => void;
  priceList: PriceListItem[];
  addPriceItem: (item: Omit<PriceListItem, 'id'>) => void;
  updatePriceItem: (id: string, item: Partial<PriceListItem>) => void;
  deletePriceItem: (id: string) => void;
  importBulkPriceItems: (items: Omit<PriceListItem, 'id'>[], replaceExisting?: boolean) => void;
  targets: TargetItem[];
  addTarget: (target: Omit<TargetItem, 'id' | 'lastUpdated'>) => void;
  updateTarget: (id: string, target: Partial<TargetItem>) => void;
  deleteTarget: (id: string) => void;
  dealerApplications: DealerApplication[];
  addDealerApplication: (app: Omit<DealerApplication, 'id' | 'applicationDate' | 'status'> & { dealerCode?: string; codeSequence?: number }) => DealerApplication;
  updateDealerApplication: (id: string, patch: Partial<DealerApplication>) => void;
  updateDealerStatus: (id: string, status: DealerApplication['status'], remarks?: string) => void;
  cancelDealerApplication: (id: string, reason?: string) => void;
  deleteDealerApplication: (id: string) => void;
  dealerOrders: DealerOrderBill[];
  addDealerOrder: (order: Omit<DealerOrderBill, 'id' | 'createdAt'>) => DealerOrderBill;
  updateDealerOrder: (id: string, patch: Partial<DealerOrderBill>) => void;
  deleteDealerOrder: (id: string) => void;
  dealerCollections: DealerCollectionRecord[];
  addDealerCollection: (col: Omit<DealerCollectionRecord, 'id' | 'createdAt' | 'amountLakh' | 'targetMonth'> & { targetMonth?: string }) => DealerCollectionRecord;
  updateDealerCollection: (id: string, patch: Partial<DealerCollectionRecord>) => void;
  deleteDealerCollection: (id: string) => void;
  getDealerBalance: (dealerId: string) => { totalOrders: number; totalCollections: number; currentOutstanding: number };
  dailyActivities: DailyActivity[];
  addDailyActivity: (activity: Omit<DailyActivity, 'id' | 'createdAt'> | DailyActivity) => DailyActivity;
  updateDailyActivity: (id: string, patch: Partial<DailyActivity>) => void;
  deleteDailyActivity: (id: string) => void;
  travelExpenses: TravelExpense[];
  addTravelExpense: (expense: Omit<TravelExpense, 'id' | 'submittedAt'>) => void;
  updateExpenseStatus: (id: string, status: TravelExpense['status']) => void;
  deleteTravelExpense: (id: string) => void;
  travelSheets: Record<string, any>;
  saveTravelSheet: (sheetKey: string, sheetData: any) => void;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  activities: ActivityLog[];
  lastSyncTimestamp: string;
  isOnline: boolean;
  syncLatencyMs: number;
  notification: { message: string; type: 'success' | 'info' } | null;
  clearNotification: () => void;
  showNotification: (message: string, type?: 'success' | 'info') => void;
  resetAllData: () => void;
  exportDataJSON: () => string;
  importDataJSON: (jsonStr: string) => boolean;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  COMPANY: 'blackworm_company_v1',
  PRICES: 'blackworm_prices_v1',
  TARGETS: 'blackworm_targets_v1',
  DEALERS: 'blackworm_dealers_v1',
  EXPENSES: 'blackworm_expenses_v1',
  USERS: 'blackworm_users_v1',
  ACTIVITIES: 'blackworm_activities_v1',
  CURRENT_USER: 'blackworm_current_user_v1',
  LANG: 'blackworm_lang_v1',
  DEALER_ORDERS: 'blackworm_dealer_orders_v1',
  DEALER_COLLECTIONS: 'blackworm_dealer_collections_v1',
  TRAVEL_SHEETS: 'blackworm_travel_sheets_map_v1',
  DAILY_ACTIVITIES: 'blackworm_daily_activities_v1',
};

// Helper functions for unique dealer code generation with pool reuse
export const parseDealerSequence = (code?: string, seq?: number): number | null => {
  if (typeof seq === 'number' && !isNaN(seq) && seq > 0) return seq;
  if (!code) return null;
  const match = code.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    return isNaN(num) ? null : num;
  }
  return null;
};

export const getNextAvailableDealerCode = (dealers: DealerApplication[]): { code: string; seq: number } => {
  const occupiedSequences = new Set<number>();
  dealers.forEach((d) => {
    if (d.status !== 'cancelled') {
      const num = parseDealerSequence(d.dealerCode, d.codeSequence);
      if (num !== null && num > 0) {
        occupiedSequences.add(num);
      }
    }
  });

  let seq = 1;
  while (occupiedSequences.has(seq)) {
    seq++;
  }

  const code = `DEALER-${String(seq).padStart(3, '0')}`;
  return { code, seq };
};

export const normalizeNavTab = (tab: string | undefined | null): NavTab => {
  if (!tab) return 'dashboard';
  const t = String(tab).toLowerCase().trim();
  if (t === 'daily' || t === 'daily-activity' || t === 'dailyactivity' || t === 'activity' || t === 'activities') return 'daily-activity';
  if (t === 'dealer' || t === 'dealer-portal' || t === 'dealer-form') return 'dealer-form';
  if (t === 'user' || t === 'users' || t === 'user-management') return 'user-management';
  if (t === 'target' || t === 'target-sheet') return 'target-sheet';
  if (t === 'price' || t === 'price-list') return 'price-list';
  if (t === 'travel' || t === 'expenses' || t === 'travel-expenses') return 'travel-expenses';
  if (t === 'report' || t === 'reports' || t === 'reporting') return 'reporting';
  if (t === 'setting' || t === 'settings') return 'settings';
  if (t === 'calculator' || t === 'order-calculator') return 'order-calculator';
  if (t === 'scheme' || t === 'schemes') return 'scheme';
  if (t === 'order' || t === 'collection' || t === 'order-collection') return 'order-collection';
  if (t === 'dashboard') return 'dashboard';
  return 'dashboard';
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Unique client session ID for avoiding echo loops
  const [clientId] = useState(() => 'CLIENT_' + Math.random().toString(36).substring(2, 9));

  // Language & Navigation
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem(STORAGE_KEYS.LANG) as Language) || 'en';
  });
  const [activeTab, setActiveTabState] = useState<NavTab>('dashboard');

  const setActiveTab = useCallback((tab: NavTab) => {
    const validTab = normalizeNavTab(tab);
    setActiveTabState(validTab);
    try {
      if (window.history.state?.tab !== validTab) {
        window.history.pushState({ tab: validTab }, '', '');
      }
    } catch (e) {
      console.warn('pushState error:', e);
    }
  }, []);

  useEffect(() => {
    const handlePopstate = (event: PopStateEvent) => {
      try {
        if (event.state && event.state.tab) {
          setActiveTabState(normalizeNavTab(event.state.tab));
        } else {
          setActiveTabState('dashboard');
        }
      } catch (e) {
        console.warn('popstate error:', e);
        setActiveTabState('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopstate);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.CURRENT_USER) {
        try {
          const val = e.newValue ? JSON.parse(e.newValue) : null;
          setCurrentUserState(val);
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    try {
      if (!window.history.state) {
        window.history.replaceState({ tab: 'dashboard' }, '', '');
      }
    } catch (_) {}
    return () => {
      window.removeEventListener('popstate', handlePopstate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Network & Real-time Sync State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncLatencyMs, setSyncLatencyMs] = useState<number>(0.1);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>(() => new Date().toISOString());
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Safe helper to parse JSON from localStorage without throwing uncaught errors
  const safeParse = useCallback(<T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return fallback;
      const parsed = JSON.parse(saved);
      return parsed ?? fallback;
    } catch (err) {
      console.warn(`Error parsing localStorage key "${key}":`, err);
      return fallback;
    }
  }, []);

  // Safe helper to set item in localStorage with quota error handling
  const safeSetItem = useCallback((key: string, value: any) => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
    } catch (e) {
      console.warn(`Failed to save to localStorage for key "${key}":`, e);
      // QuotaExceededError handling
      if (e instanceof DOMException && 
         (e.code === 22 || e.code === 1014 || e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        try {
          // Attempt simple pruning: Clear activities/logs which are less critical
          localStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
          localStorage.removeItem(STORAGE_KEYS.TRAVEL_SHEETS);
          // Try to set it again after pruning
          const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
          localStorage.setItem(key, stringValue);
        } catch (retryErr) {
          console.warn('Still over quota after pruning. Local cache might be disabled.');
        }
      }
    }
  }, []);

  // Authoritative State with local storage cache fallback
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPANY);
      return saved ? JSON.parse(saved) : initialCompanyDetails;
    } catch {
      return initialCompanyDetails;
    }
  });

  const [priceList, setPriceList] = useState<PriceListItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRICES);
      return saved ? JSON.parse(saved) : initialPriceList;
    } catch {
      return initialPriceList;
    }
  });

  const [targets, setTargets] = useState<TargetItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TARGETS);
      return saved ? JSON.parse(saved) : initialTargets;
    } catch {
      return initialTargets;
    }
  });

  const [dealerApplications, setDealerApplications] = useState<DealerApplication[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEALERS);
      return saved ? JSON.parse(saved) : initialDealerApplications;
    } catch {
      return initialDealerApplications;
    }
  });

  const [travelExpenses, setTravelExpenses] = useState<TravelExpense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return saved ? JSON.parse(saved) : initialTravelExpenses;
    } catch {
      return initialTravelExpenses;
    }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      let list: User[] = saved ? JSON.parse(saved) : initialUsers;
      if (!Array.isArray(list) || list.length === 0) list = initialUsers;
      if (!list.some((u) => u.loginId === 'admin' || u.id === 'USR-001')) {
        list = [initialUsers[0], ...list];
      }
      const map = new Map<string, User>();
      list.forEach((u) => {
        if (u && u.id) map.set(u.id, u);
      });
      return Array.from(map.values());
    } catch {
      return initialUsers;
    }
  });

  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
    } catch (_) { /* ignore */ }
    return null;
  });

  const setCurrentUser = useCallback((user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      safeSetItem(STORAGE_KEYS.CURRENT_USER, user);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [safeSetItem]);

  // Auto-logout if current user is deleted from the system
  useEffect(() => {
    if (currentUser && currentUser.id !== 'GUEST') {
      const stillExists = users.some(u => u.id === currentUser.id);
      if (!stillExists) {
        setCurrentUser(null);
      }
    }
  }, [users, currentUser, setCurrentUser]);

  const [activities, setActivities] = useState<ActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      return saved ? JSON.parse(saved) : initialActivities;
    } catch {
      return initialActivities;
    }
  });

  const [dealerOrders, setDealerOrders] = useState<DealerOrderBill[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEALER_ORDERS);
      return saved ? JSON.parse(saved) : initialDealerOrders;
    } catch {
      return initialDealerOrders;
    }
  });

  const [dealerCollections, setDealerCollections] = useState<DealerCollectionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEALER_COLLECTIONS);
      return saved ? JSON.parse(saved) : initialDealerCollections;
    } catch {
      return initialDealerCollections;
    }
  });

  const [travelSheets, setTravelSheets] = useState<Record<string, any>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRAVEL_SHEETS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [dailyActivities, setDailyActivities] = useState<DailyActivity[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DAILY_ACTIVITIES);
      return saved ? JSON.parse(saved) : initialDailyActivities;
    } catch {
      return initialDailyActivities;
    }
  });

  // Track latest state references for callbacks & sync merges
  const dailyActivitiesRef = useRef(dailyActivities);
  dailyActivitiesRef.current = dailyActivities;

  const dealerApplicationsRef = useRef(dealerApplications);
  dealerApplicationsRef.current = dealerApplications;

  const travelSheetsRef = useRef(travelSheets);
  travelSheetsRef.current = travelSheets;

  const usersRef = useRef(users);
  usersRef.current = users;

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const dealerOrdersRef = useRef(dealerOrders);
  dealerOrdersRef.current = dealerOrders;

  const dealerCollectionsRef = useRef(dealerCollections);
  dealerCollectionsRef.current = dealerCollections;

  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  const priceListRef = useRef(priceList);
  priceListRef.current = priceList;

  const travelExpensesRef = useRef(travelExpenses);
  travelExpensesRef.current = travelExpenses;

  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;

  // Notification helper
  const showNotification = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }, []);

  const clearNotification = useCallback(() => setNotification(null), []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    safeSetItem(STORAGE_KEYS.LANG, lang);
  }, [safeSetItem]);

  // Broadcast helper
  const broadcastSync = useCallback((type: string, data: any) => {
    const timestamp = new Date().toISOString();
    setLastSyncTimestamp(timestamp);

    // Post to centralized backend
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data, sender: clientId }),
    }).catch((err) => console.warn('Sync post error:', err));
  }, [clientId]);

  // Non-destructive bidirectional merger (Zero Data Loss - preserves newer local edits)
  const mergeWithLocal = useCallback(<T extends { id: string; lastUpdated?: string; updatedAt?: string; createdAt?: string }>(
    serverList: T[],
    currentList: T[],
    storageKey: string
  ): { merged: T[]; missingOnServer: T[] } => {
    const map = new Map<string, T>();
    // 1. Add server items first
    serverList.forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    // 2. Overlay local items if local item is missing on server OR if local item is newer/equal
    const missingOnServer: T[] = [];
    currentList.forEach((localItem) => {
      if (!localItem || !localItem.id) return;
      const serverItem = map.get(localItem.id);
      if (!serverItem) {
        missingOnServer.push(localItem);
        map.set(localItem.id, localItem);
      } else {
        const localTime = new Date(localItem.lastUpdated || localItem.updatedAt || localItem.createdAt || 0).getTime();
        const serverTime = new Date(serverItem.lastUpdated || serverItem.updatedAt || serverItem.createdAt || 0).getTime();
        if (localTime >= serverTime) {
          map.set(localItem.id, localItem);
        }
      }
    });

    const merged = Array.from(map.values());
    safeSetItem(storageKey, merged);
    return { merged, missingOnServer };
  }, [safeSetItem]);

  // ================= CENTRALIZED REAL-TIME CLOUD SYNC =================

  // Fetch full authoritative snapshot from central server database
  const fetchAuthoritativeData = useCallback(async () => {
    try {
      const startTime = performance.now();
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === 'ok' && json.data) {
        const db = json.data;
        if (db.companyDetails) {
          setCompanyDetails(db.companyDetails);
          safeSetItem(STORAGE_KEYS.COMPANY, db.companyDetails);
        }
        if (Array.isArray(db.priceList)) {
          const { merged, missingOnServer } = mergeWithLocal(db.priceList, priceListRef.current, STORAGE_KEYS.PRICES);
          setPriceList(merged);
          priceListRef.current = merged;
          if (missingOnServer.length > 0) broadcastSync('PRICE_UPDATE', { priceList: merged });
        }
        if (Array.isArray(db.targets)) {
          const { merged, missingOnServer } = mergeWithLocal(db.targets, targetsRef.current, STORAGE_KEYS.TARGETS);
          setTargets(merged);
          targetsRef.current = merged;
          if (missingOnServer.length > 0) broadcastSync('SYNC_TARGETS', { targets: merged });
        }
        if (Array.isArray(db.dealerApplications)) {
          const { merged, missingOnServer } = mergeWithLocal(db.dealerApplications, dealerApplicationsRef.current, STORAGE_KEYS.DEALERS);
          setDealerApplications(merged);
          dealerApplicationsRef.current = merged;
          if (missingOnServer.length > 0) broadcastSync('DEALER_UPDATE', { dealerApplications: merged });
        }
        if (Array.isArray(db.travelExpenses)) {
          const { merged, missingOnServer } = mergeWithLocal(db.travelExpenses, travelExpensesRef.current, STORAGE_KEYS.EXPENSES);
          setTravelExpenses(merged);
          travelExpensesRef.current = merged;
          if (missingOnServer.length > 0) broadcastSync('EXPENSE_UPDATE', { travelExpenses: merged });
        }
        if (Array.isArray(db.users) && db.users.length > 0) {
          const { merged, missingOnServer } = mergeWithLocal(db.users, usersRef.current, STORAGE_KEYS.USERS);
          setUsers(merged);
          usersRef.current = merged;
          if (missingOnServer.length > 0) broadcastSync('USER_UPDATE', { users: merged });
        }
        if (Array.isArray(db.activities)) {
          const { merged, missingOnServer } = mergeWithLocal(db.activities, activitiesRef.current, STORAGE_KEYS.ACTIVITIES);
          setActivities(merged);
          activitiesRef.current = merged;
          if (missingOnServer.length > 0) broadcastSync('ACTIVITY_UPDATE', { activities: merged });
        }
        if (Array.isArray(db.dailyActivities)) {
          const { merged, missingOnServer } = mergeWithLocal(db.dailyActivities, dailyActivitiesRef.current, STORAGE_KEYS.DAILY_ACTIVITIES);
          setDailyActivities(merged);
          dailyActivitiesRef.current = merged;
          if (missingOnServer.length > 0) broadcastSync('DAILY_ACTIVITY_UPDATE', { dailyActivities: merged });
        }
        if (Array.isArray(db.dealerOrders)) {
          const { merged, missingOnServer } = mergeWithLocal(db.dealerOrders, dealerOrdersRef.current, STORAGE_KEYS.DEALER_ORDERS);
          setDealerOrders(merged);
          dealerOrdersRef.current = merged;
          if (missingOnServer.length > 0) broadcastSync('DEALER_ORDERS', { dealerOrders: merged });
        }
        if (Array.isArray(db.dealerCollections)) {
          const { merged, missingOnServer } = mergeWithLocal(db.dealerCollections, dealerCollectionsRef.current, STORAGE_KEYS.DEALER_COLLECTIONS);
          setDealerCollections(merged);
          dealerCollectionsRef.current = merged;
          if (missingOnServer.length > 0) broadcastSync('DEALER_COLLECTIONS', { dealerCollections: merged });
        }
        if (db.travelSheets && typeof db.travelSheets === 'object') {
          const currentLocal = travelSheetsRef.current || {};
          const mergedSheets = { ...db.travelSheets };
          Object.entries(currentLocal).forEach(([key, localVal]) => {
            const serverVal = mergedSheets[key];
            if (!serverVal) {
              mergedSheets[key] = localVal;
            } else if (localVal && typeof localVal === 'object') {
              const localTime = new Date(localVal.lastUpdated || 0).getTime();
              const serverTime = new Date((serverVal && serverVal.lastUpdated) || 0).getTime();
              if (localTime >= serverTime) {
                mergedSheets[key] = localVal;
              }
            }
          });
          setTravelSheets(mergedSheets);
          travelSheetsRef.current = mergedSheets;
          safeSetItem(STORAGE_KEYS.TRAVEL_SHEETS, mergedSheets);
          // Also sync each individual sheet key to localStorage for instant component compatibility
          Object.entries(mergedSheets).forEach(([key, val]) => {
            safeSetItem(`blackworm_travel_sheet_${key}`, val);
          });
        }

        const elapsed = Math.max(0.1, Number((performance.now() - startTime).toFixed(1)));
        setSyncLatencyMs(elapsed);
        setLastSyncTimestamp(json.serverTimestamp || new Date().toISOString());
        setIsOnline(true);
      }
    } catch (err) {
      console.warn('Central server sync poll error (using cached local data):', err);
    }
  }, [broadcastSync, mergeWithLocal]);

  // Server-Sent Events (SSE) listener for instantaneous 0-ms push from server across all devices
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.addEventListener('sync', (e: MessageEvent) => {
          try {
            if (!e.data) return;
            const payload: SyncPayload = JSON.parse(e.data);
            if (!payload || payload.sender === clientId || !payload.data || typeof payload.data !== 'object') return;

            const startTime = performance.now();
            if (payload.data.companyDetails) {
              setCompanyDetails(payload.data.companyDetails);
              safeSetItem(STORAGE_KEYS.COMPANY, payload.data.companyDetails);
            }
            if (payload.data.priceList) {
              setPriceList(payload.data.priceList);
              safeSetItem(STORAGE_KEYS.PRICES, payload.data.priceList);
            }
            if (payload.data.targets) {
              setTargets(payload.data.targets);
              safeSetItem(STORAGE_KEYS.TARGETS, payload.data.targets);
            }
            if (payload.data.dealerApplications) {
              setDealerApplications(payload.data.dealerApplications);
              safeSetItem(STORAGE_KEYS.DEALERS, payload.data.dealerApplications);
            }
            if (payload.data.travelExpenses) {
              setTravelExpenses(payload.data.travelExpenses);
              safeSetItem(STORAGE_KEYS.EXPENSES, payload.data.travelExpenses);
            }
            if (payload.data.users) {
              const map = new Map<string, User>();
              payload.data.users.forEach((u: User) => { if (u && u.id) map.set(u.id, u); });
              const uniqueUsers = Array.from(map.values());
              setUsers(uniqueUsers);
              safeSetItem(STORAGE_KEYS.USERS, uniqueUsers);
            }
            if (payload.data.activities) {
              setActivities(payload.data.activities);
              safeSetItem(STORAGE_KEYS.ACTIVITIES, payload.data.activities);
            }
            if (payload.data.dailyActivities) {
              const { merged } = mergeWithLocal(payload.data.dailyActivities, dailyActivitiesRef.current, STORAGE_KEYS.DAILY_ACTIVITIES);
              setDailyActivities(merged);
            }
            if (payload.data.dealerOrders) {
              setDealerOrders(payload.data.dealerOrders);
              safeSetItem(STORAGE_KEYS.DEALER_ORDERS, payload.data.dealerOrders);
            }
            if (payload.data.dealerCollections) {
              setDealerCollections(payload.data.dealerCollections);
              safeSetItem(STORAGE_KEYS.DEALER_COLLECTIONS, payload.data.dealerCollections);
            }
            if (payload.data.travelSheets) {
              const updatedSheets = { ...travelSheetsRef.current, ...payload.data.travelSheets };
              setTravelSheets(updatedSheets);
              safeSetItem(STORAGE_KEYS.TRAVEL_SHEETS, updatedSheets);
              Object.entries(payload.data.travelSheets).forEach(([key, val]) => {
                safeSetItem(`blackworm_travel_sheet_${key}`, val);
              });
            }

            const latency = Math.max(0.1, Number((performance.now() - startTime).toFixed(2)));
            setSyncLatencyMs(latency);
            setLastSyncTimestamp(payload.timestamp || new Date().toISOString());
            setIsOnline(true);
          } catch (parseErr) {
            console.error('SSE sync parse error:', parseErr);
          }
        });

        eventSource.onopen = () => {
          setIsOnline(true);
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect after 3 seconds
          clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connectSSE, 3000);
        };
      } catch (err) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectSSE, 3000);
      }
    };

    // Initial fetch from centralized server database
    fetchAuthoritativeData();
    connectSSE();

    // Re-sync when mobile/browser tab becomes visible or focused
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchAuthoritativeData();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Periodic heartbeat sync every 10 seconds to ensure 100% sync integrity
    const syncInterval = setInterval(fetchAuthoritativeData, 10000);

    const handleOnline = () => {
      setIsOnline(true);
      fetchAuthoritativeData();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (eventSource) eventSource.close();
      clearTimeout(reconnectTimeout);
      clearInterval(syncInterval);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [clientId, fetchAuthoritativeData]);

  // Activity logger
  const logActivity = useCallback((action: string, actionMr: string, module: string, details: string) => {
    const newLog: ActivityLog = {
      id: 'ACT-' + Date.now(),
      timestamp: new Date().toISOString(),
      userName: currentUser ? currentUser.name : 'Guest User',
      userRole: currentUser ? currentUser.role.toUpperCase() : 'GUEST',
      action,
      actionMr,
      module,
      details,
    };
    setActivities((prev) => {
      const updated = [newLog, ...prev].slice(0, 50);
      safeSetItem(STORAGE_KEYS.ACTIVITIES, updated);
      return updated;
    });
  }, [currentUser]);

  // CRUD for Company Details
  const updateCompanyDetails = useCallback((details: Partial<CompanyDetails>) => {
    setCompanyDetails((prev) => {
      const updated = { ...prev, ...details };
      safeSetItem(STORAGE_KEYS.COMPANY, updated);
      broadcastSync('COMPANY_UPDATE', { companyDetails: updated });
      return updated;
    });
    logActivity('Company Details Updated', 'कंपनी तपशील अद्ययावत केले', 'settings', 'कंपनीचे पत्ता/बँक तपशील बदलण्यात आले.');
    showNotification(language === 'mr' ? 'कंपनी तपशील यशस्वीरित्या सेव्ह झाले.' : 'Company details saved successfully.');
  }, [broadcastSync, language, logActivity, showNotification]);

  // CRUD for Price List
  const addPriceItem = useCallback((item: Omit<PriceListItem, 'id'>) => {
    const newItem: PriceListItem = {
      ...item,
      id: 'PROD-' + Date.now().toString().slice(-4),
    };
    setPriceList((prev) => {
      const updated = [newItem, ...prev];
      safeSetItem(STORAGE_KEYS.PRICES, updated);
      return updated;
    });

    fetch('/api/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newItem, sender: clientId }),
    }).catch((err) => console.warn('Failed to post price item to server:', err));

    logActivity('Added Product to Price List', 'प्राइस लिस्टमध्ये नवीन उत्पादन जोडले', 'price-list', `${newItem.nameMr} - ₹${newItem.dealerPrice}`);
    showNotification(language === 'mr' ? 'नवीन प्रॉडक्ट प्राइस लिस्टमध्ये जोडले!' : 'Product added to price list!');
  }, [clientId, language, logActivity, showNotification]);

  const updatePriceItem = useCallback((id: string, patch: Partial<PriceListItem>) => {
    setPriceList((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, ...patch } : item));
      safeSetItem(STORAGE_KEYS.PRICES, updated);
      return updated;
    });

    fetch(`/api/prices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...patch, sender: clientId }),
    }).catch((err) => console.warn('Failed to update price item on server:', err));

    logActivity('Updated Price Item', 'प्रॉडक्ट दर अद्ययावत केले', 'price-list', `आयटम ${id} चे दर बदलले.`);
    showNotification(language === 'mr' ? 'प्रॉडक्ट माहिती अद्ययावत झाली.' : 'Product updated successfully.');
  }, [clientId, language, logActivity, showNotification]);

  const deletePriceItem = useCallback((id: string) => {
    setPriceList((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      safeSetItem(STORAGE_KEYS.PRICES, updated);
      return updated;
    });

    fetch(`/api/prices/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: clientId }),
    }).catch((err) => console.warn('Failed to delete price item on server:', err));

    logActivity('Deleted Product', 'प्रॉडक्ट हटवले', 'price-list', `आयटम ${id} हटवला.`);
    showNotification(language === 'mr' ? 'प्रॉडक्ट हटवले गेले.' : 'Product deleted.');
  }, [clientId, language, logActivity, showNotification]);

  const importBulkPriceItems = useCallback((newItems: Omit<PriceListItem, 'id'>[], replaceExisting: boolean = false) => {
    setPriceList((prev) => {
      const itemsWithIds: PriceListItem[] = newItems.map((item, idx) => ({
        ...item,
        id: item.code ? `PRC-${item.code}` : `PRC-${Date.now()}-${idx}`,
      }));

      let updatedList: PriceListItem[];
      if (replaceExisting) {
        updatedList = itemsWithIds;
      } else {
        const existingMap = new Map<string, PriceListItem>(prev.map((i) => [(i.code || i.id).toLowerCase(), i]));
        itemsWithIds.forEach((item) => {
          const key = (item.code || item.id).toLowerCase();
          if (existingMap.has(key)) {
            const old = existingMap.get(key)!;
            existingMap.set(key, { ...old, ...item });
          } else {
            existingMap.set(key, item);
          }
        });
        updatedList = Array.from(existingMap.values());
      }

      safeSetItem(STORAGE_KEYS.PRICES, updatedList);

      fetch('/api/prices/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceList: updatedList, sender: clientId }),
      }).catch((err) => console.warn('Failed to post bulk price items to server:', err));

      return updatedList;
    });

    logActivity(
      'Bulk Imported Price List',
      'प्राइस लिस्ट फाईल मधून प्रॉडक्ट्स अपलोड केले',
      'price-list',
      `${newItems.length} प्रॉडक्ट्स प्राईस लिस्टमध्ये समाविष्ट केले.`
    );
    showNotification(
      language === 'mr'
        ? `${newItems.length} प्रॉडक्ट्स प्राईस लिस्टमध्ये यशस्वीपणे समाविष्ट झाले!`
        : `${newItems.length} products imported into price list!`
    );
  }, [clientId, language, logActivity, showNotification]);

  // CRUD for Targets
  const addTarget = useCallback((target: Omit<TargetItem, 'id' | 'lastUpdated'>) => {
    const newTarget: TargetItem = {
      ...target,
      id: 'TGT-' + Date.now().toString().slice(-5),
      lastUpdated: new Date().toISOString(),
    };
    setTargets((prev) => {
      const updated = [newTarget, ...prev];
      safeSetItem(STORAGE_KEYS.TARGETS, updated);
      return updated;
    });

    fetch('/api/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTarget, sender: clientId }),
    }).catch((err) => console.warn('Failed to post target to server:', err));

    logActivity('Created Sales Target', 'नवीन विक्री उद्दिष्ट निश्चित केले', 'target-sheet', `${newTarget.executiveName} - ₹${newTarget.targetAmount.toLocaleString()}`);
    showNotification(language === 'mr' ? 'नवीन टार्गेट यशस्वीरित्या जोडले गेले!' : 'Target added successfully!');
  }, [clientId, language, logActivity, showNotification]);

  const updateTarget = useCallback((id: string, patch: Partial<TargetItem>) => {
    setTargets((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, ...patch, lastUpdated: new Date().toISOString() } : item));
      safeSetItem(STORAGE_KEYS.TARGETS, updated);
      return updated;
    });

    fetch(`/api/targets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...patch, sender: clientId }),
    }).catch((err) => console.warn('Failed to update target on server:', err));

    logActivity('Target Updated', 'टार्गेट प्रगती अद्ययावत केली', 'target-sheet', `टार्गेट ${id} अपडेट केले.`);
    showNotification(language === 'mr' ? 'टार्गेट सीट अद्ययावत केली.' : 'Target sheet updated.');
  }, [clientId, language, logActivity, showNotification]);

  const deleteTarget = useCallback((id: string) => {
    setTargets((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      safeSetItem(STORAGE_KEYS.TARGETS, updated);
      return updated;
    });

    fetch(`/api/targets/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: clientId }),
    }).catch((err) => console.warn('Failed to delete target on server:', err));

    logActivity('Deleted Target', 'टार्गेट हटवले', 'target-sheet', `टार्गेट ${id} हटवले.`);
    showNotification(language === 'mr' ? 'टार्गेट हटवले.' : 'Target deleted.');
  }, [clientId, language, logActivity, showNotification]);

  // Sync collections to Target Sheets actualCollectionLakh automatically
  const syncCollectionsToTargetSheets = useCallback((collectionsList: DealerCollectionRecord[]) => {
    const monthTotalsLakh: Record<string, number> = {};
    let lastYearCollectionTotalLakh = 0;
    DEFAULT_MONTH_NAMES.forEach((m) => {
      monthTotalsLakh[m.month] = 0;
    });

    collectionsList.forEach((c) => {
      if (c.targetMonth === 'Last Year Dues' || c.targetMonth === 'Last Year') {
        lastYearCollectionTotalLakh += (Number(c.amount) || 0) / 100000;
      } else {
        const mName = c.targetMonth || getMonthNameFromDate(c.collectionDate);
        if (mName && monthTotalsLakh[mName] !== undefined) {
          monthTotalsLakh[mName] = (monthTotalsLakh[mName] || 0) + (Number(c.amount) || 0) / 100000;
        }
      }
    });

    setTargets((prevTargets) => {
      const updated = prevTargets.map((tgt) => {
        const currentOpening = tgt.lastYearOpeningOutstanding ?? ((tgt.lastYearOutstanding ?? 5) + (tgt.lastYearCollection ?? 0));
        const newLastYearCol = lastYearCollectionTotalLakh > 0 ? Number(lastYearCollectionTotalLakh.toFixed(2)) : (tgt.lastYearCollection ?? 0);
        const newRemainingOutstanding = Number(Math.max(0, currentOpening - newLastYearCol).toFixed(2));

        if (!tgt.monthsData) {
          return {
            ...tgt,
            lastYearOpeningOutstanding: currentOpening,
            lastYearCollection: newLastYearCol,
            lastYearOutstanding: newRemainingOutstanding,
            lastUpdated: new Date().toISOString(),
          };
        }
        const updatedMonths = tgt.monthsData.map((m) => {
          const actualCol = Number((monthTotalsLakh[m.month] || 0).toFixed(2));
          const ach = Number(m.achievementLakh) || 0;
          const col = Number(m.collectionLakh) || 0;
          const actualColPct = ach > 0
            ? Number(((actualCol / ach) * 100).toFixed(2))
            : (col > 0 ? Number(((actualCol / col) * 100).toFixed(2)) : 0);
          return {
            ...m,
            actualCollectionLakh: actualCol,
            percentCollection: actualColPct,
          };
        });
        const totalActualCol = updatedMonths.reduce((s, m) => s + (m.actualCollectionLakh || 0), 0);
        return {
          ...tgt,
          lastYearOpeningOutstanding: currentOpening,
          lastYearCollection: newLastYearCol,
          lastYearOutstanding: newRemainingOutstanding,
          monthsData: updatedMonths,
          collectionAmount: Number((totalActualCol * 100000).toFixed(2)),
          lastUpdated: new Date().toISOString(),
        };
      });
      safeSetItem(STORAGE_KEYS.TARGETS, updated);
      broadcastSync('SYNC_TARGETS', { targets: updated });
      return updated;
    });
  }, [broadcastSync]);

  // CRUD for Dealer Orders & Bills
  const addDealerOrder = useCallback((order: Omit<DealerOrderBill, 'id' | 'createdAt'>) => {
    const newOrder: DealerOrderBill = {
      ...order,
      id: 'ORD-' + Date.now().toString().slice(-6),
      createdAt: new Date().toISOString(),
    };
    const updated = [newOrder, ...dealerOrdersRef.current];
    setDealerOrders(updated);
    safeSetItem(STORAGE_KEYS.DEALER_ORDERS, updated);

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'DEALER_ORDERS', data: { dealerOrders: updated }, sender: clientId }),
    }).catch((err) => console.warn('Failed to sync dealer order:', err));

    logActivity('New Dealer Order Bill', 'नवीन डीलर ऑर्डर बिल नोंदवले', 'order-collection', `${newOrder.dealerName} - बिल क्र: ${newOrder.billNumber} (₹${newOrder.totalAmount.toLocaleString()})`);
    showNotification(language === 'mr' ? `ऑर्डर बिल ${newOrder.billNumber} यशस्वीरीत्या सेव्ह झाले!` : `Order bill ${newOrder.billNumber} created!`);
    return newOrder;
  }, [clientId, language, logActivity, showNotification]);

  const updateDealerOrder = useCallback((id: string, patch: Partial<DealerOrderBill>) => {
    const updated = dealerOrdersRef.current.map((o) => (o.id === id ? { ...o, ...patch } : o));
    setDealerOrders(updated);
    safeSetItem(STORAGE_KEYS.DEALER_ORDERS, updated);

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'DEALER_ORDERS', data: { dealerOrders: updated }, sender: clientId }),
    }).catch((err) => console.warn('Failed to update dealer order:', err));

    logActivity('Updated Dealer Order', 'डीलर ऑर्डर बिल अद्ययावत केले', 'order-collection', `बिल ${id}`);
    showNotification(language === 'mr' ? 'ऑर्डर बिल अद्ययावत झाले.' : 'Order bill updated.');
  }, [clientId, language, logActivity, showNotification]);

  const deleteDealerOrder = useCallback((id: string) => {
    const targetOrder = dealerOrdersRef.current.find((o) => o.id === id);
    const updated = dealerOrdersRef.current.filter((o) => o.id !== id);
    setDealerOrders(updated);
    safeSetItem(STORAGE_KEYS.DEALER_ORDERS, updated);

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'DEALER_ORDERS', data: { dealerOrders: updated }, sender: clientId }),
    }).catch((err) => console.warn('Failed to delete dealer order:', err));

    logActivity('Deleted Order Bill', 'ऑर्डर बिल डिलीट केले', 'order-collection', `बिल: ${targetOrder?.billNumber || id}`);
    showNotification(language === 'mr' ? 'ऑर्डर बिल हटवले.' : 'Order bill deleted.');
  }, [clientId, language, logActivity, showNotification]);

  // CRUD for Dealer Collections
  const addDealerCollection = useCallback((col: Omit<DealerCollectionRecord, 'id' | 'createdAt' | 'amountLakh' | 'targetMonth'> & { targetMonth?: string }) => {
    const amt = Number(col.amount) || 0;
    const amtLakh = Number((amt / 100000).toFixed(2));
    const targetMonth = col.targetMonth || getMonthNameFromDate(col.collectionDate);

    const newCol: DealerCollectionRecord = {
      ...col,
      id: 'COL-' + Date.now().toString().slice(-6),
      amountLakh: amtLakh,
      targetMonth,
      createdAt: new Date().toISOString(),
    };

    const updated = [newCol, ...dealerCollectionsRef.current];
    setDealerCollections(updated);
    safeSetItem(STORAGE_KEYS.DEALER_COLLECTIONS, updated);

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'DEALER_COLLECTIONS', data: { dealerCollections: updated }, sender: clientId }),
    }).catch((err) => console.warn('Failed to sync collection:', err));

    // Automatically sync to target sheet
    syncCollectionsToTargetSheets(updated);

    logActivity('Collection Received', 'कलेक्शन जमा नोंदवले', 'order-collection', `${newCol.dealerName}: ₹${amt.toLocaleString()} (${newCol.paymentMode.toUpperCase()}) - ${targetMonth} महिना`);
    showNotification(language === 'mr' ? `₹${amt.toLocaleString()} चे कलेक्शन जमा झाले व ${targetMonth} च्या टार्गेट सीटमध्ये ऍक्च्युअल कलेक्शन अपडेट झाले!` : `Collection of ₹${amt.toLocaleString()} recorded & Target Sheet updated!`);
    return newCol;
  }, [clientId, language, logActivity, showNotification, syncCollectionsToTargetSheets]);

  const updateDealerCollection = useCallback((id: string, patch: Partial<DealerCollectionRecord>) => {
    const updated = dealerCollectionsRef.current.map((c) => {
      if (c.id !== id) return c;
      const colDate = patch.collectionDate || c.collectionDate;
      const amt = patch.amount !== undefined ? Number(patch.amount) : c.amount;
      return {
        ...c,
        ...patch,
        amount: amt,
        amountLakh: Number((amt / 100000).toFixed(2)),
        targetMonth: getMonthNameFromDate(colDate),
      };
    });

    setDealerCollections(updated);
    safeSetItem(STORAGE_KEYS.DEALER_COLLECTIONS, updated);

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'DEALER_COLLECTIONS', data: { dealerCollections: updated }, sender: clientId }),
    }).catch((err) => console.warn('Failed to update collection:', err));

    syncCollectionsToTargetSheets(updated);
    showNotification(language === 'mr' ? 'कलेक्शन नोंद अद्ययावत झाली.' : 'Collection record updated.');
  }, [clientId, language, showNotification, syncCollectionsToTargetSheets]);

  const deleteDealerCollection = useCallback((id: string) => {
    const updated = dealerCollectionsRef.current.filter((c) => c.id !== id);
    setDealerCollections(updated);
    safeSetItem(STORAGE_KEYS.DEALER_COLLECTIONS, updated);

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'DEALER_COLLECTIONS', data: { dealerCollections: updated }, sender: clientId }),
    }).catch((err) => console.warn('Failed to delete collection:', err));

    syncCollectionsToTargetSheets(updated);
    showNotification(language === 'mr' ? 'कलेक्शन नोंद हटवली.' : 'Collection record deleted.');
  }, [clientId, language, showNotification, syncCollectionsToTargetSheets]);

  // Dealer Balance & Current Outstanding Calculation
  const getDealerBalance = useCallback((dealerId: string) => {
    const orders = dealerOrdersRef.current.filter((o) => o.dealerId === dealerId && o.status !== 'cancelled');
    const collections = dealerCollectionsRef.current.filter((c) => c.dealerId === dealerId);

    const totalOrders = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const totalCollections = collections.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const currentOutstanding = totalOrders - totalCollections;

    return { totalOrders, totalCollections, currentOutstanding };
  }, []);

  // CRUD for Dealer Applications
  const addDealerApplication = useCallback((app: Omit<DealerApplication, 'id' | 'applicationDate' | 'status'> & { dealerCode?: string; codeSequence?: number }): DealerApplication => {
    const currentDealers = dealerApplicationsRef.current;
    const { code, seq } = getNextAvailableDealerCode(currentDealers);

    const newApp: DealerApplication = {
      ...app,
      id: 'DLR-APP-' + Date.now().toString().slice(-6),
      dealerCode: app.dealerCode || code,
      codeSequence: app.codeSequence || seq,
      applicationDate: new Date().toISOString().split('T')[0],
      status: 'pending',
    };

    const updated = [newApp, ...currentDealers.filter((d) => d.id !== newApp.id)];
    setDealerApplications(updated);
    safeSetItem(STORAGE_KEYS.DEALERS, updated);

    // Save to central cloud database
    fetch('/api/dealers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newApp, sender: clientId }),
    }).catch((err) => console.warn('Failed to save dealer to cloud database:', err));

    logActivity(
      'New Dealer Application',
      'नवीन डीलर अर्ज नोंदवला',
      'dealer-form',
      `${newApp.firmName} (कोड: ${newApp.dealerCode})`
    );
    showNotification(
      language === 'mr'
        ? `डीलर अर्ज सेव्ह झाला! कोड: ${newApp.dealerCode}`
        : `Dealer application saved! Auto code: ${newApp.dealerCode}`
    );

    return newApp;
  }, [clientId, language, logActivity, showNotification]);

  const updateDealerApplication = useCallback((id: string, patch: Partial<DealerApplication>) => {
    const currentDealers = dealerApplicationsRef.current;
    const updated = currentDealers.map((app) => (app.id === id ? { ...app, ...patch } : app));
    setDealerApplications(updated);
    safeSetItem(STORAGE_KEYS.DEALERS, updated);

    fetch(`/api/dealers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...patch, sender: clientId }),
    }).catch((err) => console.warn('Failed to update dealer on cloud database:', err));

    logActivity('Updated Dealer Application', 'डीलर अर्ज माहिती अद्ययावत केली', 'dealer-form', `अर्ज ${id}`);
    showNotification(language === 'mr' ? 'डीलर माहिती सेव्ह झाली.' : 'Dealer application updated.');
  }, [clientId, language, logActivity, showNotification]);

  const updateDealerStatus = useCallback((id: string, status: DealerApplication['status'], remarks?: string) => {
    const currentDealers = dealerApplicationsRef.current;
    const updated = currentDealers.map((app) => {
      if (app.id !== id) return app;
      return {
        ...app,
        status,
        reviewRemarks: remarks || app.reviewRemarks,
        approvedDate: status === 'approved' ? new Date().toISOString().split('T')[0] : app.approvedDate,
        cancelledDate: status === 'cancelled' ? new Date().toISOString().split('T')[0] : app.cancelledDate,
        certificateNo: status === 'approved' && !app.certificateNo ? `BW-DLR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` : app.certificateNo,
      };
    });

    setDealerApplications(updated);
    safeSetItem(STORAGE_KEYS.DEALERS, updated);

    fetch(`/api/dealers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        reviewRemarks: remarks,
        approvedDate: status === 'approved' ? new Date().toISOString().split('T')[0] : undefined,
        cancelledDate: status === 'cancelled' ? new Date().toISOString().split('T')[0] : undefined,
        sender: clientId,
      }),
    }).catch((err) => console.warn('Failed to update dealer status on cloud database:', err));

    const statusText = status === 'approved' ? 'मंजूर केला' : status === 'rejected' ? 'नाकारला' : status === 'cancelled' ? 'रद्द केला (कोड रीलिज)' : 'तपासणीत ठेवला';
    logActivity('Dealer Application Status Changed', `डीलर अर्ज स्थिती ${statusText}`, 'dealer-form', `अर्ज क्रमांक ${id}`);
    showNotification(language === 'mr' ? `डीलर अर्ज स्थिती: ${statusText}` : `Dealer status updated to: ${status}`);
  }, [clientId, language, logActivity, showNotification]);

  const cancelDealerApplication = useCallback((id: string, reason?: string) => {
    const currentDealers = dealerApplicationsRef.current;
    const targetApp = currentDealers.find((d) => d.id === id);
    const codeReleased = targetApp?.dealerCode || 'N/A';

    const patch = {
      status: 'cancelled' as const,
      cancelledDate: new Date().toISOString().split('T')[0],
      reviewRemarks: reason ? `${targetApp?.reviewRemarks ? targetApp.reviewRemarks + ' | ' : ''}Cancelled: ${reason}` : (targetApp?.reviewRemarks || 'Dealership cancelled; code released to pool.'),
    };

    const updated = currentDealers.map((app) => (app.id === id ? { ...app, ...patch } : app));
    setDealerApplications(updated);
    safeSetItem(STORAGE_KEYS.DEALERS, updated);

    fetch(`/api/dealers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...patch, sender: clientId }),
    }).catch((err) => console.warn('Failed to cancel dealer on cloud database:', err));

    logActivity(
      'Dealer Application Cancelled',
      'डीलर अर्ज रद्द केला',
      'dealer-form',
      `डीलर ${targetApp?.firmName || id} (कोड: ${codeReleased}) रद्द केला. कोड रीलिज झाला.`
    );
    showNotification(
      language === 'mr'
        ? `डीलर अर्ज रद्द केला. कोड ${codeReleased} नवीन अर्जासाठी पुन्हा उपलब्ध झाला आहे.`
        : `Dealership cancelled. Code ${codeReleased} returned to pool.`
    );
  }, [clientId, language, logActivity, showNotification]);

  const deleteDealerApplication = useCallback((id: string) => {
    const currentDealers = dealerApplicationsRef.current;
    const targetApp = currentDealers.find((d) => d.id === id);
    const codeReleased = targetApp?.dealerCode || 'N/A';
    const updated = currentDealers.filter((app) => app.id !== id);

    setDealerApplications(updated);
    safeSetItem(STORAGE_KEYS.DEALERS, updated);

    fetch(`/api/dealers/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: clientId }),
    }).catch((err) => console.warn('Failed to delete dealer on cloud database:', err));

    logActivity(
      'Deleted Dealer Application',
      'डीलर अर्ज पूर्णपणे डिलीट केला',
      'dealer-form',
      `डीलर ${targetApp?.firmName || id} (कोड: ${codeReleased})`
    );
    showNotification(
      language === 'mr'
        ? `डीलर अर्ज डिलीट केला (कोड ${codeReleased} मोकळा झाला).`
        : `Dealer application deleted (Code ${codeReleased} freed).`
    );
  }, [clientId, language, logActivity, showNotification]);

  // CRUD for Daily Activities (Site visits, Farmer meetings, Dealer interactions)
  const addDailyActivity = useCallback((activityData: Omit<DailyActivity, 'id' | 'createdAt'> | DailyActivity): DailyActivity => {
    const newActivity: DailyActivity = {
      ...activityData,
      id: (activityData as any).id || `ACT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      createdAt: (activityData as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newActivity, ...dailyActivitiesRef.current.filter((a) => a.id !== newActivity.id)];
    setDailyActivities(updated);
    safeSetItem(STORAGE_KEYS.DAILY_ACTIVITIES, updated);

    // Save to central cloud database
    fetch('/api/daily-activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newActivity, sender: clientId }),
    }).catch((err) => console.warn('Failed to save daily activity on cloud server:', err));

    logActivity(
      'Daily Activity Logged',
      'दैनिक कामकाज नोंदवले',
      'Daily Activity',
      `${newActivity.employeeName}: ${newActivity.activityType} - ${newActivity.village} (${newActivity.farmerOrPersonName || newActivity.dealerName || 'भेट'})`
    );

    showNotification(
      language === 'mr' ? 'दैनिक कामकाज यशस्वीरीत्या नोंदवले!' : 'Daily activity logged successfully!'
    );

    return newActivity;
  }, [clientId, language, logActivity, showNotification]);

  const updateDailyActivity = useCallback((id: string, patch: Partial<DailyActivity>) => {
    const updated = dailyActivitiesRef.current.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a));
    setDailyActivities(updated);
    safeSetItem(STORAGE_KEYS.DAILY_ACTIVITIES, updated);

    fetch(`/api/daily-activities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...patch, sender: clientId }),
    }).catch((err) => console.warn('Failed to update daily activity on cloud server:', err));

    showNotification(
      language === 'mr' ? 'कामकाज माहिती अद्ययावत झाली.' : 'Daily activity updated.'
    );
  }, [clientId, language, showNotification]);

  const deleteDailyActivity = useCallback((id: string) => {
    const target = dailyActivitiesRef.current.find((a) => a.id === id);
    const updated = dailyActivitiesRef.current.filter((a) => a.id !== id);
    setDailyActivities(updated);
    safeSetItem(STORAGE_KEYS.DAILY_ACTIVITIES, updated);

    fetch(`/api/daily-activities/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: clientId }),
    }).catch((err) => console.warn('Failed to delete daily activity on cloud server:', err));

    logActivity(
      'Daily Activity Deleted',
      'दैनिक कामकाज नोंद हटवली',
      'Daily Activity',
      `${target?.employeeName || 'Officer'}: ${target?.village || id}`
    );

    showNotification(
      language === 'mr' ? 'कामकाज नोंद हटवली.' : 'Daily activity record deleted.',
      'info'
    );
  }, [clientId, language, logActivity, showNotification]);

  // CRUD for Travel Expenses
  const addTravelExpense = useCallback((expense: Omit<TravelExpense, 'id' | 'submittedAt'>) => {
    const newExpense: TravelExpense = {
      ...expense,
      id: 'EXP-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900),
      submittedAt: new Date().toISOString(),
    };
    setTravelExpenses((prev) => {
      const updated = [newExpense, ...prev];
      safeSetItem(STORAGE_KEYS.EXPENSES, updated);
      return updated;
    });

    fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newExpense, sender: clientId }),
    }).catch((err) => console.warn('Failed to save expense on cloud database:', err));

    logActivity('Travel Claim Submitted', 'प्रवास खर्च दावा सादर केला', 'travel-expenses', `${newExpense.employeeName}: ${newExpense.fromLocation} ते ${newExpense.toLocation} (₹${newExpense.totalClaimAmount})`);
    showNotification(language === 'mr' ? 'ट्रॅव्हलिंग एक्सपेन्स दावा सबमिट झाला!' : 'Travel claim submitted successfully!');
  }, [clientId, language, logActivity, showNotification]);

  const updateExpenseStatus = useCallback((id: string, status: TravelExpense['status']) => {
    const approverName = currentUser ? currentUser.name : 'Admin';
    setTravelExpenses((prev) => {
      const updated = prev.map((exp) => {
        if (exp.id !== id) return exp;
        return {
          ...exp,
          status,
          approvedBy: approverName,
          approvalDate: new Date().toISOString().split('T')[0],
        };
      });
      safeSetItem(STORAGE_KEYS.EXPENSES, updated);
      return updated;
    });

    fetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        approvedBy: approverName,
        approvalDate: new Date().toISOString().split('T')[0],
        sender: clientId,
      }),
    }).catch((err) => console.warn('Failed to update expense status on cloud database:', err));

    const statusText = status === 'approved' ? 'मंजूर केला' : status === 'paid' ? 'पैसे वर्ग केले' : 'नाकारला';
    logActivity('Expense Claim Status Updated', `प्रवास दावा ${statusText}`, 'travel-expenses', `दावा क्रमांक ${id}`);
    showNotification(language === 'mr' ? `दावा ${statusText}.` : `Claim marked as ${status}.`);
  }, [clientId, currentUser, language, logActivity, showNotification]);

  const deleteTravelExpense = useCallback((id: string) => {
    setTravelExpenses((prev) => {
      const updated = prev.filter((exp) => exp.id !== id);
      safeSetItem(STORAGE_KEYS.EXPENSES, updated);
      return updated;
    });

    fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: clientId }),
    }).catch((err) => console.warn('Failed to delete expense on cloud database:', err));

    showNotification(language === 'mr' ? 'खर्च दावा हटवला.' : 'Expense claim removed.');
  }, [clientId, language, showNotification]);

  // CRUD for Travel Sheets (Syncs across devices)
  const saveTravelSheet = useCallback((sheetKey: string, sheetPayload: any) => {
    setTravelSheets((prev) => {
      const updated = { ...prev, [sheetKey]: sheetPayload };
      safeSetItem(STORAGE_KEYS.TRAVEL_SHEETS, updated);
      return updated;
    });

    // Save individual key for fast lookup
    safeSetItem(`blackworm_travel_sheet_${sheetKey}`, sheetPayload);

    // Broadcast across all connected clients and save to cloud backend
    broadcastSync('TRAVEL_SHEET_SYNC', { travelSheets: { [sheetKey]: sheetPayload } });
  }, [broadcastSync]);

  // CRUD for Users
  const addUser = useCallback((user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: 'USR-' + Date.now().toString().slice(-4),
    };
    setUsers((prev) => {
      const updated = [newUser, ...prev];
      safeSetItem(STORAGE_KEYS.USERS, updated);
      return updated;
    });

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newUser, sender: clientId }),
    }).catch((err) => console.warn('Failed to create user on cloud database:', err));

    // Automatically generate sales target sheet for this new user
    const autoTarget = createTargetSheetForUser(newUser, newUser.id);
    addTarget(autoTarget);

    logActivity('New User Created', 'नवीन युजर तयार केला', 'user-management', `${newUser.fullName} (${newUser.role})`);
    showNotification(language === 'mr' ? 'नवीन युजर आणि त्यांची टार्गेट सीट यशस्वीरित्या तयार झाली!' : 'New user & target sheet created successfully!');
  }, [addTarget, clientId, language, logActivity, showNotification]);

  const updateUser = useCallback((id: string, patch: Partial<User>) => {
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === id ? { ...u, ...patch } : u));
      safeSetItem(STORAGE_KEYS.USERS, updated);
      return updated;
    });

    setCurrentUserState((current) => {
      if (current && (current.id === id || current.loginId === id)) {
        const updated = { ...current, ...patch };
        safeSetItem(STORAGE_KEYS.CURRENT_USER, updated);
        return updated;
      }
      return current;
    });

    fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...patch, sender: clientId }),
    }).catch((err) => console.warn('Failed to update user on cloud database:', err));

    logActivity('User Profile Updated', 'युजर प्रोफाइल अद्ययावत केली', 'user-management', `युजर ${id} अपडेट केला.`);
    showNotification(language === 'mr' ? 'युजर माहिती अद्ययावत झाली.' : 'User updated successfully.');
  }, [clientId, language, logActivity, showNotification]);

  const deleteUser = useCallback((id: string) => {
    const userToDelete = usersRef.current.find((u) => u.id === id || u.loginId === id);
    if (!userToDelete) return;

    // 1. System/Admin accounts cannot be deleted under any circumstances
    if (
      userToDelete.id === 'USR-001' ||
      userToDelete.loginId === 'admin' ||
      userToDelete.id === 'USR-PRAVIN' ||
      userToDelete.loginId === 'pravin' ||
      userToDelete.role === 'admin'
    ) {
      showNotification(
        language === 'mr'
          ? 'मुख्य एडमिन युजर कोणत्याही परिस्थितीत डिलीट करता येत नाही!'
          : 'Main admin user cannot be deleted under any circumstances!',
        'info'
      );
      return;
    }

    // 2. Strict Admin Authorization Check
    const activeUser = currentUserRef.current;
    const isUserAdmin = activeUser && (
      activeUser.role === 'admin' ||
      activeUser.loginId === 'admin' ||
      activeUser.loginId === 'pravin' ||
      activeUser.id === 'USR-001' ||
      activeUser.id === 'USR-PRAVIN' ||
      (activeUser.fullName && (activeUser.fullName.toLowerCase().includes('shreedhar') || activeUser.fullName.toLowerCase().includes('pravin')))
    );

    if (!isUserAdmin) {
      showNotification(
        language === 'mr'
          ? 'युजर डिलीट करण्याचे अधिकार फक्त मुख्य एडमिनलाच आहेत!'
          : 'Only Admin has authority to delete users!',
        'info'
      );
      return;
    }

    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== id);
      safeSetItem(STORAGE_KEYS.USERS, updated);
      return updated;
    });

    // Also remove any target sheet associated with this user
    setTargets((prev) => {
      const updated = prev.filter((t) => t.userId !== id && t.executiveId !== id);
      safeSetItem(STORAGE_KEYS.TARGETS, updated);
      return updated;
    });

    fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: clientId, requestedBy: activeUser.loginId }),
    }).catch((err) => console.warn('Failed to delete user on cloud database:', err));

    logActivity('User Deleted', 'एडमिनद्वारे युजर डिलीट केला', 'user-management', `युजर ${userToDelete.fullName || userToDelete.name || id} हटवला.`);
    showNotification(
      language === 'mr'
        ? `एडमिनद्वारे युजर व संबंधित टार्गेट सीट हटवली.`
        : `User and associated target sheet deleted by Admin.`
    );
  }, [clientId, language, logActivity, showNotification]);

  // Reset & Backup Utilities
  const resetAllData = useCallback(() => {
    fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: clientId }),
    }).then(() => fetchAuthoritativeData())
      .catch((err) => console.warn('Failed to reset data on cloud database:', err));

    showNotification(language === 'mr' ? 'सर्व डेटा मूळ स्थितीत रिसेट झाला!' : 'All data restored to factory defaults!');
  }, [clientId, fetchAuthoritativeData, language, showNotification]);

  const exportDataJSON = useCallback(() => {
    const backup = {
      companyDetails,
      priceList,
      targets,
      dealerApplications,
      travelExpenses,
      users,
      activities,
      dealerOrders,
      dealerCollections,
      dailyActivities,
      exportedAt: new Date().toISOString(),
      app: 'Blackworm Agritech Portal',
    };
    return JSON.stringify(backup, null, 2);
  }, [activities, companyDetails, dailyActivities, dealerApplications, dealerCollections, dealerOrders, priceList, targets, travelExpenses, users]);

  const importDataJSON = useCallback((jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.companyDetails) setCompanyDetails(parsed.companyDetails);
      if (parsed.priceList) setPriceList(parsed.priceList);
      if (parsed.targets) setTargets(parsed.targets);
      if (parsed.dealerApplications) setDealerApplications(parsed.dealerApplications);
      if (parsed.travelExpenses) setTravelExpenses(parsed.travelExpenses);
      if (parsed.users) setUsers(parsed.users);
      if (parsed.activities) setActivities(parsed.activities);
      if (parsed.dealerOrders) setDealerOrders(parsed.dealerOrders);
      if (parsed.dealerCollections) setDealerCollections(parsed.dealerCollections);
      if (parsed.dailyActivities && Array.isArray(parsed.dailyActivities)) {
        setDailyActivities(parsed.dailyActivities);
        safeSetItem(STORAGE_KEYS.DAILY_ACTIVITIES, parsed.dailyActivities);
      }

      broadcastSync('SYNC_ALL', parsed);
      showNotification(language === 'mr' ? 'बॅकअप डेटा यशस्वीपणे लोड झाला!' : 'Backup loaded successfully!');
      return true;
    } catch (err) {
      showNotification(language === 'mr' ? 'अवैध JSON फाइल!' : 'Invalid JSON file!', 'info');
      return false;
    }
  }, [broadcastSync, language, showNotification]);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        activeTab,
        setActiveTab,
        companyDetails,
        updateCompanyDetails,
        priceList,
        addPriceItem,
        updatePriceItem,
        deletePriceItem,
        importBulkPriceItems,
        targets,
        addTarget,
        updateTarget,
        deleteTarget,
        dealerApplications,
        addDealerApplication,
        updateDealerApplication,
        updateDealerStatus,
        cancelDealerApplication,
        deleteDealerApplication,
        dealerOrders,
        addDealerOrder,
        updateDealerOrder,
        deleteDealerOrder,
        dealerCollections,
        addDealerCollection,
        updateDealerCollection,
        deleteDealerCollection,
        getDealerBalance,
        dailyActivities,
        addDailyActivity,
        updateDailyActivity,
        deleteDailyActivity,
        travelExpenses,
        addTravelExpense,
        updateExpenseStatus,
        deleteTravelExpense,
        travelSheets,
        saveTravelSheet,
        users,
        addUser,
        updateUser,
        deleteUser,
        currentUser,
        setCurrentUser,
        activities,
        lastSyncTimestamp,
        isOnline,
        syncLatencyMs,
        notification,
        clearNotification,
        showNotification,
        resetAllData,
        exportDataJSON,
        importDataJSON,
        refreshData: fetchAuthoritativeData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
