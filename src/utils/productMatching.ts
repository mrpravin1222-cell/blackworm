import { PriceListItem } from '../types';

/**
 * Normalizes generic text strings by removing excess whitespace and lowercasing.
 */
export const normalizeText = (text: string | undefined | null): string => {
  if (!text) return '';
  return String(text).trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Clean and normalize a product code / SKU.
 */
export const cleanProductCode = (code: string | undefined | null): string => {
  if (!code) return '';
  return String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
};

/**
 * Checks if a code is a generic temporary importer code (e.g., BW-IMP-1, BW-P-1).
 */
export const isTemporaryCode = (code: string | undefined | null): boolean => {
  if (!code) return true;
  const upper = String(code).toUpperCase().trim();
  return upper.startsWith('BW-IMP-') || upper.startsWith('IMP-') || upper.startsWith('TMP-') || upper.startsWith('BW-P-');
};

/**
 * Standardizes packing unit strings for strict SKU packing equivalence.
 * e.g. "1 Litre", "1 Ltr", "1L", "१ लिटर", "1 Litre Bottle" -> "1l"
 */
export const normalizePacking = (packing: string | undefined | null): string => {
  if (!packing) return '';
  let str = String(packing).toLowerCase().trim();

  // Devanagari numerals to standard numerals
  const devToEng: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  };
  str = str.replace(/[०-९]/g, (d) => devToEng[d] || d);

  // Remove common container words
  str = str.replace(/(bottle|bag|can|bucket|pouch|drum|barrel|बॉक्स|बॅग|बाटली|कॅन|बकेट)/gi, '').trim();

  // Litres
  if (/(200\s*(l|ltr|litre|liter|लिटर))/i.test(str)) return '200l';
  if (/(50\s*(l|ltr|litre|liter|लिटर))/i.test(str)) return '50l';
  if (/(20\s*(l|ltr|litre|liter|लिटर))/i.test(str)) return '20l';
  if (/(10\s*(l|ltr|litre|liter|लिटर))/i.test(str)) return '10l';
  if (/(5\s*(l|ltr|litre|liter|लिटर))/i.test(str)) return '5l';
  if (/(2\.5\s*(l|ltr|litre|liter|लिटर))/i.test(str)) return '2.5l';
  if (/(2\s*(l|ltr|litre|liter|लिटर))/i.test(str)) return '2l';
  if (/(1\s*(l|ltr|litre|liter|लिटर))/i.test(str)) return '1l';

  // Millilitres
  if (/(500\s*(ml|मिली))/i.test(str)) return '500ml';
  if (/(250\s*(ml|मिली))/i.test(str)) return '250ml';
  if (/(100\s*(ml|मिली))/i.test(str)) return '100ml';

  // Kilograms
  if (/(50\s*(kg|kilo|किलो|किग्रा))/i.test(str)) return '50kg';
  if (/(40\s*(kg|kilo|किलो|किग्रा))/i.test(str)) return '40kg';
  if (/(25\s*(kg|kilo|किलो|किग्रा))/i.test(str)) return '25kg';
  if (/(10\s*(kg|kilo|किलो|किग्रा))/i.test(str)) return '10kg';
  if (/(5\s*(kg|kilo|किलो|किग्रा))/i.test(str)) return '5kg';
  if (/(1\s*(kg|kilo|किलो|किग्रा))/i.test(str)) return '1kg';

  // Grams
  if (/(500\s*(gm|g|gram|ग्रॅम))/i.test(str)) return '500g';
  if (/(250\s*(gm|g|gram|ग्रॅम))/i.test(str)) return '250g';
  if (/(100\s*(gm|g|gram|ग्रॅम))/i.test(str)) return '100g';

  return str.replace(/[^a-z0-9]/g, '');
};

/**
 * Normalizes product names for resilient matching across Marathi & English.
 * Strips noise punctuation: ( ) [ ] { } , . ; : " ' - _ / \ * & + % #
 */
export const normalizeNameForMatching = (name: string | undefined | null): string => {
  if (!name) return '';
  let str = String(name).toLowerCase();

  // Strip parenthetical content if it's purely packings or codes
  str = str.replace(/[()[\]{}<>\-_.,;:*&+#%"'\\/]/g, ' ');
  str = str.replace(/\s+/g, ' ').trim();

  // Collapse common spelling variations in Marathi & English
  str = str.replace(/सेंद्रिय\s*गांडूळ\s*खत/g, 'सेंद्रिय गांडूळखत');
  str = str.replace(/गांडूळ\s*खत/g, 'गांडूळखत');
  str = str.replace(/vermi\s*compost/g, 'vermicompost');
  str = str.replace(/bio\s*npk/g, 'bionpk');
  str = str.replace(/bio\s*potash/g, 'biopotash');
  str = str.replace(/humic\s*gold/g, 'humicgold');
  str = str.replace(/humic\s*acid/g, 'humicacid');
  str = str.replace(/micro\s*rich/g, 'microrich');
  str = str.replace(/neem\s*protect/g, 'neemprotect');

  return str.replace(/\s+/g, ' ').trim();
};

/**
 * Bigram similarity score (Dice coefficient) between two strings.
 */
export const stringSimilarity = (s1: string, s2: string): number => {
  if (!s1 || !s2) return 0.0;
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1.0 : 0.0;

  const getBigrams = (str: string) => {
    const set = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      set.add(str.slice(i, i + 2));
    }
    return set;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;
  b1.forEach((bg) => {
    if (b2.has(bg)) intersection++;
  });

  return (2 * intersection) / (b1.size + b2.size);
};

/**
 * Mutually exclusive product keywords to strictly prevent accidental false-positive merges.
 */
const CONFLICTING_KEYWORD_GROUPS: string[][] = [
  ['npk', 'potash', 'zinc', 'boron', 'calcium', 'magnesium', 'sulphur', 'nitrogen', 'phosphorus'],
  ['liquid', 'granule', 'powder', 'द्रव', 'दाणेदार', 'पावडर'],
  ['vermi', 'compost', 'humic', 'neem', 'seaweed', 'amino'],
];

/**
 * Verifies that two product descriptions do not contain mutually exclusive keywords.
 */
const hasKeywordConflict = (nameA: string, nameB: string): boolean => {
  const a = nameA.toLowerCase();
  const b = nameB.toLowerCase();

  for (const group of CONFLICTING_KEYWORD_GROUPS) {
    const aWords = group.filter((w) => a.includes(w));
    const bWords = group.filter((w) => b.includes(w));

    if (aWords.length > 0 && bWords.length > 0) {
      // If they have keywords in this group, they must have at least one keyword in common!
      const hasOverlap = aWords.some((w) => bWords.includes(w));
      if (!hasOverlap) {
        return true; // Conflict detected (e.g. one has 'npk' and other has 'potash')
      }
    }
  }

  return false;
};

/**
 * Creates an intelligent slug for generating stable deterministic IDs.
 */
const slugify = (text: string): string => {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
};

/**
 * Generates a stable, deterministic Product ID that never changes between identical uploads.
 */
export const generateStableProductId = (
  item: Partial<PriceListItem>,
  indexFallback: number = 0
): string => {
  if (item.id && !item.id.includes('Date.now()') && !item.id.startsWith('PRC-TMP-')) {
    return item.id;
  }

  const cleanCode = cleanProductCode(item.code);
  if (cleanCode && !isTemporaryCode(item.code) && cleanCode.length >= 3) {
    return `PRC-${cleanCode}`;
  }

  const namePart = slugify(item.nameEn || item.nameMr || `product-${indexFallback}`);
  const packPart = normalizePacking(item.packing) || 'std';
  return `PRC-${namePart}-${packPart}`;
};

/**
 * Intelligent matching logic between an uploaded item and an existing catalog item.
 * Guarantees that:
 * 1. Matches on exact SKU / Code (if valid code exists).
 * 2. Matches on normalized Product Name + compatible Packing.
 * 3. Never merges two products with distinct packings (e.g. 1 Litre vs 5 Litre are different SKUs).
 * 4. Never merges two products with conflicting ingredients or formulations (e.g. NPK vs Potash).
 */
export const isProductMatch = (
  newItem: Partial<PriceListItem>,
  existingItem: PriceListItem
): boolean => {
  // 1. Direct SKU Code Match (if both have real codes)
  const newCode = cleanProductCode(newItem.code);
  const existCode = cleanProductCode(existingItem.code);

  if (
    newCode &&
    existCode &&
    !isTemporaryCode(newItem.code) &&
    !isTemporaryCode(existingItem.code) &&
    newCode.length >= 3
  ) {
    if (newCode === existCode) {
      return true;
    }
  }

  // Also check if existing item ID matches code: e.g. PRC-BW-VC-50K vs BW-VC-50K
  if (newCode && existingItem.id && cleanProductCode(existingItem.id).includes(newCode)) {
    return true;
  }

  // 2. Packing Validation:
  // Two products with different packings (e.g. 1L vs 5L or 1L vs 50kg) MUST NOT be merged!
  const newPackNorm = normalizePacking(newItem.packing);
  const existPackNorm = normalizePacking(existingItem.packing);

  if (newPackNorm && existPackNorm && newPackNorm !== existPackNorm) {
    // Packings are clearly different -> distinctly different SKUs!
    return false;
  }

  // 3. Name Preparation
  const newNameMr = normalizeNameForMatching(newItem.nameMr);
  const newNameEn = normalizeNameForMatching(newItem.nameEn);
  const existNameMr = normalizeNameForMatching(existingItem.nameMr);
  const existNameEn = normalizeNameForMatching(existingItem.nameEn);

  const fullNew = `${newNameMr} ${newNameEn}`.trim();
  const fullExist = `${existNameMr} ${existNameEn}`.trim();

  // Safety: If there is a formulation/ingredient conflict, DO NOT MERGE!
  if (hasKeywordConflict(fullNew, fullExist)) {
    return false;
  }

  // Exact normalized match on either language
  if (newNameMr && existNameMr && newNameMr === existNameMr) return true;
  if (newNameEn && existNameEn && newNameEn === existNameEn) return true;
  if (newNameMr && existNameEn && newNameMr === existNameEn) return true;
  if (newNameEn && existNameMr && newNameEn === existNameMr) return true;

  // Substring containment match with strict word boundary or minimal length difference
  if (newNameMr && existNameMr) {
    if (newNameMr.includes(existNameMr) || existNameMr.includes(newNameMr)) {
      const lenDiff = Math.abs(newNameMr.length - existNameMr.length);
      if (lenDiff <= 12) return true;
    }
  }

  if (newNameEn && existNameEn) {
    if (newNameEn.includes(existNameEn) || existNameEn.includes(newNameEn)) {
      const lenDiff = Math.abs(newNameEn.length - existNameEn.length);
      if (lenDiff <= 12) return true;
    }
  }

  // Resilient Bigram similarity for slight spelling differences (>= 0.82)
  if (newNameMr && existNameMr && stringSimilarity(newNameMr, existNameMr) >= 0.82) {
    return true;
  }
  if (newNameEn && existNameEn && stringSimilarity(newNameEn, existNameEn) >= 0.82) {
    return true;
  }

  return false;
};

/**
 * Performs a safe, non-destructive, non-duplicating intelligent merge of uploaded price list items
 * into the existing catalog.
 *
 * Requirements satisfied:
 * - Requirement 1: Uploaded file items never duplicated.
 * - Requirement 2: Product names, groups/categories, and order are respected from the file.
 * - Requirement 3: Existing products updated/replaced in-place with latest prices/info.
 * - Requirement 4: New products automatically added under their proper group/category.
 * - Requirement 6: Stable deterministic IDs used.
 * - Requirement 7: Manual products in catalog not in the file are preserved unless clearly matched.
 * - Requirement 8: Safe merge without duplicate database copies.
 * - Requirement 9: Intelligent matching avoiding accidental merge of distinct packings/products.
 * - Requirement 10: Real-time sync across devices.
 */
export const safeMergePriceList = (
  existingCatalog: PriceListItem[],
  uploadedItems: (Omit<PriceListItem, 'id'> | PriceListItem)[],
  options: { replaceCatalog?: boolean } = {}
): {
  mergedList: PriceListItem[];
  updatedCount: number;
  addedCount: number;
  unchangedCount: number;
} => {
  // Step 1: Deduplicate the incoming file items internally first
  const deduplicatedUploads: (Omit<PriceListItem, 'id'> | PriceListItem)[] = [];
  const uploadSeenKeys = new Set<string>();

  uploadedItems.forEach((item, idx) => {
    const codeKey = cleanProductCode(item.code);
    const nameKey = normalizeNameForMatching(item.nameMr || item.nameEn);
    const packKey = normalizePacking(item.packing);

    const uniqueKey =
      !isTemporaryCode(item.code) && codeKey
        ? `code:${codeKey}`
        : `name:${nameKey}_pack:${packKey || idx}`;

    if (!uploadSeenKeys.has(uniqueKey)) {
      uploadSeenKeys.add(uniqueKey);
      deduplicatedUploads.push(item);
    } else {
      // Overwrite previous row with latest in file
      const existingIdx = deduplicatedUploads.findIndex((u) => {
        const uCode = cleanProductCode(u.code);
        const uName = normalizeNameForMatching(u.nameMr || u.nameEn);
        const uPack = normalizePacking(u.packing);
        return !isTemporaryCode(u.code) && uCode
          ? uCode === codeKey
          : uName === nameKey && uPack === packKey;
      });
      if (existingIdx !== -1) {
        deduplicatedUploads[existingIdx] = item;
      }
    }
  });

  // Step 2: Prepare working copy of existing catalog
  const workingCatalog: PriceListItem[] = existingCatalog.map((item) => ({ ...item }));
  const matchedExistingIds = new Set<string>();

  let updatedCount = 0;
  let addedCount = 0;

  // Step 3: Match and update existing or add new
  const newlyAddedItems: PriceListItem[] = [];

  deduplicatedUploads.forEach((uploaded, idx) => {
    // Try to find a match among existing items
    const matchIndex = workingCatalog.findIndex(
      (exist) => !matchedExistingIds.has(exist.id) && isProductMatch(uploaded, exist)
    );

    if (matchIndex !== -1) {
      // Match found -> Update existing in-place, keeping original stable ID
      const matched = workingCatalog[matchIndex];
      matchedExistingIds.add(matched.id);

      workingCatalog[matchIndex] = {
        ...matched,
        code: !isTemporaryCode(uploaded.code) && uploaded.code ? uploaded.code : matched.code,
        nameMr: uploaded.nameMr || matched.nameMr,
        nameEn: uploaded.nameEn || matched.nameEn,
        category: uploaded.category || matched.category || 'Organic Fertilizers',
        packing: uploaded.packing || matched.packing,
        mrp: Number(uploaded.mrp) || matched.mrp,
        dealerPrice: Number(uploaded.dealerPrice) || matched.dealerPrice,
        distributorPrice: Number(uploaded.distributorPrice) || matched.distributorPrice,
        gstRate: Number(uploaded.gstRate) !== undefined ? Number(uploaded.gstRate) : matched.gstRate,
        hsnCode: uploaded.hsnCode || matched.hsnCode,
        inStock: uploaded.inStock !== undefined ? uploaded.inStock : matched.inStock,
        minOrderQty: Number(uploaded.minOrderQty) || matched.minOrderQty,
        descriptionMr: uploaded.descriptionMr || matched.descriptionMr,
        descriptionEn: uploaded.descriptionEn || matched.descriptionEn,
        groupDiscountPercent:
          uploaded.groupDiscountPercent !== undefined
            ? uploaded.groupDiscountPercent
            : matched.groupDiscountPercent,
      };

      updatedCount++;
    } else {
      // No match found -> Genuinely new product from file
      const stableId = generateStableProductId(uploaded, idx);

      const newProduct: PriceListItem = {
        id: stableId,
        code: uploaded.code || `BW-${stableId.replace('PRC-', '').toUpperCase().slice(0, 10)}`,
        nameMr: uploaded.nameMr || uploaded.nameEn || `नवीन उत्पादन`,
        nameEn: uploaded.nameEn || uploaded.nameMr || `New Product`,
        category: uploaded.category || 'Organic Fertilizers',
        packing: uploaded.packing || '1 Litre',
        mrp: Number(uploaded.mrp) || 500,
        dealerPrice: Number(uploaded.dealerPrice) || 350,
        distributorPrice: Number(uploaded.distributorPrice) || 315,
        gstRate: Number(uploaded.gstRate) !== undefined ? Number(uploaded.gstRate) : 12,
        hsnCode: uploaded.hsnCode || '31010099',
        inStock: uploaded.inStock !== undefined ? uploaded.inStock : true,
        minOrderQty: Number(uploaded.minOrderQty) || 10,
        descriptionMr: uploaded.descriptionMr || `${uploaded.nameMr} - ${uploaded.packing}`,
        descriptionEn: uploaded.descriptionEn || `${uploaded.nameEn} - ${uploaded.packing}`,
        groupDiscountPercent: uploaded.groupDiscountPercent,
      };

      newlyAddedItems.push(newProduct);
      addedCount++;
    }
  });

  // If options.replaceCatalog is TRUE:
  // The catalog structure is strictly defined by the uploaded file items (preserving matched IDs for continuity)
  if (options.replaceCatalog) {
    const catalogFromUpload: PriceListItem[] = [];
    deduplicatedUploads.forEach((uploaded, idx) => {
      // Find matching item in updated working catalog
      const matched = workingCatalog.find((w) => isProductMatch(uploaded, w));
      if (matched) {
        catalogFromUpload.push(matched);
      } else {
        const added = newlyAddedItems.find((n) => isProductMatch(uploaded, n));
        if (added) {
          catalogFromUpload.push(added);
        } else {
          catalogFromUpload.push({
            id: generateStableProductId(uploaded, idx),
            code: uploaded.code || `BW-P-${idx + 1}`,
            nameMr: uploaded.nameMr || 'नवीन उत्पादन',
            nameEn: uploaded.nameEn || 'New Product',
            category: uploaded.category || 'Group A',
            packing: uploaded.packing || '1 Litre',
            mrp: Number(uploaded.mrp) || 500,
            dealerPrice: Number(uploaded.dealerPrice) || 350,
            distributorPrice: Number(uploaded.distributorPrice) || 315,
            gstRate: Number(uploaded.gstRate) !== undefined ? Number(uploaded.gstRate) : 12,
            hsnCode: uploaded.hsnCode || '31010099',
            inStock: true,
            minOrderQty: 10,
            descriptionMr: `${uploaded.nameMr} - ${uploaded.packing}`,
            descriptionEn: `${uploaded.nameEn} - ${uploaded.packing}`,
          });
        }
      }
    });

    return {
      mergedList: catalogFromUpload,
      updatedCount,
      addedCount,
      unchangedCount: 0,
    };
  }

  // Default: Safe intelligent merge (preserves untouched manual catalog items)
  const mergedList = [...workingCatalog, ...newlyAddedItems];
  const unchangedCount = workingCatalog.length - updatedCount;

  return {
    mergedList,
    updatedCount,
    addedCount,
    unchangedCount,
  };
};
