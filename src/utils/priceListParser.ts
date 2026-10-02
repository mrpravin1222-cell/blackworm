import * as XLSX from 'xlsx';
import { PriceListItem } from '../types';
import { isTemporaryCode } from './productMatching';

/**
 * Standard default categories for auto-classification if category is not provided.
 */
/**
 * Standard 4 business categories as specified by the user:
 * 1. ग्रुप ए (Group A)
 * 2. स्पेशालिटी (Speciality / ग्रेड डी)
 * 3. ग्रुप बी (Group B)
 * 4. ग्रुप सी (Group C)
 */
export const KNOWN_CATEGORIES = [
  'Group A',
  'Speciality',
  'Group B',
  'Group C',
];

/**
 * Checks if a parsed line or cell is a junk company letterhead, table header, or terms & conditions row.
 */
export const isJunkHeaderOrTerms = (text: string | undefined | null): boolean => {
  if (!text) return true;
  const t = text.trim();
  if (t.length < 2) return true;
  const junkPatterns = [
    /‼\s*Shri\s*‼/i,
    /BLACKWORM AGRITECH/i,
    /CIN\s*:/i,
    /Address\s*-/i,
    /Ph\s*:\s*\+/i,
    /Pricelist w\.e\.f/i,
    /^Sr\.$/i,
    /^No\.$/i,
    /Product Name/i,
    /^GST$/i,
    /^Rate$/i,
    /^MRP$/i,
    /^[A-D]\s*\.$/i,
    /^::$/i,
    /^S\s*\.$/i,
    /^Nos$/i,
    /^\.\s*Ns$/i,
    /^Nos\s*-\s*%/i,
    /^ml\s*Nos$/i,
    /Terms\s*&\s*Conditions/i,
    /extra charged/i,
    /Credit Period/i,
    /stock availability/i,
    /not be taken back/i,
    /Sangli Jurisdiction/i,
    /previous price list/i,
    /prior notice/i,
    /dispatched material/i,
    /Cheque DD/i,
    /Company Management/i,
    /Annual TOD Scheme/i,
    /Grow Nutri Excel/i,
  ];
  return junkPatterns.some((p) => p.test(t));
};

/**
 * Detects category from text or cleans category string from file.
 * Strictly maps to the 4 business groups: Group A, Speciality, Group B, Group C.
 */
export const detectOrCleanCategory = (rawCat: string | undefined | null, productName?: string): string => {
  if (!rawCat) rawCat = '';
  const c = rawCat.trim();
  const lower = c.toLowerCase();
  const p = (productName || '').toLowerCase();

  // 1. Speciality (स्पेशालिटी / ग्रेड डी / Speciality Grades)
  if (
    lower.includes('speciality') || lower.includes('specialty') || lower.includes('स्पेशालिटी') ||
    lower.includes('grade d') || lower.includes('ग्रेड डी') || lower === 'd' || lower === 'group d' ||
    lower.includes('category d') || lower.includes('ग्रुप d') || lower.includes('कॅटेगरी d') ||
    p.includes('specialty') || p.includes('speciality') || p.includes('sp.') ||
    p.includes('12:61:00') || p.includes('13:40:13') || p.includes('13:00:45') || p.includes('00:52:34')
  ) {
    return 'Speciality';
  }

  // 2. Group A (ग्रुप ए)
  if (
    lower.includes('group a') || lower.includes('category a') || lower === 'a' ||
    lower.includes('ग्रुप a') || lower.includes('ग्रुप ए') || lower.includes('कॅटेगरी a') ||
    lower.includes('water soluble')
  ) {
    return 'Group A';
  }

  // 3. Group B (ग्रुप बी)
  if (
    lower.includes('group b') || lower.includes('category b') || lower === 'b' ||
    lower.includes('ग्रुप b') || lower.includes('ग्रुप बी') || lower.includes('कॅटेगरी b') ||
    lower.includes('micronutrient') || lower.includes('सूक्ष्म') || lower.includes('chelated') ||
    lower.includes('plant growth')
  ) {
    return 'Group B';
  }

  // 4. Group C (ग्रुप सी)
  if (
    lower.includes('group c') || lower.includes('category c') || lower === 'c' ||
    lower.includes('ग्रुप c') || lower.includes('ग्रुप सी') || lower.includes('कॅटेगरी c') ||
    lower.includes('bio-stimulant') || lower.includes('fungicide') || lower.includes('pesticide') ||
    lower.includes('larvicide')
  ) {
    return 'Group C';
  }

  // Default fallback
  return 'Group A';
};

/**
 * Normalizes cell lookup in Excel rows across varied English & Marathi column titles.
 */
const getCellValue = (row: any, keys: string[], possibleKeyNames: string[], defaultVal: any = '') => {
  for (const pk of possibleKeyNames) {
    const cleanPk = pk.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedKey = keys.find((k) => {
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanK === cleanPk || cleanK.includes(cleanPk);
    });
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
      return row[matchedKey];
    }
  }
  return defaultVal;
};

/**
 * Parses raw JSON rows from XLSX / CSV into structured PriceList products.
 * Handles both flat tabular files and grouped spreadsheets with section header rows.
 */
export const parseRawRowsToProducts = (rawRows: any[]): Omit<PriceListItem, 'id'>[] => {
  const products: Omit<PriceListItem, 'id'>[] = [];
  let currentGroupCategory = 'Organic Fertilizers';

  rawRows.forEach((row, idx) => {
    if (!row || typeof row !== 'object') return;
    const keys = Object.keys(row);
    if (keys.length === 0) return;

    // Check if this row is a Group / Category Header row
    // (Common in Excel price lists where a row has a single text like "ORGANIC FERTILIZERS" and no rates)
    const firstColVal = String(row[keys[0]] || '').trim();
    const hasAnyPrice = keys.some((k) => {
      const v = Number(row[k]);
      return !isNaN(v) && v > 0 && /rate|price|mrp|दर|रुपये/i.test(k);
    });

    if (firstColVal && !hasAnyPrice && keys.length <= 3) {
      const detected = detectOrCleanCategory(firstColVal);
      if (detected) {
        currentGroupCategory = detected;
        return; // Header row, continue to product rows
      }
    }

    const codeVal = String(
      getCellValue(row, keys, ['code', 'sku', 'itemcode', 'productcode', 'आयडी', 'कोड', 'एसकेयू'], '')
    ).trim();

    const nameMr = String(
      getCellValue(
        row,
        keys,
        ['namemr', 'marathiname', 'productname', 'itemname', 'name', 'नाव', 'उत्पादनाचे नाव', 'उत्पादन', 'प्रॉडक्ट नाव', 'तपशील'],
        ''
      )
    ).trim();

    const nameEn = String(
      getCellValue(row, keys, ['nameen', 'englishname', 'name', 'product', 'item'], nameMr)
    ).trim();

    // If no product name found at all, skip empty row
    if (!nameMr && !nameEn) return;

    // Skip company header, address, terms & conditions rows
    if (isJunkHeaderOrTerms(nameMr) && isJunkHeaderOrTerms(nameEn)) return;

    // Category / Group detection
    const rowCategoryVal = String(
      getCellValue(row, keys, ['category', 'group', 'productgroup', 'श्रेणी', 'ग्रुप', 'वर्ग', 'विभाग', 'प्रकार'], currentGroupCategory)
    ).trim();

    const category = detectOrCleanCategory(rowCategoryVal || currentGroupCategory);

    // Packing
    const packing = String(
      getCellValue(row, keys, ['packing', 'size', 'packingsize', 'unit', 'पॅकिंग', 'प्रमाण', 'साइज', 'माप'], '1 Litre')
    ).trim();

    // Prices & Rates
    const rawMrp = getCellValue(row, keys, ['mrp', 'maxretailprice', 'छापील किंमत', 'एमआरपी', 'किंमत'], 500);
    const rawDealerPrice = getCellValue(row, keys, ['dealerprice', 'dealerrate', 'rate', 'basicrate', 'dp', 'डीलर दर', 'दर', 'भाव'], 0);
    const rawDistributorPrice = getCellValue(row, keys, ['distributorprice', 'distributorrate', 'वितरक दर'], 0);
    const rawGst = getCellValue(row, keys, ['gstrate', 'gst', 'tax', 'जीएसटी', 'कर'], 12);
    const rawHsn = getCellValue(row, keys, ['hsncode', 'hsn', 'एचएसएन'], '31010099');
    const rawMoq = getCellValue(row, keys, ['minorderqty', 'moq', 'किमान ऑर्डर', 'किमान'], 10);

    const mrp = Number(rawMrp) || 500;
    const dealerPrice = Number(rawDealerPrice) || (mrp > 0 ? Math.round(mrp * 0.7) : 350);
    const distributorPrice = Number(rawDistributorPrice) || Math.round(dealerPrice * 0.9);
    const gstRate = Number(rawGst) !== undefined && !isNaN(Number(rawGst)) ? Number(rawGst) : 12;
    const hsnCode = String(rawHsn).trim() || '31010099';
    const minOrderQty = Number(rawMoq) || 10;

    products.push({
      code: codeVal || `BW-P-${idx + 1}`,
      nameMr: nameMr || nameEn,
      nameEn: nameEn || nameMr,
      category,
      packing,
      mrp,
      dealerPrice,
      distributorPrice,
      gstRate,
      hsnCode,
      inStock: true,
      minOrderQty,
      descriptionMr: `${nameMr || nameEn} - ${packing}`,
      descriptionEn: `${nameEn || nameMr} - ${packing}`,
    });
  });

  return products;
};

/**
 * Parses lines of text from TXT, CSV, or extracted PDF documents.
 */
export const parseTextLinesToProducts = (lines: string[]): Omit<PriceListItem, 'id'>[] => {
  const products: Omit<PriceListItem, 'id'>[] = [];
  let currentCategory = 'Organic Fertilizers';

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) return;

    // Check for category title lines
    const lower = trimmed.toLowerCase();
    
    // Check ABCD header like "Group A", "Category A", "Group B", "A", "B", etc.
    const abcdMatch = trimmed.match(/^(?:group|category|cat|ग्रुप|कॅटेगरी|श्रेणी)?\s*([a-dA-D])(?:\s*[-:]|\s*$)/i);
    if (abcdMatch && abcdMatch[1]) {
      currentCategory = `Group ${abcdMatch[1].toUpperCase()}`;
      return;
    }

    if (lower.includes('category') || lower.includes('group') || lower.includes('श्रेणी') || lower.includes('ग्रुप')) {
      const parts = trimmed.split(/[:=-]/);
      if (parts.length > 1) {
        currentCategory = detectOrCleanCategory(parts[1].trim());
        return;
      }
    }

    if (lower.includes('सेंद्रिय खते') || lower.includes('organic fertilizer')) {
      currentCategory = 'Organic Fertilizers';
      return;
    } else if (lower.includes('बायो') || lower.includes('stimulant') || lower.includes('टॉनिक')) {
      currentCategory = 'Bio-Stimulants';
      return;
    } else if (lower.includes('माती') || lower.includes('soil conditioner') || lower.includes('ह्युमिक')) {
      currentCategory = 'Soil Conditioners';
      return;
    } else if (lower.includes('सूक्ष्म') || lower.includes('micronutrient')) {
      currentCategory = 'Micronutrients';
      return;
    } else if (lower.includes('कीड') || lower.includes('pest care') || lower.includes('कीटक')) {
      currentCategory = 'Pest Care';
      return;
    }

    // Extract numbers from the line (e.g. MRP, Dealer Price, Packing)
    const numbers = trimmed.match(/\b\d+(\.\d+)?\b/g);
    let mrp = 500;
    let dealerPrice = 350;

    if (numbers && numbers.length >= 2) {
      const n1 = Number(numbers[0]);
      const n2 = Number(numbers[1]);
      if (n1 > n2) {
        mrp = n1;
        dealerPrice = n2;
      } else {
        mrp = n2;
        dealerPrice = n1;
      }
    } else if (numbers && numbers.length === 1) {
      mrp = Number(numbers[0]);
      dealerPrice = Math.round(mrp * 0.7);
    }

    // Detect packing
    let packing = '1 Litre';
    const packMatch = trimmed.match(/\b(1|2|5|10|20|25|40|50|200)\s*(kg|kilo|l|ltr|litre|liter|लिटर|किलो|किग्रा|gm|g|ml|मिली)\b/i);
    if (packMatch) {
      packing = packMatch[0].trim();
    }

    // Detect SKU code
    let code = `BW-P-${idx + 1}`;
    const codeMatch = trimmed.match(/\b[A-Z]{2,4}[-_][A-Z0-9]{2,6}[-_]?[A-Z0-9]*\b/);
    if (codeMatch) {
      code = codeMatch[0];
    }

    // Clean up name by removing numbers and packing
    let namePart = trimmed
      .replace(codeMatch ? codeMatch[0] : '', '')
      .replace(packMatch ? packMatch[0] : '', '')
      .replace(/\b\d+(\.\d+)?\b/g, '')
      .replace(/[,;|=/*_~]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (namePart.length >= 2 && !isJunkHeaderOrTerms(namePart)) {
      products.push({
        code,
        nameMr: namePart,
        nameEn: namePart,
        category: currentCategory,
        packing,
        mrp,
        dealerPrice,
        distributorPrice: Math.round(dealerPrice * 0.9),
        gstRate: 12,
        hsnCode: '31010099',
        inStock: true,
        minOrderQty: 10,
        descriptionMr: `${namePart} - ${packing}`,
        descriptionEn: `${namePart} - ${packing}`,
      });
    }
  });

  return products;
};

/**
 * Extracts plain text lines from a PDF file using pdfjs-dist.
 */
export const extractTextFromPdfFile = async (file: File): Promise<string[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjs = await import('pdfjs-dist');
    
    // Set worker source gracefully
    if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '4.10.38'}/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const allLines: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let currentLine = '';
      let lastY: number | null = null;

      for (const item of textContent.items as any[]) {
        if (!item || !item.str) continue;
        const y = item.transform ? item.transform[5] : null;

        if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
          if (currentLine.trim()) {
            allLines.push(currentLine.trim());
          }
          currentLine = item.str;
        } else {
          currentLine += (currentLine ? ' ' : '') + item.str;
        }
        lastY = y;
      }

      if (currentLine.trim()) {
        allLines.push(currentLine.trim());
      }
    }

    return allLines;
  } catch (err) {
    console.warn('PDF text extraction with pdfjs-dist failed, attempting fallback text read:', err);
    const raw = await file.text();
    return raw.split('\n').filter((l) => l.trim().length > 0);
  }
};

/**
 * Universal file reader supporting XLSX, XLS, CSV, TSV, PDF, TXT, JSON.
 */
export const parsePriceListFile = async (
  file: File
): Promise<{ products: Omit<PriceListItem, 'id'>[]; fileName: string; format: string }> => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  let products: Omit<PriceListItem, 'id'>[] = [];

  if (['xlsx', 'xls', 'csv', 'tsv'].includes(extension)) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const firstSheet = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheet];
    const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    products = parseRawRowsToProducts(rawRows);
  } else if (extension === 'pdf') {
    const lines = await extractTextFromPdfFile(file);
    products = parseTextLinesToProducts(lines);
  } else if (extension === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const rawArray = Array.isArray(parsed) ? parsed : parsed.priceList || [parsed];
    products = parseRawRowsToProducts(rawArray);
  } else {
    // TXT or other text document
    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    products = parseTextLinesToProducts(lines);
  }

  return {
    products,
    fileName: file.name,
    format: extension.toUpperCase(),
  };
};
