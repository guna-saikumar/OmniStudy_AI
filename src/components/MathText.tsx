import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  content?: string | null;
  className?: string;
  inline?: boolean;
}

interface Segment {
  type: 'text' | 'math-inline' | 'math-block';
  value: string;
}

/**
 * Tokenizes text containing math delimiters:
 *  - Block math: $$ ... $$ or \[ ... \]
 *  - Inline math: $ ... $ or \( ... \)
 *  - Auto-detected un-delimited LaTeX (e.g. \frac{a}{b}, \sqrt{x})
 */
function parseMathSegments(text: string): Segment[] {
  if (!text) return [];

  const segments: Segment[] = [];
  
  // Regex to match block ($$...$$ or \[...\]) and inline ($...$ or \(...\)) math
  const mathRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\(.*?\\\)|(?:\$[^$\n]+\$))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(text)) !== null) {
    const start = match.index;
    const matchedStr = match[0];

    // Add preceding plain text if any
    if (start > lastIndex) {
      const plain = text.substring(lastIndex, start);
      parsePlainOrRawLatex(plain, segments);
    }

    // Determine math type and clean value
    if (matchedStr.startsWith('$$') && matchedStr.endsWith('$$')) {
      segments.push({ type: 'math-block', value: matchedStr.slice(2, -2).trim() });
    } else if (matchedStr.startsWith('\\[') && matchedStr.endsWith('\\]')) {
      segments.push({ type: 'math-block', value: matchedStr.slice(2, -2).trim() });
    } else if (matchedStr.startsWith('\\(') && matchedStr.endsWith('\\)')) {
      segments.push({ type: 'math-inline', value: matchedStr.slice(2, -2).trim() });
    } else if (matchedStr.startsWith('$') && matchedStr.endsWith('$')) {
      segments.push({ type: 'math-inline', value: matchedStr.slice(1, -1).trim() });
    }

    lastIndex = match.index + matchedStr.length;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    const plain = text.substring(lastIndex);
    parsePlainOrRawLatex(plain, segments);
  }

  return segments;
}

/**
 * Checks if a plain text chunk contains un-delimited LaTeX mathematical expressions
 * (e.g., \frac{1}{2}, \int_0^1, \sum_{i=1}^n, \sqrt{x}, \alpha, \beta, \theta, etc.)
 */
function parsePlainOrRawLatex(plainText: string, segments: Segment[]) {
  // Common LaTeX commands regex
  const rawLatexRegex = /(\\(?:frac|sqrt|sum|int|lim|prod|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|rho|sigma|tau|phi|psi|omega|Gamma|Delta|Theta|Lambda|Sigma|Phi|Psi|Omega|cdot|times|div|pm|mp|leq|geq|neq|approx|infty|partial|nabla|vec|hat|bar|tilde|mathbf|mathrm|mathcal|mathbb|begin|end)[\{A-Za-z0-9_\^\+\-\*\/\=\s\\,\.\[\]\(\)]+)/g;

  if (/\\(frac|sqrt|sum|int|lim|alpha|beta|theta|pi|sigma|infty|partial|vec|begin)/.test(plainText)) {
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = rawLatexRegex.exec(plainText)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', value: plainText.substring(lastIndex, match.index) });
      }
      segments.push({ type: 'math-inline', value: match[0].trim() });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < plainText.length) {
      segments.push({ type: 'text', value: plainText.substring(lastIndex) });
    }
  } else {
    segments.push({ type: 'text', value: plainText });
  }
}

export default function MathText({ content, className = '', inline = false }: MathTextProps) {
  const segments = useMemo(() => {
    if (!content) return [];
    return parseMathSegments(content);
  }, [content]);

  if (!content) return null;

  const Component = inline ? 'span' : 'div';

  return (
    <Component className={`inline-math-container ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <span key={idx}>{seg.value}</span>;
        }

        const isBlock = seg.type === 'math-block' && !inline;

        try {
          const html = katex.renderToString(seg.value, {
            displayMode: isBlock,
            throwOnError: false,
            output: 'htmlAndMathml',
          });

          if (isBlock) {
            return (
              <div
                key={idx}
                className="my-3 py-2 px-3 overflow-x-auto bg-slate-100/70 dark:bg-slate-900/70 rounded-xl text-center border border-slate-200/50 dark:border-slate-800/50"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }

          return (
            <span
              key={idx}
              className="inline-block px-1 py-0.5 align-baseline"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (err) {
          return (
            <code key={idx} className="font-mono text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1 py-0.5 rounded">
              {seg.value}
            </code>
          );
        }
      })}
    </Component>
  );
}
