import 'server-only';

/**
 * Business-rule violations that are well-formed requests failing a domain
 * precondition (docs/prd.md FR-018/FR-019, §17.1). Mapped to HTTP 422 at
 * the API boundary — distinct from Zod 400 (malformed input), AuthzError
 * 401/403/404 (authorization), and ConflictError 409 (identity conflicts).
 */
export class BusinessRuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'BusinessRuleError';
    this.code = code;
  }
}
