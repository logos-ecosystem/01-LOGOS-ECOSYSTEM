declare module 'use-debounce' {
  export function useDebounce<T>(value: T, delay: number): [T, () => void];
  export function useDebouncedCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number,
    options?: { maxWait?: number; leading?: boolean; trailing?: boolean }
  ): T;
}
