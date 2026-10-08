type EyebrowProps = {
  children: string;
};

/** Small uppercase locator above headings — part of the type hierarchy. */
export function Eyebrow({ children }: EyebrowProps) {
  return (
    <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
      {children}
    </p>
  );
}
