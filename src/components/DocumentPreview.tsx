'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DocumentStructure, DocumentElement } from '@/lib/types';

interface DocumentPreviewProps {
  documentStructure: DocumentStructure;
  onDownload: () => void;
  onBack: () => void;
}

export function DocumentPreview({ documentStructure, onDownload, onBack }: DocumentPreviewProps) {
  const { title, elements, pages } = documentStructure;
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);

  // Group elements by page
  const elementsByPage = useMemo(() => {
    const grouped: Record<number, DocumentElement[]> = {};
    elements.forEach((element) => {
      const page = element.page || 1;
      if (!grouped[page]) grouped[page] = [];
      grouped[page].push(element);
    });
    return grouped;
  }, [elements]);

  // Get current page elements
  const currentPageElements = elementsByPage[currentPage] || [];

  // Stats
  const stats = useMemo(() => {
    const headings = elements.filter((e) => e.type === 'heading' || e.type === 'subheading' || e.type === 'title').length;
    const paragraphs = elements.filter((e) => e.type === 'paragraph').length;
    const bullets = elements.filter((e) => e.type === 'bullet' || e.type === 'numbered').length;
    const tables = elements.filter((e) => e.type === 'table').length;
    const images = elements.filter((e) => e.type === 'image').length;
    return { headings, paragraphs, bullets, tables, images };
  }, [elements]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 50));
  const handleResetZoom = () => setZoom(100);

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Top Toolbar */}
      <div className="flex-shrink-0 bg-white dark:bg-[#1e293b] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          {/* Left: Back button and title */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <span className="material-icons-round text-xl">arrow_back</span>
              Back
            </Button>
            <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="material-icons-round text-blue-500 text-xl">description</span>
              <span className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                {title || 'Document Preview'}
              </span>
            </div>
          </div>

          {/* Center: Page navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <span className="material-icons-round text-lg">chevron_left</span>
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-300 min-w-[80px] text-center">
              Page {currentPage} of {pages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.min(pages || 1, p + 1))}
              disabled={currentPage >= (pages || 1)}
            >
              <span className="material-icons-round text-lg">chevron_right</span>
            </Button>
          </div>

          {/* Right: Zoom and download */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
              >
                <span className="material-icons-round text-lg">remove</span>
              </Button>
              <button
                onClick={handleResetZoom}
                className="text-xs text-gray-600 dark:text-gray-300 min-w-[50px] hover:text-gray-900 dark:hover:text-white"
              >
                {zoom}%
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
              >
                <span className="material-icons-round text-lg">add</span>
              </Button>
            </div>
            <Button
              onClick={onDownload}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <span className="material-icons-round text-lg">download</span>
              <span className="hidden sm:inline">Download .docx</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Document Stats */}
        <div className="hidden lg:flex flex-col w-64 bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Document Structure</h3>

          <div className="space-y-3">
            <StatItem icon="title" label="Headings" count={stats.headings} color="blue" />
            <StatItem icon="notes" label="Paragraphs" count={stats.paragraphs} color="indigo" />
            <StatItem icon="format_list_bulleted" label="List Items" count={stats.bullets} color="sky" />
            <StatItem icon="table_chart" label="Tables" count={stats.tables} color="emerald" />
            <StatItem icon="image" label="Images" count={stats.images} color="purple" />
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick Navigation</h3>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {elements
                .filter((e) => e.type === 'title' || e.type === 'heading')
                .slice(0, 15)
                .map((element, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(element.page || 1)}
                    className={cn(
                      'w-full text-left text-xs py-1.5 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 truncate',
                      element.type === 'title'
                        ? 'font-bold text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400',
                      element.page === currentPage && 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    )}
                  >
                    {element.content.slice(0, 40)}{element.content.length > 40 ? '...' : ''}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Document View */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div
            className="max-w-3xl mx-auto bg-white dark:bg-[#1e293b] rounded-lg shadow-lg min-h-[800px] p-8 md:p-12"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease'
            }}
          >
            {/* Document Title */}
            {title && currentPage === 1 && (
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                {title}
              </h1>
            )}

            {/* Page Elements */}
            <div className="space-y-4">
              {currentPageElements.length === 0 ? (
                <div className="text-center text-gray-400 dark:text-gray-500 py-12">
                  <span className="material-icons-round text-4xl mb-2">article</span>
                  <p>No content on this page</p>
                </div>
              ) : (
                currentPageElements.map((element, index) => (
                  <ElementRenderer key={index} element={element} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Page Thumbnails */}
        <div className="hidden xl:flex flex-col w-48 bg-white dark:bg-[#1e293b] border-l border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Pages</h3>
          <div className="space-y-2 overflow-y-auto">
            {Array.from({ length: pages || 1 }, (_, i) => i + 1).map((pageNum) => {
              const pageElements = elementsByPage[pageNum] || [];
              const hasContent = pageElements.length > 0;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    'w-full aspect-[3/4] rounded-lg border-2 flex flex-col items-center justify-center text-xs transition-all',
                    currentPage === pageNum
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <span className={cn(
                    'text-lg font-semibold',
                    currentPage === pageNum ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                  )}>
                    {pageNum}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 mt-1">
                    {hasContent ? `${pageElements.length} items` : 'Empty'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat item component
function StatItem({ icon, label, count, color }: { icon: string; label: string; count: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30',
    sky: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorClasses[color])}>
        <span className="material-icons-round text-sm">{icon}</span>
      </div>
      <div className="flex-1">
        <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
      </div>
      <div className="text-sm font-semibold text-gray-900 dark:text-white">{count}</div>
    </div>
  );
}

// Element renderer component
function ElementRenderer({ element }: { element: DocumentElement }) {
  const baseTextStyle = cn(
    element.isBold && 'font-bold',
    element.isItalic && 'italic',
    element.isUnderline && 'underline',
    element.alignment === 'center' && 'text-center',
    element.alignment === 'right' && 'text-right',
    element.alignment === 'justify' && 'text-justify'
  );

  switch (element.type) {
    case 'title':
      return (
        <h1 className={cn('text-2xl font-bold text-gray-900 dark:text-white', baseTextStyle)}>
          {element.content}
        </h1>
      );

    case 'heading':
      return (
        <h2 className={cn('text-xl font-semibold text-gray-800 dark:text-gray-100 mt-6', baseTextStyle)}>
          {element.content}
        </h2>
      );

    case 'subheading':
      return (
        <h3 className={cn('text-lg font-medium text-gray-700 dark:text-gray-200 mt-4', baseTextStyle)}>
          {element.content}
        </h3>
      );

    case 'paragraph':
      return (
        <p
          className={cn('text-gray-600 dark:text-gray-300 leading-relaxed', baseTextStyle)}
          style={{ paddingLeft: element.indent ? `${element.indent * 24}px` : undefined }}
        >
          {element.content}
        </p>
      );

    case 'bullet':
      return (
        <div
          className="flex items-start gap-2"
          style={{ paddingLeft: element.indent ? `${element.indent * 24}px` : undefined }}
        >
          <span className="text-blue-500 mt-1.5">•</span>
          <p className={cn('text-gray-600 dark:text-gray-300 flex-1', baseTextStyle)}>
            {element.content}
          </p>
        </div>
      );

    case 'numbered':
      return (
        <div
          className="flex items-start gap-2"
          style={{ paddingLeft: element.indent ? `${element.indent * 24}px` : undefined }}
        >
          <span className="text-blue-500 font-medium min-w-[20px]">{element.level || 1}.</span>
          <p className={cn('text-gray-600 dark:text-gray-300 flex-1', baseTextStyle)}>
            {element.content}
          </p>
        </div>
      );

    case 'table':
      if (!element.tableData?.rows?.length) return null;
      return (
        <div className="my-4 overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
            <tbody>
              {element.tableData.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    rowIndex === 0 && element.tableData?.hasHeader
                      ? 'bg-blue-50 dark:bg-blue-900/30 font-semibold'
                      : rowIndex % 2 === 0
                        ? 'bg-white dark:bg-gray-800'
                        : 'bg-gray-50 dark:bg-gray-800/50'
                  )}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'image':
      if (!element.imageData?.data) return null;
      return (
        <div className="my-4 flex justify-center">
          <img
            src={`data:image/${element.imageData.type || 'png'};base64,${element.imageData.data}`}
            alt="Extracted from PDF"
            className="max-w-full h-auto rounded-lg shadow-md"
            style={{
              maxHeight: '400px',
              objectFit: 'contain'
            }}
          />
        </div>
      );

    case 'whitespace':
      return <div className="h-4" />;

    default:
      if (element.content?.trim()) {
        return (
          <p className={cn('text-gray-600 dark:text-gray-300', baseTextStyle)}>
            {element.content}
          </p>
        );
      }
      return null;
  }
}
