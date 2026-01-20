import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, deal_id, org_id, data } = await req.json();

    if (action === 'schedule_closing') {
      const { closing_date, closing_time, location_type, location_name, location_address, escrow_officer_name, escrow_officer_email, escrow_officer_phone } = data;
      
      const schedule = await base44.entities.ClosingSchedule.create({
        org_id, deal_id, closing_date, closing_time, location_type, location_name, location_address,
        escrow_officer_name, escrow_officer_email, escrow_officer_phone, status: 'scheduled'
      });
      
      // Generate closing checklist
      const checklistItems = [
        { name: 'Final Loan Approval', category: 'pre_closing' },
        { name: 'Closing Disclosure Sent (3-day rule)', category: 'pre_closing' },
        { name: 'Wire Instructions Received', category: 'pre_closing' },
        { name: 'Title Clear', category: 'pre_closing' },
        { name: 'Homeowners Insurance Verified', category: 'pre_closing' },
        { name: 'Final Walkthrough Complete', category: 'closing_day' },
        { name: 'All Documents Signed', category: 'closing_day' },
        { name: 'Funds Wired', category: 'closing_day' },
        { name: 'Recording Confirmed', category: 'post_closing' },
        { name: 'Welcome Package Sent', category: 'post_closing' }
      ];
      
      for (const item of checklistItems) {
        await base44.entities.ClosingChecklist.create({ org_id, deal_id, item_name: item.name, category: item.category, status: 'pending' });
      }
      
      // Calculate TRID deadlines
      const closingDateObj = new Date(closing_date);
      const cdDeadline = new Date(closingDateObj);
      cdDeadline.setDate(cdDeadline.getDate() - 3);
      
      return Response.json({ success: true, closing_id: schedule.id, checklist_items: checklistItems.length, trid_deadlines: { cd_must_be_sent_by: cdDeadline.toISOString().split('T')[0] } });
    }

    if (action === 'get_timeline') {
      const schedules = await base44.entities.ClosingSchedule.filter({ deal_id });
      const schedule = schedules[0];
      
      if (!schedule) return Response.json({ timeline: [], critical_dates: {} });
      
      const closingDate = new Date(schedule.closing_date);
      const timeline = [
        { date: new Date(closingDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], event: 'Final document review' },
        { date: new Date(closingDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], event: 'CD must be sent (TRID)' },
        { date: new Date(closingDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], event: 'Final walkthrough' },
        { date: schedule.closing_date, event: 'Closing Day' }
      ];
      
      return Response.json({ timeline, critical_dates: { closing_date: schedule.closing_date, cd_deadline: timeline[1].date } });
    }

    if (action === 'update_checklist') {
      const { checklist_id, status, notes } = data;
      
      await base44.entities.ClosingChecklist.update(checklist_id, {
        status, notes,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        completed_by: status === 'completed' ? user.email : null
      });
      
      return Response.json({ success: true });
    }

    if (action === 'confirm_clear_to_close') {
      // Check all conditions
      const conditions = await base44.entities.Condition.filter({ deal_id });
      const openConditions = conditions.filter(c => c.status !== 'approved' && c.status !== 'waived');
      
      // Check title clearance
      const titleOrders = await base44.entities.TitleOrder.filter({ deal_id });
      const titleClear = titleOrders.length === 0 || titleOrders[0]?.status === 'clear';
      
      const blockingItems = [];
      if (openConditions.length > 0) blockingItems.push(`${openConditions.length} open conditions`);
      if (!titleClear) blockingItems.push('Title not clear');
      
      const clearToClose = blockingItems.length === 0;
      
      if (clearToClose) {
        const schedules = await base44.entities.ClosingSchedule.filter({ deal_id });
        if (schedules.length > 0) {
          await base44.entities.ClosingSchedule.update(schedules[0].id, { clear_to_close: true });
        }
        await base44.entities.Deal.update(deal_id, { status: 'clear_to_close' });
      }
      
      return Response.json({ clear_to_close: clearToClose, blocking_items: blockingItems });
    }

    if (action === 'record_closing') {
      const { funding_date, recording_date } = data;
      
      const schedules = await base44.entities.ClosingSchedule.filter({ deal_id });
      if (schedules.length > 0) {
        await base44.entities.ClosingSchedule.update(schedules[0].id, { funding_date, recording_date, status: 'completed' });
      }
      
      await base44.entities.Deal.update(deal_id, { status: 'funded' });
      
      return Response.json({ success: true, loan_status: 'funded' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Closing coordination error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});