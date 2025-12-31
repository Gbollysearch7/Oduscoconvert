'use client';

import { useState, useCallback } from 'react';
import { parsePdf, extractTextByPage, extractDocumentStructure } from '@/lib/pdfParser';
import { extractTables } from '@/lib/tableExtractor';
import { generateExcel, downloadBlob } from '@/lib/excelGenerator';
import { generateDocFromResult, downloadDocBlob } from '@/lib/docGenerator';
import type { ConversionState, ConversionMode, ConversionResult, OutputFormat } from '@/lib/types';

const initialState: ConversionState = {
  status: 'idle',
  progress: 0,
  currentStep: '',
  result: null,
  error: null,
  fileName: null,
  outputFormat: 'excel',
};

export function usePdfConversion() {
  const [state, setState] = useState<ConversionState>(initialState);
  const [arrayBufferCache, setArrayBufferCache] = useState<ArrayBuffer | null>(null);

  const updateProgress = useCallback((progress: number, currentStep: string) => {
    setState((prev) => ({ ...prev, progress, currentStep }));
  }, []);

  const convert = useCallback(
    async (file: File, mode: ConversionMode = 'auto', outputFormat: OutputFormat = 'excel') => {
      setState({
        status: 'reading',
        progress: 0,
        currentStep: 'Reading file...',
        result: null,
        error: null,
        fileName: file.name,
        outputFormat,
      });

      try {
        // Read file as ArrayBuffer
        updateProgress(2, 'Reading file...');
        const arrayBuffer = await file.arrayBuffer();
        setArrayBufferCache(arrayBuffer);

        // Clone ArrayBuffer for each PDF.js operation to avoid detached buffer errors
        // PDF.js can transfer ownership of the buffer, making it unusable for subsequent operations
        const cloneBuffer = (buffer: ArrayBuffer) => buffer.slice(0);

        // Parse PDF
        setState((prev) => ({ ...prev, status: 'parsing' }));
        const textItems = await parsePdf(cloneBuffer(arrayBuffer), updateProgress);

        // Extract document structure for DOC conversion
        let documentStructure = undefined;
        if (outputFormat === 'doc') {
          updateProgress(50, 'Analyzing document structure...');
          documentStructure = await extractDocumentStructure(cloneBuffer(arrayBuffer), updateProgress);
        }

        // Determine extraction mode
        setState((prev) => ({ ...prev, status: 'extracting' }));
        let result: ConversionResult;

        if (mode === 'text') {
          // Force text extraction
          updateProgress(55, 'Extracting text content...');
          const textContent = await extractTextByPage(cloneBuffer(arrayBuffer), updateProgress);
          result = { tables: [], textContent, mode: 'text', documentStructure };
        } else {
          // Try table extraction first
          const tables = extractTables(textItems, updateProgress);

          if (tables.length > 0 || mode === 'tables') {
            result = { tables, textContent: [], mode: 'tables', documentStructure };
          } else {
            // Fallback to text extraction for auto mode
            updateProgress(70, 'No tables found, extracting text...');
            const textContent = await extractTextByPage(cloneBuffer(arrayBuffer), updateProgress);
            result = { tables: [], textContent, mode: 'text', documentStructure };
          }
        }

        // Check if we have any data
        if (result.tables.length === 0 && result.textContent.length === 0) {
          throw new Error('No extractable content found in this PDF');
        }

        setState({
          status: 'complete',
          progress: 100,
          currentStep: 'Conversion complete!',
          result,
          error: null,
          fileName: file.name,
          outputFormat,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        setState({
          status: 'error',
          progress: 0,
          currentStep: '',
          result: null,
          error: message,
          fileName: file.name,
          outputFormat,
        });
      }
    },
    [updateProgress]
  );

  const download = useCallback(async () => {
    if (!state.result || !state.fileName) return;

    const format = state.outputFormat;
    const formatLabel = format === 'excel' ? 'Excel' : 'Word';

    setState((prev) => ({
      ...prev,
      status: 'generating',
      currentStep: `Generating ${formatLabel} file...`,
    }));

    try {
      if (format === 'excel') {
        const blob = generateExcel(state.result, state.fileName, updateProgress);
        downloadBlob(blob, state.fileName);
      } else {
        const blob = await generateDocFromResult(state.result, state.fileName, updateProgress);
        downloadDocBlob(blob, state.fileName);
      }
      setState((prev) => ({ ...prev, status: 'complete', currentStep: 'Download started!' }));
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to generate ${formatLabel} file`;
      setState((prev) => ({ ...prev, status: 'error', error: message }));
    }
  }, [state.result, state.fileName, state.outputFormat, updateProgress]);

  const setOutputFormat = useCallback((format: OutputFormat) => {
    setState((prev) => ({ ...prev, outputFormat: format }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    setArrayBufferCache(null);
  }, []);

  return {
    ...state,
    convert,
    download,
    reset,
    setOutputFormat,
  };
}
