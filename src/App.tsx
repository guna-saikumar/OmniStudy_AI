import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation, useParams } from 'react-router-dom';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import UploadScreen from './components/UploadScreen';
import SummaryViewer from './components/SummaryViewer';
import ProfileSettings from './components/ProfileSettings';
import HistoryPage from './components/HistoryPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import InstallPrompt from './components/InstallPrompt';
import { Toaster } from './components/ui/sonner';

// ── Reads session state for the summary page (survives F5 refresh) ────────
function SummaryRoute({
  theme,
  onThemeToggle,
}: {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileName = sessionStorage.getItem(`summary_file_${id}`) || 'Document';
  return (
    <SummaryViewer
      fileName={fileName}
      summaryId={id ?? null}
      onBack={() => navigate('/')}
      theme={theme}
      onThemeToggle={onThemeToggle}
    />
  );
}

// ── Route guard — defined OUTSIDE App so it never gets remounted ──────────
function ProtectedRoute({
  isLoggedIn,
  children,
}: {
  isLoggedIn: boolean;
  children: React.ReactNode;
}) {
  const location = useLocation();
  if (!isLoggedIn) {
    // We use a query parameter for the redirect destination so it's bulletproof
    // across in-app browsers (WhatsApp/Instagram) that might clear session storage.
    const search = new URLSearchParams();
    search.set('redirect', location.pathname + location.search);
    return <Navigate to={`/login?${search.toString()}`} replace />;
  }
  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('Student');
  const [userId, setUserId] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  // authReady prevents ProtectedRoute from redirecting to /login
  // before localStorage has been read on the very first render
  const [authReady, setAuthReady] = useState(false);

  // Restore auth + theme from localStorage on first load
  useEffect(() => {
    // Theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');

    // Auth
    const raw = localStorage.getItem('userInfo');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setUserName(parsed.name || 'Student');
        setUserId(parsed._id || null);
        setProfileImage(parsed.profileImage || null);
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem('userInfo');
      }
    }

    console.log('[OmniStudy] Initializing application...');
    
    // Branded splash reveal (Logo + Name)
    const timer = setTimeout(() => {
      setAuthReady(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleThemeToggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const handleLogin = (userInfo: any) => {
    const userObj = typeof userInfo === 'string'
      ? { name: userInfo, _id: 'mock-id-' + userInfo.toLowerCase() }
      : userInfo;

    setUserName(userObj.name || 'Student');
    setUserId(userObj._id || null);
    setProfileImage(userObj.profileImage || null);
    setIsLoggedIn(true);
    localStorage.setItem('userInfo', JSON.stringify(userObj));

    // Priority 1: Check URL search params (most reliable for WhatsApp/Redirects)
    // Priority 2: Check sessionStorage (fallback)
    // Priority 3: Default to home
    const searchParams = new URLSearchParams(window.location.search);
    const redirectPath = searchParams.get('redirect') || sessionStorage.getItem('returnTo') || '/';
    
    sessionStorage.removeItem('returnTo');
    navigate(redirectPath, { replace: true });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName('Student');
    setUserId(null);
    setProfileImage(null);
    localStorage.removeItem('userInfo');
    navigate('/login', { replace: true });
  };

  // Store fileName in sessionStorage keyed by ID so it persists across refresh
  const handleViewSummary = (id: string, fileName: string) => {
    sessionStorage.setItem(`summary_file_${id}`, fileName);
    navigate(`/summary/${id}`);
  };

  return (
    <>
      {!authReady ? (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 animate-in fade-in duration-1000">
          <img src="/icons/logo-transparent-512.png" alt="OmniStudy Logo" className="w-32 h-32 sm:w-48 sm:h-48 animate-pulse" />
          <h1 className="brand-logo text-[32px] sm:text-[48px]">
            OmniStudy <span className="brand-logo-ai">AI</span>
          </h1>
          {/* Lens Flare Line */}
          <div className="w-48 sm:w-64 h-[1.5px] bg-gradient-to-r from-transparent via-[#d946ef] to-transparent shadow-[0_0_20px_rgba(217,70,239,0.8)] opacity-80 -mt-4"></div>
        </div>
      ) : (
        <>
          <Routes>
            <Route
              path="/login"
              element={
                isLoggedIn
                  ? <Navigate to="/" replace />
                  : <AuthPage onLogin={handleLogin} theme={theme} onThemeToggle={handleThemeToggle} />
              }
            />

            <Route
              path="/"
              element={
                <ProtectedRoute isLoggedIn={isLoggedIn}>
                  <Dashboard
                    key={userId || 'guest'}
                    userName={userName}
                    profileImage={profileImage}
                    onUploadClick={() => navigate('/upload')}
                    onProfileClick={() => navigate('/profile')}
                    onViewAllClick={() => navigate('/history')}
                    theme={theme}
                    onThemeToggle={handleThemeToggle}
                    onViewSummary={handleViewSummary}
                    onLogout={handleLogout}
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/upload"
              element={
                <ProtectedRoute isLoggedIn={isLoggedIn}>
                  <UploadScreen
                    onBack={() => navigate('/')}
                    onUploadComplete={(fileName, id) => handleViewSummary(id, fileName)}
                    theme={theme}
                    onThemeToggle={handleThemeToggle}
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/summary/:id"
              element={
                <ProtectedRoute isLoggedIn={isLoggedIn}>
                  <SummaryRoute theme={theme} onThemeToggle={handleThemeToggle} />
                </ProtectedRoute>
              }
            />

            <Route path="/summary" element={<Navigate to="/" replace />} />

            <Route
              path="/profile"
              element={
                <ProtectedRoute isLoggedIn={isLoggedIn}>
                  <ProfileSettings
                    userName={userName}
                    profileImage={profileImage}
                    onBack={() => navigate('/')}
                    onLogout={handleLogout}
                    onNameChange={(name) => setUserName(name)}
                    onProfileImageChange={(img) => setProfileImage(img)}
                    theme={theme}
                    onThemeToggle={handleThemeToggle}
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/history"
              element={
                <ProtectedRoute isLoggedIn={isLoggedIn}>
                  <HistoryPage
                    key={userId || 'guest'}
                    onBack={() => navigate('/')}
                    onViewSummary={handleViewSummary}
                    theme={theme}
                    onThemeToggle={handleThemeToggle}
                  />
                </ProtectedRoute>
              }
            />

            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to={isLoggedIn ? '/' : '/login'} replace />} />
          </Routes>
          <InstallPrompt />
          <Toaster position="top-center" theme={theme} />
        </>
      )}
    </>
  );
}
