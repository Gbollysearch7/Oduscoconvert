'use client';

import { Progress } from '@/components/ui/progress';
import { FileText, Table, FileSpreadsheet, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConversionStatus } from '@/lib/types';

interface ConversionProgressProps {
  status: ConversionStatus;
  progress: number;
  currentStep: string;
  fileName: string | null;
}

const steps = [
  { key: 'reading', label: 'Reading', icon: FileText },
  { key: 'parsing', label: 'Parsing', icon: FileText },
  { key: 'extracting', label: 'Extracting', icon: Table },
  { key: 'generating', label: 'Generating', icon: FileSpreadsheet },
  { key: 'complete', label: 'Complete', icon: CheckCircle2 },
];

export function ConversionProgress({ status, progress, currentStep, fileName }: ConversionProgressProps) {
  const currentStepIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="w-full space-y-6">
      {fileName && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="truncate max-w-[300px]">{fileName}</span>
        </div>
      )}

      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
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
                  isActive && 'bg-primary text-primary-foreground',
                  isCompleted && !isActive && 'bg-green-500 text-white',
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
                  'text-xs',
                  isActive && 'font-medium text-primary',
                  isCompleted && !isActive && 'text-green-600',
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
