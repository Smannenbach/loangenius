import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'sessionId required' }, { status: 400 });
    }

    // Validate session and get deal info
    const sessionResponse = await base44.functions.invoke('portalAuth', {
      action: 'getSession',
      sessionId,
    });

    const session = sessionResponse.data;
    if (!session || !session.dealId) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get deal details
    const deal = await base44.entities.Deal.filter({
      id: session.dealId,
      org_id: session.orgId,
    });

    if (!deal || deal.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const dealData = deal[0];

    // Get document requirements status
    const requirements = await base44.entities.DealDocumentRequirement.filter({
      deal_id: session.dealId,
      org_id: session.orgId,
    });

    const documentsApproved = requirements.filter(r => r.status === 'approved').length;
    const documentsPending = requirements.filter(r => r.status !== 'approved').length;

    // Calculate days in stage and total days
    const applicationStartDate = dealData.application_date ? new Date(dealData.application_date) : new Date(dealData.created_date);
    const now = new Date();
    const daysInStage = dealData.stage_updated_at 
      ? Math.floor((now - new Date(dealData.stage_updated_at)) / (1000 * 60 * 60 * 24))
      : 0;
    const totalDays = Math.floor((now - applicationStartDate) / (1000 * 60 * 60 * 24));

    // Generate alerts
    const alerts = [];
    
    if (documentsPending > 0) {
      alerts.push({
        title: 'Missing Documents',
        message: `You have ${documentsPending} document(s) pending review. Please upload them to move forward.`,
      });
    }

    if (totalDays > 30 && dealData.stage === 'processing') {
      alerts.push({
        title: 'Extended Processing',
        message: 'Your application has been in processing for over 30 days. Please contact your loan officer.',
      });
    }

    return Response.json({
      stage: dealData.stage,
      stageUpdatedAt: dealData.stage_updated_at,
      documentsApproved,
      documentsPending,
      daysInStage,
      totalDays,
      alerts,
      dealNumber: dealData.deal_number,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});