import React from 'react';
import { useApp } from '../context/AppContext';
import { BlackwormLogo } from './BlackwormLogo';
import { Building2, Phone, Mail, MapPin, Landmark } from 'lucide-react';

interface CompanyLetterheadProps {
  showBankDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export const CompanyLetterhead: React.FC<CompanyLetterheadProps> = ({
  showBankDetails = false,
  compact = false,
  className = '',
}) => {
  const { companyDetails, language } = useApp();

  return (
    <div
      id="company-official-letterhead"
      className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs relative overflow-hidden ${className}`}
    >
      {/* Decorative top colored border (Red & Green & Orange brand stripes) */}
      <div className="absolute top-0 left-0 right-0 h-1.5 flex">
        <div className="w-1/3 bg-emerald-600" />
        <div className="w-1/3 bg-amber-500" />
        <div className="w-1/3 bg-red-600" />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-5 border-b border-slate-100 pb-5">
        {/* Left: Brand Logo */}
        <div className="shrink-0 flex items-center">
          <BlackwormLogo variant="horizontal" size="lg" />
        </div>

        {/* Right: Company Legal Info */}
        <div className="flex flex-col items-center md:items-end text-center md:text-right">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
            {companyDetails.name}
          </h1>
          <div className="text-xs text-slate-700 font-medium flex flex-wrap justify-center md:justify-end gap-x-3 gap-y-0.5 mt-1">
            <span><strong className="text-slate-900">CIN:</strong> {companyDetails.cin}</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span><strong className="text-slate-900">GST No:</strong> {companyDetails.gstNo}</span>
          </div>

          <div className="text-xs text-slate-600 flex items-center justify-center md:justify-end gap-1.5 mt-1 max-w-lg">
            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>{companyDetails.address}</span>
          </div>

          <div className="text-xs text-slate-600 flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-1 mt-1 font-sans">
            <a href={`tel:${companyDetails.phone}`} className="flex items-center gap-1 hover:text-red-600">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{companyDetails.phone}</span>
            </a>
            <a href={`mailto:${companyDetails.email}`} className="flex items-center gap-1 hover:text-red-600">
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>{companyDetails.email}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Optional Bank Details Bar as seen in user upload */}
      {showBankDetails && (
        <div className="mt-4 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-700 shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {language === 'mr' ? 'अधिकृत बँक खाते तपशील' : 'Official Bank Account Details'}
              </div>
              <div className="font-bold text-slate-800 text-sm">
                {companyDetails.bankDetails.bankName}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-6 gap-y-1 text-slate-700 font-mono text-[11px]">
            <div>
              <span className="text-slate-500 block text-[10px] font-sans font-medium">
                {language === 'mr' ? 'खाते क्रमांक' : 'A/C Number'}
              </span>
              <span className="font-bold text-slate-900 tracking-wider">
                {companyDetails.bankDetails.accountNo}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-sans font-medium">
                {language === 'mr' ? 'आयएफएससी कोड' : 'IFSC Code'}
              </span>
              <span className="font-bold text-slate-900 tracking-wider">
                {companyDetails.bankDetails.ifsc}
              </span>
            </div>
            <div className="col-span-2 sm:col-auto">
              <span className="text-slate-500 block text-[10px] font-sans font-medium">
                {language === 'mr' ? 'खातेधारक नाव' : 'A/C Name'}
              </span>
              <span className="font-semibold text-slate-800 font-sans">
                {companyDetails.bankDetails.accountHolder}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
