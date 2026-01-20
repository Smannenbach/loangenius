/**
 * Telemetry Utility - LoanGenius
 * Provides tracing and metrics for frontend operations
 */

import { 
  generateSpanId, 
  getCurrentTraceId, 
  redactSensitiveData,
  addBreadcrumb 
} from './ErrorCapture';

// Active spans for the current page
const activeSpans = new Map();

/**
 * Start a span for timing an operation
 */
export function startSpan(name, attributes = {}) {
  const spanId = generateSpanId();
  const traceId = getCurrentTraceId();
  
  const span = {
    span_id: spanId,
    trace_id: traceId,
    name,
    start_time: performance.now(),
    start_timestamp: Date.now(),
    attributes: {
      route: window.location.pathname,
      ...attributes
    }
  };
  
  activeSpans.set(spanId, span);
  
  // Also add as breadcrumb
  addBreadcrumb(`span_start:${name}`, attributes);
  
  return spanId;
}

/**
 * End a span and record the telemetry
 */
export function endSpan(spanId, status = 'ok', error = null) {
  const span = activeSpans.get(spanId);
  if (!span) {
    console.warn(`[Telemetry] Span not found: ${spanId}`);
    return null;
  }
  
  const duration_ms = performance.now() - span.start_time;
  
  const completedSpan = {
    type: 'span',
    ...span,
    duration_ms,
    status,
    error: error ? redactSensitiveData(error.message || String(error)) : null,
    end_timestamp: Date.now()
  };
  
  // Remove from active spans
  activeSpans.delete(spanId);
  
  // Add as breadcrumb
  addBreadcrumb(`span_end:${span.name}`, { 
    duration_ms: Math.round(duration_ms), 
    status 
  });
  
  // Send telemetry
  sendTelemetry(completedSpan);
  
  return completedSpan;
}

/**
 * Record a metric
 */
export function recordMetric(name, value, labels = {}) {
  const metric = {
    type: 'metric',
    name,
    value,
    labels: {
      route: window.location.pathname,
      ...labels
    },
    trace_id: getCurrentTraceId(),
    timestamp: Date.now()
  };
  
  sendTelemetry(metric);
  return metric;
}

/**
 * Wrap an async function with automatic span tracking
 */
export function withSpan(name, attributes = {}) {
  return function(fn) {
    return async function(...args) {
      const spanId = startSpan(name, attributes);
      try {
        const result = await fn.apply(this, args);
        endSpan(spanId, 'ok');
        return result;
      } catch (error) {
        endSpan(spanId, 'error', error);
        throw error;
      }
    };
  };
}

/**
 * Time a synchronous operation
 */
export function timeSync(name, fn, attributes = {}) {
  const spanId = startSpan(name, attributes);
  try {
    const result = fn();
    endSpan(spanId, 'ok');
    return result;
  } catch (error) {
    endSpan(spanId, 'error', error);
    throw error;
  }
}

/**
 * Time an async operation
 */
export async function timeAsync(name, fn, attributes = {}) {
  const spanId = startSpan(name, attributes);
  try {
    const result = await fn();
    endSpan(spanId, 'ok');
    return result;
  } catch (error) {
    endSpan(spanId, 'error', error);
    throw error;
  }
}

/**
 * Send telemetry to backend
 */
function sendTelemetry(data) {
  // Log in development
  if (import.meta.env?.MODE === 'development') {
    console.log('[Telemetry]', data);
  }
  
  // Send to backend (fire and forget)
  try {
    navigator.sendBeacon('/api/telemetry', JSON.stringify(data));
  } catch {
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true
    }).catch(() => {
      // Silently fail
    });
  }
}

/**
 * Track page load performance
 */
export function trackPageLoad() {
  // Wait for page to fully load
  if (document.readyState === 'complete') {
    capturePageMetrics();
  } else {
    window.addEventListener('load', capturePageMetrics);
  }
}

function capturePageMetrics() {
  try {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    const metrics = {
      // Navigation timing
      dns_lookup_ms: navigation?.domainLookupEnd - navigation?.domainLookupStart,
      tcp_connect_ms: navigation?.connectEnd - navigation?.connectStart,
      ttfb_ms: navigation?.responseStart - navigation?.requestStart,
      dom_interactive_ms: navigation?.domInteractive - navigation?.fetchStart,
      dom_complete_ms: navigation?.domComplete - navigation?.fetchStart,
      load_complete_ms: navigation?.loadEventEnd - navigation?.fetchStart,
      
      // Paint timing
      fcp_ms: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
      
      // Page info
      route: window.location.pathname
    };
    
    recordMetric('page_load', metrics.load_complete_ms || 0, {
      route: window.location.pathname,
      ttfb: Math.round(metrics.ttfb_ms || 0),
      fcp: Math.round(metrics.fcp_ms || 0)
    });
    
  } catch (e) {
    console.warn('[Telemetry] Failed to capture page metrics:', e);
  }
}

/**
 * Track Core Web Vitals
 */
export function trackWebVitals() {
  try {
    // LCP - Largest Contentful Paint
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        recordMetric('lcp', entry.startTime, { route: window.location.pathname });
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    
    // CLS - Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
    
    // Report CLS on page hide
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        recordMetric('cls', clsValue, { route: window.location.pathname });
      }
    });
    
  } catch (e) {
    console.warn('[Telemetry] Web Vitals not supported:', e);
  }
}

export default {
  startSpan,
  endSpan,
  recordMetric,
  withSpan,
  timeSync,
  timeAsync,
  trackPageLoad,
  trackWebVitals
};