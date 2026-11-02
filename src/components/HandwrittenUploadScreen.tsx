import { useState, useRef, useCallback, DragEvent } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Moon,
  Sun,
  PenLine,
  Edit3,
  RotateCcw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';

interface HandwrittenUploadScreenProps {
  onBack: () => void;
  onUploadComplete: (fileName: string, id: string) => void;
  onDigitalUploadClick?: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

type Step = 'idle' | 'extracting' | 'review' | 'generating';

interface OcrWord {
  text: string;
  confidence: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const ACCEPTED_EXTS = '.jpg,.jpeg,.png,.webp,.pdf';

function getAuthToken(): string | null {
  const raw = localStorage.getItem('userInfo');
  if (!raw) return null;
  try { return JSON.parse(raw).token; } catch { return null; }
}

export default function HandwrittenUploadScreen({
  onBack,
  onUploadComplete,
  onDigitalUploadClick,
  theme,
  onThemeToggle,
}: HandwrittenUploadScreenProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  // OCR state
  const [ocrText, setOcrText] = useState('');
  const [ocrWords, setOcrWords] = useState<OcrWord[]>([]);
  const [ocrConfidence, setOcrConfidence] = useState(0);
  const [ocrEngine, setOcrEngine] = useState('');
  const [pageCount, setPageCount] = useState(1);
  const [fileName, setFileName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── File validation ──────────────────────────────────────────────────────
  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'Please upload a JPG, PNG, WEBP image, or a scanned PDF file';
    }
    if (f.size > 50 * 1024 * 1024) {
      return 'File size exceeds 50MB limit. Please upload a smaller file.';
    }
    return null;
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    const err = validateFile(selectedFile);
    if (err) { setError(err); setFile(null); setPreview(null); return; }
    setError(null);
    setFile(selectedFile);
    setFileName(selectedFile.name);
    if (selectedFile.type !== 'application/pdf') {
      setPreview(URL.createObjectURL(selectedFile));
    } else {
      setPreview(null);
    }
  }, []);

  // ── Drag handlers ────────────────────────────────────────────────────────
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleRemoveFile = () => {
    setFile(null); setPreview(null); setError(null);
    setStep('idle'); setUploadProgress(0); setOcrText('');
    setIsEditing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Progress simulation ──────────────────────────────────────────────────
  const startProgressSimulation = (maxPct: number, intervalMs = 300, step = 5) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= maxPct) {
          clearInterval(progressIntervalRef.current!);
          return maxPct;
        }
        return prev + step;
      });
    }, intervalMs);
  };

  const stopProgress = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  // ── Step 1: Extract text via OCR ─────────────────────────────────────────
  const handleExtract = async () => {
    if (!file) return;
    setStep('extracting');
    setUploadProgress(0);
    startProgressSimulation(85);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const token = getAuthToken();

      const res = await fetch(`${API_URL}/ocr/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      stopProgress();

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'OCR extraction failed');
      }

      const data = await res.json();
      setOcrText(data.ocrText || '');
      setOcrWords(data.words || []);
      setOcrConfidence(data.confidence ?? 0.85);
      setOcrEngine(data.engine || 'gemini-vision');
      setPageCount(data.pageCount || 1);
      if (data.fileName) setFileName(data.fileName);

      setUploadProgress(100);
      await new Promise(r => setTimeout(r, 600));
      setStep('review');
      setUploadProgress(0);
    } catch (err: any) {
      stopProgress();
      setError(err.message || 'OCR extraction failed');
      setStep('idle');
      setUploadProgress(0);
    }
  };

  // ── Step 2: Generate study materials ─────────────────────────────────────
  const handleGenerate = async () => {
    if (!ocrText.trim()) { toast.error('No text to process. Please re-upload.'); return; }
    setStep('generating');
    setUploadProgress(0);
    startProgressSimulation(85);

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/ocr/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ocrText, fileName, pageCount }),
      });

      stopProgress();

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'AI generation failed');
      }

      const data = await res.json();
      setUploadProgress(100);
      toast.success('AI summary generated and saved!');
      onUploadComplete(fileName, data._id);
    } catch (err: any) {
      stopProgress();
      toast.error(err.message || 'Failed to generate study materials');
      setStep('review');
      setUploadProgress(0);
    }
  };

  // ── Step 1.5: Auto-correct text & formulas with AI ────────────────────────
  const handleAutoCorrect = async () => {
    if (!ocrText.trim()) return;
    setIsCorrecting(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/ocr/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ocrText }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Auto-correction failed');
      }

      const data = await res.json();
      if (data.correctedText) {
        setOcrText(data.correctedText);
        setOcrConfidence(0.98);
        setOcrWords(
          data.correctedText
            .split(/\s+/)
            .filter((w: string) => w.length > 0)
            .map((t: string) => ({ text: t, confidence: 0.98 }))
        );
        toast.success('AI auto-corrected text and mathematical formulas!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to auto-correct with AI');
    } finally {
      setIsCorrecting(false);
    }
  };

  // ── Progress label (same style as UploadScreen) ──────────────────────────
  const getExtractLabel = () => {
    if (uploadProgress < 30) return '📷 Reading image...';
    if (uploadProgress < 60) return '✨ Enhancing & preprocessing...';
    if (uploadProgress < 85) return '🧠 Running OCR engine...';
    return '💾 Finalizing extraction...';
  };

  const getGenerateLabel = () => {
    if (uploadProgress < 30) return '📤 Sending extracted text...';
    if (uploadProgress < 60) return '🤖 Gemini AI is analyzing...';
    if (uploadProgress < 85) return '📚 Building study materials...';
    return '💾 Saving to database...';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation — identical to UploadScreen */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 py-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-1.5">
              <img src="/icons/logo-transparent-192.png" alt="OmniStudy Logo" className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="brand-logo text-[20px] sm:text-[28px]">
                OmniStudy <span className="brand-logo-ai">AI</span>
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onThemeToggle}
            className="rounded-full"
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      <main className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 py-12">
        <div className="space-y-8">

          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 dark:text-white">Upload Handwritten Notes</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upload a photo, scan, or whiteboard image — AI will extract and summarize the text
            </p>
          </div>

          {/* Upload type toggle — Handwritten Notes tab is active */}
          <div className="flex justify-center">
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl gap-1">
              <button
                onClick={onDigitalUploadClick}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all"
              >
                <Upload className="h-4 w-4 text-blue-500" />
                Digital Documents
              </button>
              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm transition-all"
              >
                <PenLine className="h-4 w-4 text-blue-500" />
                Handwritten Notes
              </button>
            </div>
          </div>

          {/* ── IDLE: No file selected — drag & drop zone ── */}
          {step === 'idle' && !file && (
            <Card
              className={`border-2 transition-all ${isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-dashed border-gray-300 dark:border-gray-700 dark:bg-black'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <CardContent className="py-8 sm:py-16">
                <div className="flex flex-col items-center justify-center space-y-6 text-center">
                  <div className="bg-blue-50 dark:bg-blue-950 p-8 rounded-full">
                    <PenLine className="h-12 w-12 sm:h-16 sm:w-16 text-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                      {isDragging ? 'Drop your image here' : 'Drag & drop your handwritten image or PDF'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">or</p>
                  </div>
                  <Button
                    size="lg"
                    className="bg-blue-500 hover:bg-blue-600"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_EXTS}
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── IDLE: File selected — preview + extract button ── */}
          {step === 'idle' && file && (
            <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 dark:bg-black">
              <CardContent className="py-8 sm:py-16">
                <div className="space-y-6">
                  {/* File row — same as UploadScreen */}
                  <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded">
                      {preview ? (
                        <img src={preview} alt="Preview" className="h-8 w-8 object-cover rounded" />
                      ) : (
                        <FileText className="h-8 w-8 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{file.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveFile}
                      className="flex-shrink-0"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Extract button — same style as "Upload and Summarize" */}
                  <Button
                    size="lg"
                    className="w-full bg-blue-500 hover:bg-blue-600"
                    onClick={handleExtract}
                  >
                    <PenLine className="mr-2 h-5 w-5" />
                    Extract Text with OCR
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── EXTRACTING: Progress bar — same style as UploadScreen upload progress ── */}
          {step === 'extracting' && (
            <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 dark:bg-black">
              <CardContent className="py-8 sm:py-16">
                <div className="space-y-6">
                  {/* File row (frozen, no X) */}
                  <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded">
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{fileName}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {file ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Progress — exact same markup as UploadScreen */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {getExtractLabel()}
                      </span>
                      <span className="font-semibold">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── REVIEW: Extracted text editor ── */}
          {step === 'review' && (
            <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 dark:bg-black">
              <CardContent className="py-8">
                <div className="space-y-6">
                  {/* File row */}
                  <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded">
                      {preview ? (
                        <img src={preview} alt="Preview" className="h-8 w-8 object-cover rounded" />
                      ) : (
                        <FileText className="h-8 w-8 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{fileName}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {pageCount > 1 ? `${pageCount} pages · ` : ''}
                        <span className={`font-medium ${
                          ocrConfidence >= 0.85 ? 'text-emerald-600 dark:text-emerald-400'
                          : ocrConfidence >= 0.70 ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                        }`}>
                          {Math.round(ocrConfidence * 100)}% confidence
                        </span>
                        {' · '}
                        <span className="capitalize">{ocrEngine.replace('-', ' ')}</span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveFile}
                      className="flex-shrink-0"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* OCR success badge */}
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Text extracted! Review and edit below.</span>
                  </div>

                  {/* Confidence legend */}
                  {ocrWords.some(w => w.confidence < 0.75) && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                      <span className="inline-block w-3 h-3 rounded bg-amber-200 dark:bg-amber-800"></span>
                      Highlighted words have low confidence — click Edit to correct them
                    </div>
                  )}

                  {/* Editable text area */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {ocrText.length.toLocaleString()} characters extracted
                      </p>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAutoCorrect}
                          disabled={isCorrecting}
                          className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:border-blue-400 gap-1.5 h-8 text-xs font-semibold rounded-lg shadow-sm"
                        >
                          <Wand2 className={`h-3.5 w-3.5 ${isCorrecting ? 'animate-spin' : ''}`} />
                          {isCorrecting ? 'Correcting text & formulas...' : 'Auto-Correct with AI'}
                        </Button>
                        <button
                          onClick={() => setIsEditing(!isEditing)}
                          className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 font-medium"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          {isEditing ? 'Done Editing' : 'Edit Text'}
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        className="w-full h-48 p-3 text-sm font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 dark:text-gray-100"
                        value={ocrText}
                        onChange={e => setOcrText(e.target.value)}
                        spellCheck
                      />
                    ) : (
                      <div className="h-48 overflow-y-auto p-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                        {ocrWords.length > 0 ? (
                          ocrWords.map((w, i) => (
                            <span
                              key={i}
                              title={`Confidence: ${Math.round(w.confidence * 100)}%`}
                              className={w.confidence < 0.75 ? 'bg-amber-200 dark:bg-amber-900 rounded px-0.5 cursor-help' : ''}
                            >
                              {w.text}{' '}
                            </span>
                          ))
                        ) : (
                          <span>{ocrText}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Generate button — same style as "Upload and Summarize" */}
                  <Button
                    size="lg"
                    className="w-full bg-blue-500 hover:bg-blue-600"
                    onClick={handleGenerate}
                    disabled={!ocrText.trim()}
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Upload and Summarize
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── GENERATING: Same progress bar style ── */}
          {step === 'generating' && (
            <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 dark:bg-black">
              <CardContent className="py-8 sm:py-16">
                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded">
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{fileName}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {ocrText.length.toLocaleString()} characters · {pageCount} page{pageCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Progress — exact same markup as UploadScreen */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {getGenerateLabel()}
                      </span>
                      <span className="font-semibold">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>

                  {uploadProgress === 100 && (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">Upload complete!</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message — identical to UploadScreen */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 dark:text-red-100">Error</h4>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* File Requirements — identical card style as UploadScreen */}
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="py-6">
              <h3 className="font-semibold mb-3">File Guidelines</h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Maximum file size is 50MB
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Accepts JPG, PNG, WEBP images and scanned PDFs
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Ensure good lighting and avoid heavy shadows for best OCR results
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Supports English, Telugu, Hindi and other major languages
                </li>
              </ul>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
