import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'touch';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-white border border-accent hover:opacity-90 active:opacity-80',
  secondary:
    'bg-surface text-ink border border-line-strong hover:bg-surface-2 active:bg-surface-2',
  ghost:
    'bg-transparent text-ink-soft border border-transparent hover:text-ink hover:bg-surface-2',
  danger:
    'bg-danger-soft text-danger border border-danger/40 hover:bg-danger hover:text-white hover:border-danger',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  touch: 'min-h-14 px-7 text-base',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-btn font-medium whitespace-nowrap transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
