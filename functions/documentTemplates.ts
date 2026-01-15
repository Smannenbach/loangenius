import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Manage document requirement templates
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's org
    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      user_id: user.email,
    });
    if (memberships.length === 0) {
      return Response.json({ error: 'No organization found' }, { status: 404 });
    }
    const org_id = memberships[0].org_id;

    if (req.method === 'GET') {
      const { template_id } = Object.fromEntries(
        new URL(req.url).searchParams.entries()
      );

      if (template_id) {
        // Get single template with items
        const template = await base44.asServiceRole.entities.DocumentTemplate.get(template_id);
        if (!template) {
          return Response.json({ error: 'Template not found' }, { status: 404 });
        }

        const items = await base44.asServiceRole.entities.DocumentTemplateItem.filter({
          template_id,
        });

        return Response.json({ template, items });
      } else {
        // List all templates for org
        const templates = await base44.asServiceRole.entities.DocumentTemplate.filter({
          org_id,
        });

        return Response.json({ templates });
      }
    }

    if (req.method === 'POST') {
      const { action, name, description, loan_types, is_default, items } = await req.json();

      if (action === 'create') {
        if (!name) {
          return Response.json({ error: 'Template name required' }, { status: 400 });
        }

        const template = await base44.asServiceRole.entities.DocumentTemplate.create({
          org_id,
          name,
          description,
          loan_types: loan_types || [],
          is_default: is_default || false,
          is_active: true,
          created_by: user.email,
        });

        // Create items
        if (items && items.length > 0) {
          for (const item of items) {
            await base44.asServiceRole.entities.DocumentTemplateItem.create({
              template_id: template.id,
              document_type: item.document_type,
              display_name: item.display_name,
              description: item.description,
              instructions: item.instructions,
              category: item.category || 'Other',
              is_required: item.is_required !== false,
              days_until_due: item.days_until_due,
              sort_order: item.sort_order || 0,
            });
          }
        }

        return Response.json({ success: true, template });
      }

      if (action === 'duplicate') {
        const { template_id, new_name } = await req.json();

        // Get original template and items
        const original = await base44.asServiceRole.entities.DocumentTemplate.get(template_id);
        if (!original) {
          return Response.json({ error: 'Template not found' }, { status: 404 });
        }

        const originalItems = await base44.asServiceRole.entities.DocumentTemplateItem.filter({
          template_id,
        });

        // Create new template
        const newTemplate = await base44.asServiceRole.entities.DocumentTemplate.create({
          org_id,
          name: new_name || `${original.name} (Copy)`,
          description: original.description,
          loan_types: original.loan_types,
          is_default: false,
          is_active: true,
          created_by: user.email,
        });

        // Duplicate items
        for (const item of originalItems) {
          await base44.asServiceRole.entities.DocumentTemplateItem.create({
            template_id: newTemplate.id,
            document_type: item.document_type,
            display_name: item.display_name,
            description: item.description,
            instructions: item.instructions,
            category: item.category,
            is_required: item.is_required,
            days_until_due: item.days_until_due,
            sort_order: item.sort_order,
          });
        }

        return Response.json({ success: true, template: newTemplate });
      }

      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (req.method === 'PUT') {
      const { template_id, name, description, is_default, is_active, items } = await req.json();

      if (!template_id) {
        return Response.json({ error: 'Template ID required' }, { status: 400 });
      }

      // Update template
      const updates = {};
      if (name) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (is_default !== undefined) updates.is_default = is_default;
      if (is_active !== undefined) updates.is_active = is_active;

      await base44.asServiceRole.entities.DocumentTemplate.update(template_id, updates);

      // Update items if provided
      if (items && items.length > 0) {
        // Delete existing items
        const existingItems = await base44.asServiceRole.entities.DocumentTemplateItem.filter({
          template_id,
        });
        for (const item of existingItems) {
          await base44.asServiceRole.entities.DocumentTemplateItem.delete(item.id);
        }

        // Create new items
        for (const item of items) {
          await base44.asServiceRole.entities.DocumentTemplateItem.create({
            template_id,
            document_type: item.document_type,
            display_name: item.display_name,
            description: item.description,
            instructions: item.instructions,
            category: item.category || 'Other',
            is_required: item.is_required !== false,
            days_until_due: item.days_until_due,
            sort_order: item.sort_order || 0,
          });
        }
      }

      return Response.json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { template_id } = Object.fromEntries(
        new URL(req.url).searchParams.entries()
      );

      if (!template_id) {
        return Response.json({ error: 'Template ID required' }, { status: 400 });
      }

      // Check if in use
      const usageCount = await base44.asServiceRole.entities.DocumentTemplate.filter({
        id: template_id,
      });

      // Delete template and items
      await base44.asServiceRole.entities.DocumentTemplate.delete(template_id);

      const items = await base44.asServiceRole.entities.DocumentTemplateItem.filter({
        template_id,
      });
      for (const item of items) {
        await base44.asServiceRole.entities.DocumentTemplateItem.delete(item.id);
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Document templates error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});