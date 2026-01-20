/**
 * Extract Key Data Points from Uploaded Documents
 * Uses AI to parse and extract structured data from loan documents
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { document_url, document_type, deal_id, auto_populate } = await req.json();

    if (!document_url) {
      return Response.json({ error: 'Missing document_url' }, { status: 400 });
    }

    // Define extraction schemas by document type
    const extractionSchemas = {
      bank_statement: {
        type: 'object',
        properties: {
          account_holder_name: { type: 'string' },
          account_type: { type: 'string', enum: ['checking', 'savings', 'money_market', 'other'] },
          account_number_last4: { type: 'string' },
          bank_name: { type: 'string' },
          statement_period_start: { type: 'string' },
          statement_period_end: { type: 'string' },
          beginning_balance: { type: 'number' },
          ending_balance: { type: 'number' },
          total_deposits: { type: 'number' },
          total_withdrawals: { type: 'number' },
          average_daily_balance: { type: 'number' },
          large_deposits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                amount: { type: 'number' },
                description: { type: 'string' },
              },
            },
          },
        },
      },
      lease_agreement: {
        type: 'object',
        properties: {
          property_address: { type: 'string' },
          tenant_name: { type: 'string' },
          landlord_name: { type: 'string' },
          monthly_rent: { type: 'number' },
          security_deposit: { type: 'number' },
          lease_start_date: { type: 'string' },
          lease_end_date: { type: 'string' },
          lease_term_months: { type: 'integer' },
          utilities_included: { type: 'array', items: { type: 'string' } },
          pet_policy: { type: 'string' },
        },
      },
      appraisal: {
        type: 'object',
        properties: {
          property_address: { type: 'string' },
          appraised_value: { type: 'number' },
          appraisal_date: { type: 'string' },
          appraiser_name: { type: 'string' },
          appraiser_license: { type: 'string' },
          property_type: { type: 'string' },
          year_built: { type: 'integer' },
          square_footage: { type: 'integer' },
          bedrooms: { type: 'integer' },
          bathrooms: { type: 'number' },
          lot_size: { type: 'string' },
          comparable_sales: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                address: { type: 'string' },
                sale_price: { type: 'number' },
                sale_date: { type: 'string' },
              },
            },
          },
        },
      },
      tax_return: {
        type: 'object',
        properties: {
          taxpayer_name: { type: 'string' },
          ssn_last4: { type: 'string' },
          tax_year: { type: 'integer' },
          filing_status: { type: 'string' },
          total_income: { type: 'number' },
          adjusted_gross_income: { type: 'number' },
          taxable_income: { type: 'number' },
          total_tax: { type: 'number' },
          schedule_e_income: { type: 'number', description: 'Rental income' },
          business_income: { type: 'number' },
        },
      },
      insurance: {
        type: 'object',
        properties: {
          policy_number: { type: 'string' },
          insurance_company: { type: 'string' },
          property_address: { type: 'string' },
          coverage_amount: { type: 'number' },
          annual_premium: { type: 'number' },
          effective_date: { type: 'string' },
          expiration_date: { type: 'string' },
          deductible: { type: 'number' },
          coverage_types: { type: 'array', items: { type: 'string' } },
        },
      },
      title_report: {
        type: 'object',
        properties: {
          property_address: { type: 'string' },
          current_owner: { type: 'string' },
          legal_description: { type: 'string' },
          existing_liens: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                lien_holder: { type: 'string' },
                lien_type: { type: 'string' },
                amount: { type: 'number' },
                recording_date: { type: 'string' },
              },
            },
          },
          easements: { type: 'array', items: { type: 'string' } },
          title_exceptions: { type: 'array', items: { type: 'string' } },
        },
      },
      general: {
        type: 'object',
        properties: {
          document_type: { type: 'string' },
          key_dates: { type: 'array', items: { type: 'string' } },
          monetary_amounts: { type: 'array', items: { type: 'number' } },
          names_mentioned: { type: 'array', items: { type: 'string' } },
          addresses_found: { type: 'array', items: { type: 'string' } },
          summary: { type: 'string' },
        },
      },
    };

    const schema = extractionSchemas[document_type] || extractionSchemas.general;

    const prompt = document_type && document_type !== 'general'
      ? `Extract all relevant information from this ${document_type.replace(/_/g, ' ')} document. Be thorough and accurate.`
      : 'Analyze this document and extract all key information including dates, amounts, names, and addresses. Identify the document type.';

    // Extract data using AI
    const extracted = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [document_url],
      response_json_schema: {
        type: 'object',
        properties: {
          extracted_data: schema,
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          warnings: { type: 'array', items: { type: 'string' } },
          document_quality: { type: 'string', enum: ['good', 'fair', 'poor'] },
        },
      },
    });

    // Store extraction results
    if (deal_id) {
      await base44.entities.DocumentAnalysis.create({
        document_id: document_url,
        deal_id,
        analysis_type: document_type || 'extraction',
        extracted_data: extracted.extracted_data,
        confidence: extracted.confidence,
        summary: JSON.stringify(extracted.warnings || []),
      }).catch(() => {});
    }

    // Auto-populate deal/property/borrower data if requested
    let autoPopulateResult = null;
    if (auto_populate && deal_id && extracted.extracted_data) {
      autoPopulateResult = await autoPopulateDealData(base44, deal_id, document_type, extracted.extracted_data);
    }

    return Response.json({
      success: true,
      document_type: document_type || extracted.extracted_data?.document_type || 'unknown',
      extracted_data: extracted.extracted_data,
      confidence: extracted.confidence,
      document_quality: extracted.document_quality,
      warnings: extracted.warnings || [],
      auto_populated: autoPopulateResult,
    });

  } catch (error) {
    console.error('Document extraction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function autoPopulateDealData(base44, dealId, documentType, data) {
  const updates = {};

  try {
    if (documentType === 'appraisal' && data.appraised_value) {
      await base44.entities.Deal.update(dealId, {
        appraised_value: data.appraised_value,
      });
      updates.deal = { appraised_value: data.appraised_value };
    }

    if (documentType === 'lease_agreement' && data.monthly_rent) {
      // Update property with rental income
      const properties = await base44.entities.Property.filter({ deal_id: dealId });
      if (properties.length > 0) {
        await base44.entities.Property.update(properties[0].id, {
          monthly_rent: data.monthly_rent,
        });
        updates.property = { monthly_rent: data.monthly_rent };
      }
    }

    if (documentType === 'insurance' && data.annual_premium) {
      const properties = await base44.entities.Property.filter({ deal_id: dealId });
      if (properties.length > 0) {
        await base44.entities.Property.update(properties[0].id, {
          annual_insurance: data.annual_premium,
        });
        updates.property = { annual_insurance: data.annual_premium };
      }
    }

    return Object.keys(updates).length > 0 ? updates : null;
  } catch (e) {
    console.error('Auto-populate error:', e);
    return null;
  }
}