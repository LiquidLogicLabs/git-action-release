/**
 * Narrow an unknown error (from a catch clause) to a user-facing message.
 * Used when we want to log or include the error in a user-facing string
 * without casting to `any` and without asserting its type.
 */
export declare function errorMessage(error: unknown): string;
//# sourceMappingURL=errors.d.ts.map