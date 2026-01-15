import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get dashboard KPIs for admin analytics
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
    }

    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      user_id: user.email,
    });
    if (memberships.length === 0) {
      return Response.json({ error: 'User not part of any organization' }, { status: 403 });
    }

    const org_id = memberships[0].org_id;

    // Get deals
    const deals = await base44.asServiceRole.entities.Deal.filter({ org_id });
    
    // Get leads
    const leads = await base44.asServiceRole.entities.Lead.filter({ org_id });

    // Calculate KPIs
    const totalDeals = deals.length;
    const activeDeals = deals.filter(d => d.status === 'active').length;
    const fundedDeals = deals.filter(d => d.stage === 'funded').length;
    const totalLoanAmount = deals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);

    const totalLeads = leads.length;
    const newLeads = leads.filter(l => l.status === 'new').length;
    const convertedLeads = leads.filter(l => l.status === 'converted').length;
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    // Get stage distribution
    const stageDistribution = {};
    deals.forEach(d => {
      stageDistribution[d.stage] = (stageDistribution[d.stage] || 0) + 1;
    });

    // Get recent activity
    const activities = await base44.asServiceRole.entities.ActivityLog.filter({
      org_id,
    });

    const recentActivities = activities
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 10);

    return Response.json({
      success: true,
      kpis: {
        deals: {
          total: totalDeals,
          active: activeDeals,
          funded: fundedDeals,
          totalAmount: totalLoanAmount,
        },
        leads: {
          total: totalLeads,
          new: newLeads,
          converted: convertedLeads,
          conversionRate,
        },
        stageDistribution,
      },
      recentActivities: recentActivities.map(a => ({
        id: a.id,
        timestamp: a.created_date,
        type: a.activity_type,
        description: a.description,
      })),
    });
  } catch (error) {
    console.error('Dashboard KPI error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});