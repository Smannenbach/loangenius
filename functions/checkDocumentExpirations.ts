/**
 * Scheduled job to check document expirations
 * Runs periodically to identify expiring documents and trigger reminders
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { logActivity } from './auditLogHelper.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const reminderWindow = 14 * 86400000; // 14 days

    // Get all documents with expiration dates
    const allDocuments = await base44.asServiceRole.entities.Document.filter({});

    const expiringDocs = [];
    const expiredDocs = [];

    for (const doc of allDocuments) {
      if (!doc.expires_at) continue;

      const expiresAt = new Date(doc.expires_at);
      const daysUntilExpiration = (expiresAt - now) / 86400000;

      if (daysUntilExpiration < 0) {
        expiredDocs.push(doc);
      } else if (daysUntilExpiration < 14) {
        expiringDocs.push({ ...doc, daysUntilExpiration });
      }
    }

    // Update status for expired documents
    for (const doc of expiredDocs) {
      await base44.asServiceRole.entities.Document.update(doc.id, {
        status: 'expired'
      });

      // Log activity
      await logActivity(base44, {
        deal_id: doc.deal_id,
        activity_type: 'System_Event',
        title: 'Document Expired',
        description: `${doc.document_type} document has expired`,
        icon: '⚠️',
        color: 'red',
        is_internal: true
      });
    }

    // Log reminders for expiring documents
    for (const doc of expiringDocs) {
      await logActivity(base44, {
        deal_id: doc.deal_id,
        activity_type: 'System_Event',
        title: 'Document Expiring Soon',
        description: `${doc.document_type} expires in ${Math.ceil(doc.daysUntilExpiration)} days`,
        icon: '⏰',
        color: 'yellow',
        is_internal: true
      });
    }

    return Response.json({
      success: true,
      checked: allDocuments.length,
      expiring_soon: expiringDocs.length,
      expired: expiredDocs.length,
      message: `Checked ${allDocuments.length} documents: ${expiringDocs.length} expiring soon, ${expiredDocs.length} expired`
    });
  } catch (error) {
    console.error('Error checking document expirations:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});