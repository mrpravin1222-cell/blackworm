import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CompanyLetterhead } from './CompanyLetterhead';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import {
  Gift,
  Plus,
  Calendar,
  Tag,
  CheckCircle2,
  Percent,
  Sparkles,
  Printer,
  FileText,
  Clock,
} from 'lucide-react';

interface SchemeItem {
  id: string;
  titleMr: string;
  titleEn: string;
  type: 'free_product' | 'cash_discount' | 'turnover_bonus';
  descriptionMr: string;
  descriptionEn: string;
  validFrom: string;
  validTill: string;
  eligibility: string;
  badge: string;
  isActive: boolean;
}

export const Scheme: React.FC = () => {
  const { language, currentUser } = useApp();

  const [schemes, setSchemes] = useState<SchemeItem[]>([
    {
      id: 'SCH-01',
      titleMr: 'खरीप महा-धमाका: १० बॅगवर १ बॅग मोफत',
      titleEn: 'Kharif Special: Buy 10 Bags Get 1 Free',
      type: 'free_product',
      descriptionMr: 'ब्लॅकवर्म सेंद्रिय गांडूळखत ५० किलोच्या १० बॅगच्या एकाच ऑर्डरवर १ बॅग मोफत दिली जाईल.',
      descriptionEn: 'Order 10 bags of Blackworm Vermicompost 50kg and receive 1 bag completely free.',
      validFrom: '2026-06-01',
      validTill: '2026-10-31',
      eligibility: 'सर्व अधिकृत डीलर व कृषी सेवा केंद्र',
      badge: '१० + १ मोफत',
      isActive: true,
    },
    {
      id: 'SCH-02',
      titleMr: 'व्हर्मी-वॉश ५ लिटर कॉम्बो डिस्काउंट १५%',
      titleEn: 'Vermi-Wash 5L Liquid Combo 15% Off',
      type: 'cash_discount',
      descriptionMr: '५ बॉटल्स किंवा त्याहून अधिक खरेदीवर थेट १५% रोख सवलत लागू होईल.',
      descriptionEn: 'Flat 15% discount on purchase of 5 or more Vermi-Wash bottles.',
      validFrom: '2026-08-01',
      validTill: '2026-09-30',
      eligibility: 'सर्व ग्राहक आणि डीलर',
      badge: '१५% सूट',
      isActive: true,
    },
    {
      id: 'SCH-03',
      titleMr: 'मासिक टार्गेट अचिव्हमेंट रोख बोनस (₹५०००)',
      titleEn: 'Monthly Target Overachiever Bonus (₹5,000)',
      type: 'turnover_bonus',
      descriptionMr: 'ज्या डीलरची मासिक उलाढाल २ लाख रुपयांपेक्षा जास्त होईल त्यांना अतिरिक्त ₹५००० थेट क्रेडिट किंवा उत्पादने दिली जातील.',
      descriptionEn: 'Dealers achieving monthly turnover exceeding ₹2 Lakh get ₹5,000 credit bonus.',
      validFrom: '2026-09-01',
      validTill: '2026-12-31',
      eligibility: 'नोंदणीकृत डीलर नेटवर्क',
      badge: '₹५,००० बोनस',
      isActive: true,
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [newScheme, setNewScheme] = useState<Omit<SchemeItem, 'id'>>({
    titleMr: '',
    titleEn: '',
    type: 'free_product',
    descriptionMr: '',
    descriptionEn: '',
    validFrom: new Date().toISOString().split('T')[0],
    validTill: '2026-11-30',
    eligibility: 'सर्व अधिकृत डीलर',
    badge: 'नवीन ऑफर',
    isActive: true,
  });

  const handleAddScheme = (e: React.FormEvent) => {
    e.preventDefault();
    const item: SchemeItem = {
      ...newScheme,
      id: 'SCH-' + Date.now().toString().slice(-3),
    };
    setSchemes([item, ...schemes]);
    setIsModalOpen(false);
  };

  return (
    <div id="scheme-printable-container" className="space-y-6 animate-in fade-in duration-150">
      {/* Printable Letterhead when printing circular */}
      <div className="print:block hidden mb-4">
        <CompanyLetterhead showBankDetails={true} />
        <div className="text-center my-4">
          <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">
            {language === 'mr' ? 'अधिकृत डीलर योजना व ऑफर्स परिपत्रक' : 'Official Dealer Scheme Circular'}
          </h2>
          <p className="text-xs text-slate-500">
            दिनांक: {new Date().toLocaleDateString('mr-IN')}
          </p>
        </div>
      </div>

      {/* Top Banner */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {language === 'mr' ? 'स्कीम व विशेष सवलती (Active Schemes)' : 'Promotional Schemes & Offers'}
            </h1>
            <p className="text-xs text-slate-500">
              {language === 'mr'
                ? 'डीलर व शेतकऱ्यांसाठी चालू असलेल्या विशेष सवलत योजना, फ्री बॅग ऑफर व टार्गेट बोनस'
                : 'Current commercial dealer schemes, free product combos, and seasonal incentives'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>{language === 'mr' ? '🖨️ योजना परिपत्रक प्रिंट A4' : 'Print Circular A4'}</span>
          </button>

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'mr' ? '+ नवीन स्कीम' : '+ Create Scheme'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Scheme Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {schemes.map((sch) => (
          <div
            key={sch.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                  {sch.badge}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>

              <div className="mt-3">
                <h3 className="font-bold text-slate-900 text-sm leading-snug">
                  {sch.titleMr}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{sch.titleEn}</p>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed bg-slate-50 p-3 rounded-xl">
                  {sch.descriptionMr}
                </p>

                <div className="mt-3 space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>मुदत: {sch.validFrom} ते <strong>{sch.validTill}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>पात्रता: {sch.eligibility}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
              <span>स्कीम क्र.: {sch.id}</span>
              <span className="text-purple-600 font-semibold">Blackworm Agritech</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Scheme Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">नवीन स्कीम / ऑफर तयार करा</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleAddScheme} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">स्कीमचे नाव (मराठी)</label>
                <input
                  type="text"
                  required
                  value={newScheme.titleMr}
                  onChange={(e) => setNewScheme({ ...newScheme, titleMr: e.target.value })}
                  placeholder="उदा. दिवाळी बंपर ऑफर"
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">स्कीम तपशील / नियम</label>
                <textarea
                  rows={2}
                  required
                  value={newScheme.descriptionMr}
                  onChange={(e) => setNewScheme({ ...newScheme, descriptionMr: e.target.value })}
                  placeholder="उदा. २० बॅग खरेदीवर २ बॅग मोफत मिळतील"
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">सुरुवात दिनांक</label>
                  <input
                    type="date"
                    required
                    value={newScheme.validFrom}
                    onChange={(e) => setNewScheme({ ...newScheme, validFrom: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">शेवटची तारीख</label>
                  <input
                    type="date"
                    required
                    value={newScheme.validTill}
                    onChange={(e) => setNewScheme({ ...newScheme, validTill: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">बॅज / हायलाईट</label>
                <input
                  type="text"
                  value={newScheme.badge}
                  onChange={(e) => setNewScheme({ ...newScheme, badge: e.target.value })}
                  placeholder="उदा. २० + २ मोफत"
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 text-white font-bold"
                >
                  स्कीम सेव्ह करा
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* A4 Print Preview & Auto-Fit Modal */}
      <A4PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        elementId="scheme-printable-container"
        title={language === 'mr' ? 'अधिकृत डीलर योजना व ऑफर्स परिपत्रक' : 'Official Dealer Scheme Circular'}
        filename="Blackworm_Scheme_Circular"
        defaultLandscape={false}
        language={language}
      />
    </div>
  );
};
