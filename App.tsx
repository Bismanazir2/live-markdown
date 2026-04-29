/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { 
  Moon, 
  Sun, 
  Copy, 
  Download, 
  Trash2, 
  Layout, 
  Sidebar, 
  RotateCcw,
  Check,
  Languages,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Marked with highlight extension
const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

// Allow gfm and breaks
marked.setOptions({
  gfm: true,
  breaks: true,
});

const DEFAULT_MARKDOWN = `# Welcome to Live Markdown Engine! 🚀

This is a real-time Markdown editor built with React, Tailwind, and Marked.js.

## What you can do here:

1. **Write content** on the left, see it rendered on the right.
2. **Syntax Highlighting** for code blocks:
\`\`\`javascript
function helloWorld() {
  console.log("Hello, Markdown!");
}
\`\`\`
3. **Typography Support**:
   - *Italics*, **Bold**, and ~~Strikethrough~~
   - [Links to documentation](https://marked.js.org/)
   - Images: ![Placeholder](https://picsum.photos/seed/markdown/400/200)

4. **Lists**:
   - First item
   - Second item
     - Sub-item
   - Third item

> "Markdown is a text-to-HTML conversion tool for web writers." - John Gruber

Enjoy writing! ✍️
`;

export default function App() {
  const [markdown, setMarkdown] = useState(() => {
    const saved = localStorage.getItem('markdown-engine-content');
    return saved || DEFAULT_MARKDOWN;
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('markdown-engine-theme');
    return saved === 'dark';
  });
  const [splitPosition, setSplitPosition] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('markdown-engine-content', markdown);
  }, [markdown]);

  useEffect(() => {
    localStorage.setItem('markdown-engine-theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle resizing
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing || !containerRef.current) return;
    
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const offsetLeft = containerRef.current.getBoundingClientRect().left;
    const width = containerRef.current.offsetWidth;
    const newPosition = ((clientX - offsetLeft) / width) * 100;
    
    if (newPosition > 15 && newPosition < 85) {
      setSplitPosition(newPosition);
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    window.addEventListener('touchmove', resize);
    window.addEventListener('touchend', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('touchmove', resize);
      window.removeEventListener('touchend', stopResizing);
    };
  }, [resize, stopResizing]);

  // Scroll Sync (Editor -> Preview)
  const handleEditorScroll = () => {
    if (editorRef.current && previewRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = editorRef.current;
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
      previewRef.current.scrollTop = scrollPercentage * (previewRef.current.scrollHeight - previewRef.current.clientHeight);
    }
  };

  // Memoized HTML rendering
  const renderedHtml = useMemo(() => {
    try {
      const rawHtml = marked.parse(markdown) as string;
      return DOMPurify.sanitize(rawHtml);
    } catch (e) {
      return '<p class="text-red-500">Error parsing markdown</p>';
    }
  }, [markdown]);

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(renderedHtml);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const downloadHtml = () => {
    const blob = new Blob([`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Exported Markdown</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css">
          <style>
            body { background: #fff; }
            .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 800px; margin: 0 auto; padding: 45px; }
            @media (max-width: 767px) { .markdown-body { padding: 15px; } }
          </style>
        </head>
        <body class="markdown-body">
          ${renderedHtml}
        </body>
      </html>
    `], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'markdown-export.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearEditor = () => {
    if (window.confirm('Are you sure you want to clear the editor?')) {
      setMarkdown('');
    }
  };

  const resetTemplate = () => {
    setMarkdown(DEFAULT_MARKDOWN);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300 text-slate-900 dark:text-slate-100">
      {/* Header / Toolbar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-30 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-4">
          <motion.div 
            initial={{ rotate: -20, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <Languages size={22} />
          </motion.div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              Markdown<span className="text-indigo-600">Engine</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest -mt-1">Creative Suite</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl transition-colors">
            <button 
              onClick={() => setIsDarkMode(false)}
              className={`p-1.5 rounded-lg transition-all ${!isDarkMode ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
              title="Light Mode"
            >
              <Sun size={18} />
            </button>
            <button 
              onClick={() => setIsDarkMode(true)}
              className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 shadow-sm text-indigo-400' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
              title="Dark Mode"
            >
              <Moon size={18} />
            </button>
          </div>
          
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block"></div>

          <div className="flex items-center gap-1">
            <button 
              onClick={resetTemplate}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/30 rounded-xl transition-all hidden md:flex"
              title="Reset Template"
            >
              <RotateCcw size={20} />
            </button>

            <button 
              onClick={clearEditor}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 rounded-xl transition-all"
              title="Clear Editor"
            >
              <Trash2 size={20} />
            </button>
          </div>

          <button 
            onClick={copyHtml}
            className={`p-2.5 transition-all rounded-xl flex items-center justify-center border ${copySuccess ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' : 'text-slate-600 border-transparent hover:border-slate-200 hover:bg-slate-100 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800'}`}
            title="Copy Rendered HTML"
          >
            {copySuccess ? <Check size={20} /> : <Copy size={20} />}
          </button>

          <button 
            onClick={downloadHtml}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all text-sm font-bold shadow-md shadow-indigo-200 dark:shadow-none active:scale-95 group"
          >
            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button 
            onClick={() => setShowMobilePreview(!showMobilePreview)}
            className={`p-2.5 transition-all rounded-xl sm:hidden border ${showMobilePreview ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800' : 'text-slate-600 border-transparent dark:text-slate-400'}`}
          >
            {showMobilePreview ? <Layout size={20} /> : <Sidebar size={20} />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main ref={containerRef} className="relative flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <motion.div 
          animate={{ width: showMobilePreview ? 0 : (window.innerWidth < 640 ? '100%' : `${splitPosition}%`) }}
          className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl"
        >
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex justify-between items-center shrink-0">
            <span className="flex items-center gap-2 italic">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              Source Content
            </span>
            <span className="font-mono text-xs opacity-60">{markdown.length} chars</span>
          </div>
          <textarea
            ref={editorRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            onScroll={handleEditorScroll}
            spellCheck="false"
            placeholder="Start writing something beautiful..."
            className="flex-1 w-full p-6 sm:p-10 bg-transparent outline-none resize-none font-mono text-base leading-relaxed text-slate-600 dark:text-slate-300 overflow-y-auto selection:bg-indigo-100 dark:selection:bg-indigo-900/40 custom-scrollbar"
          />
        </motion.div>

        {/* Resizer Divider */}
        <div 
          onMouseDown={startResizing}
          onTouchStart={startResizing}
          className="hidden sm:flex group absolute top-0 bottom-0 z-40 cursor-col-resize items-center justify-center w-3 hover:w-8 transition-all"
          style={{ left: `calc(${splitPosition}% - 6px)` }}
        >
          <div className={`w-0.5 h-full bg-slate-200 dark:bg-slate-800 group-hover:bg-indigo-400 transition-colors ${isResizing ? 'bg-indigo-500 w-1' : ''}`} />
          <div className={`absolute top-1/2 -translate-y-1/2 w-8 h-12 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all ${isResizing ? 'scale-110 opacity-100 rotate-90 border-indigo-500' : ''}`}>
            <div className="flex gap-1">
              <div className="w-1 h-4 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
              <div className="w-1 h-4 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <motion.div 
          animate={{ width: showMobilePreview || window.innerWidth >= 640 ? (window.innerWidth < 640 ? '100%' : `${100 - splitPosition}%`) : 0 }}
          className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 overflow-hidden"
        >
          <div className="px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex justify-between items-center shrink-0">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Visual Render
            </span>
            <div className="flex gap-2">
              <span className="hidden sm:inline italic opacity-60">Ready to Publish</span>
            </div>
          </div>
          <div 
            ref={previewRef}
            className="flex-1 w-full p-6 sm:p-10 md:p-16 lg:p-24 overflow-y-auto scroll-smooth custom-scrollbar bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:32px_32px]"
          >
            <AnimatePresence mode="wait">
              <motion.div 
                key={markdown.length === 0 ? 'empty' : 'content'}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-4xl mx-auto markdown-body pb-32 bg-white px-8 sm:px-12 md:px-20 py-12 sm:py-16 md:py-24 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-2xl border border-slate-200"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] text-slate-400 flex justify-between items-center select-none uppercase tracking-widest font-bold">
        <div className="flex gap-6">
          <div className="flex items-center gap-1.5 text-indigo-500">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
            <span>Indigo Core Engine</span>
          </div>
          <span className="hidden sm:inline">UTF-8 Encoding</span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
          <span className="hidden sm:inline">GFM v3.0</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
          <span className="text-slate-500">Workspace Persistent</span>
        </div>
      </footer>

      {/* Global Resize Guard */}
      {isResizing && (
        <div className="fixed inset-0 z-[100] cursor-col-resize select-none" />
      )}
    </div>
  );
}
