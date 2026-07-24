import { useEffect } from 'react';

// Global stack to ensure only the top-most modal responds to Escape key presses
const modalStack: (() => void)[] = [];

/**
 * Custom hook to listen for Escape key press when a modal or overlay is open.
 * Handles nested modals automatically by triggering the top-most modal callback first.
 * 
 * @param onEscape Callback function to execute when Escape key is pressed
 * @param active Whether the modal is currently open
 */
export function useEscapeKey(onEscape: () => void, active: boolean = true) {
  useEffect(() => {
    if (!active) return;

    modalStack.push(onEscape);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (modalStack.length > 0 && modalStack[modalStack.length - 1] === onEscape) {
          event.preventDefault();
          event.stopPropagation();
          onEscape();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      const index = modalStack.lastIndexOf(onEscape);
      if (index !== -1) {
        modalStack.splice(index, 1);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onEscape, active]);
}
