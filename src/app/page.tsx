'use client';

import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FileDropzone } from '@/components/FileDropzone';
import { ConversionProgress } from '@/components/ConversionProgress';
import { TablePreview } from '@/components/TablePreview';
import { Button } from '@/components/ui/button';
import { usePdfConversion } from '@/hooks/usePdfConversion';
import type { OutputFormat } from '@/lib/types';

export default function Home() {
  const { status, progress, currentStep, result, error, fileName, outputFormat, convert, download, reset } =
    usePdfConversion();

  const handleFileSelect = useCallback(
    (file: File, format: OutputFormat) => {
      const formatLabel = format === 'excel' ? 'Excel' : 'Word';
      toast.info(`Converting ${file.name} to ${formatLabel}...`);
      convert(file, 'auto', format);
    },
    [convert]
  );

  const handleDownload = useCallback(async () => {
    const formatLabel = outputFormat === 'excel' ? 'Excel' : 'Word';
    await download();
    toast.success(`${formatLabel} download started!`);
  }, [download, outputFormat]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (status === 'complete' && result) {
      const tableCount = result.tables.length;
      const message =
        result.mode === 'tables'
          ? `Found ${tableCount} table${tableCount !== 1 ? 's' : ''} - Ready to download`
          : 'Content extracted - Ready to download';
      toast.success(message);
    }
  }, [status, result]);

  const isProcessing = ['reading', 'parsing', 'extracting', 'generating'].includes(status);
  const isComplete = status === 'complete' && result;

  const formatLabel = outputFormat === 'excel' ? 'Excel' : 'Word';
  const formatIcon = outputFormat === 'excel' ? 'table_chart' : 'description';
  const formatExt = outputFormat === 'excel' ? '.xlsx' : '.docx';

  return (
    <div className="relative flex min-h-screen flex-col bg-background overflow-hidden">
      {/* Background blur blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-blob"></div>
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-blob"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-blob"></div>
      </div>

      <Header />

      <main className="relative flex-1 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-jakarta)' }}>
              <span className="gradient-text">Transform PDFs</span>
              <br />
              <span className="text-gray-900 dark:text-white">into Excel or Word</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Extract tables, preserve formatting, and convert PDF documents instantly.
              Fast, free, and 100% private - everything runs in your browser.
            </p>
          </div>

          {/* Main Converter Card */}
          <div className="mx-auto max-w-2xl">
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl shadow-soft dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 md:p-8">
              {/* Idle State - Show Dropzone */}
              {status === 'idle' && <FileDropzone onFileSelect={handleFileSelect} />}

              {/* Processing State - Show Progress */}
              {isProcessing && (
                <ConversionProgress
                  status={status}
                  progress={progress}
                  currentStep={currentStep}
                  fileName={fileName}
                />
              )}

              {/* Complete State - Show Preview & Download */}
              {isComplete && (
                <div className="space-y-6">
                  <TablePreview result={result} />

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button
                      size="lg"
                      onClick={handleDownload}
                      className={`gap-2 rounded-xl px-6 font-semibold ${
                        outputFormat === 'excel'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <span className="material-icons-round text-xl">download</span>
                      Download {formatLabel} ({formatExt})
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={reset}
                      className="gap-2 rounded-xl px-6 font-semibold border-gray-200 dark:border-gray-700"
                    >
                      <span className="material-icons-round text-xl">refresh</span>
                      Convert Another
                    </Button>
                  </div>

                  {/* Format info */}
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="material-icons-round text-base align-middle mr-1">{formatIcon}</span>
                    Your file will be downloaded as {formatLabel} ({formatExt})
                  </div>
                </div>
              )}

              {/* Error State - Show Error & Reset */}
              {status === 'error' && (
                <div className="text-center space-y-4 py-8">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500">
                    <span className="material-icons-round text-4xl">error_outline</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Conversion Failed</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
                  </div>
                  <Button
                    onClick={reset}
                    variant="outline"
                    className="gap-2 rounded-xl border-gray-200 dark:border-gray-700"
                  >
                    <span className="material-icons-round">refresh</span>
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Features Section */}
          <div className="mx-auto mt-20 max-w-4xl">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center p-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <span className="material-icons-round text-2xl">format_align_left</span>
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">Preserves Formatting</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Headers, bullet points, and text alignment are preserved in your output.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <span className="material-icons-round text-2xl">shield</span>
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">100% Private</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Your files never leave your device. All processing happens locally.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  <span className="material-icons-round text-2xl">auto_awesome</span>
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">Clean Output</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Professional formatting with proper spacing, fonts, and color coding.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
