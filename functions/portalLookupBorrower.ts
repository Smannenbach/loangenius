/**
 * Portal Lookup Borrower
 * SECURITY: Requires org_id to prevent cross-org data access (IDOR)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, org_id } = body;

    if (!email) {
      return Response.json({ error: 'Missing email' }, { status: 400 });
    }

    if (!org_id) {
      return Response.json({ error: 'Missing org_id - required for security' }, { status: 400 });
    }

    // SECURITY FIX: Filter by org_id to prevent IDOR vulnerability
    const borrowers = await base44.asServiceRole.entities.Borrower.filter({ 
      email: email.toLowerCase(),
      org_id: org_id
    });

    if (borrowers.length === 0) {
      return Response.json({ found: false });
    }

    const borrower = borrowers[0];

    // Get associated deals
    const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({
      borrower_id: borrower.id,
    });

    return Response.json({
      found: true,
      borrower: {
        id: borrower.id,
        first_name: borrower.first_name,
        last_name: borrower.last_name,
        email: borrower.email,
      },
      deal_count: dealBorrowers.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});