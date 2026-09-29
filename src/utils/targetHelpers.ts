import { TargetItem, MonthTargetRow, User } from '../types';

export const DEFAULT_MONTH_NAMES = [
  { srNo: 1, month: 'April', monthMr: 'एप्रिल', quarter: 'Q1' as const, defaultTarget: 9 },
  { srNo: 2, month: 'May', monthMr: 'मे', quarter: 'Q1' as const, defaultTarget: 8 },
  { srNo: 3, month: 'June', monthMr: 'जून', quarter: 'Q1' as const, defaultTarget: 5 },
  { srNo: 4, month: 'July', monthMr: 'जुलै', quarter: 'Q2' as const, defaultTarget: 8 },
  { srNo: 5, month: 'August', monthMr: 'ऑगस्ट', quarter: 'Q2' as const, defaultTarget: 8 },
  { srNo: 6, month: 'September', monthMr: 'सप्टेंबर', quarter: 'Q2' as const, defaultTarget: 8 },
  { srNo: 7, month: 'October', monthMr: 'ऑक्टोबर', quarter: 'Q3' as const, defaultTarget: 8 },
  { srNo: 8, month: 'November', monthMr: 'नोव्हेंबर', quarter: 'Q3' as const, defaultTarget: 8 },
  { srNo: 9, month: 'December', monthMr: 'डिसेंबर', quarter: 'Q3' as const, defaultTarget: 8 },
  { srNo: 10, month: 'January', monthMr: 'जानेवारी', quarter: 'Q4' as const, defaultTarget: 3 },
  { srNo: 11, month: 'February', monthMr: 'फेब्रुवारी', quarter: 'Q4' as const, defaultTarget: 2 },
  { srNo: 12, month: 'March', monthMr: 'मार्च', quarter: 'Q4' as const, defaultTarget: 0 },
];

export const getMonthNameFromDate = (dateStr: string): string => {
  if (!dateStr) return 'April';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'April';
  const monthNum = date.getMonth(); // 0 = Jan, 1 = Feb, ..., 3 = Apr, 4 = May, 11 = Dec
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[monthNum] || 'April';
};

export const calculateCollectionFromOutstanding = (
  achievementLakh: number,
  currentYearOutstandingPercent: number = 0
): number => {
  const ach = Number(achievementLakh) || 0;
  const outPct = Number(currentYearOutstandingPercent) || 0;
  // If outstanding is 10%, collection required is 90% (100 - 10)%
  const colPct = Math.max(0, 100 - outPct);
  return Number(((ach * colPct) / 100).toFixed(2));
};

export const generateDefaultMonthlyBreakdown = (targetLakh: number = 75): MonthTargetRow[] => {
  return DEFAULT_MONTH_NAMES.map((m) => {
    // Proportional target calculation based on template
    const proportionalTarget = Number(((m.defaultTarget / 75) * targetLakh).toFixed(2));
    return {
      srNo: m.srNo,
      month: m.month,
      monthMr: m.monthMr,
      quarter: m.quarter,
      targetLakh: targetLakh === 75 ? m.defaultTarget : proportionalTarget,
      achievementLakh: 0,
      percentAchievement: 0,
      collectionLakh: 0,
      actualCollectionLakh: 0,
      notes: '',
    };
  });
};

export const createTargetSheetForUser = (
  user: User | Omit<User, 'id'>,
  userId?: string,
  targetLakh: number = 75
): Omit<TargetItem, 'id' | 'lastUpdated'> => {
  const monthsData = generateDefaultMonthlyBreakdown(targetLakh);
  const totalTargetLakh = monthsData.reduce((s, m) => s + m.targetLakh, 0);

  return {
    executiveId: userId || ('id' in user ? (user as User).id : 'USR-' + Date.now()),
    executiveName: user.fullName || user.name || 'Sales Officer',
    executiveRole: user.designation || 'Sr.Sales Officer',
    territory: user.territory || 'Tasgaon, Palus, Kadegaon, Khanapur (Vita )',
    centre: user.territory || 'Tasgaon, Palus, Kadegaon, Khanapur (Vita )',
    financialYear: '2026-2027',
    lastYearSale: 0,
    lastYearSalesText: '0',
    salesTargetLakh: totalTargetLakh,
    lastYearAchievement: 0,
    lastYearOpeningOutstanding: 5,
    lastYearOutstanding: 5,
    lastYearCollection: 0,
    currentYearOutstandingPercent: 10,
    year: '2026 - 27',
    monthsData,
    month: 'सर्व महिने (Annual 2026-27)',
    productCategory: 'सर्व सेंद्रिय उत्पादने (All Products)',
    targetUnits: Math.round(totalTargetLakh * 100),
    unitType: 'Units',
    targetAmount: totalTargetLakh * 100000,
    achievedUnits: 0,
    achievedAmount: 0,
    collectionAmount: 0,
    notes: 'युजर तयार झाल्यानंतर सिस्टीमने तयार केलेली अधिकृत सेल्स टार्गेट सीट (Sales Target Sheet 2026-27)',
  };
};

// Initial target sheet matching the exact screenshot provided by the user
export const samplePravinTargetSheet: TargetItem = {
  id: 'TGT-SHREEDHAR-2026',
  executiveId: 'USR-001',
  executiveName: 'Shreedhar Balkrushna Shinde',
  executiveRole: 'Owner',
  territory: 'Tasgaon, Palus, Kadegaon, Khanapur (Vita )',
  centre: 'Tasgaon, Palus, Kadegaon, Khanapur (Vita )',
  financialYear: '2026-2027',
  lastYearSale: 0,
  lastYearSalesText: '0',
  salesTargetLakh: 75,
  lastYearAchievement: 0,
  lastYearOpeningOutstanding: 5,
  lastYearOutstanding: 4,
  lastYearCollection: 1,
  currentYearOutstandingPercent: 40,
  year: '2026 - 27',
  month: 'वार्षिक (2026-2027)',
  productCategory: 'सर्व उत्पादने (Total Sales)',
  targetUnits: 7500,
  unitType: 'Units',
  targetAmount: 7500000,
  achievedUnits: 1880,
  achievedAmount: 1880000,
  collectionAmount: 1128000,
  lastUpdated: new Date().toISOString(),
  notes: 'Blackworm Sales Target Sheet 2026-2027',
  monthsData: [
    { srNo: 1, month: 'April', monthMr: 'एप्रिल', quarter: 'Q1', targetLakh: 9, achievementLakh: 10.56, percentAchievement: 117.33, collectionLakh: 6.34, actualCollectionLakh: 6.34 },
    { srNo: 2, month: 'May', monthMr: 'मे', quarter: 'Q1', targetLakh: 8, achievementLakh: 4.31, percentAchievement: 53.88, collectionLakh: 2.59, actualCollectionLakh: 2.59 },
    { srNo: 3, month: 'June', monthMr: 'जून', quarter: 'Q1', targetLakh: 5, achievementLakh: 3.26, percentAchievement: 65.20, collectionLakh: 1.96, actualCollectionLakh: 1.96 },
    { srNo: 4, month: 'July', monthMr: 'जुलै', quarter: 'Q2', targetLakh: 8, achievementLakh: 0.67, percentAchievement: 8.38, collectionLakh: 0.40, actualCollectionLakh: 0.40 },
    { srNo: 5, month: 'August', monthMr: 'ऑगस्ट', quarter: 'Q2', targetLakh: 8, achievementLakh: 0, percentAchievement: 0, collectionLakh: 0, actualCollectionLakh: 0 },
    { srNo: 6, month: 'September', monthMr: 'सप्टेंबर', quarter: 'Q2', targetLakh: 8, achievementLakh: 0, percentAchievement: 0, collectionLakh: 0, actualCollectionLakh: 0 },
    { srNo: 7, month: 'October', monthMr: 'ऑक्टोबर', quarter: 'Q3', targetLakh: 8, achievementLakh: 0, percentAchievement: 0, collectionLakh: 0, actualCollectionLakh: 0 },
    { srNo: 8, month: 'November', monthMr: 'नोव्हेंबर', quarter: 'Q3', targetLakh: 8, achievementLakh: 0, percentAchievement: 0, collectionLakh: 0, actualCollectionLakh: 0 },
    { srNo: 9, month: 'December', monthMr: 'डिसेंबर', quarter: 'Q3', targetLakh: 8, achievementLakh: 0, percentAchievement: 0, collectionLakh: 0, actualCollectionLakh: 0 },
    { srNo: 10, month: 'January', monthMr: 'जानेवारी', quarter: 'Q4', targetLakh: 3, achievementLakh: 0, percentAchievement: 0, collectionLakh: 0, actualCollectionLakh: 0 },
    { srNo: 11, month: 'February', monthMr: 'फेब्रुवारी', quarter: 'Q4', targetLakh: 2, achievementLakh: 0, percentAchievement: 0, collectionLakh: 0, actualCollectionLakh: 0 },
    { srNo: 12, month: 'March', monthMr: 'मार्च', quarter: 'Q4', targetLakh: 0, achievementLakh: 0, percentAchievement: 0, collectionLakh: 0, actualCollectionLakh: 0 },
  ],
};
