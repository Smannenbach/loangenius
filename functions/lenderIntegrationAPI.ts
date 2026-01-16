import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case 'list_integrations': {
        const integrations = await base44.entities.LenderIntegration.filter({
          org_id: params.org_id
        });
        return Response.json({ success: true, integrations });
      }

      case 'create_integration': {
        const integration = await base44.entities.LenderIntegration.create({
          org_id: params.org_id,
          lender_name: params.lender_name,
          lender_type: params.lender_type,
          api_type: params.api_type || 'MISMO_34',
          api_endpoint: params.api_endpoint,
          submission_email: params.submission_email,
          contact_name: params.contact_name,
          contact_email: params.contact_email,
          contact_phone: params.contact_phone,
          supported_products: params.supported_products || [],
          supported_states: params.supported_states || [],
          min_loan_amount: params.min_loan_amount,
          max_loan_amount: params.max_loan_amount,
          min_dscr: params.min_dscr,
          max_ltv: params.max_ltv,
          status: 'active'
        });
        return Response.json({ success: true, integration });
      }

      case 'submit_to_lender': {
        const { deal_id, lender_integration_id, submission_type } = params;

        // Get deal data
        const deal = await base44.entities.Deal.get(deal_id);
        if (!deal) {
          return Response.json({ error: 'Deal not found' }, { status: 404 });
        }

        // Get lender integration
        const integration = await base44.entities.LenderIntegration.get(lender_integration_id);
        if (!integration) {
          return Response.json({ error: 'Lender integration not found' }, { status: 404 });
        }

        // Generate MISMO XML
        let mismoUrl = null;
        try {
          const mismoResponse = await base44.functions.invoke('generateMISMO34', { deal_id });
          if (mismoResponse.data?.file_url) {
            mismoUrl = mismoResponse.data.file_url;
          }
        } catch (e) {
          console.log('MISMO generation failed:', e.message);
        }

        // Get documents for submission
        const documents = await base44.entities.Document.filter({ deal_id });
        const docIds = documents.map(d => d.id);

        // Create submission record
        const submission = await base44.entities.LenderSubmission.create({
          org_id: deal.org_id,
          deal_id,
          lender_integration_id,
          lender_name: integration.lender_name,
          submission_type: submission_type || 'initial',
          status: 'pending',
          submission_method: integration.api_type,
          submitted_by: user.email,
          mismo_file_url: mismoUrl,
          documents_submitted: docIds
        });

        // Handle submission based on API type
        let submitResult = { success: false };

        switch (integration.api_type) {
          case 'EMAIL':
            // Send via email
            if (integration.submission_email) {
              await base44.integrations.Core.SendEmail({
                to: integration.submission_email,
                subject: `Loan Submission: ${deal.deal_number || deal_id}`,
                body: `New loan submission for review.\n\nDeal: ${deal.deal_number}\nLoan Amount: $${(deal.loan_amount || 0).toLocaleString()}\nProduct: ${deal.loan_product}\n\nMISMO file and documents attached.`,
                from_name: 'LoanGenius'
              });
              submitResult = { success: true, method: 'email' };
            }
            break;

          case 'REST_API':
            // Call lender's REST API
            if (integration.api_endpoint) {
              try {
                const apiResponse = await fetch(integration.api_endpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${integration.api_key_encrypted}`
                  },
                  body: JSON.stringify({
                    deal_id,
                    loan_amount: deal.loan_amount,
                    loan_product: deal.loan_product,
                    mismo_url: mismoUrl
                  })
                });
                const apiResult = await apiResponse.json();
                submitResult = { 
                  success: apiResponse.ok, 
                  method: 'api',
                  response: apiResult
                };
              } catch (apiError) {
                submitResult = { success: false, error: apiError.message };
              }
            }
            break;

          case 'MANUAL':
            submitResult = { success: true, method: 'manual', message: 'Marked for manual submission' };
            break;

          default:
            submitResult = { success: true, method: 'queued' };
        }

        // Update submission status
        await base44.entities.LenderSubmission.update(submission.id, {
          status: submitResult.success ? 'submitted' : 'pending',
          submitted_at: submitResult.success ? new Date().toISOString() : null,
          response_message: submitResult.message || submitResult.error
        });

        // Update integration stats
        await base44.entities.LenderIntegration.update(lender_integration_id, {
          last_submission_at: new Date().toISOString(),
          total_submissions: (integration.total_submissions || 0) + 1,
          successful_submissions: submitResult.success 
            ? (integration.successful_submissions || 0) + 1 
            : integration.successful_submissions
        });

        return Response.json({
          success: true,
          submission_id: submission.id,
          result: submitResult
        });
      }

      case 'get_submissions': {
        const submissions = await base44.entities.LenderSubmission.filter({
          deal_id: params.deal_id
        });
        return Response.json({ success: true, submissions });
      }

      case 'update_submission_status': {
        const { submission_id, status, lender_loan_number, conditions, pricing, notes } = params;
        
        await base44.entities.LenderSubmission.update(submission_id, {
          status,
          lender_loan_number,
          conditions,
          pricing,
          notes,
          lender_response_at: new Date().toISOString()
        });

        return Response.json({ success: true });
      }

      case 'match_lenders': {
        // Find matching lenders for a deal
        const { deal_id } = params;
        const deal = await base44.entities.Deal.get(deal_id);
        
        // Get property to check state
        const dealProps = await base44.entities.DealProperty.filter({ deal_id });
        let propertyState = null;
        if (dealProps.length > 0) {
          const prop = await base44.entities.Property.get(dealProps[0].property_id);
          propertyState = prop?.address_state;
        }

        const allIntegrations = await base44.entities.LenderIntegration.filter({
          org_id: deal.org_id,
          status: 'active'
        });

        const matchedLenders = allIntegrations.filter(lender => {
          // Check loan amount
          if (lender.min_loan_amount && deal.loan_amount < lender.min_loan_amount) return false;
          if (lender.max_loan_amount && deal.loan_amount > lender.max_loan_amount) return false;
          
          // Check state
          if (lender.supported_states?.length > 0 && propertyState) {
            if (!lender.supported_states.includes(propertyState) && 
                !lender.supported_states.includes('Nationwide')) {
              return false;
            }
          }

          // Check product type
          if (lender.supported_products?.length > 0) {
            if (!lender.supported_products.includes(deal.loan_product)) {
              return false;
            }
          }

          return true;
        });

        return Response.json({ 
          success: true, 
          matched_lenders: matchedLenders,
          total_checked: allIntegrations.length
        });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Lender integration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});