import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  BookOpen,
  Upload,
  FileText,
  Eye,
  Download,
  Clock,
  Brain,
  Share2,
  FileArchive,
  GitBranch,
  ImageIcon,
  Sparkles,
  CircleUser,
  Network,
  SquareStack,
  Table,
  Grid3x3,
  Gift,
  MoreVertical,
  Trash2,
  LogOut,
  Settings,
  HelpCircle,
  List,
  Copy,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import * as htmlToImage from 'html-to-image';
import MindMapViewer from './MindMapViewer';
import InfographicViewer from './InfographicViewer';
import ComparativeTableViewer from './ComparativeTableViewer';
import FlashcardsViewer from './FlashcardsViewer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import api from '../utils/api';
import { toast } from 'sonner';
import { Trash2 as TrashIcon } from 'lucide-react';

interface DashboardProps {
  userName: string;
  onUploadClick: () => void;
  onProfileClick: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onViewSummary?: (id: string, fileName: string) => void;
  onViewAllClick?: () => void;
  onLogout?: () => void;
}

export default function Dashboard({
  userName,
  onUploadClick,
  onProfileClick,
  theme,
  onThemeToggle,
  onViewSummary,
  onViewAllClick,
  onLogout,
}: DashboardProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [activeExportData, setActiveExportData] = useState<any>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      if (parsed.profileImage) {
        setProfileImage(parsed.profileImage);
      }
    }

    let isMounted = true;
    const fetchHistory = async () => {
      try {
        const { data } = await api.get('/summaries');
        if (isMounted) setHistory(data.slice(0, 3));
      } catch (error: any) {
        if (isMounted) toast.error('Failed to fetch history');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchHistory();
    return () => { isMounted = false; };
  }, []);

  // Handle View button click
  const handleView = (item: any) => {
    if (onViewSummary) {
      onViewSummary(item._id, item.fileName);
    } else {
      toast.info(`Opening summary for: ${item.fileName}`);
    }
  };

  // Helper function to capture hidden elements
  const captureElement = async (id: string) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const originalStyle = el.style.display;
    el.style.display = 'block';
    try {
      const dataUrl = await htmlToImage.toPng(el, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: '#0f172a',
        style: { transform: 'scale(1)', padding: '20px' },
        cacheBust: true,
      });
      el.style.display = originalStyle;
      return dataUrl;
    } catch (e) {
      console.error(`Failed to capture ${id}`, e);
      el.style.display = originalStyle;
      return null;
    }
  };

  // Handle Export button click
  const handleExport = async (item: any) => {
    try {
      toast.info('Generating comprehensive report with visuals...', { duration: 5000 });

      // Fetch the full summary data
      const { data: fullSummary } = await api.get(`/summaries/${item._id}`);
      setActiveExportData(fullSummary);

      // Give components a moment to render in the hidden div
      await new Promise(resolve => setTimeout(resolve, 800));

      const docTitle = fullSummary.fileName;
      const content = fullSummary.content || {};
      const keyPoints = Array.isArray(content.text) ? content.text : (typeof content.text === 'string' ? content.text.split('\n') : []);
      const documentOutline = content.documentOutline || [];
      const flashcards = content.flashcards || [];
      const tables = content.comparativeTable || [];

      const element = document.createElement('div');
      element.className = 'pdf-export-container';
      element.style.padding = '40px';
      element.style.background = '#030712';
      element.style.color = '#f8fafc';
      element.style.fontFamily = 'Inter, sans-serif';

      let html = `
        <div style="text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid #1e293b;">
          <h1 style="font-size: 32px; color: #60a5fa; margin-bottom: 10px; font-weight: 800; letter-spacing: -1px;">OmniStudy AI</h1>
          <p style="font-size: 14px; color: #94a3b8; margin: 0;">Comprehensive Research Report: <span style="color: #60a5fa;">${docTitle}</span></p>
        </div>
      `;

      // 1. Key Points
      if (keyPoints.length > 0) {
        html += `
          <div style="margin-bottom: 40px; background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b;">
            <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 20px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">keypoints</h2>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${keyPoints.map((p: string, idx: number) => `
                <div style="display: flex; align-items: start; gap: 18px; background: #020617; border: 1px solid #1e40af; padding: 16px 20px; border-radius: 10px; page-break-inside: avoid;">
                  <div style="flex-shrink: 0; width: 28px; height: 28px; background: #2563eb; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; line-height: 1;">${idx + 1}</div>
                  <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">${p}</p>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // 2. Outline
      if (documentOutline.length > 0) {
        html += `
          <div style="margin-bottom: 40px; background: #0f172a; padding: 25px; border-radius: 24px; border: 1px solid #1e293b;">
            <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">document structure</h2>
            ${documentOutline.map((s: any, idx: number) => `
              <div style="margin-bottom: 20px; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; page-break-inside: avoid; background: #020617;">
                <div style="background: linear-gradient(to right, rgba(99, 102, 241, 0.1), rgba(59, 130, 246, 0.1)); padding: 20px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 16px;">
                  <div style="width: 32px; height: 32px; background: #6366f1; color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); flex-shrink: 0;">${idx + 1}</div>
                  <h3 style="font-size: 16px; font-weight: 800; color: #f8fafc; margin: 0;">${s.heading}</h3>
                </div>
                <div style="padding: 24px; background: rgba(15, 23, 42, 0.5);">
                  <div style="margin-bottom: 20px;">
                    ${(s.bullets || []).map((b: string) => `
                        <div style="display: flex; align-items: flex-start; margin-bottom: 12px; gap: 12px;">
                          <span style="display: block; width: 6px; height: 6px; background: #818cf8; border-radius: 50%; margin-top: 8px; flex-shrink: 0;"></span>
                          <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.6; font-weight: 500;">${b}</p>
                        </div>
                    `).join('')}
                  </div>
                  ${(s.subSections || []).map((sub: any) => `
                    <div style="margin-left: 20px; margin-top: 15px; padding-left: 15px; border-left: 2px solid #312e81; padding-top: 4px; padding-bottom: 4px;">
                      <h4 style="font-size: 11px; font-weight: 900; color: #818cf8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1em;">${sub.title}</h4>
                      <div style="padding-left: 4px;">
                        ${(sub.bullets || []).map((sb: string) => `
                          <div style="display: flex; align-items: flex-start; margin-bottom: 6px; gap: 10px;">
                            <span style="color: #475569; font-size: 12px;">—</span>
                            <p style="margin: 0; color: #94a3b8; font-size: 13px; font-weight: 400;">${sb}</p>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }

      // 3. Mind Maps
      const mindmapWrapper = document.getElementById('dash-export-mindmap');
      if (mindmapWrapper) {
        const originalDisplay = mindmapWrapper.style.display;
        mindmapWrapper.style.display = 'block';
        const innerMaps = mindmapWrapper.querySelectorAll('[data-mindmap-content="true"]');

        for (let i = 0; i < innerMaps.length; i++) {
          const mapEl = innerMaps[i] as HTMLElement;
          const mapImg = await htmlToImage.toPng(mapEl, {
            quality: 1.0,
            pixelRatio: 3,
            backgroundColor: '#0f172a',
            style: { transform: 'scale(1)', padding: '20px' }
          });

          html += `
            <div style="page-break-before: always; width: 100%; min-height: 290mm; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #030712; padding: 10px; box-sizing: border-box;">
              <div style="width: 96%; border-radius: 24px; overflow: hidden; background: #0f172a; border: 1px solid #1e293b; box-shadow: 0 15px 45px rgba(0,0,0,0.6);">
                <img src="${mapImg}" style="width: 100%; height: auto; display: block;" />
              </div>
              <div style="margin-top: 25px; text-align: center; color: #94a3b8; font-family: Inter, sans-serif; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; opacity: 0.8;">
                OmniStudy AI • Mind Map ${i + 1}
              </div>
            </div>
          `;
        }
        mindmapWrapper.style.display = originalDisplay;
      }

      // 4. Infographics
      const infraWrapper = document.getElementById('dash-export-infographic-all');
      if (infraWrapper) {
        const originalDisplay = infraWrapper.style.display;
        infraWrapper.style.display = 'block';
        const innerInfras = infraWrapper.querySelectorAll('[data-infographic-content="true"]');

        for (let i = 0; i < innerInfras.length; i++) {
          const infraEl = innerInfras[i] as HTMLElement;
          const infraType = infraEl.getAttribute('data-infographic-view') || 'Visual';
          const infraImg = await htmlToImage.toPng(infraEl, {
            quality: 1.0,
            pixelRatio: 3,
            backgroundColor: '#0f172a',
            style: { transform: 'scale(1)', padding: '20px' }
          });

          const typeLabels: Record<string, string> = {
            hub: 'Knowledge Hub',
            flow: 'Logical Interaction Flow',
            circular: 'Conceptual Orbit',
            flowchart: 'Structural Progression'
          };

          const isSteps = infraType === 'flow';
          const isFlowchart = infraType === 'flowchart';

          html += `
            <div style="page-break-before: always; width: 100%; min-height: 290mm; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #030712; padding: ${isFlowchart || isSteps ? '40px' : '10px'}; box-sizing: border-box;">
               <div style="width: ${isFlowchart ? '42%' : isSteps ? '75%' : '96%'}; ${isFlowchart ? 'max-width: 95mm;' : isSteps ? 'max-height: 265mm;' : ''} border-radius: 20px; overflow: hidden; background: #0f172a; border: 1px solid #1e293b; box-shadow: 0 12px 40px rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center;">
                  <img src="${infraImg}" style="max-width: 100%; max-height: ${isSteps ? '260mm' : '100%'}; width: auto; height: auto; display: block; object-fit: contain;" />
               </div>
               <div style="margin-top: ${isFlowchart || isSteps ? '30px' : '25px'}; text-align: center; color: #94a3b8; font-family: Inter, sans-serif; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; opacity: 0.8;">
                  OmniStudy AI • ${typeLabels[infraType] || 'Visual Infographic'}
               </div>
            </div>
          `;
        }
        infraWrapper.style.display = originalDisplay;
      }

      // 5. Flashcards
      if (flashcards.length > 0) {
        html += `
          <div style="margin-bottom: 40px; background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b; page-break-inside: avoid;">
              <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">flashcards</h2>
              <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                  ${flashcards.map((f: any) => `
                      <div style="border: 1px solid #3d0a21; padding: 18px; border-radius: 12px; background: #020617; border-left: 6px solid #ec4899; margin-bottom: 12px; page-break-inside: avoid;">
                          <p style="font-weight: 700; color: #fdf2f8; margin-bottom: 8px; font-size: 15px;">Q: ${f.question}</p>
                          <p style="color: #fbcfe8; font-size: 14px; line-height: 1.6; border-top: 1px dashed #500724; padding-top: 8px;">A: ${f.answer}</p>
                      </div>
                  `).join('')}
              </div>
          </div>
        `;
      }

      // 6. Comparative Tables
      if (tables.length > 0) {
        tables.forEach((table: any, i: number) => {
          const headers = table.headers || (table[0] ? Object.keys(table[0]) : []);
          const rows = table.rows || (Array.isArray(table) ? table : []);
          html += `
            <div style="page-break-before: always; padding: 20px; background: #030712; min-height: 280mm;">
              <h2 style="font-size: 20px; color: #e2e8f0; margin-bottom: 25px; text-transform: lowercase; font-weight: 700; letter-spacing: 0.5px;">comparative analysis ${tables.length > 1 ? (i + 1) : ''}</h2>
              <div style="background: #020617; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #cbd5e1;">
                  <thead><tr style="background: #000000;">
                    ${headers.map((h: string) => `<th style="border: 1px solid #1e293b; padding: 14px; text-align: left; color: #60a5fa;">${h}</th>`).join('')}
                  </tr></thead>
                  <tbody>
                    ${rows.map((row: any) => `
                      <tr>${(Array.isArray(row) ? row : Object.values(row)).map((cell: any) => `<td style="border: 1px solid #1e293b; padding: 14px;">${cell || ''}</td>`).join('')}</tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              <div style="margin-top: 25px; text-align: center; color: #94a3b8; font-family: Inter, sans-serif; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; opacity: 0.8;">
                OmniStudy AI • Comparison Data
              </div>
            </div>
          `;
        });
      }

      element.innerHTML = html;

      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: 0,
        filename: `${docTitle}_Full_Report.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
      setActiveExportData(null);
      toast.success('Comprehensive Study Report generated successfully!');
    } catch (err: any) {
      console.error('Export failed:', err);
      toast.error('Failed to generate full report');
      setActiveExportData(null);
    }
  };

  // Handle Delete button click with toast confirmation
  const handleDelete = (id: string, fileName: string) => {
    // Optimistically remove from UI
    const previous = [...history];
    setHistory((prev) => prev.filter((item) => item._id !== id));

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        await api.delete(`/summaries/${id}`);
      } catch {
        // Restore if DB delete failed
        setHistory(previous);
        toast.error('Failed to delete summary');
      }
    }, 4000);

    toast.success(`"${fileName.replace('.pdf', '')}" deleted`, {
      duration: 4000,
      action: {
        label: 'Undo',
        onClick: () => {
          cancelled = true;
          clearTimeout(timer);
          setHistory(previous);
          toast.info('Deletion cancelled');
        },
      },
    });
  };

  const handleCopyLink = (id: string) => {
    const shareUrl = `${window.location.origin}/summary/${id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleWhatsAppShare = (item: any) => {
    const shareUrl = `${window.location.origin}/summary/${item._id}`;
    const text = encodeURIComponent(`Check out this document summary for "${item.fileName}" on OmniStudy AI: ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleSystemShare = async (item: any) => {
    const shareUrl = `${window.location.origin}/summary/${item._id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.fileName,
          text: `Check out this document summary for "${item.fileName}" on OmniStudy AI!`,
          url: shareUrl,
        });
      } else {
        handleCopyLink(item._id);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast.error('Failed to share');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[20px] sm:text-[28px] font-bold tracking-widest drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center">
              <span style={{ color: '#1d51df' }}>O</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400" style={{ backgroundImage: 'linear-gradient(to right, #2B7FFF)', WebkitBackgroundClip: 'text' }}>mni</span>
              <span style={{ color: '#1d51df' }} className="ml-1">S</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400" style={{ backgroundImage: 'linear-gradient(to right, #2B7FFF)', WebkitBackgroundClip: 'text' }}>tudy</span>
              <span className="inline-block w-1 sm:w-2"></span>
              <span style={{ color: '#1d51df' }}>A</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400" style={{ backgroundImage: 'linear-gradient(to right, #2B7FFF)', WebkitBackgroundClip: 'text' }}>I</span>
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center justify-center h-10 w-10 overflow-hidden rounded-full bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800"
            >
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <CircleUser className="h-6 w-6" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel className="font-bold">My Account</DropdownMenuLabel>
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={onProfileClick}
              >
                <CircleUser className="h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2"
                onClick={onThemeToggle}
              >
                <Settings className="h-5 w-5" />
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 text-red-500 hover:text-red-600"
                onClick={onLogout}
              >
                <LogOut className="h-5 w-5" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 py-8 space-y-12">
        {/* Welcome Section */}
        <section className="text-center space-y-2">
          <h1 className="text-2xl sm:text-4xl font-bold px-2">
            Hi {userName}, ready to simplify your studying?
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base max-w-xs sm:max-w-none mx-auto">
            Upload your PDFs and get instant summaries, mind maps, and infographics
          </p>
        </section>

        {/* Upload Panel */}
        <Card className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-lg border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-[2rem] hover:border-blue-400 hover:shadow-2xl transition-all duration-500">
          <CardContent className="pt-8 pb-8 sm:pt-12 sm:pb-12">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-full">
                <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-blue-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Upload Your PDF</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                  Supports PDF, PPT, DOCX, TXT formats
                </p>
              </div>

              {/* File Extension Icons */}
              <div className="flex flex-wrap items-center justify-center gap-3 py-2">
                <div className="bg-red-500 text-white px-3 py-1.5 rounded-md font-bold text-sm shadow-sm">
                  PDF
                </div>
                <div className="bg-orange-500 text-white px-3 py-1.5 rounded-md font-bold text-sm shadow-sm">
                  PPT
                </div>
                <div className="bg-blue-500 text-white px-3 py-1.5 rounded-md font-bold text-sm shadow-sm">
                  DOCX
                </div>
                <div className="bg-teal-500 text-white px-3 py-1.5 rounded-md font-bold text-sm shadow-sm">
                  TXT
                </div>
              </div>

              <Button
                size="lg"
                className="bg-blue-500 hover:bg-blue-600 text-base sm:text-lg px-6 sm:px-8"
                onClick={onUploadClick}
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Visual Stepper */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-center">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {/* Step 1 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-blue-400/50 transition-all duration-300">
              <div className="bg-blue-100 dark:bg-blue-950 p-4 rounded-full mb-3">
                <Upload className="h-8 w-8 text-blue-500" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <h3 className="font-bold">Upload</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose your PDF file
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-emerald-400/50 transition-all duration-300">
              <div className="bg-emerald-100 dark:bg-emerald-950 p-4 rounded-full mb-3">
                <Sparkles className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-emerald-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <h3 className="font-bold">Summarize</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI processes your document
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-purple-400/50 transition-all duration-300">
              <div className="bg-purple-100 dark:bg-purple-950 p-4 rounded-full mb-3">
                <Eye className="h-8 w-8 text-purple-500" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <h3 className="font-bold">View</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Review in multiple formats
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-orange-400/50 transition-all duration-300">
              <div className="bg-orange-100 dark:bg-orange-950 p-4 rounded-full mb-3">
                <Download className="h-8 w-8 text-orange-500" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  4
                </span>
                <h3 className="font-bold">Download</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Save and share your notes
              </p>
            </div>
          </div>
        </section>

        {/* Explore Smart Summary Modes Section */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">What You Get After Uploading</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Choose from six powerful summary modes designed to match your learning style
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Key Points */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 flex flex-col space-y-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-950 p-2 rounded">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-lg">Key Points</h3>
              </div>
              <div className="w-full h-[1px] bg-gray-200 dark:bg-gray-700 my-1"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 pt-1">
                AI-powered bullet-point summaries that make long documents quick to read and easy to review.
              </p>
            </div>

            {/* Outline */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 flex flex-col space-y-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 dark:bg-indigo-950 p-2 rounded">
                  <List className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-bold text-lg">Outline</h3>
              </div>
              <div className="w-full h-[1px] bg-gray-200 dark:bg-gray-700 my-1"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 pt-1">
                A structured breakdown of your document's hierarchy, from main chapters to detailed sub-topics.
              </p>
            </div>

            {/* Infographic */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 flex flex-col space-y-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 dark:bg-orange-950 p-2 rounded">
                  <ImageIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-bold text-lg">Infographic</h3>
              </div>
              <div className="w-full h-[1px] bg-gray-200 dark:bg-gray-700 my-1"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 pt-1">
                Turn dense text into clean visual summaries that are perfect for presentations and visual learners.
              </p>
            </div>

            {/* Mind Map */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 flex flex-col space-y-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 dark:bg-purple-950 p-2 rounded">
                  <Network className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-bold text-lg">Mind Map</h3>
              </div>
              <div className="w-full h-[1px] bg-gray-200 dark:bg-gray-700 my-1"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 pt-1">
                See how ideas are connected through an interactive concept map that mirrors your document's structure.
              </p>
            </div>

            {/* Flashcards */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 flex flex-col space-y-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-pink-100 dark:bg-pink-950 p-2 rounded">
                  <SquareStack className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="font-bold text-lg">Flashcards</h3>
              </div>
              <div className="w-full h-[1px] bg-gray-200 dark:bg-gray-700 my-1"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 pt-1">
                Instantly generate smart Q&A pairs from your document to help with revision and memorization.
              </p>
            </div>

            {/* Comparison */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 flex flex-col space-y-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  <Table className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 className="font-bold text-lg">Comparison</h3>
              </div>
              <div className="w-full h-[1px] bg-gray-200 dark:bg-gray-700 my-1"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 pt-1">
                Automatically compare terms or models side-by-side with clear column-based layouts for structured review.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-center">Why Students Love This Tool</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-4 flex flex-row items-center gap-4 space-y-0">
                <div className="bg-blue-100 dark:bg-blue-950 w-12 h-12 rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle>Save Time</CardTitle>
              </CardHeader>
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-4" />
              <CardContent>
                <CardDescription>
                  Reduce hours of reading to minutes. Get the key points instantly and focus on
                  what matters most.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-4 flex flex-row items-center gap-4 space-y-0">
                <div className="bg-emerald-100 dark:bg-emerald-950 w-12 h-12 rounded-lg flex items-center justify-center shrink-0">
                  <Brain className="h-6 w-6 text-emerald-500" />
                </div>
                <CardTitle>Visual Learning</CardTitle>
              </CardHeader>
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-4" />
              <CardContent>
                <CardDescription>
                  Transform text into mind maps and infographics that help you understand and
                  remember better.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-4 flex flex-row items-center gap-4 space-y-0">
                <div className="bg-purple-100 dark:bg-purple-950 w-12 h-12 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="h-6 w-6 text-purple-500" />
                </div>
                <CardTitle>Structured Notes</CardTitle>
              </CardHeader>
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-4" />
              <CardContent>
                <CardDescription>
                  Get organized summaries with bullet points and key takeaways perfect for exam
                  prep.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features Grid */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-center">Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Feature 1 - Free to Use */}
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Gift className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-base">Free to Use</CardTitle>
                </div>
              </CardHeader>
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload your PDF and get instant summaries at no cost. Simple, fast, and designed for students and beginners.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 - Auto Summary */}
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  <CardTitle className="text-base">Auto Summary</CardTitle>
                </div>
              </CardHeader>
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI automatically summarizes your PDF by highlighting key points. It includes text view, mind maps, infographics, flash cards, comparative tables, and topic clusters for easy understanding.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 - Export */}
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Download className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-base">Export</CardTitle>
                </div>
              </CardHeader>
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Download summaries as PDF, TXT, or PNG images
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 - Share */}
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Share2 className="h-5 w-5 text-pink-500" />
                  <CardTitle className="text-base">Share</CardTitle>
                </div>
              </CardHeader>
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate shareable links for study groups and classmates
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 - History */}
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <FileArchive className="h-5 w-5 text-cyan-500" />
                  <CardTitle className="text-base">History</CardTitle>
                </div>
              </CardHeader>
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Access all your past summaries anytime, anywhere
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Recent History Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Recent History</h2>
            <Button variant="ghost" className="text-blue-500 hover:text-blue-600" onClick={onViewAllClick}>
              View All
            </Button>
          </div>

          <div className="space-y-4">
            {history.map((item) => (
              <Card key={item._id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left Section - File Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1 truncate">{item.fileName}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                          <span>{item.pages} pages</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            {item.status}
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Summary Type: <span className="font-medium text-blue-600 dark:text-blue-400">{item.summaryType}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                        onClick={() => handleView(item)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                        onClick={() => handleExport(item)}
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl outline-none">
                          <Share2 className="h-4 w-4" />
                          Share
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1 bg-white dark:bg-slate-900 border shadow-xl z-50">
                          <DropdownMenuItem onClick={() => handleCopyLink(item._id)} className="gap-2 rounded-xl cursor-copy">
                            <Copy className="h-4 w-4 text-blue-500" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleWhatsAppShare(item)} className="gap-2 rounded-xl">
                            <MessageCircle className="h-4 w-4 text-green-500" />
                            WhatsApp
                          </DropdownMenuItem>
                          {!!navigator.share && (
                            <DropdownMenuItem onClick={() => handleSystemShare(item)} className="gap-2 rounded-xl">
                              <ExternalLink className="h-4 w-4 text-purple-500" />
                              More...
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        onClick={() => handleDelete(item._id, item.fileName)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 w-full bg-gray-200 dark:bg-gray-800 animate-pulse rounded-xl" />
              ))}
            </div>
          )}

          {/* Empty State for when no history */}
          {!isLoading && history.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-gray-100 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileArchive className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="font-bold text-lg mb-2">No History Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Upload your first PDF to get started
              </p>
              <Button onClick={onUploadClick} className="bg-blue-500 hover:bg-blue-600">
                <Upload className="mr-2 h-4 w-4" />
                Upload Now
              </Button>
            </div>
          )}
        </section>
      </main>
      {/* Export Capture Utility (Hidden) */}
      <div className="pointer-events-none absolute" style={{ top: -10000, left: -5000, overflow: 'hidden' }}>
        {activeExportData && (
          <>
            <div id="dash-export-mindmap" style={{ display: 'none' }}>
              <MindMapViewer title={activeExportData.fileName} data={activeExportData.content?.mindMapData} theme={theme} />
            </div>
            <div id="dash-export-infographic-all" style={{ display: 'none', width: '1400px' }}>
              <InfographicViewer title={activeExportData.fileName} data={activeExportData.content?.infographicData} theme={theme} forcedViewMode="hub" />
              <InfographicViewer title={activeExportData.fileName} data={activeExportData.content?.infographicData} theme={theme} forcedViewMode="flow" />
              <InfographicViewer title={activeExportData.fileName} data={activeExportData.content?.infographicData} theme={theme} forcedViewMode="circular" />
              <InfographicViewer title={activeExportData.fileName} data={activeExportData.content?.infographicData} theme={theme} forcedViewMode="flowchart" />
            </div>
          </>
        )}
      </div>
    </div >
  );
}