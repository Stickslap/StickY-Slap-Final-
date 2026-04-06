export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Handle specific known errors
    if (error.message.includes('permission-denied')) {
      return 'You do not have permission to perform this action.';
    }
    if (error.message.includes('network-error')) {
      return 'A network error occurred. Please check your connection and try again.';
    }
    return error.message;
  }
  return 'An unexpected error occurred. Please try again later.';
}

export function logError(error: unknown, context: string) {
  console.error(`[${context}] Error:`, error);
  // In a real app, you'd send this to an error tracking service like Sentry
}
