import { Fragment } from 'react';
import { Check } from 'lucide-react';

export interface IntakeStepDef {
  number: number;
  label: string;
}

interface IntakeStepperProps {
  currentStep: number;
  steps: IntakeStepDef[];
}

function segmentComplete(currentStep: number, stepNumber: number) {
  return currentStep > stepNumber;
}

/**
 * Sloupec kroku: items-stretch + širší než samotný kruh → delší názvy se lámají a zůstávají pod středem kruhu.
 * !text-center vyloučí přepsání z rodiče; dir="ltr" kvůli konzistentnímu zarovnání textu.
 */
const STEP_COL =
  'flex w-11 shrink-0 flex-col items-stretch sm:w-12';
const CIRCLE_ROW = 'flex h-10 w-full shrink-0 items-center justify-center';
const GAP = 'px-1.5 sm:px-2.5';

export function IntakeStepper({ currentStep, steps }: IntakeStepperProps) {
  return (
    <div className="w-full py-4 sm:py-6" dir="ltr" lang="cs">
      <div className="flex w-full min-w-0 items-start">
        {steps.map((step, i) => (
          <Fragment key={step.number}>
            <div className={STEP_COL}>
              <div className={CIRCLE_ROW}>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors sm:h-10 sm:w-10 ${
                    currentStep > step.number
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : currentStep === step.number
                        ? 'border-blue-600 bg-white text-blue-600 dark:bg-gray-900'
                        : 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-500'
                  }`}
                >
                  {currentStep > step.number ? (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.number}</span>
                  )}
                </div>
              </div>
              <div
                className={`mt-1.5 block w-full min-w-0 !text-center text-balance text-[10px] leading-tight sm:text-xs ${
                  currentStep >= step.number
                    ? 'font-medium text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex h-10 min-w-0 flex-1 shrink-0 items-center self-start ${GAP}`}
                aria-hidden
              >
                <div
                  className={`h-0.5 w-full rounded-full transition-colors ${
                    segmentComplete(currentStep, step.number)
                      ? 'bg-blue-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
