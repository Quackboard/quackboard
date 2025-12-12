import { useEffect, useRef, useCallback } from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';

interface UseFormDraftOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  storageKey: string;
  debounceMs?: number;
  serialize?: (data: T) => string;
  deserialize?: (data: string) => Partial<T>;
}

export function useFormDraft<T extends FieldValues>({
  form,
  storageKey,
  debounceMs = 1500,
  serialize,
  deserialize,
}: UseFormDraftOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(false);

  // Default serializers handle Date objects
  const defaultSerialize = useCallback((data: T): string => {
    return JSON.stringify(data, (key, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    });
  }, []);

  const defaultDeserialize = useCallback((jsonStr: string): Partial<T> => {
    return JSON.parse(jsonStr, (key, value) => {
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });
  }, []);

  const serializeFn = serialize || defaultSerialize;
  const deserializeFn = deserialize || defaultDeserialize;

  // Load draft on mount
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = deserializeFn(saved);
        // Reset form with saved values
        form.reset(parsed as T, { keepDefaultValues: false });
      }
    } catch (e) {
      // Invalid data, clear it
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, form, deserializeFn]);

  // Auto-save on changes with debounce
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, serializeFn(values as T));
        } catch (e) {
          // Storage quota exceeded or other error
          console.warn('Failed to save form draft:', e);
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [form, storageKey, debounceMs, serializeFn]);

  // Clear draft function
  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { clearDraft };
}
