import { useState, useCallback } from 'react';

/**
 * Hook for copying text to clipboard with feedback
 *
 * @param {Object} options - Configuration options
 * @param {number} options.successDuration - How long to show success state (ms)
 * @param {Function} options.onSuccess - Callback on successful copy
 * @param {Function} options.onError - Callback on copy failure
 *
 * @returns {Object} { copy, copied, error, reset }
 *
 * @example
 * const { copy, copied } = useClipboard();
 *
 * <button onClick={() => copy('text to copy')}>
 *   {copied ? 'Copied!' : 'Copy'}
 * </button>
 */
export default function useClipboard(options = {}) {
  const { successDuration = 2000, onSuccess, onError } = options;

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const copy = useCallback(async (text) => {
    if (!text) {
      const err = new Error('No text provided to copy');
      setError(err);
      onError?.(err);
      return false;
    }

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (!successful) {
          throw new Error('Copy command failed');
        }
      }

      setCopied(true);
      setError(null);
      onSuccess?.(text);

      // Reset copied state after duration
      if (successDuration > 0) {
        setTimeout(() => {
          setCopied(false);
        }, successDuration);
      }

      return true;
    } catch (err) {
      setError(err);
      setCopied(false);
      onError?.(err);
      return false;
    }
  }, [successDuration, onSuccess, onError]);

  const reset = useCallback(() => {
    setCopied(false);
    setError(null);
  }, []);

  return { copy, copied, error, reset };
}

/**
 * Simple copy function without state management
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);

    return successful;
  } catch {
    return false;
  }
}
