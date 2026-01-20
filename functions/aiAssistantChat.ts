/**
 * AI Assistant Chat - Chat with AI about loans and deals
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { message, context = {} } = body;

    if (!message) {
      return Response.json({ ok: false, error: 'Missing message' }, { status: 400 });
    }

    const systemPrompt = `You are LoanGenius AI, an expert assistant for commercial real estate loan origination. 
You help loan officers with DSCR calculations, loan structuring, underwriting questions, and general mortgage guidance.
Be concise, accurate, and professional. If you don't know something, say so.`;

    const prompt = `${systemPrompt}\n\nUser: ${message}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: context.search_web || false,
    });

    return Response.json({
      ok: true,
      response: response,
      message: typeof response === 'string' ? response : response.text || JSON.stringify(response),
    });
  } catch (error) {
    console.error('aiAssistantChat error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});