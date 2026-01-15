/**
 * Central audit logging helper
 * All create/update/delete actions must log through here
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { maskSensitiveField } from './encryptionHelper.js';

/**
 * Log an audit event
 * @param {Object} base44 - Base44 SDK client
 * @param {Object} auditData - Audit data
 * @returns {Promise<Object>} - Created audit log
 */
export async function logAudit(base44, auditData) {
  const {
    action_type,
    entity_type,
    entity_id,
    entity_name,
    description,
    old_values,
    new_values,
    severity = 'Info',
    metadata = {}
  } = auditData;

  // Mask sensitive fields
  const maskedOld = maskAuditValues(old_values);
  const maskedNew = maskAuditValues(new_values);

  // Calculate changed fields
  const changedFields = calculateChangedFields(maskedOld, maskedNew);

  const auditLog = {
    action_type,
    entity_type,
    entity_id,
    entity_name,
    description,
    old_values: maskedOld,
    new_values: maskedNew,
    changed_fields: changedFields,
    severity,
    metadata
  };

  // Get org_id from metadata or entity
  if (metadata.org_id) {
    auditLog.org_id = metadata.org_id;
  }

  // Get user from context
  if (metadata.user_id) {
    auditLog.user_id = metadata.user_id;
  }

  // Get request context
  if (metadata.ip_address) {
    auditLog.ip_address = metadata.ip_address;
  }
  if (metadata.user_agent) {
    auditLog.user_agent = metadata.user_agent;
  }

  try {
    const created = await base44.asServiceRole.entities.AuditLog.create(auditLog);
    
    // If severity is warning/error/critical, trigger alert
    if (['Warning', 'Error', 'Critical'].includes(severity)) {
      // TODO: Alert service
      console.warn(`[AUDIT] ${severity}: ${description}`);
    }

    return created;
  } catch (error) {
    console.error('Audit log creation failed:', error);
    // Don't throw - audit failures shouldn't break main operation
    return null;
  }
}

/**
 * Log activity feed entry
 * @param {Object} base44
 * @param {Object} activityData
 * @returns {Promise<Object>}
 */
export async function logActivity(base44, activityData) {
  const {
    deal_id,
    borrower_id,
    activity_type,
    title,
    description,
    icon,
    color,
    metadata = {},
    is_internal = false
  } = activityData;

  const activity = {
    activity_type,
    title,
    description,
    icon,
    color,
    metadata,
    is_internal
  };

  if (deal_id) activity.deal_id = deal_id;
  if (borrower_id) activity.borrower_id = borrower_id;

  try {
    return await base44.asServiceRole.entities.ActivityLog.create(activity);
  } catch (error) {
    console.error('Activity log creation failed:', error);
    return null;
  }
}

/**
 * Log data access (especially PII)
 * @param {Object} base44
 * @param {Object} accessData
 * @returns {Promise<Object>}
 */
export async function logDataAccess(base44, accessData) {
  const {
    org_id,
    user_id,
    access_type,
    entity_type,
    entity_id,
    fields_accessed,
    access_reason,
    ip_address
  } = accessData;

  // Determine if PII accessed
  const piiFields = [
    'ssn', 'social_security_number', 'dob', 'date_of_birth',
    'ein', 'tax_id', 'bank_account', 'account_number',
    'credit_score', 'drivers_license'
  ];
  const pii_accessed = fields_accessed?.some(f =>
    piiFields.some(pf => f.toLowerCase().includes(pf))
  );

  const accessLog = {
    org_id,
    user_id,
    access_type,
    entity_type,
    entity_id,
    fields_accessed,
    pii_accessed: pii_accessed || false,
    access_reason,
    ip_address
  };

  // Bulk PII access = warning
  if (pii_accessed && (fields_accessed?.length || 0) > 10) {
    console.warn(`[DATA ACCESS] Bulk PII access: ${user_id} accessed ${fields_accessed?.length} fields`);
  }

  try {
    return await base44.asServiceRole.entities.DataAccessLog.create(accessLog);
  } catch (error) {
    console.error('Data access log creation failed:', error);
    return null;
  }
}

/**
 * Helper: Mask sensitive values in audit log
 * @param {Object} values
 * @returns {Object}
 */
function maskAuditValues(values) {
  if (!values) return null;

  const masked = { ...values };
  Object.keys(masked).forEach(key => {
    masked[key] = maskSensitiveField(key, masked[key]);
  });
  return masked;
}

/**
 * Helper: Calculate which fields changed
 * @param {Object} oldValues
 * @param {Object} newValues
 * @returns {Array<string>}
 */
function calculateChangedFields(oldValues, newValues) {
  if (!oldValues || !newValues) return [];

  const changed = [];
  const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

  allKeys.forEach(key => {
    if (oldValues[key] !== newValues[key]) {
      changed.push(key);
    }
  });

  return changed;
}