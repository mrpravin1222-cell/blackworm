import React, { useState } from 'react';
import { Printer, Eye, FileDown, Loader2 } from 'lucide-react';
import { exportElementToPDF, exportElementToPrintOrPDF } from '../utils/printHelpers';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import { useApp } from '../context/AppContext';

export interface PrintActionsProps {
  elementId: string;
  title: string;
  filename?: string;
  landscape?: boolean;
  className?: string;
  showPreview?: boolean;
  showDirectPrint?: boolean;
  showDownloadPDF?: boolean;
  buttonLabel?: string;
}

export const PrintActions: React.FC<PrintActionsProps> = ({
  elementId,
  title,
  filename,
  landscape = false,
  className = '',
  showPreview = true,
  showDirectPrint = true,
  showDownloadPDF = true,
  buttonLabel,
}) => {
  const { language } = useApp();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleDirectPrint = async () => {
    setIsExporting(true);
    try {
      await exportElementToPrintOrPDF(elementId, title, { landscape });
    } catch (err) {
      console.error('Print error:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      await exportElementToPDF(elementId, filename || title, {
        orientation: landscape ? 'landscape' : 'portrait',
        scale: 2,
      });
    } catch (err) {
      console.error('PDF download error:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 no-print ${className}`}>
        {/* Main "Print A4 / Preview" button */}
        {showDirectPrint && (
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
            title={language === 'mr' ? 'A4 प्रिंट पूर्वावलोकन उघडा' : 'Open A4 Print Preview'}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{buttonLabel || (language === 'mr' ? '🖨️ प्रिंट A4' : 'Print A4')}</span>
          </button>
        )}

        {/* Dedicated Print Preview Button if requested */}
        {showPreview && (
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border border-slate-200"
            title={language === 'mr' ? 'पूर्वावलोकन' : 'Print Preview'}
          >
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            <span>{language === 'mr' ? 'पूर्वावलोकन' : 'Preview'}</span>
          </button>
        )}

        {/* Direct PDF Download button */}
        {showDownloadPDF && (
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title={language === 'mr' ? 'थेट A4 PDF डाउनलोड करा' : 'Download as A4 PDF'}
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{language === 'mr' ? 'PDF' : 'PDF'}</span>
          </button>
        )}
      </div>

      {/* A4 Interactive Print Preview Modal */}
      {isPreviewOpen && (
        <A4PrintPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          elementId={elementId}
          title={title}
          defaultLandscape={landscape}
          filename={filename}
          language={language}
        />
      )}
    </>
  );
};
