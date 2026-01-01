'use client';

import { cn } from '@/lib/utils';
import type { DocumentStructure } from '@/lib/types';

interface WordPreviewProps {
  documentStructure: DocumentStructure;
}

export function WordPreview({ documentStructure }: WordPreviewProps) {
  const { title, elements, pages } = documentStructure;

  // Count different element types
  const headings = elements.filter((e) => e.type === 'heading' || e.type === 'subheading').length;
  const paragraphs = elements.filter((e) => e.type === 'paragraph').length;
  const bullets = elements.filter((e) => e.type === 'bullet' || e.type === 'numbered').length;

  // Get preview elements (first few meaningful ones)
  const previewElements = elements
    .filter((e) => e.content.trim() && e.type !== 'whitespace')
    .slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Success Header */}
      <div className="flex items-center gap-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white">
          <span className="material-icons-round text-2xl">check</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white">Document Ready</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {elements.length} elements extracted • {pages || 1} page{(pages || 1) > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Document Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{headings}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Headings</div>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 text-center">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{paragraphs}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Paragraphs</div>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 text-center">
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{bullets}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">List Items</div>
        </div>
      </div>

      {/* Document Preview */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 max-h-64 overflow-y-auto">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wide">
          Preview
        </p>
        <div className="space-y-2">
          {title && (
            <div className="font-bold text-lg text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-800">
              {title}
            </div>
          )}
          {previewElements.map((element, index) => (
            <div
              key={index}
              className={cn(
                'text-sm',
                element.type === 'heading' && 'font-bold text-gray-900 dark:text-white text-base',
                element.type === 'subheading' && 'font-semibold text-gray-800 dark:text-gray-200',
                element.type === 'paragraph' && 'text-gray-600 dark:text-gray-400',
                element.type === 'bullet' && 'text-gray-600 dark:text-gray-400 pl-4 before:content-["•"] before:mr-2 before:text-blue-500',
                element.type === 'numbered' && 'text-gray-600 dark:text-gray-400 pl-4'
              )}
              style={{
                paddingLeft: element.indent ? `${element.indent * 16}px` : undefined,
              }}
            >
              {element.content.length > 100 ? `${element.content.slice(0, 100)}...` : element.content}
            </div>
          ))}
          {elements.length > previewElements.length && (
            <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
              ... and {elements.length - previewElements.length} more elements
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
