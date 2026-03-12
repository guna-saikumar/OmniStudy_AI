import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Table } from 'lucide-react';

interface ComparisonTable {
  title: string;
  headers: string[];
  rows: string[][];
}
interface ComparativeTableViewerProps {
  title: string;
  data?: any[];
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

export default function ComparativeTableViewer({ title, data }: ComparativeTableViewerProps) {
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
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Table className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            Comparative Analysis
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              — {tables.length} table{tables.length !== 1 ? 's' : ''}
            </span>
          </CardTitle>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Side-by-side breakdown of every key section in{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">{title}</span>
        </p>
      </CardHeader>

      <CardContent className="px-0">
        <ScrollArea className="h-[650px] w-full pr-4">
          <div className="space-y-8 pb-8">
            {tables.map((table, tIdx) => (
              <Card key={tIdx} className="overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-950">
                <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 py-4">
                  <CardTitle className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    {table.title}
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[600px]">
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
        </ScrollArea>
      </CardContent>
    </Card>
  );
}