/**
 * AI Assistant Chat
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { message, context } = body;

    if (!message) {
      return Response.json({ error: 'Missing message' }, { status: 400 });
    }

    // Use InvokeLLM for AI response
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a helpful AI assistant for a loan origination platform called LoanGenius. 
      You help users with questions about loans, DSCR calculations, underwriting, and general mortgage questions.
      
      User question: ${message}
      
      ${context ? `Additional context: ${JSON.stringify(context)}` : ''}
      
      Provide a helpful, professional response.`,
      add_context_from_internet: true,
    });

    return Response.json({
      success: true,
      response: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});