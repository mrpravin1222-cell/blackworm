import { NavTab, User } from '../types';

export interface ModulePermissionOption {
  id: NavTab;
  labelMr: string;
  labelEn: string;
}

export const ALL_NAV_MODULES: ModulePermissionOption[] = [
  { id: 'target-sheet', labelMr: 'टार्गेट सीट', labelEn: 'Target Sheet' },
  { id: 'order-collection', labelMr: 'ऑर्डर कॅल्क्युलेट', labelEn: 'Order Calculator' },
  { id: 'dealer-form', labelMr: 'डीलर', labelEn: 'Dealer' },
  { id: 'travel-expenses', labelMr: 'ट्रॅव्हल्स', labelEn: 'Travel' },
  { id: 'scheme', labelMr: 'स्कीम', labelEn: 'Scheme' },
  { id: 'settings', labelMr: 'सेटिंग', labelEn: 'Setting' },
  { id: 'daily-activity', labelMr: 'लागवड', labelEn: 'Cultivation' },
  { id: 'dashboard', labelMr: 'डॅशबोर्ड', labelEn: 'Dashboard' },
  { id: 'price-list', labelMr: 'प्राइस लिस्ट', labelEn: 'Price List' },
  { id: 'reporting', labelMr: 'रिपोर्ट', labelEn: 'Report' },
  { id: 'user-management', labelMr: 'युजर', labelEn: 'User' },
];

// Exact 7 options visible to regular users after login:
// टारगेट सेट, ऑर्डर कॅल्क्युलेट, डीलर, ट्रॅव्हल्स, स्कीम, सेटिंग आणि लागवड
export const STANDARD_USER_ALLOWED_TABS: NavTab[] = [
  'target-sheet',
  'order-collection',
  'dealer-form',
  'travel-expenses',
  'scheme',
  'settings',
  'daily-activity',
];

export const isSuperAdmin = (user: User | null): boolean => {
  if (!user) return false;
  const safeEmail = (user.email || '').toLowerCase().trim();
  const safeRole = (user.role || '').toUpperCase();
  return (
    safeRole === 'SUPER_ADMIN' ||
    safeEmail === 'mr.pravin1222@gmail.com' ||
    user.id === 'USR-PRAVIN-SUPERADMIN'
  );
};

export const isShreedharUser = (user: User | null): boolean => {
  if (!user) return false;
  if (isSuperAdmin(user)) return false;
  
  const safeName = (user.fullName || user.name || '').toLowerCase();
  const safeLoginId = (user.loginId || '').toLowerCase().trim();
  const safeRole = (user.role || '').toUpperCase();
  
  return (
    safeRole === 'ADMIN' ||
    safeName.includes('shridhar') ||
    safeName.includes('shreedhar') ||
    safeLoginId === 'admin' ||
    user.id === 'USR-001'
  );
};

export const isAdmin = (user: User | null): boolean => {
  return isSuperAdmin(user) || isShreedharUser(user) || user?.role?.toUpperCase() === 'ADMIN';
};

export const isPravinUser = isSuperAdmin;

export const isTabAllowedForUser = (tabId: NavTab, user: User | null): boolean => {
  if (!user || user.id === 'GUEST') {
    return tabId === 'user-management';
  }

  // Super Admin has full access to everything
  if (isSuperAdmin(user)) {
    return true;
  }

  // Admin (Shreedhar) has full access to modules but follows workflow
  if (isShreedharUser(user)) {
    return true;
  }

  // Regular users are strictly restricted by assigned allowedTabs or standard allowed tabs
  if (user.allowedTabs && Array.isArray(user.allowedTabs) && user.allowedTabs.length > 0) {
    return user.allowedTabs.includes(tabId);
  }

  return STANDARD_USER_ALLOWED_TABS.includes(tabId);
};

export const getUserRank = (u: User): number => {
  const d = (u.designation || '').toLowerCase();
  const r = (u.role || '').toLowerCase();
  if (d.includes('owner')) return 1;
  if (r === 'admin') return 2;
  if (d.includes('director')) return 3;
  if (d.includes('manager')) return 4;
  if (d.includes('asm') || r === 'asm') return 5;
  if (d.includes('sales officer') || r === 'sales-officer') return 6;
  if (d.includes('field officer') || r === 'field-officer') return 7;
  return 10;
};

export const sortUsersByRank = (users: User[]): User[] => {
  return [...users].sort((a, b) => {
    const rA = getUserRank(a);
    const rB = getUserRank(b);
    if (rA !== rB) return rA - rB;
    return (a.fullName || a.name || '').localeCompare(b.fullName || b.name || '');
  });
};
