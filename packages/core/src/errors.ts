/**
 * Typed errors with stable `code`s. Throw these from packages instead of bare
 * strings so callers can branch on `code` and boundaries can report consistently
 * (see docs/conventions.md → Errors).
 */
export class ResonanceError extends Error {
  readonly code: string;
  override readonly cause?: unknown;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "ResonanceError";
    this.code = code;
    this.cause = options?.cause;
  }
}

/** A capability isn't implemented yet (e.g. a stubbed package — ADR-0006/0007). */
export class NotImplementedError extends ResonanceError {
  constructor(what: string) {
    super("not_implemented", `${what} is not implemented yet.`);
    this.name = "NotImplementedError";
  }
}

/** Input failed validation at a boundary (pairs with Zod parsing). */
export class ValidationError extends ResonanceError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("validation_error", message, options);
    this.name = "ValidationError";
  }
}
