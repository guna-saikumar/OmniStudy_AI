import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ZoomIn, ZoomOut, Maximize2, Network, Layers, Presentation } from 'lucide-react';

interface MindMapNode {
  id?: string;
  name?: string;
  label?: string;
  type?: string;
  children?: MindMapNode[];
  nodes?: MindMapNode[];
}

interface MindMapViewerProps {
  title: string;
  data?: MindMapNode | { title?: string; nodes?: MindMapNode[] };
}

const COLORS = [
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
];

const ICONS = ['🚀', '🛡️', '⚙️', '📊', '💡', '🔍', '🎯', '📦'];

interface SingleMindMapProps {
  title: string;
  data: any;
  defaultZoom?: number;
}

function SingleMindMap({ title, data, defaultZoom = 100 }: SingleMindMapProps) {
  const [zoom, setZoom] = useState(defaultZoom);

  // Normalize data between the old format and the new explicit prompt format
  const displayTitle = (data as any)?.title || (data as any)?.label || title;
  const nodes = useMemo(() => {
    let rawNodes = (data as any)?.nodes || (data as any)?.children || [];
    if (!Array.isArray(rawNodes)) rawNodes = [];
    return rawNodes;
  }, [data]);

  const W = 1400;
  const H = Math.max(900, nodes.length * 120);
  const cx = W / 2;
  const cy = H / 2;
  const centerRadius = 140;

  const boxW = 340;
  const boxH = 180;

  // Split nodes into left and right columns
  const half = Math.ceil(nodes.length / 2);
  const leftNodes = nodes.slice(0, half);
  const rightNodes = nodes.slice(half);

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-[3rem]">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
            <Presentation className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Mindmap Infographic</CardTitle>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{nodes.length} Core Topics Processed</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setZoom(z => Math.max(40, z - 10))}>
            <ZoomOut className="h-4 w-4 text-slate-600" />
          </Button>
          <span className="text-[11px] font-black px-2 w-12 text-center text-slate-600 dark:text-slate-300">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setZoom(z => Math.min(200, z + 10))}>
            <ZoomIn className="h-4 w-4 text-slate-600" />
          </Button>
          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg ml-2" onClick={() => setZoom(100)}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 bg-[#f8fafc] dark:bg-slate-950 relative overflow-auto custom-scrollbar flex items-center justify-center min-h-[600px]">
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#6366f1 2px, transparent 2px)', backgroundSize: '40px 40px' }} />

        <div className="transform-origin-center transition-transform duration-300" style={{ transform: `scale(${zoom / 100})`, width: W, height: H }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full drop-shadow-sm">
            <defs>
              <marker id="arrowHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
              </marker>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Render Left Connections */}
            {leftNodes.map((node: MindMapNode, i: number) => {
              const color = COLORS[i % COLORS.length];
              const yGap = H / (leftNodes.length + 1);
              const nodeY = yGap * (i + 1);
              const targetX = 100 + boxW; // Right edge of left box
              const targetY = nodeY;

              const path = `M ${cx - centerRadius + 20} ${cy} C ${cx - 200} ${cy}, ${targetX + 150} ${targetY}, ${targetX + 15} ${targetY}`;

              return (
                <path
                  key={`left-path-${i}`}
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  markerEnd="url(#arrowHead)"
                  className="transition-all duration-300 opacity-90"
                />
              );
            })}

            {/* Render Right Connections */}
            {rightNodes.map((node: MindMapNode, i: number) => {
              const globalIdx = leftNodes.length + i;
              const color = COLORS[globalIdx % COLORS.length];
              const yGap = H / (rightNodes.length + 1);
              const nodeY = yGap * (i + 1);
              const targetX = W - 100 - boxW; // Left edge of right box
              const targetY = nodeY;

              const path = `M ${cx + centerRadius - 20} ${cy} C ${cx + 200} ${cy}, ${targetX - 150} ${targetY}, ${targetX - 15} ${targetY}`;

              return (
                <path
                  key={`right-path-${i}`}
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  markerEnd="url(#arrowHead)"
                  className="transition-all duration-300 opacity-90"
                />
              );
            })}

            {/* Render Left Boxes */}
            {leftNodes.map((node: MindMapNode, i: number) => {
              const color = COLORS[i % COLORS.length];
              const emoji = ICONS[i % ICONS.length];
              const yGap = H / (leftNodes.length + 1);
              const nodeY = yGap * (i + 1);
              const label = node.name || node.label || `Topic ${i + 1}`;
              const bullets = node.children || node.nodes || [];

              return (
                <foreignObject key={`left-box-${i}`} x={100} y={nodeY - boxH / 2} width={boxW} height={boxH}>
                  <div className="w-full h-full bg-white dark:bg-slate-900 border-4 rounded-3xl p-5 flex flex-col items-center justify-center shadow-lg transition-transform hover:-translate-y-1 relative" style={{ borderColor: color }}>
                    <div className="absolute top-0 right-8 px-4 py-1.5 rounded-b-xl text-white font-black text-xs uppercase" style={{ backgroundColor: color }}>
                      0{i + 1}. SECTION
                    </div>
                    <div className="flex w-full items-center gap-4 mb-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ backgroundColor: color + '15' }}>
                        {emoji}
                      </div>
                      <h3 className="font-black text-[14px] leading-tight text-slate-800 dark:text-white uppercase line-clamp-2">
                        {label}
                      </h3>
                    </div>
                    <div className="w-full space-y-1.5 px-1">
                      {bullets.slice(0, 3).map((b: any, bi: number) => (
                        <div key={bi} className="flex gap-2 items-start">
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 line-clamp-1 leading-tight">{b.name || b.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </foreignObject>
              );
            })}

            {/* Render Right Boxes */}
            {rightNodes.map((node: MindMapNode, i: number) => {
              const globalIdx = leftNodes.length + i;
              const color = COLORS[globalIdx % COLORS.length];
              const emoji = ICONS[globalIdx % ICONS.length];
              const yGap = H / (rightNodes.length + 1);
              const nodeY = yGap * (i + 1);
              const label = node.name || node.label || `Topic ${globalIdx + 1}`;
              const bullets = node.children || node.nodes || [];

              return (
                <foreignObject key={`right-box-${i}`} x={W - 100 - boxW} y={nodeY - boxH / 2} width={boxW} height={boxH}>
                  <div className="w-full h-full bg-white dark:bg-slate-900 border-4 rounded-3xl p-5 flex flex-col items-center justify-center shadow-lg transition-transform hover:-translate-y-1 relative" style={{ borderColor: color }}>
                    <div className="absolute top-0 left-8 px-4 py-1.5 rounded-b-xl text-white font-black text-xs uppercase" style={{ backgroundColor: color }}>
                      0{globalIdx + 1}. SECTION
                    </div>
                    <div className="flex w-full items-center gap-4 mb-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ backgroundColor: color + '15' }}>
                        {emoji}
                      </div>
                      <h3 className="font-black text-[14px] leading-tight text-slate-800 dark:text-white uppercase line-clamp-2">
                        {label}
                      </h3>
                    </div>
                    <div className="w-full space-y-1.5 px-1">
                      {bullets.slice(0, 3).map((b: any, bi: number) => (
                        <div key={bi} className="flex gap-2 items-start">
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 line-clamp-1 leading-tight">{b.name || b.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </foreignObject>
              );
            })}

            {/* Render Center Node */}
            <foreignObject x={cx - centerRadius - 20} y={cy - centerRadius - 20} width={(centerRadius + 20) * 2} height={(centerRadius + 20) * 2}>
              <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[12px] border-indigo-500 relative z-50">
                <div className="absolute inset-2 rounded-full border border-indigo-100 dark:border-indigo-900 border-dashed animate-[spin_30s_linear_infinite]" />
                <div className="flex flex-col items-center justify-center p-6 text-center z-10">
                  <span className="text-[10px] font-black tracking-[0.3em] text-indigo-400 uppercase mb-2">MINDMAP</span>
                  <span className="font-black text-2xl text-slate-800 dark:text-white uppercase tracking-tighter leading-tight line-clamp-3">
                    {displayTitle}
                  </span>
                  <div className="flex gap-1.5 mt-4">
                    {COLORS.slice(0, 5).map(c => <span key={c} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />)}
                  </div>
                </div>
              </div>
            </foreignObject>

          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MindMapViewer({ title, data }: MindMapViewerProps) {
  const maps = Array.isArray(data) ? data : [data];

  if (!data || maps.length === 0) {
    return (
      <Card className="p-12 text-center text-slate-500">
        <Network className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>No mind map data generated.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {maps.map((mapData, i) => (
        <SingleMindMap key={i} title={mapData?.title || title} data={mapData} />
      ))}
    </div>
  );
}
