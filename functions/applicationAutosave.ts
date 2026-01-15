/**
 * Loan Application Autosave
 * Saves application state at each step without finalizing
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org_id, application_id, step, data } = await req.json();

    if (!org_id || !application_id || step === undefined || !data) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch application
    const apps = await base44.asServiceRole.entities.LoanApplication.filter({
      id: application_id
    });

    if (!apps.length) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

    const app = apps[0];

    // Map step to field
    const fieldMap = {
      1: 'loan_data_json',
      2: 'property_data_json',
      3: 'borrower_data_json',
      4: 'loan_data_json',
      5: 'borrower_data_json',
      6: 'loan_data_json'
    };

    const field = fieldMap[step];
    const currentData = app[field] || {};
    const updatedData = { ...currentData, ...data };

    // Calculate progress
    const progress = Math.round((step / app.total_steps) * 100);

    // Autosave
    const updated = await base44.asServiceRole.entities.LoanApplication.update(
      application_id,
      {
        current_step: step,
        [field]: updatedData,
        progress_percent: progress,
        last_saved_at: new Date().toISOString()
      }
    );

    return Response.json({
      success: true,
      application_id,
      step,
      progress: progress,
      last_saved: updated.last_saved_at
    });
  } catch (error) {
    console.error('Error in applicationAutosave:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});