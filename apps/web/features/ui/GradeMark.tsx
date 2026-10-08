type GradeMarkProps = {
  grade: 'A' | 'B' | 'C' | 'REJECTED';
  size?: 'sm' | 'md';
};

const TONE: Record<GradeMarkProps['grade'], string> = {
  A: 'border-st-available text-st-available',
  B: 'border-st-committed text-st-committed',
  C: 'border-st-reserved text-st-reserved',
  REJECTED: 'border-st-rejected text-st-rejected',
};

/** Quality grade as a form (A/B/C), not just a colored word. */
export function GradeMark({ grade, size = 'md' }: GradeMarkProps) {
  const dims = size === 'sm' ? 'size-5 text-[0.625rem]' : 'size-7 text-xs';
  return (
    <span
      className={`inline-flex items-center justify-center border font-mono font-bold ${dims} ${TONE[grade]}`}
      title={`Grade ${grade}`}
    >
      {grade === 'REJECTED' ? '×' : grade}
    </span>
  );
}
