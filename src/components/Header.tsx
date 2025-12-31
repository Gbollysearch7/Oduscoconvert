'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Header() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  return (
    <header className="w-full border-b border-border bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-20 relative">
          {/* Centered App Name */}
          <div className="flex items-center gap-4">
            <div className="bg-[#111827] dark:bg-white text-white dark:text-[#111827] p-2.5 rounded-xl flex items-center justify-center shadow-lg">
              <span className="material-icons-round text-3xl">description</span>
            </div>
            <div className="flex flex-col items-center">
              <span
                className="font-black text-3xl sm:text-4xl leading-tight tracking-tight text-gray-900 dark:text-white"
                style={{ fontFamily: 'var(--font-jakarta)' }}
              >
                Odusco Convert
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                PDF to Excel Converter
              </span>
            </div>
          </div>

          {/* Theme Toggle - Absolute positioned to the right */}
          <div className="absolute right-0 flex items-center">
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className="p-2.5 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            >
              {isDark ? (
                <Sun className="h-6 w-6" />
              ) : (
                <Moon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
