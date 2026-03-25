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
  const [isExiting, setIsExiting] = useState(false);
  const [flightStyles, setFlightStyles] = useState<React.CSSProperties>({});

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
      setIsExiting(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Shared Element Coordinate Calculation
  useEffect(() => {
    if (isExiting) {
      // Small delay to ensure the background app has rendered target IDs
      const timer = setTimeout(() => {
        const logoTarget = document.getElementById('app-logo-target');
        const titleTarget = document.getElementById('app-title-target');
        const logoSource = document.getElementById('splash-logo-source');
        const titleSource = document.getElementById('splash-title-source');

        if (logoTarget && titleTarget && logoSource && titleSource) {
          const lRect = logoTarget.getBoundingClientRect();
          const tRect = titleTarget.getBoundingClientRect();
          const lsRect = logoSource.getBoundingClientRect();
          const tsRect = titleSource.getBoundingClientRect();
          
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;

          setFlightStyles({
            '--tx': `${lRect.left + lRect.width/2 - (lsRect.left + lsRect.width/2)}px`,
            '--ty': `${lRect.top + lRect.height/2 - (lsRect.top + lsRect.height/2)}px`,
            '--scale': `${lRect.width / lsRect.width}`,
            '--ttx': `${tRect.left + tRect.width/2 - (tsRect.left + tsRect.width/2)}px`,
            '--tty': `${tRect.top + tRect.height/2 - (tsRect.top + tsRect.height/2)}px`,
            '--tscale': `${tRect.width / tsRect.width}`,
          } as React.CSSProperties);

          // Soft-landing handoff at 1350ms (just before 1.5s flight concludes)
          setTimeout(() => {
            setAuthReady(true);
          }, 1350); 
        } else {
          // Fallback if measurement fails
          setAuthReady(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExiting]);

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
      {/* Splash Screen Layer */}
      {(!authReady || isExiting) && (
        <div 
          className={`fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center gap-8 overflow-hidden transition-opacity duration-1000 ${authReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          style={flightStyles}
        >
          {/* Logo - Flight Ready */}
          <div className="relative group">
            <div className={`absolute -inset-8 bg-gradient-to-r from-cyan-500/20 to-magenta-500/20 rounded-full blur-3xl ${isExiting ? 'opacity-0 scale-0' : 'animate-pulse'} transition-all duration-700`}></div>
            <div id="splash-logo-source" className={`splash-shared-element ${!isExiting ? 'animate-logo-float' : ''} ${isExiting ? 'splash-shared-logo-flying' : ''}`}>
              <img 
                src="/icons/logo-transparent-512.png" 
                alt="OmniStudy Logo" 
                className="w-32 h-32 sm:w-48 sm:h-48 relative z-10 animate-logo-entrance drop-shadow-[0_0_30px_rgba(34,211,238,0.3)]" 
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            {/* Title - Flight Ready */}
            <h1 id="splash-title-source" className={`brand-logo text-[40px] sm:text-[56px] animate-title-reveal shimmer-text splash-shared-element ${isExiting ? 'splash-shared-title-flying' : ''}`}>
              OmniStudy <span className="brand-logo-ai">AI</span>
            </h1>
            
            {/* Tagline - Hidden during flight */}
            <p className={`text-slate-400 text-xs sm:text-sm font-medium tracking-[0.3em] uppercase transition-all duration-300 ${!isExiting ? 'opacity-0 animate-title-reveal [animation-delay:0.4s]' : 'opacity-0 -translate-y-8 invisible'}`}>
              Personalized Learning Universe
            </p>
          </div>

          {/* Animated Lens Flare Line */}
          <div className={`relative w-48 sm:w-80 h-[2px] transition-all duration-700 ${isExiting ? 'opacity-0 scale-x-0' : ''}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-magenta-500 to-transparent shadow-[0_0_20px_rgba(217,70,239,0.8)] animate-flare-expansion [animation-delay:0.6s] opacity-0"></div>
          </div>
        </div>
      )}

      {/* Main Content Layer */}
      <div 
        className={`w-full ${authReady ? 'animate-app-entrance' : 'invisible absolute h-0 overflow-hidden'}`}
        style={{ pointerEvents: authReady ? 'auto' : 'none' }}
      >
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
      </div>
    </>
  );
}
