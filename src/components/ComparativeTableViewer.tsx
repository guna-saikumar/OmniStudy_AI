import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Table, Download, FileSpreadsheet } from 'lucide-react';
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
      const dataUrl = await htmlToImage.toPng(localRef.current, {
        quality: 1.0,
        pixelRatio: 4.0, // Stable high density
        backgroundColor: theme === 'dark' ? '#030712' : '#ffffff',
        style: {
          padding: '24px',
          borderRadius: '20px',
          width: 'fit-content',
          minWidth: '900px', // Tables usually need width
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
      <CardHeader className="bg-gray-50/80 dark:bg-gray-900/80 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {table.title}
          </CardTitle>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">Table Sequence #{tIdx + 1}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveIndividual}
          className="rounded-xl gap-2 h-8 px-3 text-xs font-bold hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
        >
          <Download className="h-3.5 w-3.5 text-blue-500" />
          <span>Save Table</span>
        </Button>
      </CardHeader>
      <div ref={localRef} className="overflow-x-auto pb-4 bg-white dark:bg-[#030712] px-6 py-6 rounded-b-[2rem]">
        <table className="w-full text-sm border-collapse min-w-[900px] table-auto">
          <thead>
            <tr className="bg-white dark:bg-gray-950 text-left border-b border-gray-100 dark:border-gray-800">
              <th className="px-6 py-4 font-black text-gray-400 dark:text-gray-500 w-16 text-center text-[10px] uppercase">Ref</th>
              {table.headers.map((h, i) => (
                <th key={i} className="px-6 py-4 font-black text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-tighter">
                  {h}
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
                  <td key={cIdx} className={`px-6 py-5 text-gray-700 dark:text-gray-300 align-top leading-relaxed text-[13px] ${cIdx === 0 ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium'}`}>
                    {cell}
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
    if (!allTablesRef.current) return;
    try {
      toast.info('Synthesizing high-fidelity PDF report...', { duration: 5000 });
      
      const subItems = allTablesRef.current.querySelectorAll('[data-pdf-export-target="true"]');
      const tableDivs = allTablesRef.current.querySelectorAll('.single-table-capture');
      const targets = tableDivs.length > 0 ? Array.from(tableDivs) : Array.from(allTablesRef.current.children).filter(c => c.tagName !== 'DIV' || !c.classList.contains('pointer-events-none'));
      
      const pdfEl = document.createElement('div');
      pdfEl.style.background = '#030712';
      
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        // Capture each table as PNG first
        const tableEl = allTablesRef.current.querySelectorAll('.overflow-x-auto')[i] as HTMLElement;
        if (!tableEl) continue;

        const imgData = await htmlToImage.toPng(tableEl, {
          quality: 1.0,
          pixelRatio: 4.0,
          backgroundColor: '#030712',
          style: { padding: '24px', borderRadius: '20px', imageRendering: '-webkit-optimize-contrast' }
        });

        const pg = document.createElement('div');
        pg.style.padding = '40px';
        pg.style.background = '#030712';
        if (i > 0) pg.style.pageBreakBefore = 'always';
        
        pg.innerHTML = `
          <div style="padding: 24px; color: #fff; font-family: 'Inter', sans-serif; border: 1px solid #1e293b; border-radius: 20px; background: #020617;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 1px solid #1e293b; padding-bottom: 15px;">
              <h1 style="color:#3b82f6; margin:0; font-size: 24px; font-weight: 800;">COMPARATIVE ANALYSIS</h1>
              <p style="color:#94a3b8; margin:5px 0 0 0; text-transform:uppercase; font-size:10px; letter-spacing: 0.1em;">${table.title} | ${title}</p>
            </div>
            <img src="${imgData}" style="width: 100%; display: block;" />
          </div>
        `;
        pdfEl.appendChild(pg);
        await new Promise(r => setTimeout(r, 300));
      }

      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const pdfOpt = {
        margin: 0, 
        filename: `Comparison_Report_${title.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'png' as const, quality: 1.0 },
        html2canvas: { scale: 1.5, useCORS: true, backgroundColor: '#030712' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as any },
        pagebreak: { mode: ['css', 'legacy'] }
      };
      await html2pdf().set(pdfOpt).from(pdfEl).save();
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
  if (data && data.length > 0) {
    if (data[0] && 'concept' in data[0]) {
      tables = [
        {
          title: 'Core Concepts Comparison',
          headers: ['Concept / Section', 'Key Features', 'Examples', 'Differences / Role'],
          rows: data.map((r: any) => [
            sanitize(r.concept),
            sanitize(r.keyFeatures),
            sanitize(r.examples),
            sanitize(r.differences)
          ])
        }
      ];
    } else if (data[0] && 'title' in data[0] && 'headers' in data[0]) {
      tables = (data as ComparisonTable[]).map(t => ({
        ...t,
        rows: t.rows.map(row => row.map(sanitize))
      }));
    }
  }

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardHeader className="space-y-3 px-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-xl font-bold uppercase">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600 dark:text-blue-400 shrink-0" />
                </div>
                <span className="truncate">Comparative Analysis</span>
              </div>
              <span className="text-xs font-black px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full normal-case tracking-normal hidden sm:inline border border-slate-200 dark:border-slate-700">
                {tables.length} DATASETS
              </span>
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            className="rounded-xl gap-2 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950 shrink-0 h-10 px-5 shadow-sm"
          >
            <Download className="h-4 w-4 text-blue-500" />
            <span className="hidden xs:inline">Save All (HD)</span>
            <span className="xs:hidden">All</span>
          </Button>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
          Detailed side-by-side analytical breakdown for{' '}
          <span className="text-blue-500 font-bold underline decoration-blue-500/30 underline-offset-4">{title}</span>
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
                  <h3 className="text-lg font-bold text-slate-400 dark:text-slate-600">No comparative data found</h3>
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