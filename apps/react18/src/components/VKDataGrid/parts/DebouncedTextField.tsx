import { useEffect, useRef, useState } from 'react';
import TextField, { type TextFieldProps } from '@mui/material/TextField';

export const FILTER_DEBOUNCE_MS = 400;

type DebouncedTextFieldProps = Omit<TextFieldProps, 'value' | 'onChange'> & {
  value: string;
  onDebouncedChange: (value: string) => void;
  delay?: number;
};

/**
 * Yazarken her tuşta istek atmamak için değeri gecikmeli bildirir.
 * Dışarıdan değer değişirse (resetFilters / applyFilters) bekleyen bildirim iptal edilir.
 */
export const DebouncedTextField = ({
  value,
  onDebouncedChange,
  delay = FILTER_DEBOUNCE_MS,
  ...rest
}: DebouncedTextFieldProps) => {
  const [text, setText] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onDebouncedChange);
  callbackRef.current = onDebouncedChange;
  const committedRef = useRef(value);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    committedRef.current = value;
    setText(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const flush = (next: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (next === committedRef.current) return;
    committedRef.current = next;
    callbackRef.current(next);
  };

  return (
    <TextField
      {...rest}
      value={text}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => flush(next), delay);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') flush(text);
        rest.onKeyDown?.(event);
      }}
    />
  );
};
