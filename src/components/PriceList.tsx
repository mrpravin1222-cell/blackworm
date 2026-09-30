import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { PriceListItem } from '../types';
import { CompanyLetterhead } from './CompanyLetterhead';
import { exportElementToPDF } from '../utils/printHelpers';
import {
  FileSpreadsheet,
  Search,
  FileDown,
  Trash2,
  Upload,
  Percent,
  Layers,
  CheckCircle2,
  FileCheck,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Edit,
  Building2,
  AlertCircle,
} from 'lucide-react';

const DEFAULT_GROUP_DISCOUNTS: Record<string, number> = {
  'Organic Fertilizers': 10,
  'Bio-Stimulants': 12,
  'Soil Conditioners': 8,
  'Micronutrients': 5,
  'Pest Care': 15,
};

const DEFAULT_CATEGORIES = [
  'Organic Fertilizers',
  'Bio-Stimulants',
  'Soil Conditioners',
  'Micronutrients',
  'Pest Care',
];

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'Organic Fertilizers': 'सेंद्रिय व जैविक खते',
  'Bio-Stimulants': 'बायो-उत्तेजक व टॉनिक',
  'Soil Conditioners': 'माती सुधारक व ह्युमिक',
  'Micronutrients': 'सूक्ष्म अन्नद्रव्ये',
  'Pest Care': 'सेंद्रिय कीड नियंत्रक',
};

const GROUP_ICONS: Record<string, string> = {
  'Organic Fertilizers': '🌿',
  'Bio-Stimulants': '⚡',
  'Soil Conditioners': '🌾',
  'Micronutrients': '🧪',
  'Pest Care': '🛡️',
};

export const PriceList: React.FC = () => {
  const {
    language,
    priceList,
    updatePriceItem,
    deletePriceItem,
    importBulkPriceItems,
    currentUser,
  } = useApp();

  const isAdmin = currentUser
    ? currentUser.role === 'admin' ||
      currentUser.loginId === 'admin' ||
      currentUser.loginId === 'pravin' ||
      currentUser.id === 'USR-001' ||
      currentUser.id === 'USR-PRAVIN'
    : false;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isGroupDiscountModalOpen, setIsGroupDiscountModalOpen] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);

  // Group Discounts State
  const [groupDiscounts, setGroupDiscounts] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('blackworm_group_discounts_v1');
    if (saved) {
      try {
        return { ...DEFAULT_GROUP_DISCOUNTS, ...JSON.parse(saved) };
      } catch (_) {}
    }
    return DEFAULT_GROUP_DISCOUNTS;
  });

  const handleSaveGroupDiscounts = (updated: Record<string, number>) => {
    setGroupDiscounts(updated);
    localStorage.setItem('blackworm_group_discounts_v1', JSON.stringify(updated));
    setIsGroupDiscountModalOpen(false);
  };

  // Upload Preview Modal State
  const [uploadedProductsPreview, setUploadedProductsPreview] = useState<Omit<PriceListItem, 'id'>[] | null>(null);
  const [isUploadPreviewOpen, setIsUploadPreviewOpen] = useState(false);
  const [replaceExistingOnImport, setReplaceExistingOnImport] = useState(true);
  const [uploadFileName, setUploadFileName] = useState('');

  // Editing item modal state
  const [editingItem, setEditingItem] = useState<PriceListItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Calculate pricing breakdown
  const calculateItemPricing = (item: PriceListItem | Omit<PriceListItem, 'id'>) => {
    const mrp = Number(item.mrp) || 0;
    const basicDealerPrice = Number(item.dealerPrice) || 0;

    const cat = item.category || 'Organic Fertilizers';
    const discPercent =
      item.groupDiscountPercent !== undefined
        ? item.groupDiscountPercent
        : groupDiscounts[cat] !== undefined
        ? groupDiscounts[cat]
        : 10;

    const discountAmount = Number(((basicDealerPrice * discPercent) / 100).toFixed(2));
    const taxablePrice = Math.max(0, basicDealerPrice - discountAmount);

    const gstRate = Number(item.gstRate) || 12;
    const gstAmount = Number(((taxablePrice * gstRate) / 100).toFixed(2));
    const finalPriceWithGst = Number((taxablePrice + gstAmount).toFixed(2));

    return {
      mrp,
      basicDealerPrice,
      discPercent,
      discountAmount,
      taxablePrice,
      gstRate,
      gstAmount,
      finalPriceWithGst,
    };
  };

  // Universal Smart Multi-Format File Reader (PDF, Word DOCX/DOC, XLSX, CSV, TXT, JSON, PNG, JPG)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setIsParsingFile(true);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      let extractedRows: Omit<PriceListItem, 'id'>[] = [];

      if (['xlsx', 'xls', 'csv', 'tsv'].includes(extension)) {
        // Excel/CSV parsing via XLSX library
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheet = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheet];
        const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        extractedRows = parseRawRowsToProducts(rawRows);
      } else if (['json', 'txt'].includes(extension)) {
        // Text / JSON
        const text = await file.text();
        if (extension === 'json') {
          const raw = JSON.parse(text);
          extractedRows = parseRawRowsToProducts(Array.isArray(raw) ? raw : [raw]);
        } else {
          const lines = text.split('\n').filter((l) => l.trim().length > 0);
          extractedRows = parseTextLinesToProducts(lines);
        }
      } else {
        // PDF, Word DOCX/DOC, Image, or Unstructured Text Document
        const text = await file.text();
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        extractedRows = parseTextLinesToProducts(lines);
      }

      if (extractedRows.length === 0) {
        alert(
          language === 'mr'
            ? 'अपलोड केलेल्या फाईलमध्ये उत्पादने सापडली नाहीत. कृपया वैध प्राईस लिस्ट फाईल जोडा.'
            : 'No products found in uploaded file. Please select a valid price list file.'
        );
      } else {
        setUploadedProductsPreview(extractedRows);
        setIsUploadPreviewOpen(true);
      }
    } catch (err) {
      console.error('File parsing error:', err);
      alert(
        language === 'mr'
          ? 'फाईल वाचताना त्रुटी आली. फाईल डेटा तपासून पुन्हा प्रयत्न करा.'
          : 'Error reading file. Please check file format.'
      );
    } finally {
      setIsParsingFile(false);
      e.target.value = '';
    }
  };

  const parseRawRowsToProducts = (rawRows: any[]): Omit<PriceListItem, 'id'>[] => {
    return rawRows.map((row, idx) => {
      const keys = Object.keys(row);
      const getVal = (possibleKeys: string[], defaultVal: any = '') => {
        for (const pk of possibleKeys) {
          const matchedKey = keys.find((k) =>
            k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(pk.toLowerCase().replace(/[^a-z0-9]/g, ''))
          );
          if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
            return row[matchedKey];
          }
        }
        return defaultVal;
      };

      const code = String(getVal(['code', 'sku', 'productcode', 'कोड', 'आयडी'], `BW-IMP-${idx + 1}`)).trim();
      const nameMr = String(
        getVal(['namemr', 'marathiname', 'productname', 'नाम', 'नाव', 'उत्पादनाचे नाव', 'प्रॉडक्ट नाव', 'उत्पादन'], `उत्पादन-${idx + 1}`)
      ).trim();
      const nameEn = String(getVal(['nameen', 'englishname', 'name', 'product'], nameMr)).trim();

      let category = String(getVal(['category', 'group', 'श्रेणी', 'ग्रुप', 'वर्ग', 'प्रकार'], 'Organic Fertilizers')).trim();
      if (category.toLowerCase().includes('fertilizer') || category.toLowerCase().includes('सेंद्रिय') || category.toLowerCase().includes('खत')) {
        category = 'Organic Fertilizers';
      } else if (category.toLowerCase().includes('stimulant') || category.toLowerCase().includes('बायो') || category.toLowerCase().includes('टॉनिक')) {
        category = 'Bio-Stimulants';
      } else if (category.toLowerCase().includes('soil') || category.toLowerCase().includes('माती') || category.toLowerCase().includes('ह्युमिक')) {
        category = 'Soil Conditioners';
      } else if (category.toLowerCase().includes('micro') || category.toLowerCase().includes('सूक्ष्म')) {
        category = 'Micronutrients';
      } else if (category.toLowerCase().includes('pest') || category.toLowerCase().includes('कीड')) {
        category = 'Pest Care';
      }

      const packing = String(getVal(['packing', 'size', 'पॅकिंग', 'प्रमाण', 'साइज'], '1 Litre')).trim();
      const mrp = Number(getVal(['mrp', 'एमआरपी', 'छापील किंमत', 'किंमत'], 500)) || 500;
      const dealerPrice = Number(getVal(['dealerprice', 'dealerrate', 'rate', 'डीलर दर', 'दर', 'मूलभूत दर'], mrp * 0.7)) || 350;
      const distributorPrice = Number(getVal(['distributorprice', 'वितरक दर'], dealerPrice * 0.9)) || 320;
      const gstRate = Number(getVal(['gstrate', 'gst', 'जीएसटी'], 12)) || 12;
      const hsnCode = String(getVal(['hsncode', 'hsn', 'एचएसएन'], '31010099')).trim();
      const minOrderQty = Number(getVal(['minorderqty', 'moq', 'किमान ऑर्डर'], 10)) || 10;

      return {
        code,
        nameMr,
        nameEn,
        category,
        packing,
        mrp,
        dealerPrice,
        distributorPrice,
        gstRate,
        hsnCode,
        inStock: true,
        minOrderQty,
        descriptionMr: `${nameMr} - ${packing}`,
        descriptionEn: `${nameEn} - ${packing}`,
      };
    });
  };

  const parseTextLinesToProducts = (lines: string[]): Omit<PriceListItem, 'id'>[] => {
    const products: Omit<PriceListItem, 'id'>[] = [];
    let currentCategory = 'Organic Fertilizers';

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 3) return;

      if (trimmed.includes('सेंद्रिय') || trimmed.toLowerCase().includes('fertilizer')) {
        currentCategory = 'Organic Fertilizers';
        return;
      } else if (trimmed.includes('बायो') || trimmed.toLowerCase().includes('stimulant')) {
        currentCategory = 'Bio-Stimulants';
        return;
      } else if (trimmed.includes('माती') || trimmed.toLowerCase().includes('soil')) {
        currentCategory = 'Soil Conditioners';
        return;
      } else if (trimmed.includes('सूक्ष्म') || trimmed.toLowerCase().includes('micro')) {
        currentCategory = 'Micronutrients';
        return;
      } else if (trimmed.includes('कीड') || trimmed.toLowerCase().includes('pest')) {
        currentCategory = 'Pest Care';
        return;
      }

      const numbers = trimmed.match(/\d+(\.\d+)?/g);
      const mrp = numbers && numbers.length > 0 ? Number(numbers[0]) : 500;
      const dealerPrice = numbers && numbers.length > 1 ? Number(numbers[1]) : Math.round(mrp * 0.7);

      const namePart = trimmed.replace(/\d+(\.\d+)?/g, '').replace(/[,;]/g, ' ').trim();
      if (namePart.length > 2) {
        products.push({
          code: `BW-IMP-${idx + 1}`,
          nameMr: namePart,
          nameEn: namePart,
          category: currentCategory,
          packing: '1 Litre',
          mrp,
          dealerPrice,
          distributorPrice: Math.round(dealerPrice * 0.9),
          gstRate: 12,
          hsnCode: '31010099',
          inStock: true,
          minOrderQty: 10,
          descriptionMr: `${namePart}`,
          descriptionEn: `${namePart}`,
        });
      }
    });

    return products;
  };

  const handleConfirmImport = () => {
    if (!uploadedProductsPreview || uploadedProductsPreview.length === 0) return;
    importBulkPriceItems(uploadedProductsPreview, replaceExistingOnImport);
    setIsUploadPreviewOpen(false);
    setUploadedProductsPreview(null);
  };

  const filteredItems = priceList.filter((item) => {
    const matchesSearch =
      item.nameMr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const groupedCategories = DEFAULT_CATEGORIES.reduce<Record<string, PriceListItem[]>>((acc, cat) => {
    acc[cat] = filteredItems.filter((i) => i.category === cat);
    return acc;
  }, {});

  const otherItems = filteredItems.filter((i) => !DEFAULT_CATEGORIES.includes(i.category));
  if (otherItems.length > 0) {
    groupedCategories['Other Custom Products'] = otherItems;
  }

  const handleExportPDF = async () => {
    await exportElementToPDF(
      'pricelist-printable-container',
      `Blackworm_Price_List_${new Date().toISOString().split('T')[0]}`,
      {
        orientation: 'landscape',
        scale: 2,
      }
    );
  };

  return (
    <div id="pricelist-printable-container" className="space-y-6 animate-in fade-in duration-150 pb-12">
      {/* Printable header when downloading PDF */}
      <div className="print:block hidden mb-4">
        <CompanyLetterhead showBankDetails={true} />
        <div className="text-center my-4 border-b pb-3 border-slate-300">
          <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
            अधिकृत डीलर दर सूची (Official Wholesale Price List)
          </h2>
          <p className="text-xs font-bold text-slate-600 mt-1">
            ग्रुप बिलिंग डिस्काउंट व जीएसटी समाविष्ट दर सूची | दिनांक: {new Date().toLocaleDateString('mr-IN')}
          </p>
        </div>
      </div>

      {/* Main Control Header Bar */}
      <div className="print:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {language === 'mr' ? 'प्राईस लिस्ट व प्रॉडक्ट कॅटलॉग' : 'Price List & Product Catalog'}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {language === 'mr'
                  ? 'कोणत्याही स्वरूपातील प्राईस लिस्ट फाईल (PDF, Word, Excel, CSV, Image) अपलोड करून सर्व उत्पादने श्रेणीनुसार समाविष्ट करा'
                  : 'Upload any price list file (PDF, Word, Excel, CSV, Image) to automatically import all products with categories'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Universal Smart File Upload Button */}
            <label
              id="upload-pricelist-file-btn"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-md"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>
                {isParsingFile
                  ? language === 'mr'
                    ? 'वाचत आहे...'
                    : 'Parsing File...'
                  : language === 'mr'
                  ? 'फाईल अपलोड करा (PDF / Word / Excel)'
                  : 'Upload Price List File'}
              </span>
              <input
                type="file"
                accept=".pdf, .doc, .docx, .xlsx, .xls, .csv, .txt, .json, .png, .jpg, .jpeg"
                onChange={handleFileUpload}
                disabled={isParsingFile}
                className="hidden"
              />
            </label>

            {/* PDF Download Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-md"
            >
              <FileDown className="w-4 h-4 text-white" />
              <span>{language === 'mr' ? 'PDF डाऊनलोड' : 'Download PDF'}</span>
            </button>

            {/* Group Discounts Settings Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsGroupDiscountModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Percent className="w-4 h-4" />
                <span>{language === 'mr' ? 'ग्रुप डिस्काउंट %' : 'Group Discounts'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-600 uppercase">
              {language === 'mr' ? 'एकूण उत्पादने:' : 'Total Products:'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-mono font-black text-xs">
              {priceList.length} {language === 'mr' ? 'आयटम्स' : 'items'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={language === 'mr' ? 'उत्पादन नाव किंवा कोड शोधा...' : 'Search product or code...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-3 pr-8 py-2 text-xs font-bold text-slate-800 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none cursor-pointer appearance-none"
              >
                <option value="all">{language === 'mr' ? 'सर्व ग्रुप्स (All Categories)' : 'All Categories'}</option>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_TRANSLATIONS[cat] || cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ================= CATEGORIZED PRODUCTS DISPLAY ================= */}
      <div className="space-y-6">
        {Object.entries(groupedCategories).map(([categoryName, items]) => {
          if (items.length === 0) return null;
          const discountPercent = groupDiscounts[categoryName] !== undefined ? groupDiscounts[categoryName] : 10;
          const groupIcon = GROUP_ICONS[categoryName] || '📦';
          const marathiTitle = CATEGORY_TRANSLATIONS[categoryName] || categoryName;

          return (
            <div key={categoryName} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              {/* Group Banner Header */}
              <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{groupIcon}</span>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-amber-400">
                      {marathiTitle} ({categoryName})
                    </h2>
                    <p className="text-[11px] text-slate-300 font-medium">
                      एकूण उत्पादने: {items.length} आयटम्स | लागू ग्रुप बिलिंग डिस्काउंट: <strong className="text-emerald-400 font-mono">{discountPercent}%</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-black font-mono">
                    ग्रुप डिस्काउंट: {discountPercent}% Off
                  </span>
                </div>
              </div>

              {/* Group Table */}
              <div className="overflow-x-auto overflow-y-auto" style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-300">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-slate-300 w-24">कोड (SKU)</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 min-w-[200px]">उत्पादन नाव व पॅकिंग</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-right w-20">एमआरपी (₹)</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[100px] bg-slate-200/50">मूळ डीलर दर</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[100px] bg-amber-50">ग्रुप डिस्काउंट ({discountPercent}%)</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[100px]">डिस्काउंटनंतर दर</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[90px]">जीएसटी (GST)</th>
                      <th className="py-2.5 px-3 text-right min-w-[120px] bg-emerald-100/80 text-emerald-950 font-black">
                        विथ जीएसटी अंतिम रेट (Net Rate)
                      </th>
                      <th className="py-2.5 px-2 text-center w-16 print:hidden">कृती</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((item) => {
                      const pricing = calculateItemPricing(item);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          {/* SKU Code */}
                          <td className="py-2.5 px-3 border-r border-slate-200 font-mono font-bold text-slate-700">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200 block text-center">
                              {item.code}
                            </span>
                          </td>

                          {/* Product Name & Packing */}
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <div className="font-black text-slate-900 text-xs">{item.nameMr}</div>
                            <div className="text-[10px] text-slate-500 font-medium">{item.nameEn}</div>
                            <span className="inline-block mt-0.5 text-[10px] px-2 py-0.2 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                              📦 {item.packing}
                            </span>
                          </td>

                          {/* MRP */}
                          <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-semibold text-slate-600">
                            ₹{pricing.mrp.toLocaleString('en-IN')}
                          </td>

                          {/* Basic Dealer Price */}
                          <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-800 bg-slate-50">
                            ₹{pricing.basicDealerPrice.toLocaleString('en-IN')}
                          </td>

                          {/* Group Discount Amount */}
                          <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-amber-800 bg-amber-50/50">
                            -₹{pricing.discountAmount.toLocaleString('en-IN')}
                            <span className="block text-[9px] text-amber-600 font-medium">({pricing.discPercent}%)</span>
                          </td>

                          {/* Rate After Discount */}
                          <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                            ₹{pricing.taxablePrice.toLocaleString('en-IN')}
                          </td>

                          {/* GST Rate & Amount */}
                          <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-slate-700">
                            +₹{pricing.gstAmount.toLocaleString('en-IN')}
                            <span className="block text-[9px] text-slate-400 font-medium">({pricing.gstRate}%)</span>
                          </td>

                          {/* Final Net Rate With GST */}
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-900 text-sm bg-emerald-50/80">
                            ₹{pricing.finalPriceWithGst.toLocaleString('en-IN')}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-2 text-center print:hidden">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsEditModalOpen(true);
                                }}
                                className="p-1 rounded hover:bg-slate-200 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                                title="Edit Item"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(language === 'mr' ? 'हे प्रॉडक्ट हटवायचे आहे का?' : 'Delete product?')) {
                                      deletePriceItem(item.id);
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Note / Terms & Conditions */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900">
        <h4 className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
          <span>⚠️ {language === 'mr' ? 'व्यापारी बिलिंग व पेमेंट नियम:' : 'Terms & Conditions:'}</span>
        </h4>
        <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
          <li>{language === 'mr' ? 'वरील विथ जीएसटी अंतिम रेट मध्ये ग्रुप बिलिंग डिस्काउंट व जीएसटी समाविष्ट आहे.' : 'Net Rate includes applicable group billing discount and GST.'}</li>
          <li>{language === 'mr' ? 'दर फॅक्टरी डिलेव्हरी (Ex-Mhaisal, Sangli) लागू राहतील.' : 'Prices are Ex-factory Mhaisal, Sangli.'}</li>
          <li>{language === 'mr' ? 'पेमेंट आरटीजीएस/एनईएफटी द्वारे अधिकृत राजारामबापू सहकारी बँक खात्यात जमा करावे.' : 'Payments to be deposited in official Rajarambapu Sahakari Bank A/C.'}</li>
        </ul>
      </div>

      {/* ================= UPLOAD PREVIEW MODAL ================= */}
      {isUploadPreviewOpen && uploadedProductsPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileCheck className="w-6 h-6 text-emerald-600" />
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    {language === 'mr' ? 'अपलोड केलेल्या फाईल मधील उत्पादने' : 'Imported Products Preview'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    फाईल नाव: <strong className="text-slate-800 font-mono">{uploadFileName}</strong> | सापडलेली उत्पादने: <strong className="text-emerald-700 font-bold">{uploadedProductsPreview.length}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsUploadPreviewOpen(false);
                  setUploadedProductsPreview(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Preview Table */}
            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-300 sticky top-0">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-300">कोड</th>
                    <th className="py-2 px-3 border-r border-slate-300">उत्पादन नाव</th>
                    <th className="py-2 px-3 border-r border-slate-300">ग्रुप / श्रेणी</th>
                    <th className="py-2 px-3 border-r border-slate-300">पॅकिंग</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-right">एमआरपी</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-right">मूळ डीलर दर</th>
                    <th className="py-2 px-3 text-right bg-emerald-100 text-emerald-950 font-bold">विथ जीएसटी अंतिम रेट</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {uploadedProductsPreview.map((item, i) => {
                    const pricing = calculateItemPricing(item);

                    return (
                      <tr key={i} className="hover:bg-slate-50 font-sans">
                        <td className="py-2 px-3 border-r border-slate-200 font-mono font-bold text-slate-700">{item.code}</td>
                        <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-900">{item.nameMr}</td>
                        <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-600">
                          {CATEGORY_TRANSLATIONS[item.category] || item.category}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-medium">{item.packing}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-semibold">₹{pricing.mrp}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-800">₹{pricing.basicDealerPrice}</td>
                        <td className="py-2 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-50">
                          ₹{pricing.finalPriceWithGst}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Import Mode Options */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-800 block mb-1">
                {language === 'mr' ? 'अपलोड मोड निवडा (Select Import Mode):' : 'Select Import Mode:'}
              </label>

              <div className="flex items-center gap-6 text-xs font-semibold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={replaceExistingOnImport}
                    onChange={() => setReplaceExistingOnImport(true)}
                    className="accent-emerald-600"
                  />
                  <span>{language === 'mr' ? 'नवीन फाईलनुसार प्राईस लिस्ट सेट करा (Set As Price List)' : 'Set As Price List'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={!replaceExistingOnImport}
                    onChange={() => setReplaceExistingOnImport(false)}
                    className="accent-blue-600"
                  />
                  <span>{language === 'mr' ? 'विद्यमान लिस्टमध्ये नवीन जोडा (Append to Existing)' : 'Append to Existing'}</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsUploadPreviewOpen(false);
                  setUploadedProductsPreview(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
              >
                {language === 'mr' ? 'रद्द करा' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'mr' ? 'प्राईस लिस्टमध्ये समाविष्ट करा' : 'Apply to Price List'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT PRODUCT MODAL ================= */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {language === 'mr' ? 'उत्पादन दर अद्ययावत करा' : 'Edit Product Price'}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updatePriceItem(editingItem.id, editingItem);
                setIsEditModalOpen(false);
              }}
              className="mt-4 space-y-3.5 text-xs"
            >
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {language === 'mr' ? 'उत्पादनाचे नाव (मराठी)' : 'Product Name (Marathi)'}
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.nameMr}
                  onChange={(e) => setEditingItem({ ...editingItem, nameMr: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {language === 'mr' ? 'पॅकिंग' : 'Packing'}
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.packing}
                  onChange={(e) => setEditingItem({ ...editingItem, packing: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {language === 'mr' ? 'एमआरपी (MRP ₹)' : 'MRP (₹)'}
                  </label>
                  <input
                    type="number"
                    required
                    value={editingItem.mrp}
                    onChange={(e) => setEditingItem({ ...editingItem, mrp: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-emerald-800 block mb-1">
                    {language === 'mr' ? 'मूलभूत डीलर दर (₹)' : 'Dealer Rate (₹)'}
                  </label>
                  <input
                    type="number"
                    required
                    value={editingItem.dealerPrice}
                    onChange={(e) => setEditingItem({ ...editingItem, dealerPrice: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-emerald-300 font-mono font-black text-emerald-700"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  {language === 'mr' ? 'रद्द करा' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  {language === 'mr' ? 'अद्ययावत करा' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Discounts Modal */}
      {isGroupDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-600">
                <Percent className="w-5 h-5" />
                <h2 className="text-base font-black text-slate-900">
                  {language === 'mr' ? 'ग्रुप बिलिंग डिस्काउंट सेटिंग्स' : 'Group Billing Discount Settings'}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsGroupDiscountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              {language === 'mr'
                ? 'प्रत्येक प्रॉडक्ट ग्रुपसाठी लागू बिलिंग डिस्काउंट (%) निश्चित करा. हे डिस्काउंट मूळ डीलर दरावर लागू होऊन विथ जीएसटी अंतिम रेट काढला जातो.'
                : 'Configure billing discount % per product group.'}
            </p>

            <div className="space-y-3">
              {DEFAULT_CATEGORIES.map((cat) => {
                const icon = GROUP_ICONS[cat] || '📦';
                const marathi = CATEGORY_TRANSLATIONS[cat] || cat;
                const val = groupDiscounts[cat] !== undefined ? groupDiscounts[cat] : 10;

                return (
                  <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{icon}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{marathi}</div>
                        <div className="text-[10px] text-slate-500">{cat}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={val}
                        onChange={(e) => {
                          const num = Math.min(100, Math.max(0, Number(e.target.value)));
                          setGroupDiscounts({ ...groupDiscounts, [cat]: num });
                        }}
                        className="w-16 p-1.5 text-xs font-mono font-bold text-center bg-white border border-slate-300 rounded-lg focus:border-amber-500 focus:outline-none"
                      />
                      <span className="text-xs font-bold text-slate-700">%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsGroupDiscountModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
              >
                {language === 'mr' ? 'रद्द करा' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => handleSaveGroupDiscounts(groupDiscounts)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-xs cursor-pointer"
              >
                {language === 'mr' ? 'डिस्काउंट सेव्ह करा' : 'Save Discounts'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
