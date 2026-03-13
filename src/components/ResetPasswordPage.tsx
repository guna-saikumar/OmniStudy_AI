import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Eye, EyeOff, Lock } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return toast.error('Passwords do not match');
        }

        setIsLoading(true);
        try {
            const { data } = await api.put(`/users/resetpassword/${token}`, { password });
            toast.success('Password reset successful! Please login.');
            navigate('/login');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Reset link invalid or expired');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-lg border-2 border-blue-500/30 rounded-3xl bg-slate-900 p-6 sm:p-12">
                <div className="flex justify-center mb-8">
                    <div className="bg-blue-500/20 p-4 rounded-full">
                        <Lock className="h-8 w-8 text-blue-500" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-white text-center mb-2 uppercase">New Password</h2>
                <p className="text-gray-400 text-center mb-8 text-sm">Create a strong new password for your account.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="New Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full bg-transparent border-2 border-blue-500/40 rounded-full px-6 py-6 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-14"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>

                    <div>
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirm New Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full bg-transparent border-2 border-blue-500/40 rounded-full px-6 py-6 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-full py-6 text-base font-medium"
                    >
                        {isLoading ? 'Resetting...' : 'Update Password'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
