"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMessage = errorMessage;
/**
 * Narrow an unknown error (from a catch clause) to a user-facing message.
 * Used when we want to log or include the error in a user-facing string
 * without casting to `any` and without asserting its type.
 */
function errorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
//# sourceMappingURL=errors.js.map