'use client';

import { useState, useCallback } from 'react';
import { parsePdf, extractDocumentStructure } from '@/lib/pdfParser';
import { generateDocFromStructure, downloadDocBlob } from '@/lib/docGenerator';
import type { DocumentStructure } from '@/lib/types';

type WordConversionStatus = 'idle' | 'reading' | 'parsing' | 'generating' | 'complete' | 'error';

interface WordConversionState {
  status: WordConversionStatus;
  progress: number;
  currentStep: string;
  documentStructure: DocumentStructure | null;
  error: string | null;
  fileName: string | null;
}

const initialState: WordConversionState = {
  status: 'idle',
  progress: 0,
  currentStep: '',
  documentStructure: null,
  error: null,
  fileName: null,
};

export function useWordConversion() {
  const [state, setState] = useState<WordConversionState>(initialState);
  const [blobCache, setBlobCache] = useState<Blob | null>(null);

  const updateProgress = useCallback((progress: number, currentStep: string) => {
    setState((prev) => ({ ...prev, progress, currentStep }));
  }, []);

  const convert = useCallback(
    async (file: File) => {
      setState({
        status: 'reading',
        progress: 0,
        currentStep: 'Reading file...',
        documentStructure: null,
        error: null,
        fileName: file.name,
      });

      try {
        // Read file as ArrayBuffer
        updateProgress(5, 'Reading file...');
        const arrayBuffer = await file.arrayBuffer();

        // Clone buffer for PDF.js operations
        const cloneBuffer = (buffer: ArrayBuffer) => buffer.slice(0);

        // Parse PDF to get document structure directly
        setState((prev) => ({ ...prev, status: 'parsing' }));
        updateProgress(15, 'Analyzing document structure...');

        const documentStructure = await extractDocumentStructure(cloneBuffer(arrayBuffer), updateProgress);

        if (!documentStructure || documentStructure.elements.length === 0) {
          throw new Error('No extractable content found in this PDF');
        }

        // Generate Word document immediately
        setState((prev) => ({ ...prev, status: 'generating' }));
        updateProgress(60, 'Creating Word document...');

        const blob = await generateDocFromStructure(documentStructure, file.name, updateProgress);
        setBlobCache(blob);

        setState({
          status: 'complete',
          progress: 100,
          currentStep: 'Conversion complete!',
          documentStructure,
          error: null,
          fileName: file.name,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        setState({
          status: 'error',
          progress: 0,
          currentStep: '',
          documentStructure: null,
          error: message,
          fileName: file.name,
        });
      }
    },
    [updateProgress]
  );

  const download = useCallback(async () => {
    if (!blobCache || !state.fileName) return;

    downloadDocBlob(blobCache, state.fileName);
  }, [blobCache, state.fileName]);

  const reset = useCallback(() => {
    setState(initialState);
    setBlobCache(null);
  }, []);

  return {
    ...state,
    convert,
    download,
    reset,
  };
}
