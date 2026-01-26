/**
 * Result type for operations that can fail
 *
 * This type provides a standardized way to handle errors across the codebase,
 * making error handling explicit and type-safe.
 *
 * @example
 * ```typescript
 * async function fetchUser(id: number): Promise<Result<User>> {
 *   try {
 *     const user = await api.getUser(id);
 *     return success(user);
 *   } catch (error) {
 *     return failure(error as Error);
 *   }
 * }
 *
 * // Usage:
 * const result = await fetchUser(123);
 * if (result.success) {
 *   console.log(result.data.name);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a successful result
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create a failed result
 */
export function failure<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Check if a result is successful (type guard)
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

/**
 * Check if a result is a failure (type guard)
 */
export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

/**
 * Unwrap a result, throwing if it's a failure
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.success) {
    return result.data;
  }
  throw result.error;
}

/**
 * Unwrap a result with a default value for failures
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.success) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Map over a successful result
 */
export function map<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
  if (result.success) {
    return success(fn(result.data));
  }
  return result;
}

/**
 * Map over a failed result's error
 */
export function mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (!result.success) {
    return failure(fn(result.error));
  }
  return result;
}

/**
 * Chain results (flatMap)
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> {
  if (result.success) {
    return fn(result.data);
  }
  return result;
}

/**
 * Combine multiple results into one
 * Returns failure with the first error if any result fails
 */
export function combine<T extends readonly Result<any, any>[]>(
  ...results: T
): Result<{ [K in keyof T]: T[K] extends Result<infer U, any> ? U : never }, Error> {
  const data: any[] = [];
  for (const result of results) {
    if (!result.success) {
      return result as any;
    }
    data.push(result.data);
  }
  return success(data as any);
}

/**
 * Async wrapper that converts promise rejections to Result
 */
export async function tryAsync<T>(
  fn: () => Promise<T>
): Promise<Result<T, Error>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Sync wrapper that converts thrown errors to Result
 */
export function trySync<T>(fn: () => T): Result<T, Error> {
  try {
    const data = fn();
    return success(data);
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}
