import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Grid3x3 } from 'lucide-react';

interface Cluster {
  category: string;
  icon: string;
  color: string;
  items: string[];
}
interface TopicClustersViewerProps {
  title: string;
  data?: Cluster[];
}

// Fallback colours if backend doesn't supply them
const CLUSTER_STYLES = [
  { bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-300 dark:border-blue-700', tag: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-300 dark:border-purple-700', tag: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-300 dark:border-emerald-700', tag: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-300 dark:border-orange-700', tag: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-pink-50 dark:bg-pink-950/40', border: 'border-pink-300 dark:border-pink-700', tag: 'bg-pink-500', text: 'text-pink-700 dark:text-pink-300' },
  { bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-300 dark:border-indigo-700', tag: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-teal-300 dark:border-teal-700', tag: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-300 dark:border-amber-700', tag: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
];


export default function TopicClustersViewer({ title, data }: TopicClustersViewerProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const clusters: Cluster[] = data && data.length > 0 ? data : [
    { category: 'Analyzing…', icon: '⏳', color: '', items: ['Upload a PDF to generate topic clusters.'] },
  ];

  const totalItems = clusters.reduce((n, c) => n + (c.items?.length || 0), 0);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Grid3x3 className="h-5 w-5 text-amber-500" />
          Topic Clusters
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            — {clusters.length} cluster{clusters.length !== 1 ? 's' : ''}, {totalItems} keywords
          </span>
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Key concepts from <span className="font-medium text-gray-700 dark:text-gray-300">{title}</span> grouped by section
        </p>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[650px] pr-1">
          {/* Overview chips row */}
          <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            {clusters.map((c, i) => {
              const style = CLUSTER_STYLES[i % CLUSTER_STYLES.length];
              return (
                <button
                  key={i}
                  onClick={() => setSelected(selected === i ? null : i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selected === i
                    ? `${style.tag} text-white border-transparent scale-105 shadow`
                    : `${style.bg} ${style.border} ${style.text} hover:scale-105`
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${selected === i ? 'bg-white' : style.tag
                    }`} />
                  {c.category}
                </button>
              );
            })}
            {selected !== null && (
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                Show all
              </button>
            )}
          </div>

          {/* Cluster cards grid */}
          <div className={`grid gap-4 ${clusters.length === 1 ? 'grid-cols-1' :
            clusters.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
            {clusters.map((cluster, i) => {
              const style = CLUSTER_STYLES[i % CLUSTER_STYLES.length];
              const isHighlighted = selected === null || selected === i;

              return (
                <div
                  key={i}
                  className={`rounded-xl border-2 ${style.border} ${style.bg} p-4 transition-all duration-200 cursor-pointer ${isHighlighted ? 'opacity-100 scale-100' : 'opacity-30 scale-95'
                    }`}
                  onClick={() => setSelected(selected === i ? null : i)}
                >
                  {/* Header — numbered dot + title */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg ${style.tag} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-xs font-semibold">{i + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className={`font-semibold text-sm leading-snug ${style.text} line-clamp-2`}>
                        {cluster.category}
                      </h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {cluster.items?.length || 0} keywords
                      </p>
                    </div>
                  </div>

                  {/* Keyword tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {(cluster.items || []).map((item, j) => (
                      <span
                        key={j}
                        className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium border ${style.border} bg-white dark:bg-gray-900 ${style.text}`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total summary */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-600">
              {totalItems} keywords across {clusters.length} topic cluster{clusters.length !== 1 ? 's' : ''} · Click a cluster to highlight
            </p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}