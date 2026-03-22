import { useState, useRef, DragEvent } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import {
  BookOpen,
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Moon,
  Sun,
} from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

interface UploadScreenProps {
  onBack: () => void;
  onUploadComplete: (fileName: string, id: string) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export default function UploadScreen({
  onBack,
  onUploadComplete,
  theme,
  onThemeToggle,
}: UploadScreenProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a PDF, TXT, PPT, or DOCX file';
    }

    if (file.size > 50 * 1024 * 1024) {
      return 'File size exceeds 50MB limit. Please upload a smaller file.';
    }

    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError(null);
    setFile(selectedFile);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress while waiting for AI
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) {
          clearInterval(interval);
          return 85;
        }
        return prev + 5;
      });
    }, 300);

    try {
      // Build multipart form data with the actual PDF file
      const formData = new FormData();
      formData.append('pdf', file);

      const userInfo = localStorage.getItem('userInfo');
      const token = userInfo ? JSON.parse(userInfo).token : null;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/summaries/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      clearInterval(interval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Upload failed');
      }

      setUploadProgress(100);
      const data = await response.json();
      toast.success('AI summary generated and saved!');
      onUploadComplete(file.name, data._id);
    } catch (error: any) {
      clearInterval(interval);
      toast.error(error.message || 'Failed to generate AI summary');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };


  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 py-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img src="/icons/logo-transparent-192.png" alt="OmniStudy Logo" className="w-6 h-6 sm:w-8 sm:h-8" />
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
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Upload Your PDF</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Drop your file here or click to browse
            </p>
          </div>

          {/* Upload Card */}
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
              {!file ? (
                <div className="flex flex-col items-center justify-center space-y-6 text-center">
                  <div className="bg-blue-50 dark:bg-blue-950 p-8 rounded-full">
                    <Upload className="h-12 w-12 sm:h-16 sm:w-16 text-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">
                      {isDragging ? 'Drop your file here' : 'Drag & drop your PDF here'}
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
                    accept=".pdf,.txt,.docx,.doc,.pptx,.ppt"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* File Preview */}
                  <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded">
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold truncate">{file.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {!isUploading && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveFile}
                        className="flex-shrink-0"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    )}
                  </div>

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {uploadProgress < 30
                            ? '📤 Uploading PDF...'
                            : uploadProgress < 60
                              ? '📖 Extracting text...'
                              : uploadProgress < 85
                                ? '🤖 Gemini AI is analyzing...'
                                : '💾 Saving to database...'}
                        </span>
                        <span className="font-bold">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}

                  {/* Success State */}
                  {uploadProgress === 100 && (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-bold">Upload complete!</span>
                    </div>
                  )}

                  {/* Upload Button */}
                  {!isUploading && uploadProgress < 100 && (
                    <Button
                      size="lg"
                      className="w-full bg-blue-500 hover:bg-blue-600"
                      onClick={handleUpload}
                    >
                      <Upload className="mr-2 h-5 w-5" />
                      Upload and Summarize
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-900 dark:text-red-100">Error</h4>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* File Requirements */}
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="py-6">
              <h3 className="font-bold mb-3">File Guidelines</h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Maximum file size is 50MB
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Maximum 100 pages per document
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Accepts PDF, TXT, DOCX, and PPT formats
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div >
  );
}