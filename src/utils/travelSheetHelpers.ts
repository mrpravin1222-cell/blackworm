export interface DailyTravelRow {
  id: string;
  dateStr: string; // e.g. "8/1/2026"
  dayName: string; // e.g. "saturday"
  route: string; // e.g. "yogewadi dorli balgawade vadagaon"
  openingKm: number;
  closingKm: number;
  otherExpensesNote: string;
  otherExpenseAmount?: number;
  amount: number;
  km: number;
}

export interface MonthlyTravelSheetData {
  id: string;
  employeeId: string;
  officerName: string;
  designation: string;
  monthYear: string; // e.g. "2026-08"
  sheetDate: string; // e.g. "8/1/2026"
  rows: DailyTravelRow[];
  extraExpenseTotal?: number;
  lastUpdated: string;
}

// Extract numeric value from text note if present (e.g. "Lodge 500" -> 500)
export function getRowOtherExpenseAmount(row: DailyTravelRow): number {
  if (typeof row.otherExpenseAmount === 'number' && row.otherExpenseAmount > 0) {
    return row.otherExpenseAmount;
  }
  if (row.otherExpensesNote) {
    // find all numbers in the string
    const matches = row.otherExpensesNote.match(/\d+/g);
    if (matches && matches.length > 0) {
      // Return the largest number or sum of numbers if multiple
      const numbers = matches.map((n) => parseInt(n, 10)).filter((n) => n > 0 && n < 100000);
      if (numbers.length > 0) {
        return numbers.reduce((a, b) => a + b, 0);
      }
    }
  }
  return 0;
}

// Generate empty rows for any month/year
export function generateMonthlyTravelSheet(
  officerName: string,
  designation: string,
  monthYearStr: string // "2026-08"
): MonthlyTravelSheetData {
  const [yearStr, monthStr] = monthYearStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1 to 12

  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const rows: DailyTravelRow[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayName = dayNames[dateObj.getDay()];
    const dateStr = `${month}/${d}/${year}`;

    const isSunday = dayName === 'sunday';

    rows.push({
      id: `row-${year}-${month}-${d}`,
      dateStr,
      dayName,
      route: isSunday ? 'Sunday' : '',
      openingKm: 0,
      closingKm: 0,
      otherExpensesNote: '',
      otherExpenseAmount: 0,
      amount: 0,
      km: 0,
    });
  }

  return {
    id: `SHEET-${year}-${month}-${Date.now()}`,
    employeeId: 'USR-OFFICER',
    officerName,
    designation,
    monthYear: monthYearStr,
    sheetDate: `${month}/1/${year}`,
    extraExpenseTotal: 0,
    lastUpdated: new Date().toISOString(),
    rows,
  };
}

// Clean blank format sample for August 2026
export const sampleAugust2026TravelSheet: MonthlyTravelSheetData = generateMonthlyTravelSheet(
  'Pravin Waghmare',
  'Sr. Sales Officer',
  '2026-08'
);
