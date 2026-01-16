import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AttentionDeals({ deals = [] }) {
  const severityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
  };

  const icons = {
    stale: '🔴',
    missing_conditions: '⚠️',
    expiring_conditions: '⏰',
    rate_lock_expiring: '🔐',
    missing_documents: '📄',
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Deals Needing Attention</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deals.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-sm text-gray-500">All deals on track!</p>
              <p className="text-xs text-gray-400 mt-1">No urgent items requiring attention</p>
            </div>
          ) : (
            deals.map((deal, idx) => (
              <Link
                key={deal.deal_id || idx}
                to={createPageUrl(`DealDetail?id=${deal.deal_id}`)}
                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <div className="flex gap-2">
                  <span className="text-xl">{icons[deal.reason] || '⚠️'}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{deal.deal_number || 'Draft Deal'}</p>
                    <p className="text-xs text-gray-600">{deal.message || deal.reason?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <Badge className={severityColors[deal.severity] || severityColors.medium}>
                  {deal.severity || 'medium'}
                </Badge>
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}