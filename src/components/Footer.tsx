export function Footer() {
  return (
    <footer className="border-t border-border bg-white dark:bg-[#0f172a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-800 dark:bg-white text-white dark:text-gray-800 rounded-full flex items-center justify-center font-bold text-xs">
            O
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} Odusco Convert. All rights reserved.
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <span className="hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors">
            Free &amp; Private
          </span>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <span className="hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors">
            No data uploaded to servers
          </span>
        </div>
      </div>
    </footer>
  );
}
