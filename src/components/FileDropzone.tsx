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

  return (
    <div className="w-full">
      {/* Format Selection */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
          Convert PDF to:
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedFormat('excel')}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-xl border-2 transition-all duration-200 font-medium',
              selectedFormat === 'excel'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-green-300 dark:hover:border-green-700'
            )}
          >
            <span className="material-icons-round text-xl">table_chart</span>
            <span>Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedFormat('doc')}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-xl border-2 transition-all duration-200 font-medium',
              selectedFormat === 'doc'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-700'
            )}
          >
            <span className="material-icons-round text-xl">description</span>
            <span>Word (.docx)</span>
          </button>
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'upload-area relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all duration-300',
          isDragActive && !isDragReject && 'border-accent bg-accent/5 scale-[1.01]',
          isDragAccept && 'border-green-500 bg-green-500/5',
          isDragReject && 'border-destructive bg-destructive/5',
          hasError && 'border-destructive',
          disabled && 'cursor-not-allowed opacity-50',
          !isDragActive && !hasError && 'border-gray-200 dark:border-gray-700 hover:border-accent/50'
        )}
      >
        <input {...getInputProps()} />

        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300',
            isDragAccept && 'bg-green-500/10 text-green-500',
            isDragReject && 'bg-destructive/10 text-destructive',
            !isDragActive && 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
          )}
        >
          {isDragReject ? (
            <span className="material-icons-round text-3xl">error_outline</span>
          ) : isDragActive ? (
            <span className="material-icons-round text-3xl animate-pulse">description</span>
          ) : (
            <span className="material-icons-round text-3xl">cloud_upload</span>
          )}
        </div>

        <div className="mt-4 text-center">
          {isDragReject ? (
            <p className="text-lg font-semibold text-destructive">Invalid file type</p>
          ) : isDragActive ? (
            <p className="text-lg font-semibold text-accent">Drop your PDF here</p>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Drag & drop your PDF here
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                or{' '}
                <span className="text-accent font-medium hover:underline underline-offset-4 cursor-pointer">
                  browse files
                </span>
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

      {/* Features */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span className="material-icons-round text-lg text-green-500">check_circle</span>
          <span>Preserves Formatting</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-icons-round text-lg text-blue-500">computer</span>
          <span>Processed Locally</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-icons-round text-lg text-purple-500">auto_awesome</span>
          <span>Clean Output</span>
        </div>
      </div>
    </div>
  );
}
