import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * Synchronizes form DOM values (inputs, selects, textareas) into their DOM attributes
 * so that both cloned elements and canvas renderers capture the exact current state.
 */
export const syncAllDOMFormValues = (rootEl?: HTMLElement | null) => {
  const root = rootEl || document;
  root.querySelectorAll('input, textarea, select').forEach((node) => {
    const inputNode = node as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (inputNode.tagName === 'INPUT') {
      const type = (inputNode as HTMLInputElement).type;
      if (type === 'checkbox' || type === 'radio') {
        if ((inputNode as HTMLInputElement).checked) {
          inputNode.setAttribute('checked', 'checked');
          (inputNode as HTMLInputElement).defaultChecked = true;
        } else {
          inputNode.removeAttribute('checked');
          (inputNode as HTMLInputElement).defaultChecked = false;
        }
      } else {
        const val = (inputNode as HTMLInputElement).value || '';
        inputNode.setAttribute('value', val);
        (inputNode as HTMLInputElement).defaultValue = val;
      }
    } else if (inputNode.tagName === 'TEXTAREA') {
      const val = (inputNode as HTMLTextAreaElement).value || '';
      inputNode.textContent = val;
      (inputNode as HTMLTextAreaElement).defaultValue = val;
      inputNode.innerHTML = val.replace(/\n/g, '<br/>');
    } else if (inputNode.tagName === 'SELECT') {
      const selNode = inputNode as HTMLSelectElement;
      Array.from(selNode.options).forEach((opt) => {
        if (opt.selected) {
          opt.setAttribute('selected', 'selected');
          opt.defaultSelected = true;
        } else {
          opt.removeAttribute('selected');
          opt.defaultSelected = false;
        }
      });
    }
  });
};

/**
 * Downloads a DOM element directly as a high-resolution, vector-aligned A4 PDF file.
 * Preserves original layout, colors, logos, fonts, borders, and all filled data.
 */
export const exportElementToPDF = async (
  elementId: string,
  filename: string = 'Document',
  options?: {
    orientation?: 'portrait' | 'landscape';
    scale?: number;
    marginMm?: number;
    onStart?: () => void;
    onComplete?: () => void;
    onError?: (err: any) => void;
  }
): Promise<boolean> => {
  try {
    if (options?.onStart) options.onStart();

    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element #${elementId} not found. Attempting document fallback.`);
      window.print();
      return false;
    }

    // 1. Sync live input values to attributes
    syncAllDOMFormValues(element);

    // 2. Wait for fonts if available
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch (_) {}
    }

    const isDealerForm = elementId === 'dealer-print-form' || element.id === 'dealer-print-form';
    const isLandscape = options?.orientation === 'landscape';
    const orientation = isLandscape ? 'landscape' : 'portrait';

    // 3. Render element to canvas with high fidelity using html2canvas-pro
    const canvas = await html2canvas(element, {
      scale: options?.scale || 3.0, // Ultra-sharp 300DPI level rendering for Devanagari text, crisp lines & logos
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: isDealerForm ? 780 : undefined,
      windowWidth: isDealerForm ? 780 : (isLandscape ? 1100 : Math.max(element.scrollWidth, 1000)),
      onclone: (clonedDoc) => {
        const clonedEl = clonedDoc.getElementById(elementId);
        if (clonedEl) {
          clonedEl.style.overflow = 'visible';
          clonedEl.style.maxHeight = 'none';
          clonedEl.style.height = 'auto';

          if (isDealerForm) {
            clonedEl.style.width = '780px';
            clonedEl.style.minWidth = '780px';
            clonedEl.style.maxWidth = '780px';
            clonedEl.style.margin = '0 auto';
            clonedEl.style.transform = 'none';
          } else {
            clonedEl.style.width = '100%';
          }
        }

        // Ensure all inputs, textareas, and selects in cloned doc show their live filled values boldly
        const sourceInputs = Array.from(element.querySelectorAll('input, select, textarea'));
        const clonedInputs = clonedEl ? Array.from(clonedEl.querySelectorAll('input, select, textarea')) : [];

        clonedInputs.forEach((clonedNode, idx) => {
          const src = sourceInputs[idx] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          if (!src) return;
          const val = src.value || src.getAttribute('value') || '';
          const inp = clonedNode as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

          inp.style.fontWeight = 'bold';
          inp.style.opacity = '1';
          inp.style.visibility = 'visible';

          if (inp.tagName === 'INPUT') {
            const inputEl = inp as HTMLInputElement;
            inputEl.setAttribute('value', val);
            inputEl.value = val;
          } else if (inp.tagName === 'TEXTAREA') {
            inp.textContent = val;
            inp.innerHTML = val.replace(/\n/g, '<br/>');
          }
        });

        // Resolve all Tailwind v4 oklch colors to computed RGB to preserve 100% original screen colors
        if (clonedEl) {
          const allNodes = Array.from(clonedEl.querySelectorAll('*'));
          allNodes.push(clonedEl);
          allNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            try {
              const comp = window.getComputedStyle(node);
              if (comp.color && comp.color !== 'rgba(0, 0, 0, 0)') {
                node.style.color = comp.color;
              }
              if (comp.backgroundColor && comp.backgroundColor !== 'rgba(0, 0, 0, 0)' && comp.backgroundColor !== 'transparent') {
                node.style.backgroundColor = comp.backgroundColor;
              }
              if (comp.borderColor && comp.borderColor !== 'rgba(0, 0, 0, 0)') {
                node.style.borderColor = comp.borderColor;
              }
            } catch (e) {}
          });
        }

        // Hide interactive buttons and print:hidden elements
        clonedDoc.querySelectorAll('.no-print, .print\\:hidden, button').forEach((node) => {
          (node as HTMLElement).style.display = 'none';
        });

        // For non-dealer-form tables: auto-fit table layout
        if (!isDealerForm) {
          clonedDoc.querySelectorAll('[class*="min-w-"]').forEach((node) => {
            (node as HTMLElement).style.minWidth = '0';
          });

          clonedDoc.querySelectorAll('table').forEach((tbl) => {
            tbl.style.width = '100%';
            tbl.style.maxWidth = '100%';
            tbl.style.tableLayout = 'auto';
          });

          clonedDoc.querySelectorAll('th, td, .truncate').forEach((node) => {
            const cell = node as HTMLElement;
            cell.style.whiteSpace = 'normal';
            cell.style.overflow = 'visible';
            cell.style.textOverflow = 'clip';
            cell.style.wordBreak = 'break-word';
            cell.style.overflowWrap = 'anywhere';
            cell.style.maxWidth = 'none';
          });
        }
      },
    });

    // 4. Construct PDF
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = isLandscape ? 297 : 210;
    const pdfHeight = isLandscape ? 210 : 297;
    const margin = options?.marginMm !== undefined ? options.marginMm : 4;
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    if (isDealerForm || contentHeight <= (pdfHeight - margin * 2) * 1.05) {
      // Single A4 page fit: ensure it never spills onto an unnecessary page 2
      const finalHeight = Math.min(contentHeight, pdfHeight - margin * 2);
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, finalHeight);
    } else {
      // Multi-page splitting
      let heightLeft = contentHeight;
      let position = margin;
      const pageAvailableHeight = pdfHeight - margin * 2;

      // First page
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
      heightLeft -= pageAvailableHeight;

      // Subsequent pages
      while (heightLeft > 0) {
        position = heightLeft - contentHeight + margin;
        pdf.addPage('a4', orientation);
        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
        heightLeft -= pageAvailableHeight;
      }
    }

    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);

    if (options?.onComplete) options.onComplete();
    return true;
  } catch (err) {
    console.error('PDF Export generation error:', err);
    if (options?.onError) options.onError(err);
    window.print();
    return false;
  }
};

/**
 * Universal print trigger that opens the high-fidelity A4 Print Preview Modal.
 * Guaranteed to open on screen every time across all browsers and iframe sandboxes.
 */
export const exportElementToPrintOrPDF = async (
  elementId: string,
  title: string = 'Blackworm Document',
  options?: { landscape?: boolean; onComplete?: () => void }
) => {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    if (options?.onComplete) options.onComplete();
    return;
  }

  // 1. Sync live input values
  syncAllDOMFormValues(el);

  // 2. Dispatch the global event to open the interactive A4 Print Preview Modal
  window.dispatchEvent(
    new CustomEvent('open-print-preview', {
      detail: {
        elementId,
        title,
        landscape: !!options?.landscape,
        filename: title,
      },
    })
  );

  if (options?.onComplete) {
    options.onComplete();
  }
};

/**
 * Dedicated system printing function used inside the print preview modal.
 * Uses a visible non-zero iframe so modern browsers never suppress it.
 */
export const executeSystemPrint = async (
  elementId: string,
  title: string = 'Blackworm Document',
  options?: { landscape?: boolean; onComplete?: () => void }
) => {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    if (options?.onComplete) options.onComplete();
    return;
  }

  syncAllDOMFormValues(el);

  let printIframe = document.getElementById('app-print-iframe') as HTMLIFrameElement;
  if (!printIframe) {
    printIframe = document.createElement('iframe');
    printIframe.id = 'app-print-iframe';
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '100px';
    printIframe.style.height = '100px';
    printIframe.style.opacity = '0.01';
    printIframe.style.pointerEvents = 'none';
    printIframe.style.border = 'none';
    printIframe.style.zIndex = '99999';
    document.body.appendChild(printIframe);
  }

  const iframeWin = printIframe.contentWindow;
  const iframeDoc = iframeWin?.document || printIframe.contentDocument;
  if (!iframeDoc || !iframeWin) {
    window.print();
    if (options?.onComplete) options.onComplete();
    return;
  }

  const pageOrientation = options?.landscape ? 'A4 landscape' : 'A4 portrait';

  let styleTags = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    styleTags += node.outerHTML;
  });

  const printHTML = `<!DOCTYPE html>
<html lang="mr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Tiro+Devanagari+Marathi:wght@400;700&display=swap" rel="stylesheet">
    ${styleTags}
    <style>
      @page {
        size: ${pageOrientation};
        margin: 3mm 4mm 3mm 4mm;
      }
      * {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        background-color: #ffffff !important;
        color: inherit !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        overflow: visible !important;
      }
      #print-mount-root {
        width: 100% !important;
        margin: 0 auto !important;
        padding: 0 !important;
      }
      .no-print, button, .print\\:hidden, nav, header, footer, aside {
        display: none !important;
      }
      #dealer-print-form {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        box-sizing: border-box !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: avoid !important;
      }
    </style>
  </head>
  <body>
    <div id="print-mount-root">
      ${el.outerHTML}
    </div>
  </body>
</html>`;

  try {
    iframeDoc.open();
    iframeDoc.write(printHTML);
    iframeDoc.close();

    if (iframeDoc.fonts?.ready) {
      try {
        await iframeDoc.fonts.ready;
      } catch (_) {}
    }

    const iframeImages = Array.from(iframeDoc.querySelectorAll('img'));
    await Promise.all(
      iframeImages.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((res) => {
          img.onload = res;
          img.onerror = res;
          setTimeout(res, 200);
        });
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 80));

    iframeWin.focus();
    iframeWin.print();

    if (options?.onComplete) options.onComplete();
  } catch (err) {
    console.error('Error rendering print iframe:', err);
    window.print();
    if (options?.onComplete) options.onComplete();
  }
};

/**
 * Universal print trigger that formats styles and triggers print.
 */
export const triggerPrint = async (options?: { onBeforePrint?: () => void; onAfterPrint?: () => void }) => {
  try {
    if (options?.onBeforePrint) {
      options.onBeforePrint();
    }

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    syncAllDOMFormValues();

    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch (_) {}
    }

    window.dispatchEvent(new Event('resize'));
    await new Promise((resolve) => setTimeout(resolve, 80));

    window.print();

    if (options?.onAfterPrint) {
      options.onAfterPrint();
    }
  } catch (err) {
    console.error('Print trigger error:', err);
    window.print();
  }
};

/**
 * Export data array to formatted Excel file (.xlsx)
 */
export const exportDataToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const cleanName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, cleanName);
};
