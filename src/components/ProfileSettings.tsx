import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

import { Separator } from './ui/separator';
import { BookOpen, ArrowLeft, CircleUser, LogOut, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import api from '../utils/api';

interface ProfileSettingsProps {
  userName: string;
  profileImage: string | null;
  onBack: () => void;
  onLogout: () => void;
  onNameChange: (name: string) => void;
  onProfileImageChange: (img: string | null) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export default function ProfileSettings({
  userName,
  profileImage: initialProfileImage,
  onBack,
  onLogout,
  onNameChange,
  onProfileImageChange,
  theme,
  onThemeToggle,
}: ProfileSettingsProps) {
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(initialProfileImage);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initial sync with prop
    setProfileImage(initialProfileImage);
    
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      setEmail(parsed.email);
      setName(parsed.name);
    }
  }, [initialProfileImage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image is too large. Please select a file smaller than 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Perform image compression to ensure mobile reliability
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800; // Standard profile size for clarity + speed
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to base64 with moderate compression quality (0.7)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setProfileImage(compressedBase64);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await api.put('/users/profile', { name, profileImage });
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      localStorage.setItem('userInfo', JSON.stringify({
        ...userInfo,
        name: data.name,
        profileImage: data.profileImage
      }));
      
      onNameChange(data.name);
      onProfileImageChange(data.profileImage);
      
      toast.success('Profile updated successfully!');
      // Return to previous page after successful save
      setTimeout(() => {
        onBack();
      }, 1000);
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
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 py-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-[20px] sm:text-[28px] font-bold  drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center">
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
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Profile Card */}
        <Card className="shadow-lg dark:bg-black">
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