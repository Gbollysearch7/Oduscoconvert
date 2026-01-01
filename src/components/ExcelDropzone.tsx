'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

interface ExcelDropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ExcelDropzone({ onFileSelect, disabled }: ExcelDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
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
      {/* Header Info */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          <span className="material-icons-round text-xl">table_chart</span>
          <span className="font-semibold">PDF → Excel Spreadsheet</span>
        </div>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Extract tables from your PDF and convert them to Excel spreadsheets
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'upload-area relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all duration-300',
          // Drag states
          isDragActive && !isDragReject && 'border-green-500 bg-green-50/50 dark:bg-green-900/20 scale-[1.01]',
          isDragAccept && 'border-green-500 bg-green-500/10',
          isDragReject && 'border-destructive bg-destructive/5',
          hasError && 'border-destructive',
          disabled && 'cursor-not-allowed opacity-50',
          // Default state
          !isDragActive && !hasError && 'border-green-200 dark:border-green-800/50 hover:border-green-400 dark:hover:border-green-600 bg-green-50/30 dark:bg-green-900/10'
        )}
      >
        <input {...getInputProps()} />

        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300',
            isDragAccept && 'bg-green-500/20 text-green-600',
            isDragReject && 'bg-destructive/10 text-destructive',
            !isDragActive && 'bg-green-100 dark:bg-green-900/40 text-green-500 dark:text-green-400'
          )}
        >
          {isDragReject ? (
            <span className="material-icons-round text-3xl">error_outline</span>
          ) : isDragActive ? (
            <span className="material-icons-round text-3xl animate-pulse">table_chart</span>
          ) : (
            <span className="material-icons-round text-3xl">cloud_upload</span>
          )}
        </div>

        <div className="mt-4 text-center">
          {isDragReject ? (
            <p className="text-lg font-semibold text-destructive">Invalid file type</p>
          ) : isDragActive ? (
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              Drop to convert to Excel
            </p>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Drop your PDF here
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                or{' '}
                <span className="font-medium hover:underline underline-offset-4 cursor-pointer text-green-600 dark:text-green-400">
                  browse files
                </span>
                {' '}to convert to Excel
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
          <span>Table Detection</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-icons-round text-lg text-green-500">computer</span>
          <span>Processed Locally</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-icons-round text-lg text-green-500">auto_awesome</span>
          <span>Color-Coded Sheets</span>
        </div>
      </div>
    </div>
  );
}
