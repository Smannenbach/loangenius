import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Check OpenAI availability
    let openaiStatus = 'unconfigured';
    if (Deno.env.get('OpenAI_API_Key')) {
      openaiStatus = 'available';
    }

    // Check Anthropic availability
    let anthropicStatus = 'unconfigured';
    if (Deno.env.get('Anthropic_API_Key')) {
      anthropicStatus = 'available';
    }

    // Check Google AI availability
    let googleStatus = 'unconfigured';
    if (Deno.env.get('Google_Gemini_API_Key')) {
      googleStatus = 'available';
    }

    const hasActiveProvider = openaiStatus === 'available' || anthropicStatus === 'available' || googleStatus === 'available';

    return Response.json({
      status: hasActiveProvider ? 'operational' : 'degraded',
      providers: {
        openai: openaiStatus,
        anthropic: anthropicStatus,
        google: googleStatus
      },
      message: hasActiveProvider 
        ? 'AI services are operational' 
        : 'No AI providers configured. Add API keys in Settings > Integrations.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI status check failed:', error);
    return Response.json({
      status: 'error',
      message: 'Failed to check AI service status',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});