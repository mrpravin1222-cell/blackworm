import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Download,
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  Loader2,
  FileCheck,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { exportElementToPDF, executeSystemPrint, syncAllDOMFormValues } from '../utils/printHelpers';

export interface A4PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  elementId: string;
  title: string;
  defaultLandscape?: boolean;
  filename?: string;
  language?: 'mr' | 'en';
}

export const A4PrintPreviewModal: React.FC<A4PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  elementId,
  title,
  defaultLandscape = false,
  filename,
  language = 'mr',
}) => {
  const [isLandscape, setIsLandscape] = useState(defaultLandscape);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewHTML, setPreviewHTML] = useState<string>('');
  const [autoFitRatio, setAutoFitRatio] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  // Sync orientation whenever defaultLandscape or modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLandscape(defaultLandscape);
    }
  }, [isOpen, defaultLandscape]);

  // Capture live DOM state and generate sanitized preview HTML
  useEffect(() => {
    if (!isOpen) return;

    const sourceEl = document.getElementById(elementId);
    if (!sourceEl) {
      setPreviewHTML('<div class="p-8 text-center text-red-500 font-bold">Element not found</div>');
      return;
    }

    // 1. Sync all active form values (inputs, selects, textareas)
    syncAllDOMFormValues(sourceEl);

    // 2. Clone the element
    const cloned = sourceEl.cloneNode(true) as HTMLElement;

    // Remove buttons, navigation, headers, and no-print elements
    cloned.querySelectorAll('.no-print, .print\\:hidden, button').forEach((node) => {
      (node as HTMLElement).style.display = 'none';
    });

    // Make hidden print-only elements visible in preview
    cloned.querySelectorAll('.print\\:block').forEach((node) => {
      (node as HTMLElement).style.display = 'block';
    });
    cloned.querySelectorAll('.print\\:table').forEach((node) => {
      (node as HTMLElement).style.display = 'table';
    });
    cloned.querySelectorAll('.print\\:flex').forEach((node) => {
      (node as HTMLElement).style.display = 'flex';
    });

    const isDealerForm = elementId === 'dealer-print-form' || cloned.id === 'dealer-print-form';

    if (isDealerForm) {
      cloned.style.width = '780px';
      cloned.style.minWidth = '780px';
      cloned.style.maxWidth = '780px';
      cloned.style.margin = '0 auto';
      cloned.style.boxSizing = 'border-box';
      cloned.style.padding = '8px 12px';

      cloned.querySelectorAll('td, th').forEach((cell) => {
        (cell as HTMLElement).style.paddingTop = '1.5px';
        (cell as HTMLElement).style.paddingBottom = '1.5px';
        (cell as HTMLElement).style.lineHeight = '1.2';
        (cell as HTMLElement).style.fontSize = '11px';
      });

      cloned.querySelectorAll('input, textarea').forEach((inputNode) => {
        (inputNode as HTMLElement).style.lineHeight = '1.15';
        (inputNode as HTMLElement).style.fontSize = '11px';
      });
    } else {
      // Ensure all min-width constraints that could blow past A4 are removed for wide tables
      cloned.querySelectorAll('[class*="min-w-"]').forEach((node) => {
        (node as HTMLElement).style.minWidth = '0';
      });

      // Make all tables auto-fit and wrap text cleanly
      cloned.querySelectorAll('table').forEach((tbl) => {
        tbl.style.width = '100%';
        tbl.style.maxWidth = '100%';
        tbl.style.tableLayout = 'auto';
      });

      cloned.querySelectorAll('th, td, .truncate').forEach((node) => {
        const el = node as HTMLElement;
        el.style.whiteSpace = 'normal';
        el.style.wordBreak = 'break-word';
        el.style.overflowWrap = 'anywhere';
        el.style.textOverflow = 'clip';
        el.style.overflow = 'visible';
        el.style.maxWidth = 'none';
      });
    }

    // Preserve live values and ensure bold, crisp appearance for inputs and textareas
    const sourceInputs = Array.from(sourceEl.querySelectorAll('input, select, textarea'));
    const clonedInputs = Array.from(cloned.querySelectorAll('input, select, textarea'));

    clonedInputs.forEach((clonedNode, idx) => {
      const srcNode = sourceInputs[idx] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (!srcNode) return;

      const inp = clonedNode as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const val = srcNode.value || srcNode.getAttribute('value') || '';

      if (inp.tagName === 'INPUT') {
        const type = (srcNode as HTMLInputElement).type;
        if (type === 'checkbox' || type === 'radio') {
          (inp as HTMLInputElement).checked = (srcNode as HTMLInputElement).checked;
          if ((srcNode as HTMLInputElement).checked) {
            inp.setAttribute('checked', 'checked');
          } else {
            inp.removeAttribute('checked');
          }
        } else {
          inp.setAttribute('value', val);
          (inp as HTMLInputElement).value = val;
          const compColor = window.getComputedStyle(srcNode).color || 'inherit';
          inp.style.border = 'none';
          inp.style.background = 'transparent';
          inp.style.outline = 'none';
          inp.style.color = compColor !== 'rgba(0, 0, 0, 0)' ? compColor : 'inherit';
          inp.style.fontWeight = 'bold';
          inp.style.width = '100%';
        }
      } else if (inp.tagName === 'TEXTAREA') {
        const compColor = window.getComputedStyle(srcNode).color || 'inherit';
        inp.textContent = val;
        inp.innerHTML = val.replace(/\n/g, '<br/>');
        inp.style.border = 'none';
        inp.style.background = 'transparent';
        inp.style.outline = 'none';
        inp.style.color = compColor !== 'rgba(0, 0, 0, 0)' ? compColor : 'inherit';
        inp.style.fontWeight = 'bold';
        inp.style.whiteSpace = 'pre-wrap';
        inp.style.wordBreak = 'break-word';
        inp.style.width = '100%';
      } else if (inp.tagName === 'SELECT') {
        const sel = srcNode as HTMLSelectElement;
        const compColor = window.getComputedStyle(srcNode).color || 'inherit';
        const selectedText = sel.options[sel.selectedIndex]?.text || val;
        const span = document.createElement('span');
        span.textContent = selectedText;
        span.style.fontWeight = 'bold';
        span.style.color = compColor !== 'rgba(0, 0, 0, 0)' ? compColor : 'inherit';
        inp.replaceWith(span);
      }
    });

    setPreviewHTML(cloned.outerHTML);
  }, [isOpen, elementId, isLandscape]);

  // Calculate auto-fit scale so preview fits perfectly inside the A4 paper box
  useEffect(() => {
    if (!isOpen || !paperRef.current) return;

    const calculateFit = () => {
      const paper = paperRef.current;
      if (!paper) return;

      const content = paper.firstElementChild as HTMLElement;
      if (!content) return;

      const isDealerForm = elementId === 'dealer-print-form';
      const a4WidthPx = isLandscape ? 1040 : 760;
      const naturalWidth = isDealerForm ? 780 : (content.scrollWidth || 780);

      if (naturalWidth > a4WidthPx + 5) {
        const ratio = Math.max(0.7, Number((a4WidthPx / naturalWidth).toFixed(3)));
        setAutoFitRatio(ratio);
      } else {
        setAutoFitRatio(1);
      }
    };

    const timer = setTimeout(calculateFit, 60);
    return () => clearTimeout(timer);
  }, [isOpen, previewHTML, isLandscape, elementId]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await executeSystemPrint(elementId, title, { landscape: isLandscape });
    } catch (err) {
      console.error('Print failed:', err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      await exportElementToPDF(elementId, filename || title, {
        orientation: isLandscape ? 'landscape' : 'portrait',
        scale: 2,
      });
    } catch (err) {
      console.error('PDF download failed:', err);
      alert(language === 'mr' ? 'PDF डाऊनलोड अयशस्वी. प्रिंट पर्याय वापरत आहे.' : 'PDF download failed. Falling back to print.');
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Top Controls Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-white tracking-wide">
                {language === 'mr' ? 'A4 प्रिंट पूर्वावलोकन (A4 Print Preview)' : 'A4 Print Preview & Auto-Fit'}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {language === 'mr' ? 'A4 ऑटो-फिट सक्रिय' : 'A4 Auto-Fit Active'}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
              {title}
            </p>
          </div>
        </div>

        {/* Orientation & View Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Orientation Toggle */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setIsLandscape(false)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                !isLandscape ? 'bg-red-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Portrait (उभे पान)"
            >
              {language === 'mr' ? 'उभे (Portrait)' : 'Portrait'}
            </button>
            <button
              type="button"
              onClick={() => setIsLandscape(true)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                isLandscape ? 'bg-red-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Landscape (आडवे पान)"
            >
              {language === 'mr' ? 'आडवे (Landscape)' : 'Landscape'}
            </button>
          </div>

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setPreviewScale((s) => Math.max(0.6, Number((s - 0.1).toFixed(1))))}
              className="p-1 hover:text-white text-slate-400 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] text-slate-300 w-11 text-center font-bold">
              {Math.round(previewScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setPreviewScale((s) => Math.min(1.4, Number((s + 0.1).toFixed(1))))}
              className="p-1 hover:text-white text-slate-400 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewScale(1)}
              className="px-1 text-[10px] text-slate-400 hover:text-white cursor-pointer ml-1 font-bold"
              title="Reset Zoom"
            >
              100%
            </button>
          </div>

          {/* Direct Print A4 Button */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="A4 कागदावर प्रिंट करा"
          >
            {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>{language === 'mr' ? '🖨️ A4 प्रिंट करा' : 'Print A4'}</span>
          </button>

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="A4 PDF डाऊनलोड करा"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{language === 'mr' ? '📥 PDF डाऊनलोड' : 'Download PDF'}</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
            title="बंद करा (Close)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Auto-Fit Information Banner */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-1.5 text-center text-[11px] text-slate-300 flex items-center justify-center gap-3">
        <span>
          📄 <strong>{isLandscape ? 'A4 Landscape (297 x 210 mm)' : 'A4 Portrait (210 x 297 mm)'}</strong>
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-emerald-400 font-bold">
          ✨ {language === 'mr' ? 'सर्व भाग व डेटा A4 मध्ये अचूकपणे ऑटो-फिट केला आहे' : 'Entire content auto-fitted to A4 page without clipping'}
        </span>
        {autoFitRatio < 1 && (
          <span className="text-amber-400 text-[10px] font-mono font-bold">
            ({Math.round(autoFitRatio * 100)}% Fit Scale)
          </span>
        )}
      </div>

      {/* Scrollable Preview Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center bg-slate-950"
      >
        <div
          style={{
            transform: `scale(${previewScale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="my-auto pb-16"
        >
          {/* Authentic A4 Paper Sheet Representation */}
          <div
            ref={paperRef}
            style={{
              width: isLandscape ? '1040px' : '760px',
              minHeight: isLandscape ? '735px' : '1075px',
              maxWidth: '100%',
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: '16px',
              margin: '0 auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              overflow: 'visible',
            }}
            className="print-preview-a4-sheet"
          >
            <div
              style={{
                transform: autoFitRatio < 1 ? `scale(${autoFitRatio})` : 'none',
                transformOrigin: 'top left',
                width: autoFitRatio < 1 ? `${(100 / autoFitRatio).toFixed(1)}%` : '100%',
              }}
              dangerouslySetInnerHTML={{ __html: previewHTML }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
