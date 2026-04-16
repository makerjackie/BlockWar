import React, { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export interface TutorialSetupFlowStep {
  id: string;
  label: string;
  title: string;
  copy: string;
  icon: ReactNode;
  detail?: ReactNode;
  note?: ReactNode;
}

interface TutorialSetupFlowProps {
  badge: string;
  title: string;
  progressLabel: string;
  stepIndex: number;
  totalSteps: number;
  step: TutorialSetupFlowStep;
  canGoBack: boolean;
  isLastStep: boolean;
  nextLabel: string;
  backLabel: string;
  startLabel: string;
  startingLabel: string;
  startBusy: boolean;
  startDisabled: boolean;
  onBack: () => void;
  onNext: () => void;
  onStart: () => void;
}

export default function TutorialSetupFlow({
  badge,
  title,
  progressLabel,
  stepIndex,
  totalSteps,
  step,
  canGoBack,
  isLastStep,
  nextLabel,
  backLabel,
  startLabel,
  startingLabel,
  startBusy,
  startDisabled,
  onBack,
  onNext,
  onStart,
}: TutorialSetupFlowProps) {
  const primaryLabel = isLastStep
    ? startBusy
      ? startingLabel
      : startLabel
    : nextLabel;

  return (
    <div className='space-y-4'>
      <div className='border border-yellow-300/30 bg-yellow-300/10 px-4 py-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='bw-page-copy mb-2'>{badge}</p>
            <h2 className='text-2xl font-black text-zinc-50'>{title}</h2>
          </div>
          <p className='text-xs font-black uppercase tracking-[0.16em] text-yellow-300'>
            {progressLabel}
          </p>
        </div>
      </div>

      <div className='border border-zinc-800 bg-zinc-950/60 px-4 py-4'>
        <div className='flex items-start gap-3'>
          <div className='grid size-11 shrink-0 place-items-center border border-yellow-300/30 bg-yellow-300/10 text-yellow-300'>
            {step.icon}
          </div>
          <div className='min-w-0 flex-1'>
            <p className='text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500'>
              {step.label}
            </p>
            <h3 className='mt-1 text-xl font-black text-zinc-50'>
              {step.title}
            </h3>
            <p className='mt-2 text-sm leading-6 text-zinc-300'>{step.copy}</p>
          </div>
        </div>

        {step.detail ? <div className='mt-4'>{step.detail}</div> : null}

        {step.note ? (
          <div className='mt-4 flex items-start gap-2 border border-yellow-300/20 bg-yellow-300/5 px-3 py-3 text-sm leading-6 text-zinc-300'>
            <Sparkles className='mt-0.5 shrink-0 text-yellow-300' size={15} strokeWidth={2.4} />
            <div>{step.note}</div>
          </div>
        ) : null}
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          {Array.from({ length: totalSteps }, (_, index) => (
            <span
              key={index}
              className={`block h-1.5 w-10 ${
                index <= stepIndex ? 'bg-yellow-300' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
        <div className='flex flex-wrap gap-2'>
          {canGoBack ? (
            <button
              type='button'
              className='bw-button bw-button-secondary min-h-10 px-3 text-sm'
              onClick={onBack}
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
              {backLabel}
            </button>
          ) : null}
          <button
            type='button'
            className='bw-button bw-button-primary min-h-10 px-4 text-sm'
            disabled={isLastStep ? startDisabled || startBusy : false}
            onClick={isLastStep ? onStart : onNext}
          >
            {primaryLabel}
            {!isLastStep ? <ChevronRight size={16} strokeWidth={2.5} /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
