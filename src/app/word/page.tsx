'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WordDropzone } from '@/components/WordDropzone';
import { WordConversionProgress } from '@/components/WordConversionProgress';
import { WordPreview } from '@/components/WordPreview';
import { DocumentPreview } from '@/components/DocumentPreview';
import { Button } from '@/components/ui/button';
import { useWordConversion } from '@/hooks/useWordConversion';

export default function WordPage() {
  const { status, progress, currentStep, documentStructure, error, fileName, convert, download, reset } =
    useWordConversion();

  const [showPreview, setShowPreview] = useState(false);

  const handleFileSelect = useCallback(
    (file: File) => {
      toast.info(`Converting ${file.name} to Word...`);
      convert(file);
    },
    [convert]
  );

  const handleDownload = useCallback(async () => {
    await download();
    toast.success('Word document download started!');
  }, [download]);

  const handleBackFromPreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  const handleReset = useCallback(() => {
    setShowPreview(false);
    reset();
  }, [reset]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (status === 'complete' && documentStructure) {
      const elementCount = documentStructure.elements.length;
      toast.success(`Document ready - ${elementCount} elements extracted`);
      setShowPreview(true);
    }
  }, [status, documentStructure]);

  const isProcessing = ['reading', 'parsing', 'generating'].includes(status);
  const isComplete = status === 'complete' && documentStructure;

  // Full-screen preview mode
  if (showPreview && isComplete) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <DocumentPreview
          documentStructure={documentStructure}
          onDownload={handleDownload}
          onBack={handleBackFromPreview}
        />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background overflow-hidden">
      {/* Background blur blobs - Blue theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-blob"></div>
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-blob"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-sky-200/20 dark:bg-sky-900/10 rounded-full blur-blob"></div>
      </div>

      <Header />

      <main className="relative flex-1 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-jakarta)' }}>
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">PDF to Word</span>
              <br />
              <span className="text-gray-900 dark:text-white">Document Converter</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Convert PDF documents to editable Word files. Preserves formatting, headings, and text structure.
            </p>

            {/* Switch to Excel */}
            <div className="mt-6">
              <Link href="/">
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <span className="material-icons-round text-xl">table_chart</span>
                  Switch to PDF → Excel
                </Button>
              </Link>
            </div>
          </div>

          {/* Main Converter Card */}
          <div className="mx-auto max-w-2xl">
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl shadow-soft dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 md:p-8">
              {/* Idle State - Show Dropzone */}
              {status === 'idle' && <WordDropzone onFileSelect={handleFileSelect} />}

              {/* Processing State - Show Progress */}
              {isProcessing && (
                <WordConversionProgress
                  status={status}
                  progress={progress}
                  currentStep={currentStep}
                  fileName={fileName}
                />
              )}

              {/* Complete State - Show Preview & Download */}
              {isComplete && (
                <div className="space-y-6">
                  <WordPreview documentStructure={documentStructure} />

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button
                      size="lg"
                      onClick={() => setShowPreview(true)}
                      className="gap-2 rounded-xl px-6 font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <span className="material-icons-round text-xl">visibility</span>
                      View Full Preview
                    </Button>
                    <Button
                      size="lg"
                      onClick={handleDownload}
                      className="gap-2 rounded-xl px-6 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <span className="material-icons-round text-xl">download</span>
                      Download Word (.docx)
                    </Button>
                  </div>

                  <div className="flex justify-center">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleReset}
                      className="gap-2 rounded-xl px-6 font-semibold border-gray-200 dark:border-gray-700"
                    >
                      <span className="material-icons-round text-xl">refresh</span>
                      Convert Another
                    </Button>
                  </div>

                  {/* Format info */}
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="material-icons-round text-base align-middle mr-1">description</span>
                    Your file will be downloaded as Word (.docx)
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
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <span className="material-icons-round text-2xl">format_align_left</span>
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">Preserves Structure</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Headings, paragraphs, and bullet points are preserved in your Word document.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <span className="material-icons-round text-2xl">shield</span>
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">100% Private</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Your files never leave your device. All processing happens locally.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
                  <span className="material-icons-round text-2xl">edit_document</span>
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">Editable Output</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Get a fully editable .docx file you can modify in Microsoft Word or Google Docs.
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
