/**
 * Get Google Maps API Key (for frontend maps)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('Google_Maps_Platform_API_Key');
    // FIX: Corrected typo from 'Goolge' to 'Google'
    const apiKey = Deno.env.get('Google_Maps_Platform_API_Key') || Deno.env.get('Goolge_Maps_Platform_API_Key');
    
    if (!apiKey) {
      return Response.json({ error: 'Maps API key not configured' }, { status: 500 });
    }

    return Response.json({
      api_key: apiKey,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});