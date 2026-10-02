import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { PriceListItem } from '../types';
import { CompanyLetterhead } from './CompanyLetterhead';
import { exportElementToPDF } from '../utils/printHelpers';
import { parsePriceListFile, isJunkHeaderOrTerms, detectOrCleanCategory } from '../utils/priceListParser';
import { safeMergePriceList, isProductMatch } from '../utils/productMatching';
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
  Copy,
  Check,
  Plus,
  Eye,
  Calculator,
  Printer,
} from 'lucide-react';

const DEFAULT_GROUP_DISCOUNTS: Record<string, number> = {
  'Group A': 10,
  'Speciality': 10,
  'Group B': 10,
  'Group C': 10,
};

// Strictly the 4 core business groups:
// 1. Group A - Water Soluble Fertilizers
// 2. Specialty Grades
// 3. Group B – Micronutrients
// 4. Group C - Bio-Stimulants & Organic
const DEFAULT_CATEGORIES = [
  'Group A',
  'Speciality',
  'Group B',
  'Group C',
];

const CATEGORY_TITLES_OFFICIAL: Record<string, string> = {
  'Group A': 'Group A - Water Soluble Fertilizers',
  'Speciality': 'Specialty Grades',
  'Speciality Grades': 'Specialty Grades',
  'Speciality Grade D': 'Specialty Grades',
  'Group D': 'Specialty Grades',
  'Group B': 'Group B – Micronutrients',
  'Group C': 'Group C - Bio-Stimulants & Soil Conditioners',
};

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'Group A': 'ग्रुप ए - वॉटर सॉल्युबल खते (Group A)',
  'Speciality': 'स्पेशालिटी ग्रेड्स (Specialty Grades)',
  'Speciality Grades': 'स्पेशालिटी ग्रेड्स (Specialty Grades)',
  'Speciality Grade D': 'स्पेशालिटी ग्रेड्स (Specialty Grades)',
  'Group D': 'स्पेशालिटी ग्रेड्स (Specialty Grades)',
  'Group B': 'ग्रुप बी – सूक्ष्म अन्नद्रव्ये (Group B)',
  'Group C': 'ग्रुप सी - बायो-स्टिम्युलंट्स व सेंद्रिय (Group C)',
};

const GROUP_ICONS: Record<string, string> = {
  'Group A': '🅰️',
  'Speciality': '⭐',
  'Speciality Grades': '⭐',
  'Speciality Grade D': '⭐',
  'Group D': '⭐',
  'Group B': '🅱️',
  'Group C': '🅲',
};

export const PriceList: React.FC = React.memo(() => {
  const {
    language,
    priceList,
    updatePriceItem,
    deletePriceItem,
    addPriceItem,
    importBulkPriceItems,
    currentUser,
    companyDetails,
  } = useApp();

  const isAdmin = currentUser
    ? currentUser.role === 'admin' ||
      currentUser.loginId === 'admin' ||
      currentUser.id === 'USR-001'
    : false;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'document' | 'calculator'>('document');
  const [isGroupDiscountModalOpen, setIsGroupDiscountModalOpen] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null);

  // Effective price list period date range
  const [effectivePeriod, setEffectivePeriod] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const formatDate = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };
    return `01/10/2026 to 31/10/2026`;
  });

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

  // Editing / Adding item modal state
  const [editingItem, setEditingItem] = useState<PriceListItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Item Form state
  const [newItemData, setNewItemData] = useState<Partial<PriceListItem>>({
    code: '',
    nameMr: '',
    nameEn: '',
    category: 'Group A',
    packing: '1Kg * 25 Nos',
    mrp: 350,
    dealerPrice: 200,
    distributorPrice: 200,
    gstRate: 5,
    hsnCode: '31052000',
    inStock: true,
    minOrderQty: 1,
  });

  // Calculate pricing breakdown
  const calculateItemPricing = (item: PriceListItem | Omit<PriceListItem, 'id'>) => {
    const mrp = Number(item.mrp) || 0;
    const basicDealerPrice = Number(item.dealerPrice) || 0;

    const cat = item.category || 'Group A';
    const discPercent =
      item.groupDiscountPercent !== undefined
        ? item.groupDiscountPercent
        : groupDiscounts[cat] !== undefined
        ? groupDiscounts[cat]
        : 10;

    const discountAmount = Number(((basicDealerPrice * discPercent) / 100).toFixed(2));
    const taxablePrice = Math.max(0, basicDealerPrice - discountAmount);

    const gstRate = Number(item.gstRate) || 5;
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

  // One-click copy product name to clipboard
  const handleCopyProductName = (name: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      navigator.clipboard.writeText(name);
      setCopiedProductId(id);
      setTimeout(() => {
        setCopiedProductId(null);
      }, 2000);
    } catch (err) {
      console.warn('Clipboard error:', err);
    }
  };

  // Universal Smart Multi-Format File Reader (Excel XLSX/XLS, CSV, TSV, PDF, TXT, JSON)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setIsParsingFile(true);

    try {
      const { products } = await parsePriceListFile(file);

      if (products.length === 0) {
        alert(
          language === 'mr'
            ? 'अपलोड केलेल्या फाईलमध्ये उत्पादने सापडली नाहीत. कृपया वैध फॉरमॅटमधील फाईल जोडा (Excel, CSV, PDF, TXT, किंवा JSON).'
            : 'No products found in uploaded file. Please select a valid file (Excel, CSV, PDF, TXT, or JSON).'
        );
      } else {
        setUploadedProductsPreview(products);
        setIsUploadPreviewOpen(true);
      }
    } catch (err) {
      console.error('File parsing error:', err);
      alert(
        language === 'mr'
          ? 'फाईल वाचताना त्रुटी आली. कृपया फाईल डेटा तपासून पुन्हा प्रयत्न करा.'
          : 'Error reading file. Please check file format and try again.'
      );
    } finally {
      setIsParsingFile(false);
      e.target.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!uploadedProductsPreview || uploadedProductsPreview.length === 0) return;
    importBulkPriceItems(uploadedProductsPreview, replaceExistingOnImport);
    setIsUploadPreviewOpen(false);
    setUploadedProductsPreview(null);
  };

  const handleSaveNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemData.nameMr && !newItemData.nameEn) {
      alert('कृपया उत्पादन नाव प्रविष्ट करा.');
      return;
    }
    const item: PriceListItem = {
      id: `PROD-${Date.now().toString(36).toUpperCase()}`,
      code: newItemData.code || 'A 1.',
      nameMr: newItemData.nameMr || newItemData.nameEn || 'नवीन उत्पादन',
      nameEn: newItemData.nameEn || newItemData.nameMr || 'New Product',
      category: newItemData.category || 'Group A',
      packing: newItemData.packing || '1 Kg',
      mrp: Number(newItemData.mrp) || 0,
      dealerPrice: Number(newItemData.dealerPrice) || 0,
      distributorPrice: Number(newItemData.distributorPrice) || Number(newItemData.dealerPrice) || 0,
      gstRate: Number(newItemData.gstRate) || 5,
      hsnCode: newItemData.hsnCode || '31052000',
      inStock: true,
      minOrderQty: 1,
      descriptionMr: newItemData.descriptionMr || '',
      descriptionEn: newItemData.descriptionEn || '',
    };
    addPriceItem(item);
    setIsAddModalOpen(false);
    setNewItemData({
      code: '',
      nameMr: '',
      nameEn: '',
      category: 'Group A',
      packing: '1Kg * 25 Nos',
      mrp: 350,
      dealerPrice: 200,
      distributorPrice: 200,
      gstRate: 5,
      hsnCode: '31052000',
      inStock: true,
      minOrderQty: 1,
    });
  };

  const filteredItems = useMemo(() => {
    return priceList.filter((item) => {
      // Exclude junk table header or terms rows
      if (isJunkHeaderOrTerms(item.nameMr) && isJunkHeaderOrTerms(item.nameEn)) {
        return false;
      }
      const normCat = detectOrCleanCategory(item.category, item.nameMr || item.nameEn);
      const matchesSearch =
        searchTerm === '' ||
        item.nameMr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.hsnCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.packing?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = selectedCategory === 'all' || normCat === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [priceList, searchTerm, selectedCategory]);

  // Strictly group into the 4 requested business categories: Group A, Speciality, Group B, Group C
  const groupedCategories = useMemo(() => {
    return DEFAULT_CATEGORIES.reduce<Record<string, PriceListItem[]>>((acc, cat) => {
      const items = filteredItems.filter((i) => {
        const normCat = detectOrCleanCategory(i.category, i.nameMr || i.nameEn);
        return normCat === cat;
      });
      if (items.length > 0) {
        acc[cat] = items;
      }
      return acc;
    }, {});
  }, [filteredItems]);

  const handleExportPDF = async () => {
    await exportElementToPDF(
      'pricelist-official-document-view',
      `Blackworm_Pricelist_${effectivePeriod.replace(/[^a-zA-Z0-9]/g, '_')}`,
      {
        orientation: 'portrait',
        scale: 2,
      }
    );
  };

  // Helper to split product name into Brand name (e.g. Airawat®, Microgrip®) and grade / formula for colored styling
  const renderStyledProductName = (name: string, id: string) => {
    const isCopied = copiedProductId === id;
    
    // Check if name contains registered mark or brand pattern
    const brandMatch = name.match(/^([A-Za-z0-9\s]+®?)\s*(.*)$/);
    const brandPart = brandMatch ? brandMatch[1] : '';
    const formulaPart = brandMatch ? brandMatch[2] : name;

    const isAirawat = name.toLowerCase().includes('airawat');
    const isMicrogrip = name.toLowerCase().includes('microgrip');
    const isBW = name.toLowerCase().includes('bw') || name.toLowerCase().includes('blackworm');
    const isNutri = name.toLowerCase().includes('nutri');

    return (
      <div className="flex items-center justify-between gap-1 group/item">
        <div className="text-left">
          {brandPart ? (
            <div>
              <span className={`font-black text-xs ${isAirawat ? 'text-amber-600' : isMicrogrip ? 'text-amber-700' : isBW ? 'text-emerald-700' : 'text-slate-800'}`}>
                {brandPart}
              </span>
              {formulaPart && (
                <span className="font-black text-xs text-blue-700 ml-1">
                  {formulaPart}
                </span>
              )}
            </div>
          ) : (
            <span className="font-black text-xs text-slate-900">{name}</span>
          )}
        </div>

        {/* Copy Product Name Action Button */}
        <button
          type="button"
          onClick={(e) => handleCopyProductName(name, id, e)}
          title="उत्पादन नाव कॉपी करा (Copy Product Name)"
          className={`shrink-0 p-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${
            isCopied
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'opacity-40 group-hover/item:opacity-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          {isCopied ? (
            <>
              <Check className="w-3 h-3 text-white" />
              <span className="text-[9px]">कॉपी झाले</span>
            </>
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 pb-16">
      {/* Top Control Header Bar (Hidden in Print) */}
      <div className="print:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {language === 'mr' ? 'प्राईस लिस्ट' : 'Price List'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-black text-[11px] border border-emerald-300">
                  {priceList.length} Products
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                अधिकृत होलसेल दर पत्रक | {effectivePeriod}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* View Mode Toggle: Document View vs Live Billing Calculator */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('document')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  viewMode === 'document'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'mr' ? 'डॉक्युमेंट व्ह्यू' : 'Document View'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('calculator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  viewMode === 'calculator'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-blue-600" />
                <span>{language === 'mr' ? 'कॅल्क्युलेटर व्ह्यू' : 'Billing Math View'}</span>
              </button>
            </div>

            {/* Universal Smart File Upload Button */}
            <label
              id="upload-pricelist-file-btn"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Upload Price List file (Excel, CSV, PDF, Text)"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {isParsingFile
                  ? language === 'mr'
                    ? 'अपलोड होत आहे...'
                    : 'Uploading...'
                  : language === 'mr'
                  ? 'अपलोड'
                  : 'Upload'}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.pdf,.txt,.json,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/json"
                onChange={handleFileUpload}
                disabled={isParsingFile}
                className="hidden"
              />
            </label>

            {/* PDF Download Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <FileDown className="w-3.5 h-3.5 text-white" />
              <span>{language === 'mr' ? 'डाउनलोड' : 'Download'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all active:scale-95 cursor-pointer border border-slate-300"
              title="Print Price List"
            >
              <Printer className="w-3.5 h-3.5 text-slate-700" />
            </button>

            {/* Add Product Button (Admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'mr' ? 'नवीन प्रॉडक्ट' : 'Add Item'}</span>
              </button>
            )}

            {/* Group Discounts Settings Button (Admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsGroupDiscountModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Percent className="w-3.5 h-3.5" />
                <span>{language === 'mr' ? 'ग्रुप डिस्काउंट %' : 'Discounts'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={language === 'mr' ? 'उत्पादन नाव, HSN किंवा कोड शोधा...' : 'Search product, HSN, code...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-3 pr-8 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none cursor-pointer appearance-none"
              >
                <option value="all">{language === 'mr' ? 'सर्व ग्रुप्स (All Groups)' : 'All Groups'}</option>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_TRANSLATIONS[cat] || cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Quick Date Range Editor */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-bold text-slate-600">कालावधी (w.e.f):</span>
              <input
                type="text"
                value={effectivePeriod}
                onChange={(e) => setEffectivePeriod(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-mono font-bold text-blue-700 bg-slate-50 focus:outline-none w-48 text-center"
              />
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DOCUMENT VIEW (IDENTICAL TO USER PHOTO DOCUMENT) */}
      {/* ========================================================================= */}
      {viewMode === 'document' && (
        <div
          id="pricelist-official-document-view"
          className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-300 shadow-md max-w-4xl mx-auto space-y-6 text-slate-900 font-sans"
        >
          {/* Header section matching exact photo */}
          <div className="text-center space-y-1 border-b pb-4 border-slate-300">
            <div className="text-xs font-serif font-black italic text-slate-800">
              !! Shri !!
            </div>

            <div className="flex items-center justify-center gap-4 pt-1">
              {companyDetails.logoUrl && (
                <img
                  src={companyDetails.logoUrl}
                  alt="Blackworm Logo"
                  className="w-16 h-16 object-contain"
                />
              )}
              <div className="text-left">
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-950 font-serif">
                  BLACKWORM AGRITECH PVT LTD
                </h1>
                <div className="text-[11px] font-bold text-slate-700">
                  <span>CIN : {companyDetails.cin || 'U01409PN2022PTC217246'}</span>,{' '}
                  <span>GST No. {companyDetails.gstNo || '27AALCB3069J1ZC'}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-medium text-slate-800 pt-1">
              <strong>Address</strong> - {companyDetails.address || 'Gat No. 17 Vijaynagar (Mhaisal), Tal - Miraj, Dist - Sangli.416409.'}
            </div>
            <div className="text-[11px] font-medium text-slate-800">
              <strong>Ph :</strong> {companyDetails.phone || '+91 7798716201'},{' '}
              <strong>E-Mail :</strong>{' '}
              <span className="text-blue-700 underline">
                {companyDetails.email || 'blackwormagritechpvtltd@gmail.com'}
              </span>
            </div>

            {/* Blue Pricelist w.e.f subheader */}
            <div className="pt-3 pb-1">
              <span className="text-xs font-black text-blue-700 tracking-wide font-serif">
                Pricelist w.e.f {effectivePeriod}
              </span>
            </div>
          </div>

          {/* Render Sections in exact order as document */}
          {Object.entries(groupedCategories).map(([categoryName, items]) => {
            const officialHeader = CATEGORY_TITLES_OFFICIAL[categoryName] || categoryName;

            return (
              <div key={categoryName} className="space-y-2 pt-2">
                {/* Green Underlined Category Header */}
                <h3 className="text-xs sm:text-sm font-black text-emerald-800 underline tracking-wide">
                  {officialHeader}
                </h3>

                {/* Table with crisp black borders identical to photo */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse border border-slate-900">
                    <thead>
                      <tr className="bg-white text-slate-950 font-black text-[11px] border-b border-slate-900 text-center">
                        <th className="py-1.5 px-2 border border-slate-900 w-14">Sr. No.</th>
                        <th className="py-1.5 px-3 border border-slate-900 min-w-[180px] text-left">Product Name</th>
                        <th className="py-1.5 px-2 border border-slate-900 w-24">HSN</th>
                        <th className="py-1.5 px-3 border border-slate-900 w-32">Packing Size</th>
                        <th className="py-1.5 px-3 border border-slate-900 w-24">Rate</th>
                        <th className="py-1.5 px-2 border border-slate-900 w-20">GST Rate</th>
                        <th className="py-1.5 px-3 border border-slate-900 w-24">MRP</th>
                        {isAdmin && <th className="py-1.5 px-1 border border-slate-900 w-12 print:hidden">Edit</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        return (
                          <tr key={item.id} className="border-b border-slate-900 hover:bg-slate-50 transition-colors">
                            {/* Sr. No. */}
                            <td className="py-1.5 px-2 border border-slate-900 text-center font-bold text-slate-900 text-xs whitespace-nowrap">
                              {item.code || `${categoryName.charAt(0)} ${idx + 1}.`}
                            </td>

                            {/* Product Name with Brand & Grade colored font & copy action */}
                            <td className="py-1.5 px-3 border border-slate-900">
                              {renderStyledProductName(item.nameMr || item.nameEn, item.id)}
                            </td>

                            {/* HSN Code */}
                            <td className="py-1.5 px-2 border border-slate-900 text-center font-mono font-medium text-slate-800 text-xs">
                              {item.hsnCode || '31052000'}
                            </td>

                            {/* Packing Size */}
                            <td className="py-1.5 px-3 border border-slate-900 text-center font-bold text-slate-900 text-xs">
                              {item.packing}
                            </td>

                            {/* Rate with /- format */}
                            <td className="py-1.5 px-3 border border-slate-900 text-center font-black text-slate-950 text-xs">
                              {item.dealerPrice}/-
                            </td>

                            {/* GST Rate with % */}
                            <td className="py-1.5 px-2 border border-slate-900 text-center font-bold text-slate-900 text-xs">
                              {item.gstRate} %
                            </td>

                            {/* MRP with /- format */}
                            <td className="py-1.5 px-3 border border-slate-900 text-center font-black text-slate-950 text-xs">
                              {item.mrp}/-
                            </td>

                            {/* Admin edit button */}
                            {isAdmin && (
                              <td className="py-1 px-1 border border-slate-900 text-center print:hidden">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setIsEditModalOpen(true);
                                  }}
                                  className="p-1 rounded hover:bg-slate-200 text-slate-600 hover:text-emerald-700"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Specific Terms & Conditions under Specialty Grades as on photo */}
                {categoryName === 'Speciality' && (
                  <div className="pt-2 text-[11px] text-slate-900 space-y-0.5">
                    <strong className="block text-xs font-black">Terms & Conditions:-</strong>
                    <div className="pl-3 space-y-0.5 font-medium">
                      <p>➤ GST rate will be extra charged on Invoice/ Dealer rate.</p>
                      <p>➤ Credit Period 8 Days.</p>
                      <p>➤ Rates upto stock availability.</p>
                      <p>➤ Once sold material will not be taken back.</p>
                      <p>➤ Subject to Sangli Jurisdiction.</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* General Footer Note */}
          <div className="border-t pt-3 border-slate-300 flex items-center justify-between text-[11px] text-slate-600 font-medium">
            <span>अधिकृत दर सूची | Blackworm Agritech Pvt Ltd</span>
            <span>तारीख: {new Date().toLocaleDateString('mr-IN')}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE BILLING & DISCOUNT CALCULATOR VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'calculator' && (
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
                    <span className="text-2xl">{groupIcon}</span>
                    <div>
                      <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-emerald-400">
                        {marathiTitle}
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

                {/* Group Table with detailed math */}
                <div className="overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-300">
                      <tr>
                        <th className="py-2.5 px-3 border-r border-slate-300 w-20">कोड</th>
                        <th className="py-2.5 px-3 border-r border-slate-300 min-w-[200px]">उत्पादन नाव व पॅकिंग</th>
                        <th className="py-2.5 px-3 border-r border-slate-300 text-center w-24">HSN</th>
                        <th className="py-2.5 px-3 border-r border-slate-300 text-right w-20">एमआरपी (₹)</th>
                        <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[90px] bg-slate-200/50">मूळ दर</th>
                        <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[100px] bg-amber-50">ग्रुप डिस्काउंट ({discountPercent}%)</th>
                        <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[90px]">टॅक्सेबल दर</th>
                        <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[80px]">जीएसटी</th>
                        <th className="py-2.5 px-3 text-right min-w-[120px] bg-emerald-100/80 text-emerald-950 font-black">
                          अंतिम बिलिंग रेट
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
                              {renderStyledProductName(item.nameMr || item.nameEn, item.id)}
                              <span className="inline-block mt-0.5 text-[10px] px-2 py-0.2 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                📦 {item.packing}
                              </span>
                            </td>

                            {/* HSN */}
                            <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono text-slate-600">
                              {item.hsnCode || '31052000'}
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
                                  className="p-1 rounded hover:bg-slate-200 text-slate-600 hover:text-emerald-700 transition-colors"
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
                                    className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
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
      )}

      {/* ================= UPLOAD PREVIEW MODAL ================= */}
      {isUploadPreviewOpen && uploadedProductsPreview && (
        (() => {
          const mergeStats = safeMergePriceList(priceList, uploadedProductsPreview, {
            replaceCatalog: replaceExistingOnImport,
          });

          return (
            <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-6 h-6 text-emerald-600" />
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        {language === 'mr' ? 'अपलोड केलेल्या फाईल मधील उत्पादने (Price List Import)' : 'Imported Products Preview'}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        फाईल नाव: <strong className="text-slate-800 font-mono">{uploadFileName}</strong>
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

                {/* Import Statistics Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-500">फाईलमधील एकूण</div>
                    <div className="text-base font-black text-slate-800">{uploadedProductsPreview.length} उत्पादने</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="text-[10px] uppercase font-bold text-amber-700">अद्ययावत (Update)</div>
                    <div className="text-base font-black text-amber-800">{mergeStats.updatedCount} जुनी उत्पादने</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="text-[10px] uppercase font-bold text-emerald-700">नवीन जोडली जाणारी</div>
                    <div className="text-base font-black text-emerald-800">{mergeStats.addedCount} नवीन उत्पादने</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="text-[10px] uppercase font-bold text-blue-700">सुरक्षित कायम राहणारी</div>
                    <div className="text-base font-black text-blue-800">
                      {replaceExistingOnImport ? 0 : Math.max(0, priceList.length - mergeStats.updatedCount)} उत्पादने
                    </div>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-300 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 border-r border-slate-300">कोड</th>
                        <th className="py-2 px-3 border-r border-slate-300">उत्पादन नाव</th>
                        <th className="py-2 px-3 border-r border-slate-300">ग्रुप</th>
                        <th className="py-2 px-3 border-r border-slate-300">पॅकिंग</th>
                        <th className="py-2 px-3 border-r border-slate-300 text-right">दर (Rate)</th>
                        <th className="py-2 px-3 border-r border-slate-300 text-center">GST %</th>
                        <th className="py-2 px-3 text-right">एमआरपी</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {uploadedProductsPreview.map((item, i) => {
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 border-r border-slate-200 font-mono font-bold text-slate-700">
                              {item.code}
                            </td>
                            <td className="py-1.5 px-3 border-r border-slate-200 font-bold text-slate-900">
                              {item.nameMr || item.nameEn}
                            </td>
                            <td className="py-1.5 px-3 border-r border-slate-200">
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 border-r border-slate-200 font-bold text-slate-700">
                              {item.packing}
                            </td>
                            <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono font-black text-slate-900">
                              ₹{item.dealerPrice}/-
                            </td>
                            <td className="py-1.5 px-3 border-r border-slate-200 text-center font-bold text-slate-700">
                              {item.gstRate}%
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-700">
                              ₹{item.mrp}/-
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Import Mode Options */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={replaceExistingOnImport}
                      onChange={(e) => setReplaceExistingOnImport(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>
                      {language === 'mr'
                        ? 'संपूर्ण प्राईस लिस्ट या फाईलने अद्ययावत करा (Replace entire catalog)'
                        : 'Replace existing catalog with uploaded file'}
                    </span>
                  </label>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUploadPreviewOpen(false);
                        setUploadedProductsPreview(null);
                      }}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
                    >
                      रद्द करा (Cancel)
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                    >
                      आयात पूर्ण करा (Import {uploadedProductsPreview.length} Items)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* ================= GROUP DISCOUNTS MODAL ================= */}
      {isGroupDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-slate-900 text-base">ग्रुप बिलिंग डिस्काउंट (%)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGroupDiscountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {DEFAULT_CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-xs text-slate-800">
                    {GROUP_ICONS[cat] || '📦'} {CATEGORY_TRANSLATIONS[cat] || cat}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={groupDiscounts[cat] !== undefined ? groupDiscounts[cat] : 10}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setGroupDiscounts((prev) => ({ ...prev, [cat]: val }));
                      }}
                      className="w-16 px-2 py-1 text-center font-mono font-bold text-xs border border-slate-300 rounded-lg bg-white"
                    />
                    <span className="text-xs font-bold text-slate-600">%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsGroupDiscountModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={() => handleSaveGroupDiscounts(groupDiscounts)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md"
              >
                जतन करा (Save)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT / ADD PRODUCT MODAL ================= */}
      {(isEditModalOpen || isAddModalOpen) && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-base">
                {isEditModalOpen ? 'उत्पादन माहिती संपादित करा' : 'नवीन उत्पादन जोडा'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setIsAddModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                if (isEditModalOpen && editingItem) {
                  e.preventDefault();
                  updatePriceItem(editingItem.id, editingItem);
                  setIsEditModalOpen(false);
                } else {
                  handleSaveNewItem(e);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">कोड (Sr. No / SKU):</label>
                  <input
                    type="text"
                    required
                    value={isEditModalOpen ? editingItem?.code : newItemData.code}
                    onChange={(e) =>
                      isEditModalOpen
                        ? setEditingItem((prev) => (prev ? { ...prev, code: e.target.value } : null))
                        : setNewItemData((prev) => ({ ...prev, code: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                    placeholder="e.g. A 1."
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ग्रुप (Category):</label>
                  <select
                    value={isEditModalOpen ? editingItem?.category : newItemData.category}
                    onChange={(e) =>
                      isEditModalOpen
                        ? setEditingItem((prev) => (prev ? { ...prev, category: e.target.value } : null))
                        : setNewItemData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_TRANSLATIONS[c] || c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">उत्पादन नाव (Product Name):</label>
                <input
                  type="text"
                  required
                  value={isEditModalOpen ? editingItem?.nameMr : newItemData.nameMr}
                  onChange={(e) =>
                    isEditModalOpen
                      ? setEditingItem((prev) => (prev ? { ...prev, nameMr: e.target.value, nameEn: e.target.value } : null))
                      : setNewItemData((prev) => ({ ...prev, nameMr: e.target.value, nameEn: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                  placeholder="e.g. Airawat® 19:19:19"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">पॅकिंग साईज (Packing):</label>
                  <input
                    type="text"
                    required
                    value={isEditModalOpen ? editingItem?.packing : newItemData.packing}
                    onChange={(e) =>
                      isEditModalOpen
                        ? setEditingItem((prev) => (prev ? { ...prev, packing: e.target.value } : null))
                        : setNewItemData((prev) => ({ ...prev, packing: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                    placeholder="e.g. 1Kg * 25 Nos / 25 Kg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">HSN Code:</label>
                  <input
                    type="text"
                    value={isEditModalOpen ? editingItem?.hsnCode : newItemData.hsnCode}
                    onChange={(e) =>
                      isEditModalOpen
                        ? setEditingItem((prev) => (prev ? { ...prev, hsnCode: e.target.value } : null))
                        : setNewItemData((prev) => ({ ...prev, hsnCode: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                    placeholder="e.g. 31052000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">दर / Rate (₹):</label>
                  <input
                    type="number"
                    required
                    value={isEditModalOpen ? editingItem?.dealerPrice : newItemData.dealerPrice}
                    onChange={(e) =>
                      isEditModalOpen
                        ? setEditingItem((prev) => (prev ? { ...prev, dealerPrice: Number(e.target.value) } : null))
                        : setNewItemData((prev) => ({ ...prev, dealerPrice: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">GST Rate (%):</label>
                  <input
                    type="number"
                    required
                    value={isEditModalOpen ? editingItem?.gstRate : newItemData.gstRate}
                    onChange={(e) =>
                      isEditModalOpen
                        ? setEditingItem((prev) => (prev ? { ...prev, gstRate: Number(e.target.value) } : null))
                        : setNewItemData((prev) => ({ ...prev, gstRate: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">एमआरपी MRP (₹):</label>
                  <input
                    type="number"
                    required
                    value={isEditModalOpen ? editingItem?.mrp : newItemData.mrp}
                    onChange={(e) =>
                      isEditModalOpen
                        ? setEditingItem((prev) => (prev ? { ...prev, mrp: Number(e.target.value) } : null))
                        : setNewItemData((prev) => ({ ...prev, mrp: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setIsAddModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
                >
                  जतन करा (Save)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

PriceList.displayName = 'PriceList';
