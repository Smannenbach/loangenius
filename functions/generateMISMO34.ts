/**
 * Generate MISMO 3.4 XML - Export deal to MISMO format
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { deal_id } = body;

    if (!deal_id) {
      return Response.json({ ok: false, error: 'Missing deal_id' }, { status: 400 });
    }

    const deals = await base44.entities.Deal.filter({ id: deal_id });
    if (deals.length === 0) {
      return Response.json({ ok: false, error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    // Basic MISMO 3.4 XML structure (simplified)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas">
  <DEAL_SETS>
    <DEAL_SET>
      <DEALS>
        <DEAL>
          <LOANS>
            <LOAN>
              <LOAN_IDENTIFIER IdentifierOwnerURI="LoanGenius" IdentifierValue="${deal.deal_number || deal.id}" />
              <LOAN_DETAIL>
                <ApplicationReceivedDate>${deal.application_date || new Date().toISOString().split('T')[0]}</ApplicationReceivedDate>
              </LOAN_DETAIL>
              <TERMS_OF_LOAN>
                <BaseLoanAmount>${deal.loan_amount || 0}</BaseLoanAmount>
                <LoanPurposeType>${deal.loan_purpose || 'Purchase'}</LoanPurposeType>
                <MortgageType>Conventional</MortgageType>
                <NoteRatePercent>${deal.interest_rate || 0}</NoteRatePercent>
              </TERMS_OF_LOAN>
            </LOAN>
          </LOANS>
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</MESSAGE>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename=MISMO_${deal.deal_number}.xml`,
      },
    });
  } catch (error) {
    console.error('generateMISMO34 error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});