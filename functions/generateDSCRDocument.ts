/**
 * DSCR Document Generation Backend
 * Generates all DSCR loan documents with organization branding
 * 
 * Supported document types:
 * - business_purpose_application
 * - anti_steering_letter
 * - cash_out_letter
 * - pro_forma_statement
 * - entity_checklist
 * - exception_request
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

/**
 * Fetch organization branding settings
 */
async function getOrgBranding(base44, orgId) {
  try {
    const settings = await base44.asServiceRole.entities.OrgSettings.filter({ org_id: orgId });
    const orgSettings = settings[0] || {};
    
    return {
      company_name: orgSettings.company_name || 'Your Company',
      logo_url: orgSettings.logo_url || null,
      nmls_id: orgSettings.nmls_id || '',
      phone: orgSettings.phone || '',
      address: orgSettings.address || '',
      website: orgSettings.website || '',
      primary_color: orgSettings.primary_color || '#2563eb',
      secondary_color: orgSettings.secondary_color || '#1e40af',
    };
  } catch {
    return {
      company_name: 'Your Company',
      logo_url: null,
      nmls_id: '',
      phone: '',
      address: '',
      website: '',
      primary_color: '#2563eb',
      secondary_color: '#1e40af',
    };
  }
}

/**
 * Add branded header to PDF
 */
function addHeader(pdf, branding, title) {
  let yPos = 15;
  
  // Company name (or would add logo here if we had image support)
  pdf.setFontSize(16);
  pdf.setTextColor(37, 99, 235); // Blue
  pdf.text(branding.company_name, 20, yPos);
  
  yPos += 6;
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  if (branding.nmls_id) {
    pdf.text(`NMLS# ${branding.nmls_id}`, 20, yPos);
  }
  
  yPos += 4;
  if (branding.address) {
    pdf.text(branding.address, 20, yPos);
    yPos += 4;
  }
  if (branding.phone) {
    pdf.text(branding.phone, 20, yPos);
    yPos += 4;
  }
  if (branding.website) {
    pdf.text(branding.website, 20, yPos);
  }
  
  // Document title
  yPos += 12;
  pdf.setFontSize(14);
  pdf.setTextColor(0);
  pdf.text(title, 105, yPos, { align: 'center' });
  
  // Line separator
  yPos += 4;
  pdf.setDrawColor(200);
  pdf.line(20, yPos, 190, yPos);
  
  return yPos + 10;
}

/**
 * Add branded footer to PDF
 */
function addFooter(pdf, branding, pageNum) {
  const pageHeight = pdf.internal.pageSize.height;
  
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.text(
    `${branding.company_name} | NMLS# ${branding.nmls_id || 'N/A'} | Confidential`,
    105,
    pageHeight - 10,
    { align: 'center' }
  );
  pdf.text(`Page ${pageNum}`, 190, pageHeight - 10, { align: 'right' });
}

/**
 * Generate Business Purpose Application PDF
 */
function generateBusinessPurposeApp(pdf, branding, deal, borrower, property, user) {
  let yPos = addHeader(pdf, branding, 'BUSINESS PURPOSE APPLICATION');
  
  // Application Date
  pdf.setFontSize(10);
  pdf.setTextColor(0);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
  pdf.text(`Application #: ${deal.deal_number || deal.id?.slice(0, 8)}`, 120, yPos);
  yPos += 10;
  
  // Borrower Section
  pdf.setFontSize(11);
  pdf.setTextColor(37, 99, 235);
  pdf.text('BORROWER INFORMATION', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  const borrowerInfo = [
    ['Name:', `${borrower?.first_name || ''} ${borrower?.last_name || ''}`],
    ['Email:', borrower?.email || 'N/A'],
    ['Phone:', borrower?.cell_phone || borrower?.home_phone || 'N/A'],
    ['Entity Name:', borrower?.entity_name || 'Individual'],
    ['Entity Type:', deal.entity_type || 'N/A'],
  ];
  
  borrowerInfo.forEach(([label, value]) => {
    pdf.text(label, 25, yPos);
    pdf.text(value, 70, yPos);
    yPos += 5;
  });
  yPos += 5;
  
  // Property Section
  pdf.setFontSize(11);
  pdf.setTextColor(37, 99, 235);
  pdf.text('SUBJECT PROPERTY', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  const propertyInfo = [
    ['Address:', property?.address_street || 'TBD'],
    ['City, State ZIP:', `${property?.address_city || ''}, ${property?.address_state || ''} ${property?.address_zip || ''}`],
    ['Property Type:', property?.property_type || deal.property_type || 'SFR'],
    ['Occupancy:', deal.occupancy_type || 'Investment'],
    ['Est. Value:', property?.estimated_value ? `$${property.estimated_value.toLocaleString()}` : 'TBD'],
    ['Monthly Rent:', property?.gross_rent_monthly ? `$${property.gross_rent_monthly.toLocaleString()}` : 'TBD'],
  ];
  
  propertyInfo.forEach(([label, value]) => {
    pdf.text(label, 25, yPos);
    pdf.text(value, 70, yPos);
    yPos += 5;
  });
  yPos += 5;
  
  // Loan Terms Section
  pdf.setFontSize(11);
  pdf.setTextColor(37, 99, 235);
  pdf.text('LOAN TERMS', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  const loanInfo = [
    ['Loan Product:', deal.loan_product || 'DSCR'],
    ['Loan Purpose:', deal.loan_purpose || 'Purchase'],
    ['Loan Amount:', deal.loan_amount ? `$${deal.loan_amount.toLocaleString()}` : 'TBD'],
    ['Interest Rate:', deal.interest_rate ? `${deal.interest_rate}%` : 'TBD'],
    ['Loan Term:', deal.loan_term_months ? `${deal.loan_term_months / 12} years` : '30 years'],
    ['LTV:', deal.ltv ? `${deal.ltv.toFixed(1)}%` : 'TBD'],
    ['DSCR:', deal.dscr ? deal.dscr.toFixed(2) : 'TBD'],
  ];
  
  loanInfo.forEach(([label, value]) => {
    pdf.text(label, 25, yPos);
    pdf.text(value, 70, yPos);
    yPos += 5;
  });
  yPos += 10;
  
  // Business Purpose Declaration
  pdf.setFontSize(11);
  pdf.setTextColor(37, 99, 235);
  pdf.text('BUSINESS PURPOSE DECLARATION', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  const declaration = `I/We hereby certify that the loan requested is for business or investment purposes and NOT for personal, family, or household use. The property will be used as an investment property for rental income and/or capital appreciation.`;
  
  const lines = pdf.splitTextToSize(declaration, 170);
  pdf.text(lines, 20, yPos);
  yPos += lines.length * 5 + 10;
  
  // Signature lines
  pdf.setFontSize(9);
  pdf.text('Borrower Signature: _______________________________', 20, yPos);
  pdf.text(`Date: _______________`, 140, yPos);
  yPos += 15;
  
  pdf.text('Co-Borrower Signature: ____________________________', 20, yPos);
  pdf.text(`Date: _______________`, 140, yPos);
  
  addFooter(pdf, branding, 1);
  
  return pdf;
}

/**
 * Generate Anti-Steering Letter
 */
function generateAntiSteeringLetter(pdf, branding, deal, borrower, user) {
  let yPos = addHeader(pdf, branding, 'ANTI-STEERING DISCLOSURE');
  
  pdf.setFontSize(10);
  pdf.setTextColor(0);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
  yPos += 10;
  
  pdf.text(`To: ${borrower?.first_name || ''} ${borrower?.last_name || ''}`, 20, yPos);
  yPos += 5;
  pdf.text(`Re: Loan Application - ${deal.deal_number || 'Pending'}`, 20, yPos);
  yPos += 10;
  
  pdf.setFontSize(9);
  const content = `Dear ${borrower?.first_name || 'Borrower'},

In accordance with federal anti-steering regulations, we are providing you with the following information about the loan products available to you based on your qualifications:

LOAN OPTIONS PRESENTED:

1. Primary Option - ${deal.loan_product || 'DSCR'} Loan
   • Loan Amount: $${deal.loan_amount?.toLocaleString() || 'TBD'}
   • Interest Rate: ${deal.interest_rate || 'TBD'}%
   • Loan Term: ${deal.loan_term_months ? deal.loan_term_months / 12 : 30} years
   • Estimated Monthly Payment: $${deal.monthly_pitia?.toFixed(2) || 'TBD'}

This loan option was selected based on your stated preferences and qualifications. Other loan products may be available.

CERTIFICATION:
The undersigned Loan Originator certifies that:
• The loan options presented are appropriate for the borrower's needs
• No steering occurred based on compensation or other factors
• The borrower has been informed of all material loan terms

Loan Originator: ${user?.full_name || 'Loan Officer'}
NMLS#: ${user?.nmls_id || branding.nmls_id || 'N/A'}
Company: ${branding.company_name}
Company NMLS#: ${branding.nmls_id || 'N/A'}`;

  const lines = pdf.splitTextToSize(content, 170);
  pdf.text(lines, 20, yPos);
  yPos += lines.length * 4 + 15;
  
  // Signatures
  pdf.text('Loan Originator Signature: _________________________', 20, yPos);
  pdf.text(`Date: _______________`, 140, yPos);
  yPos += 15;
  
  pdf.text('Borrower Acknowledgment: _________________________', 20, yPos);
  pdf.text(`Date: _______________`, 140, yPos);
  
  addFooter(pdf, branding, 1);
  
  return pdf;
}

/**
 * Generate Cash-Out Letter
 */
function generateCashOutLetter(pdf, branding, deal, borrower, property) {
  let yPos = addHeader(pdf, branding, 'CASH-OUT PURPOSE LETTER');
  
  pdf.setFontSize(10);
  pdf.setTextColor(0);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
  yPos += 10;
  
  pdf.setFontSize(9);
  const content = `BORROWER INFORMATION:
Name: ${borrower?.first_name || ''} ${borrower?.last_name || ''}
Property Address: ${property?.address_street || 'TBD'}, ${property?.address_city || ''}, ${property?.address_state || ''} ${property?.address_zip || ''}

CASH-OUT DETAILS:
Cash-Out Amount: $${deal.cash_out_amount?.toLocaleString() || 'TBD'}
Purpose of Funds: _______________________________________________

I/We, the undersigned borrower(s), hereby certify that the cash-out proceeds from this refinance transaction will be used for the following business/investment purpose(s):

☐ Property improvements/repairs
☐ Purchase of additional investment property
☐ Business operating expenses
☐ Debt consolidation (business debt)
☐ Reserve funds for investment property
☐ Other business purpose: _______________________________________

I/We understand and acknowledge that:
1. This loan is for business/investment purposes only
2. The property is not my/our primary residence
3. The cash-out funds will not be used for personal, family, or household purposes
4. Providing false information may result in loan default and/or legal action

CERTIFICATION:
I/We certify that the information provided above is true and accurate to the best of my/our knowledge.`;

  const lines = pdf.splitTextToSize(content, 170);
  pdf.text(lines, 20, yPos);
  yPos += lines.length * 4 + 15;
  
  // Signatures
  pdf.text('Borrower Signature: _______________________________', 20, yPos);
  pdf.text(`Date: _______________`, 140, yPos);
  yPos += 15;
  
  pdf.text('Co-Borrower Signature: ____________________________', 20, yPos);
  pdf.text(`Date: _______________`, 140, yPos);
  
  addFooter(pdf, branding, 1);
  
  return pdf;
}

/**
 * Generate Pro Forma Operating Statement
 */
function generateProFormaStatement(pdf, branding, deal, property) {
  let yPos = addHeader(pdf, branding, 'PRO FORMA OPERATING STATEMENT');
  
  pdf.setFontSize(10);
  pdf.setTextColor(0);
  pdf.text(`Property: ${property?.address_street || 'TBD'}, ${property?.address_city || ''}, ${property?.address_state || ''} ${property?.address_zip || ''}`, 20, yPos);
  yPos += 6;
  pdf.text(`Date Prepared: ${new Date().toLocaleDateString()}`, 20, yPos);
  yPos += 10;
  
  // Income Section
  pdf.setFontSize(11);
  pdf.setTextColor(37, 99, 235);
  pdf.text('MONTHLY INCOME', 20, yPos);
  yPos += 8;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  
  const monthlyRent = property?.gross_rent_monthly || 0;
  const otherIncome = 0;
  const totalIncome = monthlyRent + otherIncome;
  
  pdf.text('Gross Rental Income:', 25, yPos);
  pdf.text(`$${monthlyRent.toLocaleString()}`, 150, yPos, { align: 'right' });
  yPos += 5;
  pdf.text('Other Income:', 25, yPos);
  pdf.text(`$${otherIncome.toLocaleString()}`, 150, yPos, { align: 'right' });
  yPos += 5;
  pdf.setFont(undefined, 'bold');
  pdf.text('TOTAL MONTHLY INCOME:', 25, yPos);
  pdf.text(`$${totalIncome.toLocaleString()}`, 150, yPos, { align: 'right' });
  pdf.setFont(undefined, 'normal');
  yPos += 12;
  
  // Expense Section
  pdf.setFontSize(11);
  pdf.setTextColor(37, 99, 235);
  pdf.text('MONTHLY EXPENSES', 20, yPos);
  yPos += 8;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  
  const taxes = property?.taxes_monthly || 0;
  const insurance = property?.insurance_monthly || 0;
  const hoa = property?.hoa_monthly || 0;
  const pi = deal.monthly_pitia || 0;
  const totalExpenses = taxes + insurance + hoa + pi;
  
  pdf.text('Principal & Interest (P&I):', 25, yPos);
  pdf.text(`$${pi.toFixed(2)}`, 150, yPos, { align: 'right' });
  yPos += 5;
  pdf.text('Property Taxes:', 25, yPos);
  pdf.text(`$${taxes.toFixed(2)}`, 150, yPos, { align: 'right' });
  yPos += 5;
  pdf.text('Hazard Insurance:', 25, yPos);
  pdf.text(`$${insurance.toFixed(2)}`, 150, yPos, { align: 'right' });
  yPos += 5;
  pdf.text('HOA Fees:', 25, yPos);
  pdf.text(`$${hoa.toFixed(2)}`, 150, yPos, { align: 'right' });
  yPos += 5;
  pdf.setFont(undefined, 'bold');
  pdf.text('TOTAL MONTHLY EXPENSES (PITIA):', 25, yPos);
  pdf.text(`$${totalExpenses.toFixed(2)}`, 150, yPos, { align: 'right' });
  pdf.setFont(undefined, 'normal');
  yPos += 12;
  
  // NOI & DSCR
  pdf.setFontSize(11);
  pdf.setTextColor(37, 99, 235);
  pdf.text('CASH FLOW ANALYSIS', 20, yPos);
  yPos += 8;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  
  const noi = totalIncome - (taxes + insurance + hoa);
  const dscr = totalExpenses > 0 ? totalIncome / totalExpenses : 0;
  
  pdf.text('Net Operating Income (NOI):', 25, yPos);
  pdf.text(`$${noi.toFixed(2)}`, 150, yPos, { align: 'right' });
  yPos += 5;
  pdf.setFont(undefined, 'bold');
  pdf.text('DSCR (Debt Service Coverage Ratio):', 25, yPos);
  pdf.text(dscr.toFixed(2), 150, yPos, { align: 'right' });
  pdf.setFont(undefined, 'normal');
  yPos += 12;
  
  // 12-Month Projection
  pdf.setFontSize(11);
  pdf.setTextColor(37, 99, 235);
  pdf.text('12-MONTH PROJECTION', 20, yPos);
  yPos += 8;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  pdf.text('Annual Gross Income:', 25, yPos);
  pdf.text(`$${(totalIncome * 12).toLocaleString()}`, 150, yPos, { align: 'right' });
  yPos += 5;
  pdf.text('Annual Expenses:', 25, yPos);
  pdf.text(`$${(totalExpenses * 12).toLocaleString()}`, 150, yPos, { align: 'right' });
  yPos += 5;
  pdf.text('Annual NOI:', 25, yPos);
  pdf.text(`$${(noi * 12).toLocaleString()}`, 150, yPos, { align: 'right' });
  
  addFooter(pdf, branding, 1);
  
  return pdf;
}

/**
 * Generate Entity Checklist
 */
function generateEntityChecklist(pdf, branding, deal, borrower) {
  let yPos = addHeader(pdf, branding, 'ENTITY DOCUMENTATION CHECKLIST');
  
  pdf.setFontSize(10);
  pdf.setTextColor(0);
  pdf.text(`Entity Name: ${borrower?.entity_name || deal.entity_name || 'TBD'}`, 20, yPos);
  yPos += 5;
  pdf.text(`Entity Type: ${deal.entity_type || 'LLC'}`, 20, yPos);
  yPos += 5;
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
  yPos += 12;
  
  pdf.setFontSize(11);
  pdf.setTextColor(37, 99, 235);
  pdf.text('REQUIRED DOCUMENTS', 20, yPos);
  yPos += 8;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  
  const checklist = [
    'Articles of Organization / Incorporation',
    'Operating Agreement / Bylaws',
    'Certificate of Good Standing (within 60 days)',
    'EIN Letter (IRS Confirmation)',
    'Resolution to Borrow / Corporate Authorization',
    'List of All Members/Owners with % Ownership',
    'Photo ID for All Signing Members',
    'Statement of Information (if applicable)',
    'Trust Documents (if held in trust)',
    'Foreign Entity Registration (if applicable)',
  ];
  
  checklist.forEach((item, idx) => {
    pdf.text(`☐ ${item}`, 25, yPos);
    yPos += 7;
  });
  
  yPos += 10;
  
  // Owner Information Section
  pdf.setFontSize(11);
  pdf.setTextColor(37, 99, 235);
  pdf.text('OWNER/MEMBER INFORMATION (20%+ Ownership)', 20, yPos);
  yPos += 8;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  
  for (let i = 1; i <= 4; i++) {
    pdf.text(`${i}. Name: ________________________  Ownership %: _____  SSN Last 4: _____`, 25, yPos);
    yPos += 8;
  }
  
  yPos += 10;
  
  // Certification
  pdf.setFontSize(9);
  const cert = `I certify that all documents provided are true, accurate, and complete. I understand that providing false or incomplete information may result in loan denial or default.`;
  const lines = pdf.splitTextToSize(cert, 170);
  pdf.text(lines, 20, yPos);
  yPos += lines.length * 5 + 10;
  
  pdf.text('Authorized Signer: _______________________________', 20, yPos);
  pdf.text(`Date: _______________`, 140, yPos);
  
  addFooter(pdf, branding, 1);
  
  return pdf;
}

/**
 * Generate Exception Request Form
 */
function generateExceptionRequest(pdf, branding, deal, borrower, user) {
  let yPos = addHeader(pdf, branding, 'EXCEPTION / SCENARIO REQUEST');
  
  pdf.setFontSize(10);
  pdf.setTextColor(0);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
  pdf.text(`Deal #: ${deal.deal_number || 'Pending'}`, 120, yPos);
  yPos += 10;
  
  // Loan Summary
  pdf.setFontSize(11);
  pdf.setTextColor(37, 99, 235);
  pdf.text('LOAN SUMMARY', 20, yPos);
  yPos += 8;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  
  const summary = [
    ['Borrower:', `${borrower?.first_name || ''} ${borrower?.last_name || ''}`],
    ['Loan Amount:', deal.loan_amount ? `$${deal.loan_amount.toLocaleString()}` : 'TBD'],
    ['Loan Product:', deal.loan_product || 'DSCR'],
    ['LTV:', deal.ltv ? `${deal.ltv.toFixed(1)}%` : 'TBD'],
    ['DSCR:', deal.dscr ? deal.dscr.toFixed(2) : 'TBD'],
    ['Credit Score:', borrower?.credit_score || 'TBD'],
  ];
  
  summary.forEach(([label, value]) => {
    pdf.text(label, 25, yPos);
    pdf.text(value, 80, yPos);
    yPos += 5;
  });
  yPos += 8;
  
  // Exception Details
  pdf.setFontSize(11);
  pdf.setTextColor(37, 99, 235);
  pdf.text('EXCEPTION REQUESTED', 20, yPos);
  yPos += 8;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  
  const exceptionTypes = [
    '☐ LTV Exception (>75%)',
    '☐ DSCR Exception (<1.0)',
    '☐ Credit Score Exception',
    '☐ Reserve Requirement Exception',
    '☐ Prepayment Penalty Modification',
    '☐ Property Type Exception',
    '☐ Other: _________________________',
  ];
  
  exceptionTypes.forEach(type => {
    pdf.text(type, 25, yPos);
    yPos += 6;
  });
  yPos += 8;
  
  // Justification
  pdf.setFontSize(11);
  pdf.setTextColor(37, 99, 235);
  pdf.text('JUSTIFICATION / COMPENSATING FACTORS', 20, yPos);
  yPos += 8;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  pdf.text('_____________________________________________________________', 20, yPos);
  yPos += 8;
  pdf.text('_____________________________________________________________', 20, yPos);
  yPos += 8;
  pdf.text('_____________________________________________________________', 20, yPos);
  yPos += 8;
  pdf.text('_____________________________________________________________', 20, yPos);
  yPos += 12;
  
  // Originator Info
  pdf.text(`Submitted By: ${user?.full_name || 'Loan Officer'}`, 20, yPos);
  yPos += 5;
  pdf.text(`NMLS#: ${user?.nmls_id || branding.nmls_id || 'N/A'}`, 20, yPos);
  yPos += 5;
  pdf.text(`Contact: ${user?.email || ''}`, 20, yPos);
  yPos += 12;
  
  // Approval Section
  pdf.setFontSize(11);
  pdf.setTextColor(37, 99, 235);
  pdf.text('UNDERWRITER DECISION', 20, yPos);
  yPos += 8;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  pdf.text('☐ APPROVED    ☐ APPROVED WITH CONDITIONS    ☐ DENIED', 25, yPos);
  yPos += 10;
  
  pdf.text('Conditions/Comments: _________________________________________', 20, yPos);
  yPos += 10;
  
  pdf.text('Underwriter Signature: _________________________', 20, yPos);
  pdf.text(`Date: _______________`, 140, yPos);
  
  addFooter(pdf, branding, 1);
  
  return pdf;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { deal_id, document_type } = body;

    if (!deal_id || !document_type) {
      return Response.json({ 
        error: 'Missing required fields: deal_id and document_type',
        supported_types: [
          'business_purpose_application',
          'anti_steering_letter', 
          'cash_out_letter',
          'pro_forma_statement',
          'entity_checklist',
          'exception_request'
        ]
      }, { status: 400 });
    }

    // Fetch deal
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    const deal = deals[0];
    
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Fetch borrower
    let borrower = null;
    try {
      const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({ deal_id });
      if (dealBorrowers.length > 0) {
        const borrowers = await base44.asServiceRole.entities.Borrower.filter({ id: dealBorrowers[0].borrower_id });
        borrower = borrowers[0];
      }
    } catch { /* ignore */ }

    // Fetch property
    let property = null;
    try {
      const dealProperties = await base44.asServiceRole.entities.DealProperty.filter({ deal_id });
      if (dealProperties.length > 0) {
        const properties = await base44.asServiceRole.entities.Property.filter({ id: dealProperties[0].property_id });
        property = properties[0];
      }
      // Fallback: direct property link
      if (!property) {
        const properties = await base44.asServiceRole.entities.Property.filter({ deal_id });
        property = properties[0];
      }
    } catch { /* ignore */ }

    // Get organization branding
    const branding = await getOrgBranding(base44, deal.org_id);

    // Generate PDF
    const pdf = new jsPDF();
    
    switch (document_type) {
      case 'business_purpose_application':
        generateBusinessPurposeApp(pdf, branding, deal, borrower, property, user);
        break;
      case 'anti_steering_letter':
        generateAntiSteeringLetter(pdf, branding, deal, borrower, user);
        break;
      case 'cash_out_letter':
        generateCashOutLetter(pdf, branding, deal, borrower, property);
        break;
      case 'pro_forma_statement':
        generateProFormaStatement(pdf, branding, deal, property);
        break;
      case 'entity_checklist':
        generateEntityChecklist(pdf, branding, deal, borrower);
        break;
      case 'exception_request':
        generateExceptionRequest(pdf, branding, deal, borrower, user);
        break;
      default:
        return Response.json({ 
          error: `Unknown document type: ${document_type}`,
          supported_types: [
            'business_purpose_application',
            'anti_steering_letter',
            'cash_out_letter', 
            'pro_forma_statement',
            'entity_checklist',
            'exception_request'
          ]
        }, { status: 400 });
    }

    const pdfBuffer = pdf.output('arraybuffer');
    const filename = `${document_type}_${deal.deal_number || deal_id.slice(0, 8)}.pdf`;

    // Log document generation
    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        org_id: deal.org_id,
        deal_id,
        user_id: user.email,
        action_type: 'document_generated',
        details: { document_type, filename },
      });
    } catch { /* ignore logging errors */ }

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('DSCR Document generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});