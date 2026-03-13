import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Table, Download } from 'lucide-react';
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

const ROW_COLORS = [
  'border-l-blue-500',
  'border-l-emerald-500',
  'border-l-purple-500',
  'border-l-orange-500',
  'border-l-pink-500',
  'border-l-indigo-500',
  'border-l-teal-500',
  'border-l-amber-500',
];

export default function ComparativeTableViewer({ title, data, theme = 'dark' }: ComparativeTableViewerProps) {
  const tableRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (!tableRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(tableRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `Comparison_${title.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Image saved!');
    } catch (err) {
      console.error('Save image failed:', err);
      toast.error('Failed to save image');
    }
  };

  let tables: ComparisonTable[] = [];
  if (data && data.length > 0) {
    if (data[0] && 'concept' in data[0]) {
      // Legacy format conversion
      tables = [
        {
          title: 'Core Concepts Comparison',
          headers: ['Concept / Section', 'Key Features', 'Examples', 'Differences / Role'],
          rows: data.map((r: any) => [
            r.concept || '',
            r.keyFeatures || '',
            r.examples || '',
            r.differences || ''
          ])
        }
      ];
    } else if (data[0] && 'title' in data[0] && 'headers' in data[0]) {
      tables = data as ComparisonTable[];
    }
  } else {
    tables = [
      {
        title: 'No Data',
        headers: ['Status'],
        rows: [['Upload a PDF to generate comparison data.']]
      }
    ];
  }

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardHeader className="space-y-3 px-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-xl font-bold uppercase">
              <div className="flex items-center gap-2">
                <Table className="h-6 w-6 text-blue-500 shrink-0" />
                <span className="truncate">Comparison</span>
              </div>
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 normal-case tracking-normal hidden sm:inline">
                — {tables.length} table{tables.length !== 1 ? 's' : ''}
              </span>
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadImage}
            className="rounded-xl gap-2 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950 shrink-0 h-9"
          >
            <Download className="h-4 w-4" />
            <span className="hidden xs:inline">Save Image</span>
            <span className="xs:hidden">Save</span>
          </Button>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Side-by-side breakdown of every key section in{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">{title}</span>
        </p>
      </CardHeader>

      <CardContent className="px-0">
        <div className="h-[700px] w-full overflow-auto custom-scrollbar">
          <div ref={tableRef} className={`space-y-8 pb-8 px-0 py-4 relative ${theme === 'dark' ? 'dark' : ''}`} style={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff' }}>
            {/* Background Grid Pattern */}
            <div
              className="absolute inset-0 opacity-[0.05] dark:opacity-[0.1] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#6366f1 2px, transparent 2px)',
                backgroundSize: '40px 40px'
              }}
            />

            <div className="relative z-10 space-y-8">
              {tables.map((table, tIdx) => (
                <Card key={tIdx} className="overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-950">
                  <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 py-4">
                    <CardTitle className="text-lg font-bold text-gray-800 dark:text-gray-100">
                      {table.title}
                    </CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto pb-4">
                    <table className="w-full text-sm border-collapse min-w-[900px] table-auto">
                      <thead>
                        <tr className="bg-gray-100/50 dark:bg-gray-900 text-left border-y border-gray-200 dark:border-gray-800">
                          <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-12 text-center">#</th>
                          {table.headers.map((h, i) => (
                            <th key={i} className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {table.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group"
                          >
                            <td className="px-4 py-4 text-gray-400 dark:text-gray-500 font-mono text-xs text-center border-l-4 border-transparent group-hover:border-blue-500">
                              {rIdx + 1}
                            </td>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className={`px-4 py-4 text-gray-700 dark:text-gray-300 align-top leading-relaxed ${cIdx === 0 ? 'font-semibold text-blue-700 dark:text-blue-400' : ''}`}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}

              {tables.length === 0 && (
                <div className="text-center py-16 text-gray-400 dark:text-gray-600">
                  <Table className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No matching elements found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}