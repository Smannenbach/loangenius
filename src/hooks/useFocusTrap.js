import { useEffect, useRef } from 'react';

/**
 * Hook to trap focus within a container element (for modals/dialogs)
 * Improves accessibility by keeping keyboard focus within the modal
 *
 * @param {boolean} isActive - Whether the focus trap is active
 * @param {Object} options - Configuration options
 * @param {boolean} options.returnFocusOnDeactivate - Return focus to trigger element on close
 * @param {string} options.initialFocusSelector - Selector for element to focus initially
 */
export default function useFocusTrap(isActive, options = {}) {
  const containerRef = useRef(null);
  const previousActiveElement = useRef(null);
  const { returnFocusOnDeactivate = true, initialFocusSelector } = options;

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store the currently focused element
    previousActiveElement.current = document.activeElement;

    const container = containerRef.current;

    // Get all focusable elements
    const getFocusableElements = () => {
      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      return Array.from(container.querySelectorAll(focusableSelectors))
        .filter(el => el.offsetParent !== null); // Filter out hidden elements
    };

    // Focus initial element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      if (initialFocusSelector) {
        const initialElement = container.querySelector(initialFocusSelector);
        if (initialElement) {
          initialElement.focus();
        } else {
          focusableElements[0].focus();
        }
      } else {
        focusableElements[0].focus();
      }
    }

    // Handle tab key to trap focus
    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: move backwards
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: move forwards
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);

      // Return focus to previous element
      if (returnFocusOnDeactivate && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, returnFocusOnDeactivate, initialFocusSelector]);

  return containerRef;
}

/**
 * Hook to handle Escape key press
 * @param {Function} onEscape - Callback when Escape is pressed
 * @param {boolean} isActive - Whether the handler is active
 */
export function useEscapeKey(onEscape, isActive = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, isActive]);
}

/**
 * Hook to handle click outside of an element
 * @param {Function} onClickOutside - Callback when clicking outside
 * @param {boolean} isActive - Whether the handler is active
 */
export function useClickOutside(onClickOutside, isActive = true) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClickOutside(event);
      }
    };

    // Use mousedown to catch clicks before other handlers
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClickOutside, isActive]);

  return ref;
}
