import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ChatGPTMarkdownProps {
    content: string;
}

export const ChatGPTMarkdown: React.FC<ChatGPTMarkdownProps> = ({ content }) => {
    const [copiedBlockIdx, setCopiedBlockIdx] = useState<number | null>(null);

    const handleCopyCode = (codeText: string, idx: number) => {
        navigator.clipboard.writeText(codeText);
        setCopiedBlockIdx(idx);
        toast.success('Code copied to clipboard!');
        setTimeout(() => setCopiedBlockIdx(null), 2000);
    };

    // Helper to render inline formatting (bold, inline code, latex)
    const renderFormattedText = (text: string) => {
        // Split by inline code, bold, and inline math
        const parts = text.split(/(\*\*.*?\*\*|`.*?`|\$.*?\$)/g);

        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return (
                    <strong key={i} className="font-bold text-gray-900 dark:text-white">
                        {part.slice(2, -2)}
                    </strong>
                );
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return (
                    <code key={i} className="px-1.5 py-0.5 mx-0.5 rounded bg-gray-200 dark:bg-gray-800 text-purple-600 dark:text-purple-300 font-mono text-xs">
                        {part.slice(1, -1)}
                    </code>
                );
            }
            if (part.startsWith('$') && part.endsWith('$')) {
                return (
                    <span key={i} className="px-1 font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded">
                        {part.slice(1, -1)}
                    </span>
                );
            }
            return part;
        });
    };

    // Split content into blocks (code blocks, blockquotes, headings, lists, paragraphs)
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLang = 'Plain text';
    let codeBlockLines: string[] = [];
    let codeBlockIdxCounter = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Code block start/end
        if (line.trim().startsWith('```')) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeBlockLang = line.trim().slice(3) || 'Plain text';
                codeBlockLines = [];
            } else {
                inCodeBlock = false;
                const codeText = codeBlockLines.join('\n');
                const currentIdx = codeBlockIdxCounter++;

                elements.push(
                    <div key={`code-${i}`} className="my-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 overflow-hidden shadow-sm">
                        <div className="px-4 py-2 bg-gray-200/70 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 font-mono">
                            <span>{codeBlockLang}</span>
                            <button
                                onClick={() => handleCopyCode(codeText, currentIdx)}
                                className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                {copiedBlockIdx === currentIdx ? (
                                    <>
                                        <Check className="h-3.5 w-3.5 text-green-500" />
                                        <span className="text-green-500 font-semibold">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>Copy code</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <pre className="p-4 overflow-x-auto text-xs font-mono text-gray-800 dark:text-gray-200 leading-relaxed">
                            <code>{codeText}</code>
                        </pre>
                    </div>
                );
            }
            continue;
        }

        if (inCodeBlock) {
            codeBlockLines.push(line);
            continue;
        }

        // Headings
        if (line.startsWith('### ')) {
            elements.push(
                <h3 key={i} className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mt-5 mb-2">
                    {renderFormattedText(line.slice(4))}
                </h3>
            );
            continue;
        }
        if (line.startsWith('## ')) {
            elements.push(
                <h2 key={i} className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-3 pb-1 border-b border-gray-200 dark:border-gray-800">
                    {renderFormattedText(line.slice(3))}
                </h2>
            );
            continue;
        }
        if (line.startsWith('# ')) {
            elements.push(
                <h1 key={i} className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mt-6 mb-3">
                    {renderFormattedText(line.slice(2))}
                </h1>
            );
            continue;
        }

        // Blockquotes (ChatGPT style left border bar)
        if (line.startsWith('> ')) {
            elements.push(
                <blockquote key={i} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 my-3 bg-blue-50/40 dark:bg-blue-950/30 rounded-r-xl font-medium text-gray-800 dark:text-gray-200 text-sm">
                    {renderFormattedText(line.slice(2))}
                </blockquote>
            );
            continue;
        }

        // Bold section headers (e.g. **1. Main Concept:** or **Key Findings**)
        const trimmed = line.trim();
        if (/^\*\*[^*]+\*\*:?$/.test(trimmed)) {
            elements.push(
                <h4 key={i} className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-5 mb-1.5">
                    {renderFormattedText(trimmed)}
                </h4>
            );
            continue;
        }

        // Bullet lists & sub-points
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const listText = trimmed.replace(/^[•\-\*]\s+/, '');
            
            // Check if bullet item is actually a section heading (e.g. • **Section Title:**)
            if (/^\*\*[^*]+\*\*:?$/.test(listText.trim())) {
                elements.push(
                    <h4 key={i} className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-5 mb-1.5">
                        {renderFormattedText(listText)}
                    </h4>
                );
            } else {
                const isSubPoint = line.search(/\S/) >= 2;
                elements.push(
                    <div key={i} className={`flex items-start gap-2.5 my-1.5 ${isSubPoint ? 'pl-6' : 'pl-2'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isSubPoint ? 'bg-blue-500 dark:bg-blue-400' : 'bg-gray-400 dark:bg-gray-500'} mt-2 shrink-0`} />
                        <span className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                            {renderFormattedText(listText)}
                        </span>
                    </div>
                );
            }
            continue;
        }

        // Numbered lists
        const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
        if (numMatch) {
            elements.push(
                <div key={i} className="flex items-start gap-2.5 my-1.5 pl-2">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 shrink-0 min-w-4">
                        {numMatch[1]}.
                    </span>
                    <span className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                        {renderFormattedText(numMatch[2])}
                    </span>
                </div>
            );
            continue;
        }

        // Empty line spacer
        if (!trimmed) {
            elements.push(<div key={i} className="h-2" />);
            continue;
        }

        // Standard Paragraph
        elements.push(
            <p key={i} className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 my-1">
                {renderFormattedText(line)}
            </p>
        );
    }

    return <div className="space-y-1">{elements}</div>;
};
