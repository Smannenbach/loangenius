import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Return Google Maps API key for frontend use
 * Called from frontend address autocomplete
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get API key from environment (checking multiple possible spellings)
    const key = Deno.env.get('Goolge_Maps_Platform_API_Key') || 
                Deno.env.get('Google_Maps_Platform_API_Key') ||
                Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!key) {
      return Response.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    return Response.json({ key });
  } catch (error) {
    console.error('Error getting Google Maps key:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});