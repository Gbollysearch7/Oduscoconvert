'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import type { OutputFormat } from '@/lib/types';

interface FileDropzoneProps {
  onFileSelect: (file: File, format: OutputFormat) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileDropzone({ onFileSelect, disabled }: FileDropzoneProps) {
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>('excel');

  const isExcel = selectedFormat === 'excel';
  const isWord = selectedFormat === 'doc';

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0], selectedFormat);
      }
    },
    [onFileSelect, selectedFormat]
  );

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject, fileRejections } =
    useDropzone({
      onDrop,
      accept: { 'application/pdf': ['.pdf'] },
      maxSize: MAX_FILE_SIZE,
      multiple: false,
      disabled,
    });

  const hasError = fileRejections.length > 0;
  const errorMessage = hasError
    ? fileRejections[0].errors[0].code === 'file-too-large'
      ? 'File is too large. Maximum size is 10MB.'
      : 'Please upload a PDF file.'
    : null;

  // Format-specific styling
  const formatConfig = {
    excel: {
      label: 'Excel',
      ext: '.xlsx',
      icon: 'table_chart',
      color: 'green',
      bgLight: 'bg-green-50',
      bgDark: 'dark:bg-green-900/20',
      borderActive: 'border-green-500',
      borderHover: 'hover:border-green-400',
      textColor: 'text-green-700 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      description: 'Best for tables, spreadsheets, and data',
    },
    doc: {
      label: 'Word',
      ext: '.docx',
      icon: 'description',
      color: 'blue',
      bgLight: 'bg-blue-50',
      bgDark: 'dark:bg-blue-900/20',
      borderActive: 'border-blue-500',
      borderHover: 'hover:border-blue-400',
      textColor: 'text-blue-700 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      description: 'Best for documents, reports, and text',
    },
  };

  const activeConfig = formatConfig[selectedFormat];

  return (
    <div className="w-full">
      {/* Format Selection - Large Toggle Cards */}
      <div className="mb-8">
        <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
          Choose your output format:
        </p>
        <div className="grid grid-cols-2 gap-4">
          {/* Excel Option */}
          <button
            type="button"
            onClick={() => setSelectedFormat('excel')}
            className={cn(
              'relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 font-medium',
              isExcel
                ? 'border-green-500 bg-green-50 dark:bg-green-900/30 shadow-lg shadow-green-500/20 scale-[1.02]'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50/50 dark:hover:bg-green-900/10'
            )}
          >
            {isExcel && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                <span className="material-icons-round text-white text-sm">check</span>
              </div>
            )}
            <div className={cn(
              'flex h-14 w-14 items-center justify-center rounded-xl transition-all',
              isExcel
                ? 'bg-green-500 text-white'
                : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            )}>
              <span className="material-icons-round text-2xl">table_chart</span>
            </div>
            <div className="text-center">
              <p className={cn(
                'font-bold text-lg',
                isExcel ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'
              )}>
                Excel
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">.xlsx spreadsheet</p>
            </div>
          </button>

          {/* Word Option */}
          <button
            type="button"
            onClick={() => setSelectedFormat('doc')}
            className={cn(
              'relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 font-medium',
              isWord
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg shadow-blue-500/20 scale-[1.02]'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
            )}
          >
            {isWord && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                <span className="material-icons-round text-white text-sm">check</span>
              </div>
            )}
            <div className={cn(
              'flex h-14 w-14 items-center justify-center rounded-xl transition-all',
              isWord
                ? 'bg-blue-500 text-white'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            )}>
              <span className="material-icons-round text-2xl">description</span>
            </div>
            <div className="text-center">
              <p className={cn(
                'font-bold text-lg',
                isWord ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
              )}>
                Word
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">.docx document</p>
            </div>
          </button>
        </div>

        {/* Selected format indicator */}
        <div className={cn(
          'mt-4 py-2 px-4 rounded-xl text-center text-sm font-medium transition-all duration-300',
          isExcel
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        )}>
          <span className="material-icons-round text-base align-middle mr-1">{activeConfig.icon}</span>
          Converting to {activeConfig.label} ({activeConfig.ext}) - {activeConfig.description}
        </div>
      </div>

      {/* Dropzone - Style changes based on format */}
      <div
        {...getRootProps()}
        className={cn(
          'upload-area relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all duration-300',
          // Drag states
          isDragActive && !isDragReject && isExcel && 'border-green-500 bg-green-50/50 dark:bg-green-900/20 scale-[1.01]',
          isDragActive && !isDragReject && isWord && 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.01]',
          isDragAccept && isExcel && 'border-green-500 bg-green-500/10',
          isDragAccept && isWord && 'border-blue-500 bg-blue-500/10',
          isDragReject && 'border-destructive bg-destructive/5',
          hasError && 'border-destructive',
          disabled && 'cursor-not-allowed opacity-50',
          // Default state - themed by format
          !isDragActive && !hasError && isExcel && 'border-green-200 dark:border-green-800/50 hover:border-green-400 dark:hover:border-green-600 bg-green-50/30 dark:bg-green-900/10',
          !isDragActive && !hasError && isWord && 'border-blue-200 dark:border-blue-800/50 hover:border-blue-400 dark:hover:border-blue-600 bg-blue-50/30 dark:bg-blue-900/10'
        )}
      >
        <input {...getInputProps()} />

        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300',
            isDragAccept && isExcel && 'bg-green-500/20 text-green-600',
            isDragAccept && isWord && 'bg-blue-500/20 text-blue-600',
            isDragReject && 'bg-destructive/10 text-destructive',
            !isDragActive && isExcel && 'bg-green-100 dark:bg-green-900/40 text-green-500 dark:text-green-400',
            !isDragActive && isWord && 'bg-blue-100 dark:bg-blue-900/40 text-blue-500 dark:text-blue-400'
          )}
        >
          {isDragReject ? (
            <span className="material-icons-round text-3xl">error_outline</span>
          ) : isDragActive ? (
            <span className="material-icons-round text-3xl animate-pulse">{activeConfig.icon}</span>
          ) : (
            <span className="material-icons-round text-3xl">cloud_upload</span>
          )}
        </div>

        <div className="mt-4 text-center">
          {isDragReject ? (
            <p className="text-lg font-semibold text-destructive">Invalid file type</p>
          ) : isDragActive ? (
            <p className={cn(
              'text-lg font-semibold',
              isExcel ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
            )}>
              Drop to convert to {activeConfig.label}
            </p>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Drop your PDF here
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                or{' '}
                <span className={cn(
                  'font-medium hover:underline underline-offset-4 cursor-pointer',
                  isExcel ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
                )}>
                  browse files
                </span>
                {' '}to convert to {activeConfig.label}
              </p>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span className="material-icons-round text-base">lock</span>
          <span>Secure & Private</span>
          <span className="mx-2">•</span>
          <span>PDF up to 10MB</span>
        </div>

        {hasError && errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <span className="material-icons-round text-lg">error</span>
            {errorMessage}
          </div>
        )}
      </div>

      {/* Features - themed by format */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span className={cn(
            'material-icons-round text-lg',
            isExcel ? 'text-green-500' : 'text-blue-500'
          )}>check_circle</span>
          <span>{isExcel ? 'Table Detection' : 'Preserves Formatting'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'material-icons-round text-lg',
            isExcel ? 'text-green-500' : 'text-blue-500'
          )}>computer</span>
          <span>Processed Locally</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'material-icons-round text-lg',
            isExcel ? 'text-green-500' : 'text-blue-500'
          )}>auto_awesome</span>
          <span>{isExcel ? 'Color-Coded Sheets' : 'Clean Document'}</span>
        </div>
      </div>
    </div>
  );
}
