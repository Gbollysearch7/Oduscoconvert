'use client';

import { Progress } from '@/components/ui/progress';
import { FileText, Table, FileSpreadsheet, FileText as DocIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConversionStatus, OutputFormat } from '@/lib/types';

interface ConversionProgressProps {
  status: ConversionStatus;
  progress: number;
  currentStep: string;
  fileName: string | null;
  outputFormat?: OutputFormat;
}

const getSteps = (format: OutputFormat) => [
  { key: 'reading', label: 'Reading', icon: FileText },
  { key: 'parsing', label: 'Parsing', icon: FileText },
  { key: 'extracting', label: format === 'excel' ? 'Extracting Tables' : 'Analyzing Structure', icon: Table },
  { key: 'generating', label: format === 'excel' ? 'Creating Excel' : 'Creating Word', icon: format === 'excel' ? FileSpreadsheet : DocIcon },
  { key: 'complete', label: 'Complete', icon: CheckCircle2 },
];

export function ConversionProgress({ status, progress, currentStep, fileName, outputFormat = 'excel' }: ConversionProgressProps) {
  const steps = getSteps(outputFormat);
  const currentStepIndex = steps.findIndex((s) => s.key === status);

  const isExcel = outputFormat === 'excel';
  const themeColor = isExcel ? 'green' : 'blue';

  return (
    <div className="w-full space-y-6">
      {/* Format indicator banner */}
      <div className={cn(
        'py-3 px-4 rounded-xl text-center font-medium',
        isExcel
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      )}>
        <span className="material-icons-round text-base align-middle mr-2">
          {isExcel ? 'table_chart' : 'description'}
        </span>
        Converting to {isExcel ? 'Excel (.xlsx)' : 'Word (.docx)'}
      </div>

      {fileName && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="truncate max-w-[300px]">{fileName}</span>
        </div>
      )}

      <div className="space-y-2">
        <Progress
          value={progress}
          className={cn(
            'h-2',
            isExcel ? '[&>div]:bg-green-500' : '[&>div]:bg-blue-500'
          )}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{currentStep}</span>
          <span>{progress}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = step.key === status;
          const isCompleted = currentStepIndex > index || status === 'complete';

          return (
            <div key={step.key} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-all',
                  isActive && isExcel && 'bg-green-500 text-white',
                  isActive && !isExcel && 'bg-blue-500 text-white',
                  isCompleted && !isActive && isExcel && 'bg-green-500 text-white',
                  isCompleted && !isActive && !isExcel && 'bg-blue-500 text-white',
                  !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                )}
              >
                {isActive && status !== 'complete' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <StepIcon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs text-center max-w-[60px]',
                  isActive && isExcel && 'font-medium text-green-600 dark:text-green-400',
                  isActive && !isExcel && 'font-medium text-blue-600 dark:text-blue-400',
                  isCompleted && !isActive && isExcel && 'text-green-600 dark:text-green-400',
                  isCompleted && !isActive && !isExcel && 'text-blue-600 dark:text-blue-400',
                  !isActive && !isCompleted && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
