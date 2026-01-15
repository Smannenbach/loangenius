import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, doc_id, task_id, labels } = body;

    if (action === 'create_label_task') {
      if (!doc_id) return Response.json({ error: 'doc_id required' }, { status: 400 });

      return Response.json({
        task_id: crypto.randomUUID(),
        doc_id,
        status: 'pending_review',
        created_at: new Date().toISOString()
      });
    }

    if (action === 'submit_labels') {
      if (!task_id || !labels) return Response.json({ error: 'task_id and labels required' }, { status: 400 });

      return Response.json({
        task_id,
        status: 'completed',
        labels_accepted: true,
        submitted_at: new Date().toISOString()
      });
    }

    if (action === 'schedule_retrain') {
      if (!body.dataset_id) return Response.json({ error: 'dataset_id required' }, { status: 400 });

      return Response.json({
        retrain_job_id: crypto.randomUUID(),
        dataset_id: body.dataset_id,
        status: 'queued',
        scheduled_at: new Date().toISOString()
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});