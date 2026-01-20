/**
 * Generate MISMO 3.4 XML Export
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { deal_id, format = 'xml' } = body;

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Get deal data
    const deals = await base44.entities.Deal.filter({ id: deal_id });
    if (deals.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    // Get related data
    const [dealBorrowers, properties] = await Promise.all([
      base44.entities.DealBorrower.filter({ deal_id: deal_id }),
      base44.entities.DealProperty.filter({ deal_id: deal_id }),
    ]);

    // Generate MISMO 3.4 XML structure
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         MISMOVersionID="3.4">
  <ABOUT_VERSIONS>
    <ABOUT_VERSION>
      <DataVersionIdentifier>201703</DataVersionIdentifier>
      <DataVersionName>MISMO 3.4</DataVersionName>
    </ABOUT_VERSION>
  </ABOUT_VERSIONS>
  <DEAL_SETS>
    <DEAL_SET>
      <DEALS>
        <DEAL>
          <LOANS>
            <LOAN>
              <LOAN_IDENTIFIERS>
                <LOAN_IDENTIFIER>
                  <LoanIdentifier>${deal.deal_number || deal.id}</LoanIdentifier>
                  <LoanIdentifierType>LenderLoan</LoanIdentifierType>
                </LOAN_IDENTIFIER>
              </LOAN_IDENTIFIERS>
              <TERMS_OF_LOAN>
                <LoanPurposeType>${deal.loan_purpose || 'Purchase'}</LoanPurposeType>
                <NoteAmount>${deal.loan_amount || 0}</NoteAmount>
                <NoteRatePercent>${deal.interest_rate || 0}</NoteRatePercent>
                <LoanTermInMonths>${deal.loan_term_months || 360}</LoanTermInMonths>
              </TERMS_OF_LOAN>
            </LOAN>
          </LOANS>
          <PARTIES>
            ${dealBorrowers.map(b => `
            <PARTY>
              <INDIVIDUAL>
                <NAME>
                  <FirstName>${b.first_name || ''}</FirstName>
                  <LastName>${b.last_name || ''}</LastName>
                </NAME>
              </INDIVIDUAL>
              <ROLES>
                <ROLE>
                  <BORROWER>
                    <BORROWER_DETAIL>
                      <BorrowerBirthDate>${b.date_of_birth || ''}</BorrowerBirthDate>
                    </BORROWER_DETAIL>
                  </BORROWER>
                </ROLE>
              </ROLES>
            </PARTY>
            `).join('')}
          </PARTIES>
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</MESSAGE>`;

    return Response.json({
      success: true,
      xml: xml,
      format: 'MISMO_3.4',
      deal_number: deal.deal_number,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});