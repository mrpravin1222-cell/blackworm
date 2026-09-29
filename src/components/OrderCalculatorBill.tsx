import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CompanyLetterhead } from './CompanyLetterhead';
import { exportElementToPDF, exportElementToPrintOrPDF, triggerPrint } from '../utils/printHelpers';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import {
  Calculator,
  Plus,
  Trash2,
  Printer,
  FileCheck,
  Building2,
  CreditCard,
  Percent,
  CheckCircle2,
  RotateCcw,
  Download,
} from 'lucide-react';

interface OrderLineItem {
  id: string;
  productId: string;
  productName: string;
  packing: string;
  rateType: 'dealer' | 'distributor' | 'mrp';
  rate: number;
  quantity: number;
  gstRate: number;
  total: number;
}

export const OrderCalculatorBill: React.FC = () => {
  const { language, priceList, dealerApplications, companyDetails, currentUser } = useApp();

  const [customerType, setCustomerType] = useState<'dealer' | 'farmer'>('dealer');
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [billNumber, setBillNumber] = useState(`BW-BILL-${Date.now().toString().slice(-4)}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [cashDiscount, setCashDiscount] = useState(0);

  // Line items
  const [items, setItems] = useState<OrderLineItem[]>([
    {
      id: '1',
      productId: priceList[0]?.id || '',
      productName: priceList[0]?.nameMr || 'सेंद्रिय गांडूळखत (Vermicompost)',
      packing: priceList[0]?.packing || '50 Kg Bag',
      rateType: 'dealer',
      rate: priceList[0]?.dealerPrice || 450,
      quantity: 50,
      gstRate: priceList[0]?.gstRate || 5,
      total: (priceList[0]?.dealerPrice || 450) * 50,
    },
  ]);

  // Handle dealer selection
  const handleDealerChange = (id: string) => {
    setSelectedDealerId(id);
    const dealer = dealerApplications.find((d) => d.id === id);
    if (dealer) {
      setCustomerName(`${dealer.firmName} (${dealer.proprietorName})`);
      setCustomerMobile(dealer.mobile);
      setCustomerAddress(`${dealer.shopAddress}, ${dealer.taluka}, ${dealer.district}`);
    }
  };

  const handleAddItem = () => {
    const defaultProduct = priceList[0];
    if (!defaultProduct) return;
    const newItem: OrderLineItem = {
      id: Date.now().toString(),
      productId: defaultProduct.id,
      productName: defaultProduct.nameMr,
      packing: defaultProduct.packing,
      rateType: 'dealer',
      rate: defaultProduct.dealerPrice,
      quantity: 10,
      gstRate: defaultProduct.gstRate,
      total: defaultProduct.dealerPrice * 10,
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof OrderLineItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'productId') {
          const prod = priceList.find((p) => p.id === value);
          if (prod) {
            updated.productName = prod.nameMr;
            updated.packing = prod.packing;
            updated.rate = item.rateType === 'mrp' ? prod.mrp : item.rateType === 'distributor' ? prod.distributorPrice : prod.dealerPrice;
            updated.gstRate = prod.gstRate;
          }
        }
        if (field === 'rateType') {
          const prod = priceList.find((p) => p.id === item.productId);
          if (prod) {
            updated.rate = value === 'mrp' ? prod.mrp : value === 'distributor' ? prod.distributorPrice : prod.dealerPrice;
          }
        }
        updated.total = updated.rate * updated.quantity;
        return updated;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100) + cashDiscount;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const gstAmount = Math.round(
    items.reduce((sum, item) => {
      const itemTax = (item.total * (item.gstRate / 100));
      return sum + itemTax;
    }, 0)
  );
  const grandTotal = taxableAmount + gstAmount;

  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  const handlePrint = () => {
    setIsPrintPreviewOpen(true);
  };

  const handleDedicatedPDF = async () => {
    await exportElementToPDF('order-bill-printable-container', `Invoice_${billNumber}`);
  };

  return (
    <div id="order-bill-printable-container" className="space-y-6 animate-in fade-in duration-150">
      {/* Printable Invoice Header */}
      <div className="print:block hidden mb-4">
        <CompanyLetterhead showBankDetails={true} />
        <div className="text-center my-3 pb-2 border-b border-slate-300">
          <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">
            अधिकृत खरेदी ऑर्डर व प्रोफॉर्मा बिल (Order Estimate & Proforma Invoice)
          </h2>
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>बिल क्रमांक: <strong>{billNumber}</strong></span>
            <span>दिनांक: <strong>{billDate}</strong></span>
          </div>
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {language === 'mr' ? 'ऑर्डर कॅल्क्युलेटर व बिल (Order Calculator & Bill)' : 'Order Calculator & Billing'}
            </h1>
            <p className="text-xs text-slate-500">
              {language === 'mr'
                ? 'डीलर/शेतकऱ्यांसाठी त्वरित दर, जीएसटी, सवलत गणना आणि अधिकृत पावती/बिल निर्मिती'
                : 'Instant order calculation, discount engine, tax breakdown, and professional invoicing'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDedicatedPDF}
            className="flex items-center gap-1.5 px-3.5 py-2.2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>PDF डाउनलोड</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'mr' ? '🖨️ प्रिंट A4' : 'Print A4'}</span>
          </button>
        </div>
      </div>

      {/* Customer / Dealer Selector */}
      <div className="print:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>{language === 'mr' ? 'ग्राहक / डीलर तपशील' : 'Customer & Dealer Details'}</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCustomerType('dealer')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                customerType === 'dealer' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              डीलर (Dealer)
            </button>
            <button
              onClick={() => setCustomerType('farmer')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                customerType === 'farmer' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              थेट शेतकरी (Direct Farmer)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {customerType === 'dealer' && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">नोंदणीकृत डीलर निवडा</label>
              <select
                value={selectedDealerId}
                onChange={(e) => handleDealerChange(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="">-- डीलर निवडा --</option>
                {dealerApplications.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.firmName} ({d.taluka})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700 block mb-1">ग्राहकाचे नाव *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="उदा. म्हैसाळ कृषी सेवा केंद्र"
              className="w-full p-2 rounded-xl border border-slate-200 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">मोबाईल नंबर</label>
            <input
              type="text"
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
              placeholder="+91 9800000000"
              className="w-full p-2 rounded-xl border border-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">पत्ता / गाव</label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="उदा. म्हैसाळ, ता. मिरज"
              className="w-full p-2 rounded-xl border border-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Bill Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            {language === 'mr' ? 'ऑर्डर आयटम्स व दर गणना' : 'Order Calculation Table'}
          </h3>
          <button
            onClick={handleAddItem}
            className="print:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'mr' ? '+ उत्पादन जोडा' : '+ Add Product'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">क्र.</th>
                <th className="py-3 px-4">उत्पादन (Product)</th>
                <th className="py-3 px-4">दर प्रकार (Rate Type)</th>
                <th className="py-3 px-4 text-right">दर प्रति नग (₹)</th>
                <th className="py-3 px-4 text-center">संख्या (Qty)</th>
                <th className="py-3 px-4 text-right">एकूण रक्कम (₹)</th>
                <th className="print:hidden py-3 px-4 text-center">कृती</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <div className="print:hidden">
                      <select
                        value={item.productId}
                        onChange={(e) => handleUpdateItem(item.id, 'productId', e.target.value)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold w-full max-w-xs"
                      >
                        {priceList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nameMr} ({p.packing})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="print:block hidden">
                      <span className="font-bold text-slate-900">{item.productName}</span>
                      <span className="text-slate-500 text-[11px] block">{item.packing}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="print:hidden">
                      <select
                        value={item.rateType}
                        onChange={(e) => handleUpdateItem(item.id, 'rateType', e.target.value)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-[11px]"
                      >
                        <option value="dealer">डीलर दर (Dealer)</option>
                        <option value="distributor">वितरक दर (Distributor)</option>
                        <option value="mrp">एमआरपी (MRP)</option>
                      </select>
                    </div>
                    <span className="print:block hidden text-slate-700 capitalize">
                      {item.rateType}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                    <div className="print:hidden">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleUpdateItem(item.id, 'rate', Number(e.target.value))}
                        className="w-20 p-1 text-right font-mono rounded border border-slate-200 text-xs"
                      />
                    </div>
                    <span className="print:block hidden">₹{item.rate}</span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="print:hidden">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(item.id, 'quantity', Math.max(1, Number(e.target.value)))}
                        className="w-16 p-1 text-center font-mono font-bold rounded border border-slate-200 text-xs"
                      />
                    </div>
                    <span className="print:block hidden font-mono font-bold">{item.quantity}</span>
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                    ₹{item.total.toLocaleString('en-IN')}
                  </td>

                  <td className="print:hidden py-3 px-4 text-center">
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length <= 1}
                      className="text-slate-400 hover:text-red-600 disabled:opacity-30 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-6">
          <div className="sm:max-w-xs space-y-2 text-xs">
            <span className="font-bold text-slate-700 block">सवलत व सूट (Discount):</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">टक्केवारी (%):</span>
              <input
                type="number"
                min="0"
                max="50"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-16 p-1 rounded border border-slate-200 font-mono text-center"
              />
              <span className="text-slate-500 ml-2">रोख सूट (₹):</span>
              <input
                type="number"
                min="0"
                value={cashDiscount}
                onChange={(e) => setCashDiscount(Number(e.target.value))}
                className="w-20 p-1 rounded border border-slate-200 font-mono text-center"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              * राजारामबापू सहकारी बँक खात्यात आरटीजीएस/एनईएफटी द्वारे जमा करावे.
            </p>
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-600">
              <span>उपएकूण (Subtotal):</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>सवलत (Discount):</span>
                <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>अंदाजे जीएसटी (GST):</span>
              <span>+₹{gstAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="pt-2 border-t border-slate-300 flex justify-between text-base font-black text-emerald-800">
              <span>एकूण देय रक्कम:</span>
              <span>₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* A4 Print Preview & Auto-Fit Modal */}
      <A4PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        elementId="order-bill-printable-container"
        title={language === 'mr' ? `ऑर्डर प्रोफॉर्मा बिल - ${billNumber}` : `Order Estimate & Proforma Bill - ${billNumber}`}
        filename={`Blackworm_Order_Invoice_${billNumber}`}
        defaultLandscape={false}
        language={language}
      />
    </div>
  );
};
