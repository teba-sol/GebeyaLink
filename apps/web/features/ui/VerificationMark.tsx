import type { VerificationStatus } from '@gebeyalink/types';

import type { StatusToken } from './StatusMark';

/**
 * Organization verification mark — shape + label + color, reusing the
 * domain status pill styling. Verification is never color-only.
 */
const TOKENS: Record<VerificationStatus, StatusToken> = {
  pending: 'pending',
  under_review: 'reserved',
  approved: 'available',
  rejected: 'rejected',
  suspended: 'cancelled',
};

const LABELS: Record<VerificationStatus, string> = {
  pending: 'Pending review',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

export function verificationLabel(status: VerificationStatus): string {
  return LABELS[status];
}

export function VerificationMark({ status }: { status: VerificationStatus }) {
  return (
    <span className="status-mark" data-status={TOKENS[status]}>
      <span className="status-mark__swatch" aria-hidden="true" />
      <span>{LABELS[status]}</span>
    </span>
  );
}
