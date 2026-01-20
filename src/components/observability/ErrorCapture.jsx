/**
 * Error Capture Utility - LoanGenius
 * Captures frontend errors with proper redaction and correlation
 */

// Redaction patterns for sensitive data
const REDACT_PATTERNS = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
  { pattern: /\b\d{9}\b/g, replacement: '[SSN]' },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '[CARD]' },
  { pattern: /Bearer\s+[A-Za-z0-9\-_.]+/gi, replacement: 'Bearer [TOKEN]' },
  { pattern: /api[_-]?key[=:]\s*[A-Za-z0-9\-_]+/gi, replacement: 'api_key=[REDACTED]' },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 
    replacement: (m) => m.slice(0, 2) + '***@' + m.split('@')[1] }
];

/**
 * Redact sensitive data from text
 */
export function redactSensitiveData(text) {
  if (!text || typeof text !== 'string') return text;
  
  let redacted = text;
  for (const { pattern, replacement } of REDACT_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted;
}

/**
 * Generate a trace ID for correlation
 */
export function generateTraceId() {
  return 'trace_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

/**
 * Generate a span ID
 */
export function generateSpanId() {
  return 'span_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

/**
 * Hash user ID for privacy
 */
export async function hashUserId(userId) {
  if (!userId) return 'anonymous';
  
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + 'salt_loan_genius_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/**
 * Detect feature area from path
 */
export function detectFeatureArea(path) {
  if (!path) return 'unknown';
  
  const areas = {
    '/Leads': 'leads',
    '/Pipeline': 'pipeline',
    '/Loans': 'deals',
    '/Deal': 'deals',
    '/Documents': 'documents',
    '/Settings': 'settings',
    '/Portal': 'borrower_portal',
    '/BorrowerPortal': 'borrower_portal',
    '/Import': 'imports',
    '/Export': 'exports',
    '/MISMO': 'exports',
    '/Dashboard': 'dashboard',
    '/Communications': 'communications',
    '/Reports': 'reports',
    '/Users': 'admin',
    '/Underwriting': 'underwriting'
  };
  
  for (const [prefix, area] of Object.entries(areas)) {
    if (path.startsWith(prefix)) return area;
  }
  return 'other';
}

// Breadcrumb storage
const MAX_BREADCRUMBS = 50;

/**
 * Add a breadcrumb for context
 */
export function addBreadcrumb(action, data = {}) {
  try {
    const breadcrumbs = JSON.parse(sessionStorage.getItem('lg_breadcrumbs') || '[]');
    
    breadcrumbs.push({
      action,
      data: typeof data === 'object' ? JSON.stringify(data) : data,
      timestamp: Date.now(),
      route: window.location.pathname
    });
    
    // Keep only last N breadcrumbs
    while (breadcrumbs.length > MAX_BREADCRUMBS) {
      breadcrumbs.shift();
    }
    
    sessionStorage.setItem('lg_breadcrumbs', JSON.stringify(breadcrumbs));
  } catch (e) {
    // Silently fail if storage is unavailable
  }
}

/**
 * Get current breadcrumbs
 */
export function getBreadcrumbs() {
  try {
    return JSON.parse(sessionStorage.getItem('lg_breadcrumbs') || '[]');
  } catch {
    return [];
  }
}

/**
 * Get or create current trace ID
 */
export function getCurrentTraceId() {
  let traceId = sessionStorage.getItem('lg_trace_id');
  if (!traceId) {
    traceId = generateTraceId();
    sessionStorage.setItem('lg_trace_id', traceId);
  }
  return traceId;
}

/**
 * Start a new trace (e.g., on page navigation)
 */
export function startNewTrace() {
  const traceId = generateTraceId();
  sessionStorage.setItem('lg_trace_id', traceId);
  return traceId;
}

/**
 * Capture an error with full context
 */
export async function captureError(error, context = {}) {
  const traceId = getCurrentTraceId();
  const userIdHash = context.userId ? await hashUserId(context.userId) : 'anonymous';
  
  const errorEvent = {
    type: 'error',
    trace_id: traceId,
    span_id: generateSpanId(),
    
    // Error details (redacted)
    error_type: error.name || 'Error',
    error_message: redactSensitiveData(error.message || String(error)),
    error_stack: redactSensitiveData(error.stack || ''),
    
    // Context
    org_id: context.orgId || 'unknown',
    user_id_hash: userIdHash,
    route: window.location.pathname,
    feature_area: detectFeatureArea(window.location.pathname),
    
    // Environment
    env: import.meta.env?.MODE || 'production',
    version: '1.0.0', // TODO: Get from build
    url: window.location.href,
    user_agent: navigator.userAgent,
    
    // Breadcrumbs for context
    breadcrumbs: getBreadcrumbs().slice(-20), // Last 20 breadcrumbs
    
    // Timing
    timestamp: new Date().toISOString()
  };
  
  // Log to console in development
  if (import.meta.env?.MODE === 'development') {
    console.error('[ErrorCapture]', errorEvent);
  }
  
  // Send to backend (fire and forget)
  try {
    navigator.sendBeacon('/api/errorCapture', JSON.stringify(errorEvent));
  } catch {
    // Fallback to fetch
    fetch('/api/errorCapture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorEvent),
      keepalive: true
    }).catch(() => {
      // Silently fail - error capture shouldn't break the app
    });
  }
  
  return errorEvent;
}

/**
 * Initialize global error handlers
 */
export function initErrorCapture(context = {}) {
  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    captureError({
      name: 'RuntimeError',
      message: event.message,
      stack: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`
    }, context);
  });
  
  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    captureError({
      name: 'UnhandledRejection',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack
    }, context);
  });
  
  console.log('[ErrorCapture] Initialized');
}

export default {
  captureError,
  initErrorCapture,
  addBreadcrumb,
  getBreadcrumbs,
  generateTraceId,
  generateSpanId,
  getCurrentTraceId,
  startNewTrace,
  redactSensitiveData,
  hashUserId,
  detectFeatureArea
};