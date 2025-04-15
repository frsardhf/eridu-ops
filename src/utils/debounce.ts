/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified delay has elapsed since the last time it was invoked.
 * 
 * @param fn - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns A debounced version of the provided function
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: number | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = window.setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}; 