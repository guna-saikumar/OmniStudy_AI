import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import api from '../utils/api';
import { toast } from 'sonner';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

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

  const toggleMode = () => {
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


  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Auth Card */}
      <div className="w-full max-w-lg border-2 border-blue-500/30 rounded-3xl bg-slate-900 p-12">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <span className="text-[28px] font-bold tracking-widest drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center">
            <span style={{ color: '#1d51df' }}>O</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400" style={{ backgroundImage: 'linear-gradient(to right, #2B7FFF)', WebkitBackgroundClip: 'text' }}>mni</span>
            <span style={{ color: '#1d51df' }} className="ml-1">S</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400" style={{ backgroundImage: 'linear-gradient(to right, #2B7FFF)', WebkitBackgroundClip: 'text' }}>tudy</span>
            <span className="inline-block w-2"></span>
            <span style={{ color: '#1d51df' }}>A</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400" style={{ backgroundImage: 'linear-gradient(to right, #2B7FFF)', WebkitBackgroundClip: 'text' }}>I</span>
          </span>
        </div>

        {/* LOGIN FORM */}
        {isLoginMode && (
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
            <div>
              <Input
                type="password"
                placeholder="Enter Your Password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent border-2 border-blue-500/40 rounded-full px-6 py-6 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
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

        {/* SIGNUP FORM */}
        {!isLoginMode && (
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
            <div>
              <Input
                type="password"
                placeholder="Enter Your Password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent border-2 border-blue-500/40 rounded-full px-6 py-6 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* Confirm Password Input */}
            <div>
              <Input
                type="password"
                placeholder="Confirm Your Password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-transparent border-2 border-blue-500/40 rounded-full px-6 py-6 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
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