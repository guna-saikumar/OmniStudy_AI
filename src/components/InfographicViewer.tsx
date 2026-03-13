import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ImageIcon, Share2, Download, Maximize2, Layers, GitBranch, LayoutGrid, ZoomIn, ZoomOut } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

interface InfographicSection {
  title: string;
  points: string[];
  relevance?: number;
  type?: 'architecture' | 'process' | 'database' | 'logic' | 'security' | 'overview';
  metadata?: { complexity: string; priority: number };
}
interface InfographicData {
  title: string;
  sections: InfographicSection[];
  logicalFlow?: { from: string; to: string; label: string }[];
}
interface InfographicViewerProps {
  title: string;
  data?: InfographicData;
  theme?: 'light' | 'dark';
  forcedViewMode?: 'hub' | 'flow' | 'circular' | 'flowchart';
}

const THEME_COLORS = [
  { main: '#3b82f6', light: 'rgba(59, 130, 246, 0.1)', border: '#60a5fa' }, // Blue
  { main: '#10b981', light: 'rgba(16, 185, 129, 0.1)', border: '#34d399' }, // Emerald
  { main: '#f59e0b', light: 'rgba(245, 158, 11, 0.1)', border: '#fbbf24' }, // Amber
  { main: '#ef4444', light: 'rgba(239, 68, 68, 0.1)', border: '#f87171' }, // Red
  { main: '#8b5cf6', light: 'rgba(139, 92, 246, 0.1)', border: '#a78bfa' }, // Purple
  { main: '#ec4899', light: 'rgba(236, 72, 153, 0.1)', border: '#f472b6' }, // Pink
];

export default function InfographicViewer({ title, data, theme = 'dark', forcedViewMode }: InfographicViewerProps) {
  const [internalViewMode, setViewMode] = useState<'hub' | 'flow' | 'circular' | 'flowchart'>('hub');
  const viewMode = forcedViewMode || internalViewMode;
  const [zoom, setZoom] = useState(100);
  const infoRef = useRef<HTMLDivElement>(null);
  const displayTitle = data?.title || title;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setZoom(40);
      } else if (window.innerWidth < 1024) {
        setZoom(60);
      } else {
        setZoom(100);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDownloadImage = async () => {
    if (!infoRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(infoRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });
      const link = document.createElement('a');
      link.download = `Infographic_${viewMode}_${displayTitle.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image', err);
    }
  };

  const sections = useMemo(() => {
    return data?.sections && data.sections.length > 0
      ? data.sections
      : [{ title: 'Subject Overview', points: ['Analyzing document structure...', 'Extracting key themes...', 'Mapping conceptual relationships...'] }];
  }, [data]);

  const renderHub = () => (
    <div className="relative w-[1200px] min-h-[1000px] flex items-center justify-center p-20 group transition-all duration-500 mx-auto">

      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="hubGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {sections.slice(0, 10).map((section, i) => {
          const count = Math.min(sections.length, 10);
          const angle = (i * 360) / count - 90;
          const rad = (angle * Math.PI) / 180;

          // Unified tracks: same as card positioning
          const trackX = 32;
          const trackY = i % 2 === 0 ? 30 : 34;

          const startRadius = 12; // Start from outside the hexagon hub
          const x1 = 50 + startRadius * Math.cos(rad);
          const y1 = 50 + startRadius * Math.sin(rad);

          const x2 = 50 + (trackX - 2.5) * Math.cos(rad); // End slightly before card center
          const y2 = 50 + (trackY - 2.5) * Math.sin(rad);

          const isTech = ['architecture', 'database', 'security'].includes(section.type || '');
          const isProcess = section.type === 'process';
          const color = isTech ? '#3b82f6' : isProcess ? '#10b981' : THEME_COLORS[i % THEME_COLORS.length].main;

          return (
            <g key={i}>
              <path
                d={`M ${x1} ${y1} Q ${50 + 18 * Math.cos(rad - 0.15)} ${50 + 18 * Math.sin(rad - 0.15)} ${x2} ${y2}`}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeOpacity="0.5"
                filter="url(#hubGlow)"
              />
              {/* Departure Node */}
              <circle
                cx={x1}
                cy={y1}
                r="1.4"
                fill="white"
                className="animate-pulse"
              />
              <circle
                cx={x1}
                cy={y1}
                r="3"
                fill={color}
                fillOpacity="0.3"
              />

              {/* Arrival Node */}
              <circle
                cx={x2}
                cy={y2}
                r="1.8"
                fill={color}
              />
              <circle
                cx={x2}
                cy={y2}
                r="4"
                fill={color}
                fillOpacity="0.2"
                className="animate-ping"
              />
            </g>
          );
        })}
      </svg>

      <div className="relative z-10 w-52 h-52 sm:w-64 sm:h-64 flex items-center justify-center">
        <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full animate-pulse" />
        <div
          className="w-full h-full bg-white dark:bg-slate-900 shadow-2xl border-4 border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center p-8 text-center"
          style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
        >
          <div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-4 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_10px_20px_-5px_rgba(79,70,229,0.5)]">
              <Layers className="text-white w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-indigo-500 mb-2">Knowledge Hub</h3>
            <h2 className="text-sm sm:text-base font-black text-slate-800 dark:text-white leading-tight line-clamp-3 uppercase tracking-tighter">{displayTitle}</h2>
          </div>
        </div>
      </div>

      {sections.slice(0, 10).map((section, i) => {
        const count = Math.min(sections.length, 10);
        const angle = (i * 360) / count - 90;
        const rad = (angle * Math.PI) / 180;

        // Match the staggered track logic (synchronized and tightened)
        const trackX = i % 2 === 0 ? 34 : 34;
        const trackY = i % 2 === 0 ? 34 : 36;

        const xPos = 50 + trackX * Math.cos(rad);
        const yPos = 50 + trackY * Math.sin(rad);

        const isTech = ['architecture', 'database', 'security'].includes(section.type || '');
        const isProcess = section.type === 'process';
        const color = isTech ? '#3b82f6' : isProcess ? '#10b981' : THEME_COLORS[i % THEME_COLORS.length].main;

        return (
          <div
            key={i}
            className="absolute z-20 w-[240px] sm:w-[280px] -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${xPos}%`, top: `${yPos}%` }}
          >
            <div className={`bg-white/95 dark:bg-slate-900 border-2 rounded-[2rem] p-6 shadow-xl transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl
              ${isTech ? 'border-blue-100 dark:border-blue-900/40 bg-blue-50/5' : isProcess ? 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/5' : 'border-slate-100 dark:border-slate-800'}
            `}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white shadow-lg" style={{ backgroundColor: color }}>
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-[14px] sm:text-[16px] leading-tight text-slate-800 dark:text-slate-100 uppercase tracking-tighter line-clamp-2">{section.title}</h4>
                  <div className="text-[10px] font-bold text-slate-400/80 uppercase tracking-widest mt-1">{section.type || 'Insight'}</div>
                </div>
              </div>
              <ul className="space-y-2">
                {section.points.slice(0, 3).map((p, pi) => (
                  <li key={pi} className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 opacity-60" style={{ backgroundColor: color }} />
                    <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed font-semibold break-words">{p}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderFlow = () => (
    <div className="relative w-[1000px] min-h-[800px] mx-auto space-y-24 py-16 px-6">

      {/* Central Timeline Thread */}
      <div className="absolute left-1/2 top-8 bottom-8 w-1 bg-indigo-100 dark:bg-slate-800 -translate-x-1/2 rounded-full overflow-hidden">
        <div className="w-full h-1/2 bg-gradient-to-b from-indigo-400 to-transparent" />
      </div>

      {sections.map((section, i) => {
        const color = THEME_COLORS[i % THEME_COLORS.length];
        const isEven = i % 2 === 0;

        const StepCard = ({ isLeft, sectionType }: { isLeft: boolean, sectionType?: string }) => {
          const isTechnical = ['architecture', 'database', 'security'].includes(sectionType || '');
          const isProcess = sectionType === 'process';

          return (
            <div className={`relative bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border transition-all hover:shadow-2xl group-hover:-translate-y-1 
              ${isLeft ? 'text-right pr-8' : 'text-left pl-8'} 
              ${isTechnical ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50/10' : 'border-slate-100 dark:border-slate-800'}
              ${isProcess ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/10' : ''}
              min-w-[280px] sm:min-w-0
            `}>
              {/* Dynamic Badge */}
              <div className={`absolute top-3 ${isLeft ? 'right-6' : 'left-6'} px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter
                ${isTechnical ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}
              `}>
                {sectionType || 'Segment'}
              </div>

              <h3 className="text-base font-black text-slate-800 dark:text-white mb-3 mt-2 flex items-center justify-end gap-2">
                {!isLeft && <GitBranch className="h-3.5 w-3.5 text-indigo-500" />}
                <span className="uppercase tracking-tight">{section.title}</span>
                {isLeft && <GitBranch className="h-3.5 w-3.5 text-indigo-500" />}
              </h3>
              <ul className="space-y-3">
                {section.points.slice(0, 5).map((p, pi) => (
                  <li key={pi} className={`flex gap-3 ${isLeft ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: color.main }} />
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-bold break-words">{p}</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        };

        return (
          <div key={i} className="relative z-10 flex flex-row items-center justify-center gap-6 sm:gap-14 group">
            {/* Left Slot */}
            <div className={`flex-1 transition-all duration-500 ${isEven ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <StepCard isLeft={true} sectionType={section.type} />
            </div>

            {/* Central Node */}
            <div className={`relative flex-shrink-0 w-14 h-14 rounded-[1.2rem] bg-white dark:bg-slate-900 flex items-center justify-center shadow-lg transition-all 
              group-hover:bg-indigo-600 group-hover:scale-110 z-20 border-4 
              ${isEven ? 'rotate-3' : '-rotate-3'} group-hover:rotate-0 border-slate-50 dark:border-slate-800
            `}>
              <span className="text-slate-900 dark:text-white group-hover:text-white font-black text-base">{i + 1}</span>
            </div>

            {/* Right Slot */}
            <div className={`flex-1 transition-all duration-500 ${!isEven ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <StepCard isLeft={false} sectionType={section.type} />
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCircular = () => (
    <div className="relative w-[1200px] min-h-[1000px] mx-auto flex items-center justify-center p-20 group transition-all duration-500">

      <div className="relative z-30 w-48 h-48 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-full flex items-center justify-center p-8 text-center shadow-[0_20px_50px_rgba(79,70,229,0.25)] border-8 border-white dark:border-slate-800 group">
        <div className="absolute inset-0 rounded-full border border-indigo-500/30 animate-ping opacity-20" />
        <div>
          <h2 className="text-white text-xs font-black uppercase tracking-tighter leading-tight mb-2">{displayTitle}</h2>
          <p className="text-[10px] text-indigo-200 font-black uppercase tracking-[0.2em]">{sections.length} Core Nodes</p>
        </div>
      </div>

      {sections.slice(0, 8).map((section, i) => {
        const count = Math.min(sections.length, 8);
        const radius = 340;
        const angle = (i * 360) / count - 90;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;

        const isTech = ['architecture', 'database', 'security'].includes(section.type || '');
        const isProcess = section.type === 'process';
        const color = isTech ? '#3b82f6' : isProcess ? '#10b981' : THEME_COLORS[i % THEME_COLORS.length].main;

        return (
          <div
            key={i}
            className="absolute z-20 flex flex-col items-center gap-3 transition-transform duration-500 hover:scale-110"
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            <div className={`w-14 h-14 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border-4 flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform`} style={{ borderColor: color }}>
              <span className="text-slate-800 dark:text-white font-black text-lg">{i + 1}</span>
            </div>
            <div className={`w-56 bg-white/95 dark:bg-slate-900 shadow-xl rounded-[2rem] p-6 border-2 text-center transition-all group-hover:border-indigo-400
              ${isTech ? 'border-blue-100 dark:border-blue-900/50' : 'border-slate-100 dark:border-slate-800'}
            `}>
              <h4 className="font-black text-[14px] sm:text-[16px] uppercase tracking-tighter text-slate-800 dark:text-white mb-3 line-clamp-2 leading-tight">{section.title}</h4>
              <div className="space-y-1.5 text-left">
                {section.points.slice(0, 2).map((p, pi) => (
                  <div key={pi} className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: color }} />
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold leading-tight break-words">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <div className="absolute w-[440px] h-[440px] border-2 border-indigo-200 dark:border-slate-700 rounded-full border-dashed animate-[spin_60s_linear_infinite]" />
      <div className="absolute w-[300px] h-[300px] border-2 border-indigo-100 dark:border-indigo-900/30 rounded-full border-dashed animate-[spin_40s_linear_infinite_reverse]" />
    </div>
  );

  // Helper for actual pie segments
  const PieChartSegment = ({ cx, cy, r, startAngle, endAngle, color }: { cx: number, cy: number, r: number, startAngle: number, endAngle: number, color: string }) => {
    const x1 = cx + r * Math.cos((Math.PI * startAngle) / 180);
    const y1 = cy + r * Math.sin((Math.PI * startAngle) / 180);
    const x2 = cx + r * Math.cos((Math.PI * endAngle) / 180);
    const y2 = cy + r * Math.sin((Math.PI * endAngle) / 180);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    return <path d={d} fill={color} className="transition-all duration-700 hover:opacity-80 cursor-pointer" />;
  };

  const renderFlowchart = () => {
    return (
      <div className="relative w-[1000px] min-h-[850px] py-16 px-6">
        <div className="relative z-10 space-y-16">
          <div className="space-y-4 text-center">
            <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.3em]">the infographic architecture</h3>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase">Conceptual Logic Diagram</h2>
          </div>

          <div className="flex flex-col items-center gap-24">
            {sections.slice(0, 8).map((section, i) => {
              const isEven = i % 2 === 0;
              const nextSection = sections[i + 1];

              // Define node styles based on index for a "Diagram" feel
              // 0, 3, 6 = External Entity (Pink)
              // 1, 4, 7 = Process (Teal)
              // 2, 5, 8 = Data Store (Purple/Pink)
              const typeIndex = i % 3;

              return (
                <div key={i} className="relative flex flex-col items-center w-full max-w-[240px]">
                  {/* Node */}
                  <div className={`relative w-full h-full flex group transition-all duration-300 hover:-translate-y-1`}>

                    {typeIndex === 0 && ( /* External Entity Style */
                      <div className={`w-full h-full bg-white dark:bg-slate-900 border-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col p-5 ring-4
                        ${section.type === 'security' ? 'border-red-200 dark:border-red-900/50 ring-red-50/50 dark:ring-red-950/20' : 'border-pink-200 dark:border-pink-900/50 ring-pink-50/50 dark:ring-pink-950/20'}
                        group-hover:ring-indigo-500/10 transition-all min-h-[140px]
                      `}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-black text-[13px] tracking-[0.2em] text-slate-400 uppercase">{section.type || 'ENTITY'}</span>
                          <span className={`text-[11px] px-2 py-1 rounded uppercase font-bold ${section.metadata?.complexity === 'high' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                            {section.metadata?.complexity || 'MED'}
                          </span>
                        </div>
                        <span className="font-black text-[12px] tracking-tight text-slate-800 dark:text-slate-100 uppercase mb-3 text-center">{section.title}</span>
                        <ul className="space-y-2">
                          {section.points.slice(0, 5).map((p, pi) => (
                            <li key={pi} className="flex gap-2 items-start">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{p}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {typeIndex === 1 && ( /* Process Style */
                      <div className="w-full h-full bg-white dark:bg-slate-900 border-2 border-teal-200 dark:border-teal-900/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden ring-4 ring-teal-50/50 dark:ring-teal-950/20 group-hover:ring-teal-500/10 transition-all min-h-[140px]">
                        <div className="h-10 border-b-2 border-teal-100 dark:border-teal-900/30 flex items-center justify-between px-4 bg-teal-50/30 dark:bg-teal-900/10">
                          <span className="text-[13px] font-black text-teal-600 tracking-widest">{section.type?.toUpperCase() || 'PROCESS'}</span>
                          <span className="text-[13px] font-black text-teal-600/50">{String(i + 1).padStart(2, '0')}</span>
                        </div>
                        <div className="p-5 flex flex-col items-center">
                          <span className="font-black text-[14px] sm:text-[15px] uppercase text-slate-800 dark:text-slate-100 mb-4 text-center">{section.title}</span>
                          <div className="w-full space-y-2">
                            {section.points.slice(0, 5).map((p, pi) => (
                              <div key={pi} className="text-[10px] text-teal-700/70 dark:text-teal-400/70 font-bold bg-teal-500/5 dark:bg-teal-400/5 px-3 py-2 rounded border border-teal-100 dark:border-teal-900/30">
                                {p}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {typeIndex === 2 && ( /* Data Store Style */
                      <div className="w-full h-full bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex ring-4 ring-indigo-50/50 dark:ring-indigo-950/20 overflow-hidden group-hover:ring-indigo-500/10 transition-all min-h-[140px]">
                        <div className="w-14 h-full bg-indigo-500/10 border-r-2 border-indigo-100 dark:border-indigo-900/30 flex flex-col items-center justify-center gap-1">
                          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                            <span className="text-[7px] font-black text-indigo-400 uppercase">Unit {i + 1}</span>
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col p-5">
                          <span className="text-[11px] text-indigo-400 font-black uppercase tracking-widest mb-1 text-center">{section.type || 'STORE'}</span>
                          <span className="font-black text-[14px] sm:text-[15px] uppercase tracking-tight text-slate-800 dark:text-slate-100 mb-4 text-center">{section.title}</span>
                          <div className="space-y-2">
                            {section.points.slice(0, 5).map((p, pi) => (
                              <p key={pi} className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed border-l-2 border-indigo-200 dark:border-indigo-900/50 pl-3">
                                {p}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Side Tag (Page Context) */}
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[8px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                      LOGIC BLOCK
                    </div>
                  </div>

                  {/* Connection Line to next */}
                  {i < sections.length - 1 && i < 7 && (
                    <div className="h-24 flex flex-col items-center justify-center">
                      <div className="w-px h-full bg-slate-300 dark:bg-slate-700 relative">
                        {/* Flow Label */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-950 px-3 py-1 border border-slate-200 dark:border-slate-800 rounded-full whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Process Flow</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                          </div>
                        </div>
                        {/* Arrow Head */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 border-b-2 border-r-2 border-slate-300 dark:border-slate-700 rotate-45" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-[900px] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-[3rem] isolate">
      <CardHeader className="flex-shrink-0 flex flex-col xl:flex-row items-center justify-between gap-6 p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
            <Layers className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white uppercase">Infographic</CardTitle>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sections.length} Core Segments Processed</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <Button
              variant={viewMode === 'hub' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-xl h-9 px-4 text-xs font-bold"
              onClick={() => setViewMode('hub')}
            >
              Hub
            </Button>
            <Button
              variant={viewMode === 'flow' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-xl h-9 px-4 text-xs font-bold"
              onClick={() => setViewMode('flow')}
            >
              Steps
            </Button>
            <Button
              variant={viewMode === 'circular' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-xl h-9 px-4 text-xs font-bold"
              onClick={() => setViewMode('circular')}
            >
              Orbit
            </Button>
            <Button
              variant={viewMode === 'flowchart' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-xl h-9 px-4 text-xs font-bold"
              onClick={() => setViewMode('flowchart')}
            >
              Flow
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 rounded-xl gap-2 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800"
              onClick={handleDownloadImage}
            >
              <Download className="h-3.5 w-3.5 text-indigo-500" />
              Save Image
            </Button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
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
        </div>
      </CardHeader>

      <CardContent className={`flex-1 ${theme === 'dark' ? 'dark' : ''} bg-slate-50/30 dark:bg-slate-950 relative overflow-auto overscroll-contain custom-scrollbar z-10`}>
        <div
          className="min-w-full min-h-full flex items-start sm:justify-center justify-start py-10 sm:py-20 px-4 sm:px-0"
        >
          <div
            ref={infoRef}
            data-infographic-content="true"
            data-infographic-view={viewMode}
            className="transition-transform duration-300 relative bg-white dark:bg-slate-900 shadow-2xl rounded-[2rem]"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: window.innerWidth < 640 ? 'left top' : 'center top'
            }}
          >
            {viewMode === 'hub' && renderHub()}
            {viewMode === 'flow' && renderFlow()}
            {viewMode === 'circular' && renderCircular()}
            {viewMode === 'flowchart' && renderFlowchart()}
          </div>
        </div>
      </CardContent>

      <div className="flex-shrink-0 p-6 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-xl">
            <Maximize2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Visual Architecture Ready</h4>
            <p className="text-[11px] text-slate-500">Interactive visualization for {displayTitle}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
