import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Public borrower lookup - called from BorrowerPortalLogin
 * Finds active deals for a borrower and notifies loan officer to send magic link
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { borrower_email } = await req.json();

    if (!borrower_email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    // Find borrower by email
    const borrowers = await base44.asServiceRole.entities.Borrower.filter({
      email: borrower_email,
    });

    if (borrowers.length === 0) {
      return Response.json({ 
        success: false,
        message: 'No borrower found with that email' 
      });
    }

    const borrower = borrowers[0];

    // Find active deals for this borrower
    const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({
      borrower_id: borrower.id,
    });

    if (dealBorrowers.length === 0) {
      return Response.json({ 
        success: false,
        message: 'No active deals found' 
      });
    }

    // Get the most recent deal
    const deals = await Promise.all(
      dealBorrowers.map(db => 
        base44.asServiceRole.entities.Deal.get(db.deal_id)
      )
    );

    const activeDeal = deals
      .filter(d => d && !d.is_deleted && ['inquiry', 'application', 'processing', 'underwriting', 'approved', 'closing'].includes(d.stage))
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

    if (!activeDeal) {
      return Response.json({ 
        success: false,
        message: 'No active deals found' 
      });
    }

    // Get loan officer assigned to deal
    const loanOfficer = activeDeal.assigned_to_user_id;
    const org = activeDeal.org_id;

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id: org,
      deal_id: activeDeal.id,
      borrower_id: borrower.id,
      activity_type: 'PORTAL_INVITE_SENT',
      description: `Borrower ${borrower.email} requested portal access link`,
      source: 'portal',
    });

    // Send notification to loan officer
    await base44.integrations.Core.SendEmail({
      to: loanOfficer,
      subject: `Portal Access Request - ${activeDeal.deal_number}`,
      body: `${borrower.first_name} ${borrower.last_name} (${borrower.email}) has requested access to their loan portal for deal ${activeDeal.deal_number}.\n\nSend them a magic link using the admin dashboard.`,
      from_name: 'LoanGenius Portal',
    });

    return Response.json({
      success: true,
      message: 'Portal access request sent to loan officer',
      borrower_id: borrower.id,
      deal_id: activeDeal.id,
    });
  } catch (error) {
    console.error('Borrower lookup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});