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
  { id: 'dealer-form', labelMr: 'डीलर ॲप्लिकेशन', labelEn: 'Dealer Portal' },
  { id: 'travel-expenses', labelMr: 'ट्रॅव्हलिंग एक्सपेन्सेस', labelEn: 'Travel Expenses' },
  { id: 'scheme', labelMr: 'स्कीम', labelEn: 'Scheme' },
  { id: 'reporting', labelMr: 'रिपोर्टिंग', labelEn: 'Reports & Analytics' },
  { id: 'user-management', labelMr: 'युजर मॅनेजमेंट', labelEn: 'User Management' },
  { id: 'settings', labelMr: 'सेटिंग', labelEn: 'Settings' },
];

export const isTabAllowedForUser = (tabId: NavTab, user: User | null): boolean => {
  if (!user || user.id === 'GUEST') {
    return tabId === 'dashboard' || tabId === 'user-management' || tabId === 'price-list';
  }

  // Master System Admin: Pravin Kumar Waghmare & Shridhar Balkrishna Shinde ALWAYS have 100% full access to all tabs & features,
  // even if permissions are modified or restricted in UI/DB.
  const isMasterSystemAdmin = 
    user.id === 'USR-PRAVIN' ||
    user.id === 'USR-001' ||
    user.loginId?.toLowerCase() === 'pravin' ||
    user.loginId?.toLowerCase() === 'admin' ||
    (user.fullName && (
      user.fullName.toLowerCase().includes('pravin') || 
      user.fullName.toLowerCase().includes('shreedhar') || 
      user.fullName.toLowerCase().includes('shridhar') || 
      user.fullName.toLowerCase().includes('shinde')
    )) ||
    (user.name && (
      user.name.toLowerCase().includes('pravin') || 
      user.name.toLowerCase().includes('shreedhar') || 
      user.name.toLowerCase().includes('shridhar') || 
      user.name.toLowerCase().includes('shinde')
    ));

  if (isMasterSystemAdmin) {
    return true;
  }

  // For other users (including Shreedhar Balkrushna Shinde / Admin):
  // Check if explicit allowedTabs list is defined
  if (user.allowedTabs && Array.isArray(user.allowedTabs)) {
    if (user.allowedTabs.length === 0) {
      return tabId === 'dashboard' || tabId === 'user-management';
    }
    return user.allowedTabs.includes(tabId);
  }

  // Admin users have full unrestricted access unless explicit allowedTabs is configured
  if (user.role === 'admin' || user.loginId === 'admin' || user.id === 'USR-001') {
    return true;
  }

  // Default fallback
  return true;
};
