import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get recent activity feed for dashboard
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { limit = 10 } = await req.json();
    const orgId = user.org_id || '';

    // Get activity logs
    const activities = await base44.asServiceRole.entities.ActivityLog.filter({
      org_id: orgId,
    });

    // Sort by date descending and limit
    const recentActivities = activities
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, limit);

    const formatted = recentActivities.map(activity => ({
      id: activity.id,
      timestamp: activity.created_date,
      icon: getActivityIcon(activity.action),
      color: getActivityColor(activity.action),
      message: formatActivityMessage(activity),
      deal_number: activity.deal_number || 'N/A',
      user_name: activity.created_by || 'System',
    }));

    return Response.json({
      success: true,
      activities: formatted,
    });
  } catch (error) {
    console.error('Error getting activity:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getActivityIcon(action) {
  const icons = {
    'deal.created': '🆕',
    'deal.status_changed': '🟢',
    'deal.assigned': '👤',
    'deal.funded': '🏦',
    'document.uploaded': '📄',
    'document.approved': '✅',
    'condition.satisfied': '✅',
    'email.sent': '📧',
    'portal.invited': '🔗',
  };
  return icons[action] || '•';
}

function getActivityColor(action) {
  const colors = {
    'deal.funded': 'text-green-600',
    'deal.created': 'text-blue-600',
    'document.approved': 'text-green-600',
    'condition.satisfied': 'text-green-600',
    'deal.status_changed': 'text-blue-600',
  };
  return colors[action] || 'text-gray-600';
}

function formatActivityMessage(activity) {
  const messages = {
    'deal.created': `New deal created`,
    'deal.status_changed': `Deal moved to ${activity.new_status || 'new stage'}`,
    'deal.funded': `Deal FUNDED! $${activity.loan_amount?.toLocaleString() || '0'}`,
    'document.uploaded': `Document uploaded`,
    'document.approved': `Document approved`,
    'condition.satisfied': `Condition satisfied`,
    'email.sent': `Email sent`,
    'portal.invited': `Portal invite sent`,
  };
  return messages[activity.action] || activity.action;
}