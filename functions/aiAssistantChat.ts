import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export default Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, deal_id, conversation_context = [] } = await req.json();

    if (!message) {
      return Response.json({ error: 'Missing message' }, { status: 400 });
    }

    // Build system prompt based on user role
    const isAdmin = user.role === 'admin';
    const systemPrompt = isAdmin
      ? `You are LoanGenius AI, an expert loan origination assistant for lenders and loan officers. 
         Help with: deal underwriting, document requirements, condition management, DSCR calculations, 
         compliance questions, and best practices. Be concise and professional.`
      : `You are LoanGenius AI, an expert loan origination assistant for borrowers. 
         Help with: understanding loan terms, document requirements, application status, required documents, 
         and general mortgage questions. Be helpful, clear, and reassuring.`;

    // Fetch deal context if provided
    let dealContext = '';
    if (deal_id) {
      const deal = await base44.entities.Deal.get(deal_id);
      if (deal) {
        dealContext = `\n\nCurrent Deal Context:\n- Loan Amount: $${deal.loan_amount?.toLocaleString()}\n- Product: ${deal.loan_product}\n- Status: ${deal.status}`;
      }
    }

    // Call LLM
    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}${dealContext}\n\nPrevious messages: ${JSON.stringify(conversation_context.slice(-5))}\n\nUser: ${message}`,
      add_context_from_internet: false
    });

    // Create activity log
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id: user.org_id || 'default',
      deal_id: deal_id || null,
      action_type: 'ai_assistant_query',
      description: `AI Assistant query: ${message.substring(0, 100)}...`,
      metadata_json: { user_role: user.role }
    });

    return Response.json({
      response: llmResponse,
      timestamp: new Date().toISOString(),
      deal_id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});