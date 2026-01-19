import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Allow automation calls without user auth
    const isAutomation = req.headers.get('x-automation') === 'true';
    if (!user && !isAutomation) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    
    // Handle entity automation payload (triggered by Deal update to 'funded')
    // Entity automations send: { event: { type, entity_name, entity_id }, data: {...} }
    let deal_id = body.deal_id;
    if (!deal_id && body.event?.entity_id) {
      deal_id = body.event.entity_id;
    }
    if (!deal_id && body.data?.id) {
      deal_id = body.data.id;
    }

    if (!deal_id) {
      return Response.json({ error: 'deal_id required' }, { status: 400 });
    }

    // Get deal details
    const deal = await base44.asServiceRole.entities.Deal.get(deal_id);

    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Only share funded deals
    if (deal.stage !== 'funded') {
      return Response.json({ 
        message: 'Deal not yet funded, skipping LinkedIn share',
        stage: deal.stage 
      });
    }

    // Get LinkedIn access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('linkedin');
    
    if (!accessToken) {
      return Response.json({ 
        error: 'LinkedIn not authorized. Please authorize in Settings.' 
      }, { status: 403 });
    }

    // Get LinkedIn user profile to get the person URN
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!profileResponse.ok) {
      return Response.json({ 
        error: 'Failed to get LinkedIn profile' 
      }, { status: profileResponse.status });
    }

    const profile = await profileResponse.json();
    const authorUrn = `urn:li:person:${profile.sub}`;

    // Format loan amount
    const loanAmount = deal.loan_amount 
      ? new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          maximumFractionDigits: 0 
        }).format(deal.loan_amount)
      : 'N/A';

    // Create post content
    const postText = `🎉 Exciting news! Just closed a ${deal.loan_product || 'DSCR'} loan for ${loanAmount}!

${deal.loan_purpose || 'Investment property'} • ${deal.loan_term_months ? `${deal.loan_term_months} month term` : ''}${deal.interest_rate ? ` • ${deal.interest_rate}% rate` : ''}

Another successful closing helping investors build wealth through real estate! 💼🏡

#RealEstateInvestment #DSCRLoan #MortgageLending #LoanOfficer #RealEstateFinance`;

    // Post to LinkedIn using UGC API
    const postData = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: postText
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(postData)
    });

    if (!postResponse.ok) {
      const error = await postResponse.text();
      return Response.json({ 
        error: 'Failed to post to LinkedIn',
        details: error
      }, { status: postResponse.status });
    }

    const result = await postResponse.json();

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id: deal.org_id,
      deal_id: deal.id,
      activity_type: 'DEAL_UPDATED',
      description: `Shared loan funding on LinkedIn`,
      source: 'system',
      user_id: user.email,
      metadata: { 
        linkedin_post_id: result.id,
        deal_number: deal.deal_number
      }
    });

    return Response.json({
      success: true,
      post_id: result.id,
      message: 'Successfully shared on LinkedIn'
    });

  } catch (error) {
    console.error('LinkedIn share error:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
});