import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation, useParams } from 'react-router-dom';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import UploadScreen from './components/UploadScreen';
import SummaryViewer from './components/SummaryViewer';
import ProfileSettings from './components/ProfileSettings';
import HistoryPage from './components/HistoryPage';
import ResetPasswordPage from './components/ResetPasswordPage';
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
    // Remember where the user wanted to go so we can return there after login
    sessionStorage.setItem('returnTo', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('Student');
  const [userId, setUserId] = useState<string | null>(null);
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
        setIsLoggedIn(true);
      } catch {
        localStorage.removeItem('userInfo');
      }
    }
    console.log('[OmniStudy] Initializing application...');
    setAuthReady(true); // ← must fire regardless of whether user is logged in
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
    setIsLoggedIn(true);
    localStorage.setItem('userInfo', JSON.stringify(userObj));
    // Go back to wherever they were trying to access
    const returnTo = sessionStorage.getItem('returnTo') || '/';
    sessionStorage.removeItem('returnTo');
    navigate(returnTo, { replace: true });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName('Student');
    setUserId(null);
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <Routes>
            {/* /login */}
            <Route
              path="/login"
              element={
                isLoggedIn
                  ? <Navigate to="/" replace />
                  : <AuthPage onLogin={handleLogin} theme={theme} onThemeToggle={handleThemeToggle} />
              }
            />

            {/* / — Dashboard */}
            <Route
              path="/"
              element={
                <ProtectedRoute isLoggedIn={isLoggedIn}>
                  <Dashboard
                    key={userId || 'guest'}
                    userName={userName}
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

            {/* /upload */}
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

            {/* /summary/:id — ID in the URL = survives refresh */}
            <Route
              path="/summary/:id"
              element={
                <ProtectedRoute isLoggedIn={isLoggedIn}>
                  <SummaryRoute theme={theme} onThemeToggle={handleThemeToggle} />
                </ProtectedRoute>
              }
            />

            {/* Legacy /summary (no id) → dashboard */}
            <Route path="/summary" element={<Navigate to="/" replace />} />

            {/* /profile */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute isLoggedIn={isLoggedIn}>
                  <ProfileSettings
                    userName={userName}
                    onBack={() => navigate('/')}
                    onLogout={handleLogout}
                    onNameChange={(name) => setUserName(name)}
                    theme={theme}
                    onThemeToggle={handleThemeToggle}
                  />
                </ProtectedRoute>
              }
            />

            {/* /history */}
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

            {/* /reset-password/:token */}
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to={isLoggedIn ? '/' : '/login'} replace />} />
          </Routes>
          <Toaster position="top-center" theme={theme} />
        </>
      )}
    </>
  );
}