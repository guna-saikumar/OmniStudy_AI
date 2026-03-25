import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import api from '../utils/api';
import { toast } from 'sonner';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';

interface AuthPageProps {
  onLogin: (userInfo: any) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export default function AuthPage({ onLogin, theme, onThemeToggle }: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!isLoginMode) {
        // Signup validation
        if (password !== confirmPassword) {
          toast.error('Passwords do not match!');
          setIsLoading(false);
          return;
        }

        const { data } = await api.post('/users', { name, email, password });
        toast.success('Registration successful!');
        onLogin(data);
      } else {
        // Login
        const { data } = await api.post('/users/login', { email, password });
        toast.success('Logged in successfully!');
        onLogin(data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await api.post('/users/forgotpassword', { email });
      toast.success('Check your email for instructions!');
      setIsForgotPasswordMode(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset instructions');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsForgotPasswordMode(false);
    setIsLoginMode(!isLoginMode);
    // Clear form fields when switching modes
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
  };

  const handleGoogleSuccess = async (accessToken: string) => {
    setIsLoading(true);
    try {
      // Fetch user info from Google using the access token
      const res = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const { email, name, picture } = res.data;

      // Send this info to the backend to login/register
      const { data } = await api.post('/users/google-custom', { email, name, picture });

      toast.success('Logged in with Google!');
      onLogin(data);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Google authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => handleGoogleSuccess(tokenResponse.access_token),
    onError: () => toast.error('Google Login Failed'),
  });

  const searchParams = new URLSearchParams(window.location.search);
  const isSharedLink = searchParams.has('redirect') && searchParams.get('redirect')?.includes('/summary/');

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Auth Card */}
      <div className="w-full max-w-lg border-2 border-blue-500/30 rounded-3xl bg-slate-900 p-6 sm:p-12">
        {/* Shared Link Messaging */}
        {isSharedLink && (
          <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500">
            <p className="text-blue-400 text-center text-sm font-medium">
              👋 Sign in to see this shared summary!
            </p>
          </div>
        )}

        {/* Logo */}
        <div className="flex justify-center items-center gap-1.5 mb-12 animate-in fade-in duration-500">
          <img 
            id="app-logo-target"
            src="/icons/logo-transparent-192.png" 
            alt="OmniStudy Logo" 
            className="w-8 h-8 sm:w-10 sm:h-10" 
          />
          <span 
            id="app-title-target"
            className="brand-logo text-[24px] sm:text-[32px]"
          >
            OmniStudy <span className="brand-logo-ai">AI</span>
          </span>
        </div>

        {/* LOGIN FORM */}
        {isLoginMode && !isForgotPasswordMode && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <Input
                type="email"
                placeholder="Enter Your Email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border-2 border-blue-500/40 rounded-full px-6 py-6 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter Your Password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent border-2 border-blue-500/40 rounded-full px-6 py-6 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-14"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setIsForgotPasswordMode(true)}
                className="text-blue-400 text-sm hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-full py-6 text-base font-medium"
            >
              {isLoading ? 'Processing...' : 'Login'}
            </Button>

            {/* Divider Text */}
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                Don't have an Account? Create one to Continue
              </p>
            </div>

            {/* Create Account Button */}
            <Button
              type="button"
              onClick={toggleMode}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-full py-6 text-base font-medium"
            >
              Create an Account
            </Button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {isForgotPasswordMode && (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <h2 className="text-white text-xl font-semibold text-center mb-4">Reset Your Password</h2>
            <p className="text-gray-400 text-sm text-center">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
            {/* Email Input */}
            <div>
              <Input
                type="email"
                placeholder="Enter Your Email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border-2 border-blue-500/40 rounded-full px-6 py-6 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* Reset Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-full py-6 text-base font-medium"
            >
              {isLoading ? 'Processing...' : 'Send Reset Link'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsForgotPasswordMode(false)}
                className="text-gray-400 text-sm hover:text-white"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {/* SIGNUP FORM */}
        {!isLoginMode && !isForgotPasswordMode && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name Input */}
            <div>
              <Input
                type="text"
                placeholder="Enter Your Full Name"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                required
                className="w-full bg-transparent border-2 border-blue-500/40 rounded-full px-6 py-6 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* Email Input */}
            <div>
              <Input
                type="email"
                placeholder="Enter Your Email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border-2 border-blue-500/40 rounded-full px-6 py-6 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter Your Password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent border-2 border-blue-500/40 rounded-full px-6 py-6 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-14"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Confirm Password Input */}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm Your Password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-transparent border-2 border-blue-500/40 rounded-full px-6 py-6 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-14"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Create Account Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-full py-6 text-base font-medium"
            >
              {isLoading ? 'Creating Account...' : 'Create an Account'}
            </Button>

            {/* Divider Text */}
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                Already have an Account? Login to Continue
              </p>
            </div>

            {/* Login Button */}
            <Button
              type="button"
              onClick={toggleMode}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-full py-6 text-base font-medium"
            >
              Login
            </Button>
          </form>
        )}

        {/* Divider with OR */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-blue-500/20"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-900 px-4 text-gray-400 font-medium">OR</span>
          </div>
        </div>

        {/* Social Login Buttons */}
        <div className="space-y-4">
          {/* Google Login */}
          <Button
            type="button"
            onClick={() => loginWithGoogle()}
            disabled={isLoading}
            className="w-full bg-white hover:bg-gray-100 text-gray-800 rounded-full py-6 text-base font-medium flex items-center justify-center gap-3 transition-all"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

        </div>
      </div>
    </div>
  );
}