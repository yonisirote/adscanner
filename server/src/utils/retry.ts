/**
 * Wait for a specified duration
 */
export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

interface RetryOptions {
    retries?: number;
    initialDelayMs?: number;
    factor?: number;
    shouldRetry?: (error: any) => boolean;
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        retries = 3,
        initialDelayMs = 1000,
        factor = 2,
        shouldRetry = () => true,
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt === retries || !shouldRetry(error)) {
                throw error;
            }

            const delayMs = initialDelayMs * Math.pow(factor, attempt);
            console.log(`[Retry] Attempt ${attempt + 1} failed. Retrying in ${delayMs}ms...`);
            await delay(delayMs);
        }
    }

    throw lastError;
}
