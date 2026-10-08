import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  children: ReactNode;
};

/** Filter chip for marketplace faceting. */
export function Chip({
  selected = false,
  className = '',
  children,
  type = 'button',
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`chip inline-flex h-8 items-center gap-1.5 border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        selected
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line-strong bg-surface text-ink-soft hover:border-ink-faint hover:text-ink'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
