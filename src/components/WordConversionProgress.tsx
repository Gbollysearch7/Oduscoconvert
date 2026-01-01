'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface WordConversionProgressProps {
  status: string;
  progress: number;
  currentStep: string;
  fileName: string | null;
}

const STEPS = [
  { key: 'reading', label: 'Reading PDF', icon: 'upload_file' },
  { key: 'parsing', label: 'Analyzing Structure', icon: 'text_format' },
  { key: 'generating', label: 'Creating Word Document', icon: 'description' },
];

export function WordConversionProgress({
  status,
  progress,
  currentStep,
  fileName,
}: WordConversionProgressProps) {
  const currentStepIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="space-y-6 py-4">
      {/* File Info */}
      <div className="flex items-center gap-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
          <span className="material-icons-round text-2xl">picture_as_pdf</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">{fileName}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Converting to Word document...</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-300">{currentStep}</span>
          <span className="font-medium text-blue-600 dark:text-blue-400">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 bg-blue-100 dark:bg-blue-900/30" />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((step, index) => {
          const isActive = step.key === status;
          const isComplete = currentStepIndex > index;
          const isPending = currentStepIndex < index;

          return (
            <div
              key={step.key}
              className={cn(
                'flex items-center gap-3 rounded-lg p-3 transition-all',
                isActive && 'bg-blue-50 dark:bg-blue-900/20',
                isComplete && 'opacity-60'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                  isComplete && 'bg-blue-500 text-white',
                  isActive && 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
                  isPending && 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                )}
              >
                {isComplete ? (
                  <span className="material-icons-round text-lg">check</span>
                ) : (
                  <span className={cn('material-icons-round text-lg', isActive && 'animate-pulse')}>
                    {step.icon}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'font-medium',
                  isComplete && 'text-gray-500 dark:text-gray-400',
                  isActive && 'text-blue-600 dark:text-blue-400',
                  isPending && 'text-gray-400 dark:text-gray-500'
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
