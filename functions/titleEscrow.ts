import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, deal_id, org_id, title_order_id, issue_id, data } = await req.json();

    if (action === 'order_title') {
      const { title_company_name, title_officer_name, title_officer_email, title_officer_phone, property_id } = data;
      
      const order = await base44.entities.TitleOrder.create({
        org_id, deal_id, property_id, title_company_name, title_officer_name, title_officer_email, title_officer_phone,
        order_date: new Date().toISOString().split('T')[0], status: 'ordered'
      });
      
      return Response.json({ success: true, title_order_id: order.id });
    }

    if (action === 'process_commitment') {
      const { issues, requirements, exceptions } = data;
      
      await base44.entities.TitleOrder.update(title_order_id, {
        commitment_received: new Date().toISOString().split('T')[0],
        title_issues_json: issues, requirements_json: requirements, exceptions_json: exceptions,
        status: issues?.length > 0 ? 'clearing' : 'commitment_issued'
      });
      
      // Create individual issue records
      if (issues?.length > 0) {
        for (const issue of issues) {
          await base44.entities.TitleIssue.create({
            org_id, deal_id, title_order_id, issue_type: issue.type || 'other',
            description: issue.description, amount: issue.amount,
            resolution_required: issue.resolution_required, resolution_status: 'open'
          });
        }
      }
      
      return Response.json({ success: true, issues: issues?.length || 0, requirements: requirements?.length || 0, exceptions: exceptions?.length || 0 });
    }

    if (action === 'update_issue') {
      const { resolution_status, resolution_notes } = data;
      
      await base44.entities.TitleIssue.update(issue_id, {
        resolution_status, resolution_notes,
        resolved_date: resolution_status === 'resolved' ? new Date().toISOString().split('T')[0] : null
      });
      
      // Check if all issues resolved
      const issues = await base44.entities.TitleIssue.filter({ title_order_id });
      const allResolved = issues.every(i => i.resolution_status === 'resolved' || i.resolution_status === 'waived');
      
      if (allResolved) {
        await base44.entities.TitleOrder.update(title_order_id, { status: 'clear' });
      }
      
      return Response.json({ success: true, all_clear: allResolved });
    }

    if (action === 'check_clearance') {
      const orders = await base44.entities.TitleOrder.filter({ deal_id });
      const order = orders[0];
      if (!order) return Response.json({ clear: false, blocking_items: ['No title order found'] });
      
      const issues = await base44.entities.TitleIssue.filter({ title_order_id: order.id });
      const blocking = issues.filter(i => i.resolution_status === 'open' || i.resolution_status === 'in_progress');
      
      return Response.json({ clear: blocking.length === 0, blocking_items: blocking.map(i => i.description) });
    }

    if (action === 'track_earnest_money') {
      const { amount, received_date, escrow_company_name, escrow_officer_name, escrow_number } = data;
      
      const existing = await base44.entities.EscrowAccount.filter({ deal_id });
      
      if (existing.length > 0) {
        await base44.entities.EscrowAccount.update(existing[0].id, {
          earnest_money_amount: amount, earnest_money_received: true, earnest_money_date: received_date
        });
      } else {
        await base44.entities.EscrowAccount.create({
          org_id, deal_id, escrow_company_name, escrow_officer_name, escrow_number,
          earnest_money_amount: amount, earnest_money_received: true, earnest_money_date: received_date,
          status: 'open'
        });
      }
      
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Title/Escrow error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});