import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Return Google Maps API key for frontend use
 * Called from frontend address autocomplete
 * Supports both authenticated and public access for lead forms
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check authentication but don't require it for public forms
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      // Allow unauthenticated access for public lead capture forms
    }

    // Get API key from environment (checking multiple possible spellings)
    const key = Deno.env.get('Goolge_Maps_Platform_API_Key') || 
                Deno.env.get('Google_Maps_Platform_API_Key') ||
                Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!key) {
      console.error('Google Maps API key not configured in environment');
      return Response.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    return Response.json({ key });
  } catch (error) {
    console.error('Error getting Google Maps key:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});