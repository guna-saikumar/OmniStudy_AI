import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { BookOpen, ArrowLeft, CircleUser, LogOut, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import api from '../utils/api';

interface ProfileSettingsProps {
  userName: string;
  onBack: () => void;
  onLogout: () => void;
  onNameChange: (name: string) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export default function ProfileSettings({
  userName,
  onBack,
  onLogout,
  onNameChange,
  theme,
  onThemeToggle,
}: ProfileSettingsProps) {
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [receiveUpdates, setReceiveUpdates] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      setEmail(parsed.email);
      setName(parsed.name);
      if (parsed.profileImage) {
        setProfileImage(parsed.profileImage);
      }
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await api.put('/users/profile', { name });
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      localStorage.setItem('userInfo', JSON.stringify({ ...userInfo, name: data.name, profileImage }));
      onNameChange(data.name);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    toast.success('Logged out successfully!');
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-8 sm:px-16 lg:px-24 xl:px-32 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <span
                className="text-[28px] font-semibold tracking-widest drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] bg-clip-text text-transparent bg-gradient-to-r"
                style={{
                  backgroundImage: 'linear-gradient(to right, #082677 4%, #2B7FFF 13%, #2B7FFF 34%, #082677 43%, #2B7FFF 50%, #2B7FFF 80%, #082677 92%, #2B7FFF 100%)'
                }}
              >
                OmniStudy AI
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Profile Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="relative group cursor-pointer inline-block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="profile-upload"
                  onChange={handleImageUpload}
                />
                <label htmlFor="profile-upload" className="block cursor-pointer">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-blue-100 dark:border-blue-900 shadow-sm transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="bg-blue-100 dark:bg-blue-950 p-6 rounded-full border-4 border-transparent group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-all">
                      <CircleUser className="h-12 w-12 text-blue-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold">Upload</span>
                  </div>
                </label>
              </div>
            </div>
            <CardTitle className="text-2xl">Profile Settings</CardTitle>
            <CardDescription>
              Manage your account preferences
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 px-6 pb-6">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>

              {/* Email Display (Non-editable) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Email cannot be changed
                </p>
              </div>

              <Separator />

              {/* Theme Toggle */}
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-base">Theme</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Toggle between light and dark mode
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onThemeToggle}
                  className="gap-2"
                >
                  {theme === 'light' ? (
                    <>
                      <Moon className="h-4 w-4" />
                      Dark
                    </>
                  ) : (
                    <>
                      <Sun className="h-4 w-4" />
                      Light
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              {/* Receive Updates Switch */}
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-base">Receive Updates</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Get tips and feedback prompts
                  </p>
                </div>
                <Switch
                  checked={receiveUpdates}
                  onCheckedChange={setReceiveUpdates}
                />
              </div>

              <Separator />

              {/* Save Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>

            <Separator />

            {/* Log Out Button */}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full gap-2 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-300 dark:hover:border-red-800 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}