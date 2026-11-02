import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { MessageSquare } from 'lucide-react';

interface DocumentChatDrawerProps {
    summaryId: string | null;
    docTitle?: string;
    theme?: 'light' | 'dark';
}

export const DocumentChatDrawer: React.FC<DocumentChatDrawerProps> = ({
    summaryId,
}) => {
    const navigate = useNavigate();

    if (!summaryId) return null;

    const handleOpenChatPage = () => {
        navigate(`/chat/${summaryId}`);
    };

    return (
        <div className="sticky bottom-[75px] left-0 right-0 z-50 print:hidden pointer-events-none">
            <div className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 flex justify-end">
                <div className="pointer-events-auto flex flex-col items-end gap-3 pr-4 sm:pr-8 lg:pr-12">
                    {/* Main "Ask OmniStudy" Button */}
                    <Button
                        onClick={handleOpenChatPage}
                        className="rounded-full h-9 sm:h-10 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-600/40 border border-blue-300/30 hover:scale-105 active:scale-95 transition-all duration-300 gap-2 group"
                    >
                        <div className="p-1 rounded-full bg-white/20 text-white group-hover:rotate-12 transition-transform">
                            <MessageSquare className="h-3.5 w-3.5 text-blue-200 animate-pulse" />
                        </div>
                        <span className="tracking-wide font-bold">
                            Ask OmniStudy
                        </span>
                    </Button>
                </div>
            </div>
        </div>
    );
};
