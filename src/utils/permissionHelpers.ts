import { NavTab, User } from '../types';

export interface ModulePermissionOption {
  id: NavTab;
  labelMr: string;
  labelEn: string;
}

export const ALL_NAV_MODULES: ModulePermissionOption[] = [
  { id: 'dashboard', labelMr: 'डॅशबोर्ड', labelEn: 'Dashboard' },
  { id: 'daily-activity', labelMr: 'दैनिक कामकाज', labelEn: 'Daily Activity' },
  { id: 'target-sheet', labelMr: 'टार्गेट सीट', labelEn: 'Target Sheet' },
  { id: 'order-collection', labelMr: 'ऑर्डर आणि कलेक्शन', labelEn: 'Order & Collection' },
  { id: 'price-list', labelMr: 'प्राइस लिस्ट', labelEn: 'Price List' },
  { id: 'dealer-form', labelMr: 'डीलर', labelEn: 'Dealer' },
  { id: 'travel-expenses', labelMr: 'ट्रॅव्हल', labelEn: 'Travel' },
  { id: 'scheme', labelMr: 'स्कीम', labelEn: 'Scheme' },
  { id: 'reporting', labelMr: 'रिपोर्ट', labelEn: 'Report' },
  { id: 'user-management', labelMr: 'युजर', labelEn: 'User' },
  { id: 'settings', labelMr: 'सेटिंग', labelEn: 'Setting' },
];

// Fallback allowed tabs if allowedTabs is not set on older user records
export const STANDARD_USER_ALLOWED_TABS: NavTab[] = [
  'dashboard',
  'target-sheet',
  'dealer-form',
  'travel-expenses',
  'settings',
];

export const isPravinUser = (user: User | null): boolean => {
  if (!user) return false;
  const safeLoginId = (user.loginId || '').toLowerCase().trim();

  // ONLY master admin login OR user with role === 'admin' is super admin!
  return user.role === 'admin' || safeLoginId === 'pravin waghmare' || safeLoginId === 'admin';
};

// Backwards compatibility alias
export const isPravinOrShreedharUser = isPravinUser;

export const isTabAllowedForUser = (tabId: NavTab, user: User | null): boolean => {
  if (!user || user.id === 'GUEST') {
    return tabId === 'dashboard' || tabId === 'user-management';
  }

  // Pravin Waghmare ALWAYS has 100% full access to all tabs & features
  if (isPravinUser(user)) {
    return true;
  }

  // Always allow Dashboard so the user can access their main dashboard view
  if (tabId === 'dashboard') {
    return true;
  }

  // Strictly respect the allowedTabs assigned by Pravin Waghmare in User Management
  if (user.allowedTabs && Array.isArray(user.allowedTabs)) {
    return user.allowedTabs.includes(tabId);
  }

  // Fallback default permissions if allowedTabs is undefined
  return STANDARD_USER_ALLOWED_TABS.includes(tabId);
};
