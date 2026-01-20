/**
 * Google Sheets API Wrapper
 * - Exponential backoff + retry for 429 quota errors
 * - Friendly error mapping for 401/403
 * - Uses batchGet for efficiency
 */

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Make a request to Google Sheets API with retry logic
 */
export async function sheetsRequest(accessToken, endpoint, options = {}) {
  const baseUrl = 'https://sheets.googleapis.com/v4';
  const url = `${baseUrl}${endpoint}`;
  
  let lastError;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      // Handle specific error codes
      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          error: 'Google Sheets authorization expired or insufficient permissions. Please reconnect in Admin → Integrations.',
          needs_reconnect: true,
          status: response.status,
        };
      }
      
      if (response.status === 429) {
        // Quota exceeded - backoff and retry
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.log(`[googleSheets] Rate limited, backing off ${backoffMs}ms (attempt ${attempt + 1})`);
        await sleep(backoffMs);
        continue;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Google Sheets API error (${response.status})`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {}
        
        return {
          ok: false,
          error: errorMessage,
          status: response.status,
        };
      }
      
      const data = await response.json();
      return { ok: true, data };
      
    } catch (error) {
      lastError = error;
      // Network error - retry with backoff
      if (attempt < MAX_RETRIES - 1) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await sleep(backoffMs);
      }
    }
  }
  
  return {
    ok: false,
    error: lastError?.message || 'Failed to connect to Google Sheets API after retries',
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse spreadsheet ID from URL or return as-is if already an ID
 */
export function parseSpreadsheetId(urlOrId) {
  if (!urlOrId) return null;
  
  // If it's already an ID (no slashes, alphanumeric with dashes/underscores)
  if (/^[a-zA-Z0-9_-]+$/.test(urlOrId) && !urlOrId.includes('/')) {
    return urlOrId;
  }
  
  // Extract from URL
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : urlOrId;
}

/**
 * List all sheets (tabs) in a spreadsheet
 */
export async function listSheets(accessToken, spreadsheetId) {
  const result = await sheetsRequest(
    accessToken,
    `/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`
  );
  
  if (!result.ok) return result;
  
  return {
    ok: true,
    spreadsheetId: result.data.spreadsheetId,
    title: result.data.properties?.title,
    sheets: (result.data.sheets || []).map(s => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
      index: s.properties.index,
    })),
  };
}

/**
 * Get headers and sample rows using batchGet for efficiency
 */
export async function getPreview(accessToken, spreadsheetId, sheetTitle, headerRow = 1, sampleRows = 25) {
  // Build ranges for batchGet
  const headerRange = `'${sheetTitle}'!${headerRow}:${headerRow}`;
  const dataStartRow = headerRow + 1;
  const dataEndRow = headerRow + sampleRows;
  const dataRange = `'${sheetTitle}'!${dataStartRow}:${dataEndRow}`;
  
  const ranges = encodeURIComponent(`${headerRange}&ranges=${dataRange}`);
  const result = await sheetsRequest(
    accessToken,
    `/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${headerRange}&ranges=${dataRange}`
  );
  
  if (!result.ok) return result;
  
  const valueRanges = result.data.valueRanges || [];
  const headers = valueRanges[0]?.values?.[0] || [];
  const rows = valueRanges[1]?.values || [];
  
  return {
    ok: true,
    headers,
    rows,
    headerRow,
  };
}

/**
 * Get all data rows (for import)
 */
export async function getAllRows(accessToken, spreadsheetId, sheetTitle, headerRow = 1, startRow = null, endRow = null) {
  const dataStartRow = startRow || (headerRow + 1);
  let range;
  
  if (endRow) {
    range = `'${sheetTitle}'!${dataStartRow}:${endRow}`;
  } else {
    range = `'${sheetTitle}'!${dataStartRow}:999999`; // Get all rows
  }
  
  // Also get headers
  const headerRange = `'${sheetTitle}'!${headerRow}:${headerRow}`;
  
  const result = await sheetsRequest(
    accessToken,
    `/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${encodeURIComponent(headerRange)}&ranges=${encodeURIComponent(range)}`
  );
  
  if (!result.ok) return result;
  
  const valueRanges = result.data.valueRanges || [];
  const headers = valueRanges[0]?.values?.[0] || [];
  const rows = valueRanges[1]?.values || [];
  
  return {
    ok: true,
    headers,
    rows,
    totalRows: rows.length,
  };
}

/**
 * Normalize lead data for import
 */
export function normalizeLeadData(rawData) {
  const normalized = {};
  
  for (const [key, value] of Object.entries(rawData)) {
    if (value === null || value === undefined || value === '') continue;
    
    let normalizedValue = String(value).trim();
    
    // Email normalization
    if (key.includes('email')) {
      normalizedValue = normalizedValue.toLowerCase();
    }
    
    // Phone normalization - keep only digits
    if (key.includes('phone')) {
      normalizedValue = normalizedValue.replace(/\D/g, '');
      // Add country code if missing
      if (normalizedValue.length === 10) {
        normalizedValue = '1' + normalizedValue;
      }
    }
    
    // Numeric fields
    if (['estimated_value', 'loan_amount', 'current_balance', 'fico_score', 'current_rate', 'property_taxes', 'annual_homeowners_insurance', 'monthly_rental_income', 'cashout_amount'].includes(key)) {
      const num = parseFloat(normalizedValue.replace(/[^0-9.-]/g, ''));
      if (!isNaN(num)) {
        normalized[key] = num;
        continue;
      }
    }
    
    normalized[key] = normalizedValue;
  }
  
  return normalized;
}

/**
 * Validate lead data and return errors
 */
export function validateLeadData(data, rowIndex) {
  const errors = [];
  
  // Check for at least one identifier
  const hasEmail = data.home_email || data.work_email;
  const hasPhone = data.mobile_phone || data.home_phone || data.work_phone;
  const hasName = data.first_name || data.last_name;
  
  if (!hasEmail && !hasPhone && !hasName) {
    errors.push(`Row ${rowIndex}: No identifiable information (need name, email, or phone)`);
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.home_email && !emailRegex.test(data.home_email)) {
    errors.push(`Row ${rowIndex}: Invalid email format`);
  }
  if (data.work_email && !emailRegex.test(data.work_email)) {
    errors.push(`Row ${rowIndex}: Invalid work email format`);
  }
  
  // Validate status enum
  const validStatuses = ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'];
  if (data.status && !validStatuses.includes(data.status.toLowerCase())) {
    data.status = 'new'; // Default to new
  }
  
  return errors;
}

/**
 * Generate dedupe key for a lead
 */
export function getDedupeKey(data) {
  // Primary: email
  const email = (data.home_email || data.work_email || '').toLowerCase().trim();
  if (email) return { type: 'email', value: email };
  
  // Secondary: phone
  const phone = (data.mobile_phone || data.home_phone || data.work_phone || '').replace(/\D/g, '');
  if (phone && phone.length >= 10) return { type: 'phone', value: phone };
  
  // No dedupe key
  return null;
}