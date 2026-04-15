import { useEffect, useState } from 'react';

interface SliderBoxProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  valueLabelDisplay?: any;
  marks?: { value: number; label: string }[];
  icon?: React.ReactNode;
  handleChange: any;
  disabled: boolean;
  restProps?: any;
}

export default function SliderBox({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  marks,
  icon,
  handleChange,
  disabled = false,
  ...restProps
}: SliderBoxProps) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  const commitValue = (event: any) => {
    handleChange(event, Number(draftValue));
  };

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          {icon ? <span className='text-zinc-400'>{icon}</span> : null}
          <label
            htmlFor={label}
            id={`${label}Label`}
            className='text-xs font-black uppercase tracking-[0.18em] text-zinc-400'
          >
            {label}
          </label>
        </div>
        <span className='min-w-10 text-right text-sm font-black text-yellow-300'>
          {draftValue}
        </span>
      </div>
      <input
        name={label}
        id={label}
        aria-labelledby={`${label}Label`}
        type='range'
        step={step}
        min={min}
        max={max}
        value={draftValue}
        disabled={disabled}
        onChange={(event) => setDraftValue(Number(event.target.value))}
        onMouseUp={commitValue}
        onTouchEnd={commitValue}
        onKeyUp={commitValue}
        onBlur={commitValue}
        className='h-2 w-full cursor-pointer appearance-none bg-zinc-800 accent-yellow-300 disabled:cursor-not-allowed disabled:opacity-40'
        {...restProps}
      />
      {marks && (
        <div className='flex justify-between gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500'>
          {marks.map((mark) => (
            <span key={mark.value}>{mark.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
