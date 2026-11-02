import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Download, Table, Sparkles, Layers, RefreshCw, FileSpreadsheet } from 'lucide-react';
import MathText from './MathText';
import * as htmlToImage from 'html-to-image';
import { toast } from 'sonner';

interface ComparisonTable {
  title: string;
  headers: string[];
  rows: string[][];
}

interface ComparativeTableViewerProps {
  title: string;
  data?: any[];
  theme?: 'light' | 'dark';
}

function SingleTable({ table, tIdx, docTitle, theme }: { table: ComparisonTable; tIdx: number; docTitle: string; theme: string }) {
  const localRef = useRef<HTMLDivElement>(null);

  const handleSaveIndividual = async () => {
    console.log('Save individual table triggered for:', table.title);
    if (!localRef.current) {
      console.error('Table Reference is null!');
      toast.error('Ref Error: Could not find table element');
      return;
    }
    
    try {
      toast.info('Synthesizing HD table image...', { duration: 3000 });
      const targetWidth = Math.max(900, localRef.current.scrollWidth);
      const dataUrl = await htmlToImage.toPng(localRef.current, {
        quality: 1.0,
        pixelRatio: 4.0, // Stable high density
        backgroundColor: theme === 'dark' ? '#030712' : '#ffffff',
        style: {
          padding: '24px',
          borderRadius: '20px',
          width: `${targetWidth}px`,
          minWidth: `${targetWidth}px`,
          transform: 'scale(1)',
          animation: 'none !important',
          transition: 'none !important',
          imageRendering: '-webkit-optimize-contrast'
        }
      });
      console.log('Table image generated successfully');
      const link = document.createElement('a');
      link.download = `Table_${tIdx + 1}_${table.title.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('HD Table saved!');
    } catch (err) {
      console.error('Save individual table failed:', err);
      toast.error('Failed to save table image');
    }
  };

  return (
    <div className="rounded-[2rem] bg-[#030712] w-full" style={{ display: 'block' }}>
      <Card className="overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-950 transition-all hover:shadow-md h-full rounded-[2rem]">
      <CardHeader className="bg-gray-50/80 dark:bg-gray-900/80 py-2 sm:py-4 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-xs sm:text-lg font-semibold text-gray-800 dark:text-gray-100 uppercase leading-tight">
            {table.title}
          </CardTitle>
          <p className="text-[8px] sm:text-[10px] text-gray-400 uppercase  font-black mt-0.5 sm:mt-1">Table Sequence #{tIdx + 1}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveIndividual}
          className="rounded-lg sm:rounded-xl gap-1.5 sm:gap-2 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm flex-shrink-0"
        >
          <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500" />
          <span className="hidden xs:inline">Save Table</span>
          <span className="xs:hidden">Save</span>
        </Button>
      </CardHeader>
      <div ref={localRef} className="overflow-x-auto pb-4 bg-white dark:bg-[#030712] px-6 py-6 rounded-b-[2rem]">
        <table className="w-full text-sm border-collapse min-w-[900px] table-auto">
          <thead>
            <tr className="bg-white dark:bg-gray-950 text-left border-b border-gray-100 dark:border-gray-800">
              <th className="px-6 py-4 font-black text-gray-400 dark:text-gray-500 w-16 text-center text-[10px] uppercase">Ref</th>
              {table.headers.map((h, i) => (
                <th key={i} className="px-6 py-4 font-black text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-tighter">
                  <MathText content={h} inline />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
            {table.rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="hover:bg-blue-50/20 dark:hover:bg-blue-900/5 transition-colors group"
              >
                <td className="px-4 py-4 text-gray-400 dark:text-gray-500 font-mono text-xs text-center border-l-4 border-transparent group-hover:border-blue-500 italic">
                  {rIdx + 1}
                </td>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className={`px-4 sm:px-6 py-4 sm:py-5 text-gray-700 dark:text-gray-300 align-top leading-relaxed text-[11px] sm:text-[13px] ${cIdx === 0 ? 'font-semibold text-blue-600 dark:text-blue-400' : 'font-medium'}`}>
                    <MathText content={cell} inline />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
    </div>
  );
}

export default function ComparativeTableViewer({ title, data, theme = 'dark' }: ComparativeTableViewerProps) {
  const allTablesRef = useRef<HTMLDivElement>(null);

  const handleDownloadAll = async () => {
    try {
      toast.info('Synthesizing high-fidelity PDF report...', { duration: 5000 });
      
      // @ts-ignore
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let pageCount = 0;

      const addPdfPage = () => {
        if (pageCount > 0) {
          pdf.addPage('a4', 'portrait');
        }
        pageCount++;
      };

      const drawHeader = (subTitle: string) => {
        pdf.setFillColor(3, 7, 18);
        pdf.rect(0, 0, 210, 297, 'F');

        pdf.setTextColor(59, 130, 246);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('OMNISTUDY AI', 105, 13, { align: 'center' });

        pdf.setTextColor(148, 163, 184);
        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'bold');

        const safeSub = (subTitle || '')
          .replace(/[^\x20-\x7E]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        const boundedSub = safeSub.length > 42 ? safeSub.slice(0, 39) + '...' : safeSub;
        const headerText = boundedSub
          ? `COMPARATIVE ANALYSIS • ${boundedSub.toUpperCase()}`
          : 'COMPARATIVE ANALYSIS';
        pdf.text(headerText, 105, 19, { align: 'center' });

        pdf.setDrawColor(30, 41, 59);
        pdf.setLineWidth(0.4);
        pdf.line(12, 23, 198, 23);
      };

      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '0';
      tempContainer.style.top = '0';
      tempContainer.style.width = '1450px';
      tempContainer.style.zIndex = '-9999';
      tempContainer.style.opacity = '1';
      tempContainer.style.visibility = 'visible';
      tempContainer.style.overflow = 'visible';
      tempContainer.style.pointerEvents = 'none';
      document.body.appendChild(tempContainer);

      const chunk = <T,>(arr: T[], size: number): T[][] => {
        const res: T[][] = [];
        for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
        return res;
      };

      // Structure tables into compact units of up to 5 rows so 2 tables fit per page
      interface TableSubBlock {
        title: string;
        subtitle?: string;
        headers: string[];
        rows: string[][];
        globalRowOffset: number;
      }
      const tableSubBlocks: TableSubBlock[] = [];
      for (const table of tables) {
        if (!table.rows || table.rows.length === 0) continue;
        const rowChunks = chunk(table.rows, 5);
        for (let rIdx = 0; rIdx < rowChunks.length; rIdx++) {
          tableSubBlocks.push({
            title: table.title,
            subtitle: rowChunks.length > 1 ? `(Part ${rIdx + 1} of ${rowChunks.length})` : undefined,
            headers: table.headers,
            rows: rowChunks[rIdx],
            globalRowOffset: rIdx * 5
          });
        }
      }

      // Group into 2 tables per page
      const pagePairs = chunk(tableSubBlocks, 2);
      for (let pIdx = 0; pIdx < pagePairs.length; pIdx++) {
        const pair = pagePairs[pIdx];
        const pageEl = document.createElement('div');
        pageEl.style.width = '1400px';
        pageEl.style.minHeight = pair.length === 2 ? '1840px' : '960px';
        pageEl.style.boxSizing = 'border-box';
        pageEl.style.padding = '12px 24px';
        pageEl.style.backgroundColor = '#020617';
        pageEl.style.color = '#f8fafc';
        pageEl.style.display = 'flex';
        pageEl.style.flexDirection = 'column';
        pageEl.style.justifyContent = 'space-between';
        (pageEl.style as any).webkitFontSmoothing = 'antialiased';
        pageEl.style.fontFamily = "'Inter', 'Noto Sans', 'Noto Sans Telugu', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Kannada', 'Noto Sans Malayalam', 'Nirmala UI', sans-serif";

        pageEl.innerHTML = pair.map((tbl, tblIdx) => `
          <div style="flex: 1; display: flex; flex-direction: column; border: 1px solid #1e293b; border-radius: 18px; background: #020617; overflow: hidden; width: 100%; box-sizing: border-box; ${tblIdx > 0 ? 'margin-top: 36px;' : ''}; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <div style="background: linear-gradient(to right, #1e1b4b, #1e3a8a); padding: 18px 24px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; flex-shrink: 0;">
              <h4 style="margin: 0; font-weight: 700; color: #f8fafc; font-size: 19px; word-break: break-word; overflow-wrap: anywhere;">
                ${tbl.title} ${tbl.subtitle ? `<span style="color: #93c5fd; font-weight: 400; font-size: 15px; margin-left: 10px;">${tbl.subtitle}</span>` : ''}
              </h4>
              <span style="font-size: 12px; font-weight: 700; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(59, 130, 246, 0.2); padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.4); flex-shrink: 0;">
                Table ${pair.length > 1 ? `${tblIdx + 1}/2` : '1/1'}
              </span>
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; padding: 0; background: #000; width: 100%; box-sizing: border-box; overflow: hidden;">
              <table style="width: 100%; height: 100%; border-collapse: collapse; color: #cbd5e1; font-size: 14.5px; table-layout: fixed; box-sizing: border-box;">
                <thead>
                  <tr style="background: #0f172a; border-bottom: 1px solid #1e293b;">
                    <th style="padding: 14px 10px; border: 1px solid #1e293b; color: #94a3b8; text-align: center; width: 48px; box-sizing: border-box; font-size: 13px;">#</th>
                    ${tbl.headers.map(h => `<th style="padding: 14px 16px; border: 1px solid #1e293b; color: #60a5fa; text-align: left; font-weight: 700; word-break: break-word; overflow-wrap: anywhere; box-sizing: border-box; font-size: 14px;">${h.toUpperCase()}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${tbl.rows.map((row, rowI) => `
                    <tr style="background: ${rowI % 2 === 0 ? 'rgba(15, 23, 42, 0.5)' : '#020617'};">
                      <td style="padding: 16px 10px; border: 1px solid #1e293b; text-align: center; color: #64748b; font-family: monospace; font-weight: bold; box-sizing: border-box; vertical-align: middle;">${tbl.globalRowOffset + rowI + 1}</td>
                      ${row.map((cell, cellI) => `
                        <td style="padding: 16px 16px; border: 1px solid #1e293b; vertical-align: middle; line-height: 1.6; word-break: break-word; overflow-wrap: anywhere; white-space: normal; box-sizing: border-box; ${cellI === 0 ? 'color: #60a5fa; font-weight: 700;' : ''}">
                          ${cell}
                        </td>
                      `).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('');

        tempContainer.appendChild(pageEl);
        await new Promise(r => setTimeout(r, 60));

        const pageImg = await htmlToImage.toPng(pageEl, {
          quality: 1.0,
          pixelRatio: 3.2,
          backgroundColor: '#020617',
          style: {
            transform: 'scale(1)',
            opacity: '1',
            overflow: 'visible',
            imageRendering: '-webkit-optimize-contrast'
          }
        });
        tempContainer.removeChild(pageEl);

        addPdfPage();
        drawHeader(`Part ${pIdx + 1} of ${pagePairs.length}`);

        const boxX = 12;
        const boxY = 27;
        const boxW = 186;
        const maxH = 254;

        const img = new Image();
        img.src = pageImg;
        await new Promise((res) => {
          if (img.complete) res(null);
          else { img.onload = () => res(null); img.onerror = () => res(null); }
        });

        const ratio = (img.width || 1400) / (img.height || 1850);
        let drawW = boxW;
        let drawH = drawW / ratio;
        if (drawH > maxH) {
          drawH = maxH;
          drawW = drawH * ratio;
        }
        const drawX = boxX + (boxW - drawW) / 2;
        const drawY = boxY;

        pdf.addImage(pageImg, 'PNG', drawX, drawY, drawW, drawH, undefined, 'FAST');
      }

      if (tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }

      pdf.save(`Comparison_Report_${title.replace(/\s+/g, '_')}.pdf`);
      toast.success('Full comparison PDF saved!');
    } catch (err) {
      console.error('Save all tables failed:', err);
      toast.error('Failed to generate PDF');
    }
  };

  const sanitize = (text: string) => {
    if (!text) return 'Detail not specified';
    const clean = text.trim();
    if (/^(n\/a|not applicable|no data|none)$/i.test(clean)) {
      return 'Refer to document for specific context';
    }
    return clean;
  };

  let tables: ComparisonTable[] = [];
  const rawList = data ? (Array.isArray(data) ? data : [data]) : [];
  if (rawList.length > 0) {
    if (rawList[0] && ('concept' in rawList[0] || 'keyFeatures' in rawList[0])) {
      tables = [
        {
          title: 'Core Concepts Comparison',
          headers: ['Concept / Section', 'Key Features', 'Examples', 'Differences / Role'],
          rows: rawList.map((r: any) => [
            sanitize(r.concept || r.title || r.name),
            sanitize(r.keyFeatures || r.features || r.description),
            sanitize(r.examples || r.example),
            sanitize(r.differences || r.role || r.details)
          ])
        }
      ];
    } else if (rawList[0] && ('title' in rawList[0] || 'headers' in rawList[0])) {
      tables = (rawList as ComparisonTable[]).map(t => ({
        ...t,
        title: t.title || 'Comparison Table',
        headers: t.headers || [],
        rows: (t.rows || []).map(row => (Array.isArray(row) ? row.map(sanitize) : Object.values(row).map(sanitize)))
      }));
    } else if (rawList[0] && typeof rawList[0] === 'object') {
      const headers = Object.keys(rawList[0]);
      tables = [{
        title: 'Comparative Analysis',
        headers,
        rows: rawList.map((item: any) => headers.map(h => sanitize(item[h])))
      }];
    }
  }

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardHeader className="sm:space-y-3 space-y-2 px-0 py-2 sm:py-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex flex-row items-center gap-2 sm:text-xl text-sm font-semibold uppercase truncate">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg sm:rounded-xl flex-shrink-0">
                  <FileSpreadsheet className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400 shrink-0" />
                </div>
                <span className="truncate">Comparative Analysis</span>
              </div>
              <span className="text-[9px] sm:text-xs font-black px-2 py-0.5 sm:px-2.5 sm:py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full normal-case tracking-normal ml-1 flex-shrink-0 border border-blue-200 dark:border-blue-800">
                {tables.length} TABLE{tables.length !== 1 ? 'S' : ''}
              </span>
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            className="rounded-lg sm:rounded-xl gap-1.5 sm:gap-2 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950 shrink-0 h-8 sm:h-10 px-3 sm:px-5 shadow-sm text-[10px] sm:text-sm"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
            <span className="hidden xs:inline">Save All (HD)</span>
            <span className="xs:hidden">All</span>
          </Button>
        </div>
        <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 font-medium line-clamp-1 sm:line-clamp-none">
          Detailed breakdown for{' '}
          <span className="text-blue-500 font-semibold underline decoration-blue-500/30 underline-offset-2 sm:underline-offset-4">{title}</span>
        </p>
      </CardHeader>

      <CardContent className="px-0 pt-6">
        <div className="h-[750px] w-full overflow-auto custom-scrollbar pr-2">
          <div ref={allTablesRef} className={`space-y-12 pb-12 px-0 py-4 relative ${theme === 'dark' ? 'dark' : ''}`} style={{ backgroundColor: theme === 'dark' ? '#020617' : '#ffffff' }}>
            {/* Background enhancement */}
            <div
              className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)',
                backgroundSize: '30px 30px'
              }}
            />

            <div className="relative z-10 space-y-10">
              {tables.map((table, tIdx) => (
                <SingleTable key={tIdx} table={table} tIdx={tIdx} docTitle={title} theme={theme} />
              ))}

              {tables.length === 0 && (
                <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <Table className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                  <h3 className="text-lg font-semibold text-slate-400 dark:text-slate-600">No comparative data found</h3>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">Analysis requires a document with multiple sections or identifiable comparison points.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}