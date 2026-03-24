import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ZoomIn, ZoomOut, Maximize2, Network, Layers, Presentation, Download } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

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
  theme?: 'light' | 'dark';
  contentOnly?: boolean;
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
  theme?: 'light' | 'dark';
  contentOnly?: boolean;
}

function SingleMindMap({ title, data, defaultZoom = 100, theme = 'dark', contentOnly }: SingleMindMapProps) {
  const [zoom, setZoom] = useState(defaultZoom);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setZoom(100);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Normalize data between the old format and the new explicit prompt format
  const displayTitle = (data as any)?.title || (data as any)?.label || title;
  const nodes = useMemo(() => {
    let rawNodes = (data as any)?.nodes || (data as any)?.children || [];
    if (!Array.isArray(rawNodes)) rawNodes = [];
    return rawNodes;
  }, [data]);

  const handleDownloadImage = async () => {
    if (!mapRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(mapRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'center center',
          padding: '0px', 
          margin: '0px'
        },
        fontEmbedCSS: '', // Reduce issues with fonts
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `MindMap_${displayTitle.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image', err);
    }
  };

  const W = 1400;
  const H = Math.max(1000, nodes.length * 300);
  const cx = W / 2;
  const cy = H / 2;
  const centerRadius = 140;

  const boxW = 340;
  const boxH = 180;

  // Split nodes into left and right columns
  const half = Math.ceil(nodes.length / 2);
  const leftNodes = nodes.slice(0, half);
  const rightNodes = nodes.slice(half);

  const renderSVGContent = () => (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full drop-shadow-sm relative z-10">
      <defs>
        <pattern id="dotGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="2" fill="#6366f1" fillOpacity={theme === 'dark' ? '0.1' : '0.05'} />
        </pattern>
        <marker id="arrowHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={contentOnly ? "0" : "6"} result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        {nodes.map((_node: MindMapNode, i: number) => (
          <marker key={`arrow-${i}`} id={`arrow-${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS[i % COLORS.length]} />
          </marker>
        ))}
      </defs>
      <rect width={W} height={H} fill="url(#dotGrid)" />
      {leftNodes.map((node: MindMapNode, i: number) => {
        const color = COLORS[i % COLORS.length];
        const yGap = H / (leftNodes.length + 1);
        const nodeY = yGap * (i + 1);
        const targetX = 100 + boxW;
        const targetY = nodeY;
        const path = `M ${cx - centerRadius + 20} ${cy} C ${cx - 200} ${cy}, ${targetX + 150} ${targetY}, ${targetX + 15} ${targetY}`;
        return (
          <path key={`left-path-${i}`} d={path} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" markerEnd={`url(#arrow-${i})`} className="transition-all duration-300 opacity-90" />
        );
      })}
      {rightNodes.map((node: MindMapNode, i: number) => {
        const globalIdx = leftNodes.length + i;
        const color = COLORS[globalIdx % COLORS.length];
        const yGap = H / (rightNodes.length + 1);
        const nodeY = yGap * (i + 1);
        const targetX = W - 100 - boxW;
        const targetY = nodeY;
        const path = `M ${cx + centerRadius - 20} ${cy} C ${cx + 200} ${cy}, ${targetX - 150} ${targetY}, ${targetX - 15} ${targetY}`;
        return (
          <path key={`right-path-${i}`} d={path} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" markerEnd={`url(#arrow-${globalIdx})`} className="transition-all duration-300 opacity-90" />
        );
      })}
      {leftNodes.map((node: MindMapNode, i: number) => {
        const color = COLORS[i % COLORS.length];
        const emoji = ICONS[i % ICONS.length];
        const yGap = H / (leftNodes.length + 1);
        const nodeY = yGap * (i + 1);
        const label = node.name || node.label || `Topic ${i + 1}`;
        const bullets = node.children || node.nodes || [];
        return (
          <foreignObject key={`left-box-${i}`} x={100} y={nodeY} width={boxW} height={800} style={{ overflow: 'visible' }}>
            <div className="w-full" style={{ transform: 'translateY(-50%)' }}>
              <div className="rounded-3xl shadow-lg relative" style={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: `4px solid ${color}`, borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', padding: '32px 24px 24px 24px', boxSizing: 'border-box', width: `${boxW}px`, minHeight: `${boxH}px` }}>
                <div style={{ position: 'absolute', top: '0', right: '32px', padding: '6px 16px', backgroundColor: color, color: 'white', fontWeight: '900', fontSize: '10px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', textTransform: 'uppercase', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>0{i + 1}. SECTION</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', width: '100%' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', flexShrink: 0 }}>{emoji}</div>
                  <h3 className={theme === 'dark' ? 'text-white' : 'text-slate-800'} style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', lineHeight: '1.2', margin: 0, flex: 1 }}>{label}</h3>
                </div>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bullets.map((b: any, bi: number) => (
                    <div key={bi} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color, marginTop: '7px', flexShrink: 0 }} />
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} style={{ fontSize: '13px', fontWeight: '700', lineHeight: '1.4' }}>{b.name || b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </foreignObject>
        );
      })}
      {rightNodes.map((node: MindMapNode, i: number) => {
        const globalIdx = leftNodes.length + i;
        const color = COLORS[globalIdx % COLORS.length];
        const emoji = ICONS[globalIdx % ICONS.length];
        const yGap = H / (rightNodes.length + 1);
        const nodeY = yGap * (i + 1);
        const label = node.name || node.label || `Topic ${globalIdx + 1}`;
        const bullets = node.children || node.nodes || [];
        return (
          <foreignObject key={`right-box-${i}`} x={W - 100 - boxW} y={nodeY} width={boxW} height={800} style={{ overflow: 'visible' }}>
            <div className="w-full" style={{ transform: 'translateY(-50%)' }}>
              <div className="rounded-3xl shadow-lg relative" style={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: `4px solid ${color}`, borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', padding: '32px 24px 24px 24px', boxSizing: 'border-box', width: `${boxW}px`, minHeight: `${boxH}px` }}>
                <div style={{ position: 'absolute', top: '0', left: '32px', padding: '6px 16px', backgroundColor: color, color: 'white', fontWeight: '900', fontSize: '10px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', textTransform: 'uppercase', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>0{globalIdx + 1}. SECTION</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', width: '100%' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', flexShrink: 0 }}>{emoji}</div>
                  <h3 className={theme === 'dark' ? 'text-white' : 'text-slate-800'} style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', lineHeight: '1.2', margin: 0, flex: 1 }}>{label}</h3>
                </div>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bullets.map((b: any, bi: number) => (
                    <div key={bi} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color, marginTop: '7px', flexShrink: 0 }} />
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} style={{ fontSize: '13px', fontWeight: '700', lineHeight: '1.4' }}>{b.name || b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </foreignObject>
        );
      })}
      <foreignObject x={cx - centerRadius - 40} y={cy - centerRadius - 40} width={(centerRadius + 40) * 2} height={(centerRadius + 40) * 2}>
        <div className="flex flex-col items-center justify-center rounded-full shadow-2xl relative z-50 overflow-hidden" style={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', border: '12px solid #6366f1', borderRadius: '1000px', width: `${(centerRadius + 20) * 2}px`, height: `${(centerRadius + 20) * 2}px`, margin: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
          <div className="absolute inset-2 rounded-full border border-indigo-100 dark:border-indigo-900 border-dashed animate-[spin_30s_linear_infinite]" />
          <div className="relative z-10 w-full" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ marginBottom: '12px', width: '100%' }}>
              <span style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.4em', color: '#818cf8', textTransform: 'uppercase', display: 'block' }}>MINDMAP</span>
            </div>
            <div style={{ width: '100%' }}>
              <div className={theme === 'dark' ? 'text-white' : 'text-slate-800'} style={{ fontSize: '28px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: '1.2', wordWrap: 'break-word', display: 'block', maxWidth: '220px', margin: '0 auto', maxHeight: '100px', overflow: 'hidden' }}>{displayTitle}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'center' }}>
              {COLORS.slice(0, 5).map(c => <div key={c} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c }} />)}
            </div>
          </div>
        </div>
      </foreignObject>
    </svg>
  );

  if (contentOnly) {
    return (
      <div ref={mapRef} data-pdf-export-target="true" data-infographic-label="Mind Map" className="transition-transform duration-300" style={{ transform: `scale(${zoom / 100})`, width: W, height: H, transformOrigin: window.innerWidth < 640 ? 'left top' : 'center center' }}>
        {renderSVGContent()}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-[3rem]">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 p-3 sm:p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg sm:rounded-xl flex-shrink-0">
            <Presentation className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-white uppercase leading-none">Mind Map</CardTitle>
            <p className="text-[8px] sm:text-[10px] font-semibold text-slate-400 uppercase  mt-0.5 sm:mt-1">{nodes.length} Core Topics Processed</p>
          </div>
        </div>
        <div className="flex items-center bg-slate-50 dark:bg-slate-950 px-2 py-1.5 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800 w-full sm:w-auto justify-between sm:justify-start gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 rounded-lg sm:rounded-xl gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-800"
            onClick={handleDownloadImage}
          >
            <Download className="h-4 w-4 text-indigo-500" />
            <span>Save</span>
          </Button>

          <div className="flex items-center gap-1 justify-center">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setZoom(z => Math.max(40, z - 10))}>
              <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />
            </Button>
            <span className="text-[10px] sm:text-[11px] font-black w-10 text-center text-slate-600 dark:text-slate-300">{zoom}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setZoom(z => Math.min(200, z + 10))}>
              <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />
            </Button>
          </div>

          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg flex-shrink-0" onClick={() => setZoom(100)}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 bg-[#f8fafc] dark:bg-slate-950 relative overflow-auto custom-scrollbar flex items-start sm:items-center sm:justify-center justify-start min-h-[600px] p-4 sm:p-0">
        <div ref={mapRef} className="transition-transform duration-300" style={{ transform: `scale(${zoom / 100})`, width: W, height: H, transformOrigin: window.innerWidth < 640 ? 'left top' : 'center center' }}>
          {renderSVGContent()}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MindMapViewer({ title, data, theme = 'dark', contentOnly }: MindMapViewerProps) {
  const maps = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  }, [data]);

  if (maps.length === 0) {
    return (
      <Card className="p-12 text-center text-slate-500">
        <Network className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>No mind map data generated.</p>
      </Card>
    );
  }

  return (
    <div className={`space-y-8 ${theme === 'dark' ? 'dark' : ''}`}>
      {maps.map((mapData, i) => (
        <SingleMindMap key={i} title={mapData?.title || title} data={mapData} theme={theme} contentOnly={contentOnly} />
      ))}
    </div>
  );
}
