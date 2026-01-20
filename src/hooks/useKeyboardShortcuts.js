import { useEffect, useCallback } from 'react';

/**
 * Hook for handling keyboard shortcuts
 *
 * @param {Object} shortcuts - Map of key combinations to callbacks
 * @param {Object} options - Configuration options
 *
 * @example
 * useKeyboardShortcuts({
 *   'ctrl+s': () => handleSave(),
 *   'ctrl+n': () => handleNew(),
 *   'escape': () => handleClose(),
 * });
 */
export function useKeyboardShortcuts(shortcuts, options = {}) {
  const {
    enabled = true,
    preventDefault = true,
    ignoreInputs = true,
  } = options;

  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // Ignore if focus is on input elements (unless overridden)
    if (ignoreInputs) {
      const target = event.target;
      const tagName = target.tagName.toLowerCase();
      const isEditable = target.isContentEditable;

      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || isEditable) {
        // Only allow Escape to work in inputs
        if (event.key !== 'Escape') return;
      }
    }

    // Build the key combination string
    const parts = [];
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');

    const key = event.key.toLowerCase();
    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      parts.push(key);
    }

    const combo = parts.join('+');

    // Check if we have a handler for this combination
    const handler = shortcuts[combo];
    if (handler) {
      if (preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
      handler(event);
    }
  }, [shortcuts, enabled, preventDefault, ignoreInputs]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Common keyboard shortcuts for forms
 */
export function useFormShortcuts({ onSave, onCancel, onNew }) {
  useKeyboardShortcuts({
    'ctrl+s': onSave,
    'escape': onCancel,
    'ctrl+n': onNew,
  });
}

/**
 * Common keyboard shortcuts for lists/tables
 */
export function useListShortcuts({ onSearch, onNew, onRefresh }) {
  useKeyboardShortcuts({
    'ctrl+f': onSearch,
    'ctrl+n': onNew,
    'ctrl+r': onRefresh,
  });
}

/**
 * Navigation shortcuts
 */
export function useNavigationShortcuts(navigate) {
  useKeyboardShortcuts({
    'ctrl+1': () => navigate('/Dashboard'),
    'ctrl+2': () => navigate('/Pipeline'),
    'ctrl+3': () => navigate('/Leads'),
    'ctrl+4': () => navigate('/Loans'),
    'ctrl+5': () => navigate('/Contacts'),
  });
}

export default useKeyboardShortcuts;
