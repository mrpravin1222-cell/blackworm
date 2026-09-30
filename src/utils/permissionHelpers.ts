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

// Allowed tabs for all users EXCEPT Pravin Waghmare & Shreedhar Shinde
export const STANDARD_USER_ALLOWED_TABS: NavTab[] = [
  'dashboard',
  'target-sheet',
  'dealer-form',
  'travel-expenses',
  'settings',
];

export const isPravinOrShreedharUser = (user: User | null): boolean => {
  if (!user) return false;
  const safeLoginId = (user.loginId || '').toLowerCase().trim();
  const safeName = (user.fullName || user.name || '').toLowerCase().trim();
  const safeId = (user.id || '').toUpperCase().trim();

  return (
    safeLoginId === 'pravin' ||
    safeLoginId === 'admin' ||
    safeLoginId === 'shridhar' ||
    safeLoginId === 'shreedhar' ||
    safeId === 'USR-PRAVIN' ||
    safeId === 'USR-001' ||
    safeName.includes('pravin') ||
    safeName.includes('waghmare') ||
    safeName.includes('shreedhar') ||
    safeName.includes('shridhar') ||
    safeName.includes('shinde')
  );
};

export const isTabAllowedForUser = (tabId: NavTab, user: User | null): boolean => {
  if (!user || user.id === 'GUEST') {
    return tabId === 'dashboard' || tabId === 'user-management';
  }

  // Pravin Waghmare & Shreedhar Shinde ALWAYS have 100% full access to all tabs & features
  if (isPravinOrShreedharUser(user)) {
    return true;
  }

  // All other users get strictly: Dashboard, Target Sheet, Dealer, Travel, Settings
  return STANDARD_USER_ALLOWED_TABS.includes(tabId);
};
