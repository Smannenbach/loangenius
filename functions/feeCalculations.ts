import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function calculateFeeAmount(base44, feeCatalogId, dealId) {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    // Fetch fee catalog and deal
    const catalogs = await base44.entities.FeeCatalog.filter({ id: feeCatalogId });
    const deals = await base44.entities.Deal.filter({ id: dealId });

    if (!catalogs[0] || !deals[0]) {
      return { error: 'Fee catalog or deal not found', status: 404 };
    }

    const feeCatalog = catalogs[0];
    const deal = deals[0];

    let amount = 0;

    if (feeCatalog.fee_type === 'Fixed') {
      amount = feeCatalog.fixed_amount || 0;
    } else if (feeCatalog.fee_type === 'Percentage') {
      let base = 0;
      if (feeCatalog.percentage_of === 'Loan_Amount') {
        base = deal.loan_amount || 0;
      } else if (feeCatalog.percentage_of === 'Purchase_Price') {
        base = deal.purchase_price || 0;
      } else if (feeCatalog.percentage_of === 'Appraised_Value') {
        base = deal.appraised_value || 0;
      }

      amount = (base * (feeCatalog.percentage || 0)) / 100;

      if (feeCatalog.min_amount && amount < feeCatalog.min_amount) {
        amount = feeCatalog.min_amount;
      }
      if (feeCatalog.max_amount && amount > feeCatalog.max_amount) {
        amount = feeCatalog.max_amount;
      }
    } else if (feeCatalog.fee_type === 'Per_Diem') {
      // Returns null - requires manual entry
      amount = null;
    } else if (feeCatalog.fee_type === 'Calculated') {
      // Returns null - requires manual entry
      amount = null;
    }

    return { 
      amount: amount ? Math.round(amount * 100) / 100 : null,
      fee_name: feeCatalog.name,
      fee_category: feeCatalog.category,
      paid_by: feeCatalog.default_paid_by,
      is_financed: feeCatalog.default_is_financed,
      is_poc: feeCatalog.default_is_poc,
      hud_line: feeCatalog.hud_line
    };
  } catch (error) {
    return { error: error.message, status: 500 };
  }
}

async function generateFeesForLoan(base44, dealId) {
  try {
    // Get deal
    const deals = await base44.entities.Deal.filter({ id: dealId });
    if (!deals[0]) {
      return { error: 'Deal not found', status: 404 };
    }

    const deal = deals[0];

    // Get auto-add fees that apply
    const feeCatalogs = await base44.entities.FeeCatalog.filter({
      org_id: deal.org_id,
      is_active: true,
      auto_add: true
    });

    const applicableFees = feeCatalogs.filter(f => {
      const typesMatch = !f.applies_to_loan_types || f.applies_to_loan_types.includes(deal.loan_type);
      const purposesMatch = !f.applies_to_loan_purposes || f.applies_to_loan_purposes.includes(deal.loan_purpose);
      return typesMatch && purposesMatch;
    });

    // Create fees for each applicable catalog entry
    const createdFees = [];
    for (const feeCatalog of applicableFees) {
      const { amount, fee_name, fee_category, paid_by, is_financed, is_poc, hud_line } = await calculateFeeAmount(base44, feeCatalog.id, dealId);

      const feeData = {
        deal_id: dealId,
        org_id: deal.org_id,
        fee_name,
        fee_category,
        amount,
        paid_by,
        is_financed,
        is_poc,
        hud_line,
        fee_catalog_id: feeCatalog.id
      };

      try {
        const created = await base44.entities.Fee.create(feeData);
        createdFees.push(created);
      } catch (err) {
        console.log(`Could not create fee ${fee_name}:`, err.message);
      }
    }

    return { created: createdFees.length, fees: createdFees };
  } catch (error) {
    return { error: error.message, status: 500 };
  }
}

// HTTP handler
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, deal_id, fee_catalog_id } = body;

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    let result;

    if (action === 'calculate' && fee_catalog_id) {
      result = await calculateFeeAmount(base44, fee_catalog_id, deal_id);
    } else if (action === 'generate' || !action) {
      result = await generateFeesForLoan(base44, deal_id);
    } else {
      return Response.json({ error: 'Invalid action. Use: calculate or generate' }, { status: 400 });
    }

    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status || 500 });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});