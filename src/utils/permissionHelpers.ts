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

export const isShreedharUser = (user: User | null): boolean => {
  if (!user) return false;
  const safeName = (user.fullName || user.name || '').toLowerCase();
  const safeLoginId = (user.loginId || '').toLowerCase().trim();
  const safeEmail = (user.email || '').toLowerCase().trim();
  return (
    user.role === 'admin' &&
    (user.id === 'USR-001' ||
     safeName.includes('shreedhar') ||
     safeName.includes('shridhar') ||
     safeLoginId.includes('admin') ||
     safeLoginId.includes('shreedhar') ||
     safeEmail.includes('blackwormagritech'))
  );
};

export const isPravinUser = (user: User | null): boolean => {
  // Pravin is now treated as a regular user managed by Owner/Admin, not an auto-admin
  return false;
};

// Backwards compatibility alias
export const isPravinOrShreedharUser = isShreedharUser;

export const isTabAllowedForUser = (tabId: NavTab, user: User | null): boolean => {
  if (!user || user.id === 'GUEST') {
    return tabId === 'user-management';
  }

  // Only Owner / Admin (Shridhar Balkrishna Shinde) has full admin access to all tabs
  if (isShreedharUser(user)) {
    return true;
  }

  // Regular users (including Pravin) are strictly restricted by assigned allowedTabs or standard allowed tabs
  if (user.allowedTabs && Array.isArray(user.allowedTabs) && user.allowedTabs.length > 0) {
    return user.allowedTabs.includes(tabId);
  }

  return STANDARD_USER_ALLOWED_TABS.includes(tabId);
};
