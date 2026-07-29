import { useEffect, RefObject } from 'react';

/**
 * Calls onOutsideClick when a mousedown happens outside the given ref's
 * element. Mirrors the pattern previously duplicated across several
 * dropdown/popover components.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutsideClick: () => void
) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClick();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
}
