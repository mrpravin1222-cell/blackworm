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
      width: isDealerForm ? 780 : (elementId.includes('traveling-expenses') || element.id.includes('traveling-expenses') ? 950 : undefined),
      windowWidth: isDealerForm ? 780 : (elementId.includes('traveling-expenses') || element.id.includes('traveling-expenses') ? 950 : (isLandscape ? 1100 : Math.max(element.scrollWidth, 1000))),
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
            clonedEl.style.padding = '8px 12px 28px 12px';
            clonedEl.style.boxSizing = 'border-box';

            // Remove stamp watermark text/instructions for PDF and Print output so the stamp area is clean and blank
            clonedEl.querySelectorAll('div').forEach((div) => {
              const text = div.textContent || '';
              if (text.includes('Stamp & Seal') || text.includes('Address Stamp Area') || text.includes('Name & Full Address of Dealership') || text.includes('Required')) {
                if (div.style.position === 'absolute' || div.classList.contains('absolute') || div.querySelector('span')) {
                  div.style.display = 'none';
                }
              }
            });

            // Ensure all tables have Excel-like grid structure
            clonedEl.querySelectorAll('table').forEach((tbl) => {
              const tableEl = tbl as HTMLElement;
              tableEl.style.borderCollapse = 'collapse';
              tableEl.style.border = '1px solid #475569';
              tableEl.style.width = '100%';
            });

            // Ensure every table cell (including Contact Number, Proprietor Name, Firm Name, etc.) has full crisp Excel-like borders and table-cell display
            clonedEl.querySelectorAll('td, th').forEach((cell) => {
              const cellEl = cell as HTMLElement;
              cellEl.style.border = '1px solid #64748b';
              cellEl.style.display = 'table-cell';
              cellEl.style.verticalAlign = 'middle';
              cellEl.style.padding = '2.5px 5px';
              cellEl.style.boxSizing = 'border-box';
            });

            // Enforce ultra-sharp, dark black text for crystal clear print & PDF
            clonedEl.querySelectorAll('*').forEach((el) => {
              const htmlEl = el as HTMLElement;
              if (htmlEl.tagName !== 'IMG' && htmlEl.tagName !== 'SVG' && !htmlEl.querySelector('img')) {
                htmlEl.style.color = '#000000';
              }
            });
          } else {
            clonedEl.style.width = '100%';
          }

          // Enforce strict nowrap and min-width on Date columns and Officer signature cells across all print views
          clonedEl.querySelectorAll('.date-column, .print-date-cell, input[type="date"], input.date-input').forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.whiteSpace = 'nowrap';
            htmlEl.style.minWidth = '130px';
            htmlEl.style.wordBreak = 'keep-all';
          });
          clonedEl.querySelectorAll('.officer-signature-cell, .officer-name-cell, input[value*="ROHIT"], input[placeholder*="OFFICER"]').forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.whiteSpace = 'nowrap';
            htmlEl.style.minWidth = '180px';
            htmlEl.style.wordBreak = 'keep-all';
          });
        }

        // Replace all inputs, textareas, and selects with pristine typographic divs in cloned doc
        // This eliminates browser shadow-DOM form-control clipping and ensures 100% ascender & descender visibility
        const sourceInputs = Array.from(element.querySelectorAll('input, select, textarea'));
        const clonedInputs = clonedEl ? Array.from(clonedEl.querySelectorAll('input, select, textarea')) : [];

        clonedInputs.forEach((clonedNode, idx) => {
          const src = sourceInputs[idx] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          if (!src) return;
          const val = src.value || src.getAttribute('value') || '';
          const inp = clonedNode as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

          if (inp.tagName === 'INPUT') {
            const inputEl = inp as HTMLInputElement;
            const type = (inputEl.type || 'text').toLowerCase();
            if (type === 'checkbox' || type === 'radio') {
              inputEl.checked = (src as HTMLInputElement).checked;
              if (inputEl.checked) {
                inputEl.setAttribute('checked', 'checked');
              } else {
                inputEl.removeAttribute('checked');
              }
              inputEl.style.opacity = '1';
              inputEl.style.visibility = 'visible';
            } else {
              const div = clonedDoc.createElement('div');
              div.className = inputEl.className;
              div.classList.remove('leading-none', 'pb-0', 'border-none', 'outline-none');
              div.style.cssText = inputEl.style.cssText;

              try {
                const comp = window.getComputedStyle(src);
                div.style.fontSize = comp.fontSize || '12px';
                div.style.fontFamily = comp.fontFamily || 'inherit';
                div.style.letterSpacing = comp.letterSpacing || 'normal';
                div.style.textAlign = comp.textAlign || 'inherit';
                div.style.textTransform = comp.textTransform || 'none';
              } catch (_) {}

              div.textContent = val || inputEl.placeholder || '';
              div.style.display = 'block';
              div.style.width = '100%';
              div.style.lineHeight = '1.4';
              div.style.minHeight = '20px';
              div.style.paddingTop = '3px';
              div.style.paddingBottom = '2px';
              div.style.overflow = 'visible';
              div.style.boxSizing = 'border-box';
              div.style.color = '#000000';
              div.style.fontWeight = inputEl.classList.contains('font-black') ? '900' : 'bold';

              // Officer name signature area specific enhancement: ample vertical clearance so top never cuts
              const isOfficerName = inputEl.placeholder?.toUpperCase().includes('OFFICER') || 
                                    inputEl.value?.toUpperCase().includes('ROHIT') ||
                                    val.toUpperCase().includes('ROHIT') ||
                                    inputEl.parentElement?.classList.contains('w-60');

              if (isOfficerName) {
                div.style.textAlign = 'center';
                div.style.textTransform = 'uppercase';
                div.style.fontWeight = '900';
                div.style.fontSize = '12px';
                div.style.letterSpacing = '0.05em';
                div.style.minHeight = '22px';
                div.style.paddingTop = '4px';
                div.style.paddingBottom = '3px';
                div.style.lineHeight = '1.4';
                div.style.overflow = 'visible';
                if (inputEl.parentElement) {
                  inputEl.parentElement.style.overflow = 'visible';
                  inputEl.parentElement.style.paddingTop = '2px';
                }
              }

              if (inputEl.parentNode) {
                inputEl.parentNode.replaceChild(div, inputEl);
              }
            }
          } else if (inp.tagName === 'TEXTAREA') {
            const div = clonedDoc.createElement('div');
            div.className = inp.className;
            div.style.cssText = inp.style.cssText;
            try {
              const comp = window.getComputedStyle(src);
              div.style.fontSize = comp.fontSize || '11px';
              div.style.fontFamily = comp.fontFamily || 'inherit';
            } catch (_) {}
            div.innerHTML = val.replace(/\n/g, '<br/>');
            div.style.display = 'block';
            div.style.width = '100%';
            div.style.lineHeight = '1.4';
            div.style.overflow = 'visible';
            div.style.color = '#000000';
            div.style.fontWeight = 'bold';
            div.style.boxSizing = 'border-box';
            div.style.padding = '2px 4px';
            if (inp.parentNode) {
              inp.parentNode.replaceChild(div, inp);
            }
          } else if (inp.tagName === 'SELECT') {
            const div = clonedDoc.createElement('div');
            div.className = inp.className;
            div.style.cssText = inp.style.cssText;
            div.textContent = val;
            div.style.display = 'block';
            div.style.width = '100%';
            div.style.lineHeight = '1.35';
            div.style.overflow = 'visible';
            div.style.color = '#000000';
            div.style.fontWeight = 'bold';
            div.style.boxSizing = 'border-box';
            if (inp.parentNode) {
              inp.parentNode.replaceChild(div, inp);
            }
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
            if (cell.classList.contains('keep-nowrap')) {
              cell.style.whiteSpace = 'nowrap';
              cell.style.wordBreak = 'keep-all';
            } else {
              cell.style.whiteSpace = 'normal';
              cell.style.overflow = 'visible';
              cell.style.textOverflow = 'clip';
              cell.style.wordBreak = 'break-word';
              cell.style.overflowWrap = 'anywhere';
              cell.style.maxWidth = 'none';
            }
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

    const isSinglePageFit = elementId.includes('traveling-expenses') || element.id.includes('traveling-expenses');
    const targetHeight = pdfHeight - margin * 2;

    if (isSinglePageFit) {
      // Proportional fit to ensure 100% of rows (including Officer Name & Signature) fit on 1 A4 page without clipping
      const scaleFactor = isDealerForm ? Math.min(0.93, (targetHeight / contentHeight) * 0.93) : Math.min(1, targetHeight / contentHeight);
      const finalWidth = contentWidth * scaleFactor;
      const finalHeight = contentHeight * scaleFactor;
      const xOffset = margin + (contentWidth - finalWidth) / 2;
      const yOffset = margin;
      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
    } else if (contentHeight <= targetHeight * 1.05) {
      // Single A4 page fit: ensure it never spills onto an unnecessary page 2
      const finalHeight = Math.min(contentHeight, targetHeight);
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

  const printClone = el.cloneNode(true) as HTMLElement;
  const srcInputs = Array.from(el.querySelectorAll('input, select, textarea'));
  const cloneInputs = Array.from(printClone.querySelectorAll('input, select, textarea'));

  cloneInputs.forEach((clonedNode, idx) => {
    const src = srcInputs[idx] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (!src) return;
    const val = src.value || src.getAttribute('value') || '';

    if (clonedNode.tagName === 'INPUT') {
      const inputEl = clonedNode as HTMLInputElement;
      const type = (inputEl.type || 'text').toLowerCase();
      if (type === 'checkbox' || type === 'radio') {
        inputEl.checked = (src as HTMLInputElement).checked;
        if (inputEl.checked) inputEl.setAttribute('checked', 'checked');
        else inputEl.removeAttribute('checked');
      } else {
        const div = document.createElement('div');
        div.className = inputEl.className;
        div.classList.remove('leading-none', 'pb-0', 'border-none', 'outline-none');
        div.style.cssText = inputEl.style.cssText;
        div.textContent = val || inputEl.placeholder || '';
        div.style.display = 'block';
        div.style.width = '100%';
        div.style.lineHeight = '1.4';
        div.style.minHeight = '20px';
        div.style.paddingTop = '3px';
        div.style.paddingBottom = '2px';
        div.style.overflow = 'visible';
        div.style.boxSizing = 'border-box';
        div.style.color = '#000000';
        div.style.fontWeight = inputEl.classList.contains('font-black') ? '900' : 'bold';

        const isOfficerName = inputEl.placeholder?.toUpperCase().includes('OFFICER') || 
                              inputEl.value?.toUpperCase().includes('ROHIT') ||
                              val.toUpperCase().includes('ROHIT') ||
                              inputEl.parentElement?.classList.contains('w-60');

        if (isOfficerName) {
          div.style.textAlign = 'center';
          div.style.textTransform = 'uppercase';
          div.style.fontWeight = '900';
          div.style.fontSize = '12px';
          div.style.letterSpacing = '0.05em';
          div.style.minHeight = '22px';
          div.style.paddingTop = '4px';
          div.style.paddingBottom = '3px';
          div.style.lineHeight = '1.4';
          div.style.overflow = 'visible';
          if (inputEl.parentElement) {
            inputEl.parentElement.style.overflow = 'visible';
            inputEl.parentElement.style.paddingTop = '2px';
          }
        }

        if (inputEl.parentNode) {
          inputEl.parentNode.replaceChild(div, inputEl);
        }
      }
    } else if (clonedNode.tagName === 'TEXTAREA') {
      const div = document.createElement('div');
      div.className = clonedNode.className;
      div.style.cssText = (clonedNode as HTMLElement).style.cssText;
      div.innerHTML = val.replace(/\n/g, '<br/>');
      div.style.display = 'block';
      div.style.width = '100%';
      div.style.lineHeight = '1.4';
      div.style.overflow = 'visible';
      div.style.color = '#000000';
      div.style.fontWeight = 'bold';
      div.style.boxSizing = 'border-box';
      div.style.padding = '2px 4px';
      if (clonedNode.parentNode) {
        clonedNode.parentNode.replaceChild(div, clonedNode);
      }
    } else if (clonedNode.tagName === 'SELECT') {
      const div = document.createElement('div');
      div.className = clonedNode.className;
      div.style.cssText = (clonedNode as HTMLElement).style.cssText;
      div.textContent = val;
      div.style.display = 'block';
      div.style.width = '100%';
      div.style.lineHeight = '1.35';
      div.style.overflow = 'visible';
      div.style.color = '#000000';
      div.style.fontWeight = 'bold';
      div.style.boxSizing = 'border-box';
      if (clonedNode.parentNode) {
        clonedNode.parentNode.replaceChild(div, clonedNode);
      }
    }
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
        padding: 6px 10px 16px 10px !important;
        box-sizing: border-box !important;
        height: auto !important;
        overflow: visible !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      #dealer-print-form table {
        border-collapse: collapse !important;
        border: 1px solid #475569 !important;
        width: 100% !important;
      }
      #dealer-print-form td, #dealer-print-form th {
        border: 1px solid #64748b !important;
        padding: 2.5px 5px !important;
        display: table-cell !important;
        vertical-align: middle !important;
      }
      #dealer-print-form .text-center.w-60 {
        overflow: visible !important;
        padding-top: 4px !important;
      }
      #dealer-print-form .text-center.w-60 div,
      #dealer-print-form .text-center.w-60 input {
        overflow: visible !important;
        line-height: 1.4 !important;
        min-height: 22px !important;
        padding-top: 3px !important;
        padding-bottom: 2px !important;
      }
    </style>
  </head>
  <body>
    <div id="print-mount-root">
      ${printClone.outerHTML}
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
