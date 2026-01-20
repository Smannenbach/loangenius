/**
 * Get Deal With All Relations - Batched endpoint to reduce frontend queries
 * Returns deal with properties, borrowers, documents, conditions, and tasks in one call
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { deal_id } = body;

    if (!deal_id) {
      return Response.json({ error: 'deal_id is required' }, { status: 400 });
    }

    // Fetch deal first
    const deals = await base44.entities.Deal.filter({ id: deal_id });
    if (deals.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    // Batch fetch all related data in parallel
    const [
      dealBorrowers,
      dealProperties,
      documents,
      conditions,
      tasks,
      fees,
      activity,
      submissions
    ] = await Promise.all([
      base44.entities.DealBorrower.filter({ deal_id }),
      base44.entities.DealProperty.filter({ deal_id }),
      base44.entities.Document.filter({ deal_id, is_deleted: false }),
      base44.entities.Condition.filter({ deal_id }),
      base44.entities.Task.filter({ deal_id }),
      base44.entities.DealFee.filter({ deal_id }),
      base44.entities.ActivityLog.filter({ deal_id }, '-created_date', 50),
      base44.entities.LenderSubmission.filter({ deal_id }),
    ]);

    // Fetch full borrower and property records
    const borrowerIds = dealBorrowers.map(db => db.borrower_id).filter(Boolean);
    const propertyIds = dealProperties.map(dp => dp.property_id).filter(Boolean);

    const [borrowers, properties] = await Promise.all([
      borrowerIds.length > 0 
        ? base44.entities.Borrower.filter({ id: { $in: borrowerIds } })
        : [],
      propertyIds.length > 0
        ? base44.entities.Property.filter({ id: { $in: propertyIds } })
        : [],
    ]);

    // Map borrowers with their roles
    const borrowerMap = Object.fromEntries(borrowers.map(b => [b.id, b]));
    const enrichedBorrowers = dealBorrowers
      .filter(db => borrowerMap[db.borrower_id])
      .map(db => ({
        ...borrowerMap[db.borrower_id],
        role: db.role,
        deal_borrower_id: db.id,
      }));

    // Map properties with subject flag
    const propertyMap = Object.fromEntries(properties.map(p => [p.id, p]));
    const enrichedProperties = dealProperties
      .filter(dp => propertyMap[dp.property_id])
      .map(dp => ({
        ...propertyMap[dp.property_id],
        is_subject: dp.is_subject,
        deal_property_id: dp.id,
      }));

    // Calculate summary stats
    const stats = {
      total_documents: documents.length,
      approved_documents: documents.filter(d => d.status === 'approved').length,
      pending_conditions: conditions.filter(c => c.status === 'pending' || c.status === 'requested').length,
      open_tasks: tasks.filter(t => t.status !== 'completed').length,
      total_fees: fees.reduce((sum, f) => sum + (f.amount || 0), 0),
    };

    return Response.json({
      success: true,
      deal,
      borrowers: enrichedBorrowers,
      properties: enrichedProperties,
      documents,
      conditions,
      tasks,
      fees,
      activity,
      submissions,
      stats,
    });
  } catch (error) {
    console.error('getDealWithRelations error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});