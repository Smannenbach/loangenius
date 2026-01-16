import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SENDGRID_API_KEY = Deno.env.get('Sendgrid_API_Key');

/**
 * Send email via SendGrid API
 */
async function sendEmailViaSendGrid(to, subject, htmlBody, fromName = 'LoanGenius') {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: 'submissions@loangenius.app', name: fromName },
      subject: subject,
      content: [{ type: 'text/html', value: htmlBody }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
  }

  return { success: true, provider: 'sendgrid' };
}

/**
 * Generate introduction email HTML for lender outreach
 */
function generateIntroEmailHTML(deal, property, borrower, lenderName, contactName) {
  const loanAmount = (deal.loan_amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const purchasePrice = (deal.purchase_price || deal.appraised_value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const ltv = deal.ltv ? `${deal.ltv.toFixed(1)}%` : 'TBD';
  const dscr = deal.dscr ? deal.dscr.toFixed(2) : 'TBD';
  
  const propertyAddress = property 
    ? `${property.address_street}, ${property.address_city}, ${property.address_state} ${property.address_zip}`
    : 'Property details available upon request';
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">New Loan Opportunity</h1>
        <p style="color: #bfdbfe; margin: 10px 0 0 0;">LoanGenius Submission</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="color: #334155; font-size: 16px; margin-top: 0;">
          Hi ${contactName || 'Lending Team'},
        </p>
        <p style="color: #334155; font-size: 16px;">
          I have a new ${deal.loan_product || 'DSCR'} loan opportunity that fits your lending criteria. Here are the key details:
        </p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <h3 style="color: #1e40af; margin-top: 0; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            Loan Summary
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 40%;">Loan Amount:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${loanAmount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Loan Purpose:</td>
              <td style="padding: 8px 0; color: #0f172a;">${deal.loan_purpose || 'Purchase'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Product Type:</td>
              <td style="padding: 8px 0; color: #0f172a;">${deal.loan_product || 'DSCR'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">LTV:</td>
              <td style="padding: 8px 0; color: #0f172a;">${ltv}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">DSCR:</td>
              <td style="padding: 8px 0; color: #0f172a;">${dscr}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <h3 style="color: #1e40af; margin-top: 0; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            Property Details
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 40%;">Address:</td>
              <td style="padding: 8px 0; color: #0f172a;">${propertyAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Property Type:</td>
              <td style="padding: 8px 0; color: #0f172a;">${property?.property_type || deal.property_type || 'SFR'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Occupancy:</td>
              <td style="padding: 8px 0; color: #0f172a;">${deal.occupancy_type || 'Investment'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Purchase Price / Value:</td>
              <td style="padding: 8px 0; color: #0f172a;">${purchasePrice}</td>
            </tr>
          </table>
        </div>
        
        ${borrower ? `
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <h3 style="color: #1e40af; margin-top: 0; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            Borrower Profile
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 40%;">Entity/Individual:</td>
              <td style="padding: 8px 0; color: #0f172a;">${borrower.borrower_type === 'entity' ? 'Entity' : 'Individual'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Credit Score (Est.):</td>
              <td style="padding: 8px 0; color: #0f172a;">${borrower.credit_score_est || 'Available upon request'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Citizenship:</td>
              <td style="padding: 8px 0; color: #0f172a;">${borrower.citizenship_status?.replace(/_/g, ' ') || 'US Citizen'}</td>
            </tr>
          </table>
        </div>
        ` : ''}
        
        <p style="color: #334155; font-size: 16px;">
          I'd love to discuss this opportunity further. Please let me know your availability for a quick call, or feel free to send over your pricing and I can provide additional documentation.
        </p>
        
        <p style="color: #334155; font-size: 16px;">
          Best regards,<br>
          <strong>The LoanGenius Team</strong>
        </p>
      </div>
      
      <div style="background: #1e293b; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          Sent via LoanGenius • Professional Loan Origination Platform
        </p>
      </div>
    </div>
  `;
}

/**
 * Match lenders based on deal parameters
 */
async function matchLendersForDeal(base44, deal, property) {
  const allLenders = await base44.entities.LenderIntegration.filter({
    org_id: deal.org_id,
    status: 'active'
  });

  const propertyState = property?.address_state;
  const matchedLenders = [];
  const matchReasons = {};

  for (const lender of allLenders) {
    const reasons = [];
    let score = 100;

    // Check loan amount
    if (lender.min_loan_amount && deal.loan_amount < lender.min_loan_amount) {
      continue; // Skip - below minimum
    }
    if (lender.max_loan_amount && deal.loan_amount > lender.max_loan_amount) {
      continue; // Skip - above maximum
    }
    if (deal.loan_amount >= (lender.min_loan_amount || 0)) {
      reasons.push('Loan amount within range');
    }

    // Check state coverage
    if (lender.supported_states?.length > 0 && propertyState) {
      const statesLower = lender.supported_states.map(s => s.toLowerCase());
      if (statesLower.includes(propertyState.toLowerCase()) || 
          statesLower.includes('nationwide') ||
          statesLower.includes('all states')) {
        reasons.push(`Covers ${propertyState}`);
      } else {
        continue; // Skip - state not covered
      }
    }

    // Check product type
    if (lender.supported_products?.length > 0) {
      const productsLower = lender.supported_products.map(p => p.toLowerCase());
      const dealProduct = (deal.loan_product || '').toLowerCase();
      if (productsLower.some(p => dealProduct.includes(p) || p.includes(dealProduct))) {
        reasons.push(`Supports ${deal.loan_product}`);
      } else {
        continue; // Skip - product not supported
      }
    }

    // Check DSCR requirement
    if (lender.min_dscr && deal.dscr) {
      if (deal.dscr >= lender.min_dscr) {
        reasons.push(`DSCR ${deal.dscr} meets min ${lender.min_dscr}`);
      } else {
        score -= 20; // Penalty but don't exclude
      }
    }

    // Check LTV requirement
    if (lender.max_ltv && deal.ltv) {
      if (deal.ltv <= lender.max_ltv) {
        reasons.push(`LTV ${deal.ltv}% within max ${lender.max_ltv}%`);
      } else {
        continue; // Skip - LTV too high
      }
    }

    // Boost score for auto-submit enabled lenders
    if (lender.auto_submit_enabled) {
      score += 10;
      reasons.push('Auto-submit enabled');
    }

    matchedLenders.push({ ...lender, match_score: score });
    matchReasons[lender.id] = reasons;
  }

  // Sort by match score
  matchedLenders.sort((a, b) => b.match_score - a.match_score);

  return { matchedLenders, matchReasons };
}

/**
 * Auto Lender Outreach System
 * Actions: match_lenders, send_intro, auto_outreach, bulk_outreach
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case 'match_lenders': {
        // Find matching lenders for a deal
        const { deal_id } = params;
        
        const deal = await base44.entities.Deal.get(deal_id);
        if (!deal) {
          return Response.json({ error: 'Deal not found' }, { status: 404 });
        }

        // Get property
        let property = null;
        const dealProps = await base44.entities.DealProperty.filter({ deal_id });
        if (dealProps.length > 0) {
          property = await base44.entities.Property.get(dealProps[0].property_id);
        }

        const { matchedLenders, matchReasons } = await matchLendersForDeal(base44, deal, property);

        // Get existing submissions to mark already contacted
        const existingSubmissions = await base44.entities.LenderSubmission.filter({ deal_id });
        const contactedLenderIds = new Set(existingSubmissions.map(s => s.lender_integration_id));

        const lendersWithStatus = matchedLenders.map(lender => ({
          ...lender,
          already_contacted: contactedLenderIds.has(lender.id),
          match_reasons: matchReasons[lender.id] || []
        }));

        return Response.json({
          success: true,
          matched_lenders: lendersWithStatus,
          total_matched: lendersWithStatus.length,
          already_contacted: lendersWithStatus.filter(l => l.already_contacted).length
        });
      }

      case 'send_intro': {
        // Send introduction email to a specific lender
        const { deal_id, lender_id, include_mismo } = params;

        const deal = await base44.entities.Deal.get(deal_id);
        if (!deal) {
          return Response.json({ error: 'Deal not found' }, { status: 404 });
        }

        const lender = await base44.entities.LenderIntegration.get(lender_id);
        if (!lender) {
          return Response.json({ error: 'Lender not found' }, { status: 404 });
        }

        if (!lender.contact_email && !lender.submission_email) {
          return Response.json({ error: 'Lender has no contact email configured' }, { status: 400 });
        }

        // Get property and borrower data
        let property = null;
        const dealProps = await base44.entities.DealProperty.filter({ deal_id });
        if (dealProps.length > 0) {
          property = await base44.entities.Property.get(dealProps[0].property_id);
        }

        let borrower = null;
        const dealBorrowers = await base44.entities.DealBorrower.filter({ deal_id });
        if (dealBorrowers.length > 0) {
          borrower = await base44.entities.Borrower.get(dealBorrowers[0].borrower_id);
        }

        // Generate MISMO if requested
        let mismoUrl = null;
        if (include_mismo) {
          try {
            const mismoResponse = await base44.functions.invoke('generateMISMO34', { deal_id });
            if (mismoResponse.data?.file_url) {
              mismoUrl = mismoResponse.data.file_url;
            }
          } catch (e) {
            console.log('MISMO generation skipped:', e.message);
          }
        }

        // Generate and send intro email
        const recipientEmail = lender.contact_email || lender.submission_email;
        const emailHtml = generateIntroEmailHTML(deal, property, borrower, lender.lender_name, lender.contact_name);
        const subject = `New ${deal.loan_product || 'DSCR'} Loan Opportunity - ${property?.address_city || 'Investment Property'}, ${property?.address_state || ''}`;

        await sendEmailViaSendGrid(recipientEmail, subject, emailHtml, user.full_name || 'LoanGenius');

        // Create submission record
        const submission = await base44.entities.LenderSubmission.create({
          org_id: deal.org_id,
          deal_id,
          lender_integration_id: lender.id,
          lender_name: lender.lender_name,
          submission_type: 'initial',
          status: 'submitted',
          submission_method: 'EMAIL',
          submitted_at: new Date().toISOString(),
          submitted_by: user.email,
          mismo_file_url: mismoUrl,
          notes: 'Introduction email sent via automated outreach'
        });

        // Update lender stats
        await base44.entities.LenderIntegration.update(lender.id, {
          last_submission_at: new Date().toISOString(),
          total_submissions: (lender.total_submissions || 0) + 1
        });

        // Log communication
        await base44.entities.CommunicationsLog.create({
          org_id: deal.org_id,
          deal_id,
          channel: 'email',
          direction: 'outbound',
          to: recipientEmail,
          from: user.email,
          subject,
          body: `Introduction email sent to ${lender.lender_name}`,
          status: 'sent'
        });

        return Response.json({
          success: true,
          submission_id: submission.id,
          lender_name: lender.lender_name,
          sent_to: recipientEmail
        });
      }

      case 'auto_outreach': {
        // Automatically send to all matching lenders with auto_submit_enabled
        const { deal_id, max_lenders = 5, include_mismo = false } = params;

        const deal = await base44.entities.Deal.get(deal_id);
        if (!deal) {
          return Response.json({ error: 'Deal not found' }, { status: 404 });
        }

        // Get property
        let property = null;
        const dealProps = await base44.entities.DealProperty.filter({ deal_id });
        if (dealProps.length > 0) {
          property = await base44.entities.Property.get(dealProps[0].property_id);
        }

        // Get borrower
        let borrower = null;
        const dealBorrowers = await base44.entities.DealBorrower.filter({ deal_id });
        if (dealBorrowers.length > 0) {
          borrower = await base44.entities.Borrower.get(dealBorrowers[0].borrower_id);
        }

        // Get matching lenders
        const { matchedLenders } = await matchLendersForDeal(base44, deal, property);

        // Filter to auto-submit enabled and not already contacted
        const existingSubmissions = await base44.entities.LenderSubmission.filter({ deal_id });
        const contactedLenderIds = new Set(existingSubmissions.map(s => s.lender_integration_id));

        const autoLenders = matchedLenders
          .filter(l => l.auto_submit_enabled && !contactedLenderIds.has(l.id) && (l.contact_email || l.submission_email))
          .slice(0, max_lenders);

        if (autoLenders.length === 0) {
          return Response.json({
            success: true,
            message: 'No eligible lenders for auto-outreach',
            sent_count: 0
          });
        }

        // Generate MISMO once if needed
        let mismoUrl = null;
        if (include_mismo) {
          try {
            const mismoResponse = await base44.functions.invoke('generateMISMO34', { deal_id });
            if (mismoResponse.data?.file_url) {
              mismoUrl = mismoResponse.data.file_url;
            }
          } catch (e) {
            console.log('MISMO generation skipped:', e.message);
          }
        }

        const results = [];

        for (const lender of autoLenders) {
          try {
            const recipientEmail = lender.contact_email || lender.submission_email;
            const emailHtml = generateIntroEmailHTML(deal, property, borrower, lender.lender_name, lender.contact_name);
            const subject = `New ${deal.loan_product || 'DSCR'} Loan Opportunity - ${property?.address_city || 'Investment Property'}, ${property?.address_state || ''}`;

            await sendEmailViaSendGrid(recipientEmail, subject, emailHtml, user.full_name || 'LoanGenius');

            // Create submission record
            const submission = await base44.entities.LenderSubmission.create({
              org_id: deal.org_id,
              deal_id,
              lender_integration_id: lender.id,
              lender_name: lender.lender_name,
              submission_type: 'initial',
              status: 'submitted',
              submission_method: 'EMAIL',
              submitted_at: new Date().toISOString(),
              submitted_by: user.email,
              mismo_file_url: mismoUrl,
              notes: 'Auto-outreach introduction email'
            });

            // Update lender stats
            await base44.entities.LenderIntegration.update(lender.id, {
              last_submission_at: new Date().toISOString(),
              total_submissions: (lender.total_submissions || 0) + 1
            });

            results.push({
              lender_name: lender.lender_name,
              sent_to: recipientEmail,
              success: true,
              submission_id: submission.id
            });
          } catch (error) {
            results.push({
              lender_name: lender.lender_name,
              success: false,
              error: error.message
            });
          }
        }

        // Log activity
        await base44.entities.CommunicationsLog.create({
          org_id: deal.org_id,
          deal_id,
          channel: 'email',
          direction: 'outbound',
          to: 'multiple lenders',
          from: user.email,
          subject: 'Auto Lender Outreach',
          body: `Sent introduction emails to ${results.filter(r => r.success).length} lenders`,
          status: 'sent'
        });

        return Response.json({
          success: true,
          sent_count: results.filter(r => r.success).length,
          failed_count: results.filter(r => !r.success).length,
          results
        });
      }

      case 'submit_mismo': {
        // Submit MISMO package to lender (for API/SFTP configured lenders)
        const { deal_id, lender_id } = params;

        const deal = await base44.entities.Deal.get(deal_id);
        const lender = await base44.entities.LenderIntegration.get(lender_id);

        if (!deal || !lender) {
          return Response.json({ error: 'Deal or lender not found' }, { status: 404 });
        }

        // Generate MISMO
        let mismoUrl = null;
        try {
          const mismoResponse = await base44.functions.invoke('generateMISMO34', { deal_id });
          if (mismoResponse.data?.file_url) {
            mismoUrl = mismoResponse.data.file_url;
          }
        } catch (e) {
          return Response.json({ error: 'Failed to generate MISMO: ' + e.message }, { status: 500 });
        }

        let submitResult = { success: false };

        if (lender.api_type === 'REST_API' && lender.api_endpoint) {
          // Submit via REST API
          try {
            const apiResponse = await fetch(lender.api_endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${lender.api_key_encrypted}`
              },
              body: JSON.stringify({
                deal_number: deal.deal_number,
                loan_amount: deal.loan_amount,
                loan_product: deal.loan_product,
                mismo_url: mismoUrl
              })
            });
            const apiResult = await apiResponse.json();
            submitResult = { success: apiResponse.ok, method: 'api', response: apiResult };
          } catch (apiError) {
            submitResult = { success: false, error: apiError.message };
          }
        } else if (lender.api_type === 'EMAIL' && (lender.submission_email || lender.contact_email)) {
          // Submit via email with MISMO attachment link
          const recipientEmail = lender.submission_email || lender.contact_email;
          const emailBody = `
            <p>Please find attached the MISMO 3.4 submission package for:</p>
            <ul>
              <li><strong>Deal:</strong> ${deal.deal_number || deal_id}</li>
              <li><strong>Loan Amount:</strong> $${(deal.loan_amount || 0).toLocaleString()}</li>
              <li><strong>Product:</strong> ${deal.loan_product}</li>
            </ul>
            <p><a href="${mismoUrl}">Download MISMO 3.4 XML</a></p>
          `;
          
          await sendEmailViaSendGrid(
            recipientEmail,
            `MISMO Submission: ${deal.deal_number || 'New Loan'}`,
            emailBody,
            user.full_name || 'LoanGenius'
          );
          
          submitResult = { success: true, method: 'email' };
        }

        // Create submission record
        const submission = await base44.entities.LenderSubmission.create({
          org_id: deal.org_id,
          deal_id,
          lender_integration_id: lender.id,
          lender_name: lender.lender_name,
          submission_type: 'initial',
          status: submitResult.success ? 'submitted' : 'pending',
          submission_method: lender.api_type,
          submitted_at: submitResult.success ? new Date().toISOString() : null,
          submitted_by: user.email,
          mismo_file_url: mismoUrl,
          response_message: submitResult.error || null
        });

        // Update lender stats
        await base44.entities.LenderIntegration.update(lender.id, {
          last_submission_at: new Date().toISOString(),
          total_submissions: (lender.total_submissions || 0) + 1,
          successful_submissions: submitResult.success 
            ? (lender.successful_submissions || 0) + 1 
            : lender.successful_submissions
        });

        return Response.json({
          success: submitResult.success,
          submission_id: submission.id,
          method: submitResult.method,
          mismo_url: mismoUrl
        });
      }

      default:
        return Response.json({ error: 'Invalid action. Use: match_lenders, send_intro, auto_outreach, submit_mismo' }, { status: 400 });
    }

  } catch (error) {
    console.error('Auto lender outreach error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});