import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, Bell, AlertCircle, TrendingUp, 
  Clock, FileText, Users, DollarSign, X 
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function SmartNotifications() {
  const [dismissed, setDismissed] = useState(new Set());

  // Fetch data for analysis
  const { data: leads = [] } = useQuery({
    queryKey: ['leads-for-notifications'],
    queryFn: () => base44.entities.Lead.list('-updated_date', 50)
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['deals-for-notifications'],
    queryFn: () => base44.entities.Deal.list('-updated_date', 50)
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents-for-notifications'],
    queryFn: () => base44.entities.Document.list('-updated_date', 50)
  });

  // AI-generated notifications
  const generateNotifications = () => {
    const notifications = [];

    // High-value leads not contacted
    const highValueLeads = leads.filter(l => 
      l.status === 'new' && 
      l.loan_amount >= 300000 &&
      !dismissed.has(`lead-${l.id}`)
    );
    if (highValueLeads.length > 0) {
      notifications.push({
        id: `lead-${highValueLeads[0].id}`,
        type: 'high_priority',
        icon: TrendingUp,
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        title: 'High-Value Lead Needs Attention',
        message: `${highValueLeads[0].first_name} ${highValueLeads[0].last_name} - $${highValueLeads[0].loan_amount?.toLocaleString()} loan, no contact yet`,
        link: '/Leads',
        linkText: 'View Lead',
        priority: 'urgent',
        timestamp: highValueLeads[0].created_date
      });
    }

    // Stale deals
    const staleDeals = deals.filter(d => {
      const daysSince = (new Date() - new Date(d.updated_date)) / (1000 * 60 * 60 * 24);
      return daysSince > 7 && d.status === 'active' && !dismissed.has(`deal-${d.id}`);
    });
    if (staleDeals.length > 0) {
      notifications.push({
        id: `deal-${staleDeals[0].id}`,
        type: 'attention_needed',
        icon: Clock,
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        title: 'Deal Inactive for 7+ Days',
        message: `${staleDeals[0].borrower_name} - No updates in ${Math.floor((new Date() - new Date(staleDeals[0].updated_date)) / (1000 * 60 * 60 * 24))} days`,
        link: `/DealDetail?id=${staleDeals[0].id}`,
        linkText: 'View Deal',
        priority: 'medium',
        timestamp: staleDeals[0].updated_date
      });
    }

    // Expiring documents
    const expiringDocs = documents.filter(d => {
      if (!d.expiration_date || dismissed.has(`doc-${d.id}`)) return false;
      const daysUntil = (new Date(d.expiration_date) - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntil > 0 && daysUntil <= 30;
    });
    if (expiringDocs.length > 0) {
      notifications.push({
        id: `doc-${expiringDocs[0].id}`,
        type: 'document_expiring',
        icon: FileText,
        color: 'text-red-600 bg-red-50 border-red-200',
        title: 'Document Expiring Soon',
        message: `${expiringDocs[0].file_name} expires in ${Math.ceil((new Date(expiringDocs[0].expiration_date) - new Date()) / (1000 * 60 * 60 * 24))} days`,
        link: '/Documents',
        linkText: 'View Documents',
        priority: 'high',
        timestamp: expiringDocs[0].expiration_date
      });
    }

    // Qualified leads ready to convert
    const readyLeads = leads.filter(l =>
      l.status === 'qualified' &&
      l.fico_score >= 680 &&
      !dismissed.has(`convert-${l.id}`)
    );
    if (readyLeads.length > 0) {
      notifications.push({
        id: `convert-${readyLeads[0].id}`,
        type: 'opportunity',
        icon: Users,
        color: 'text-green-600 bg-green-50 border-green-200',
        title: 'Lead Ready to Convert',
        message: `${readyLeads[0].first_name} ${readyLeads[0].last_name} is qualified with ${readyLeads[0].fico_score} FICO`,
        link: '/Leads',
        linkText: 'Convert to Deal',
        priority: 'high',
        timestamp: readyLeads[0].updated_date
      });
    }

    return notifications.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  const notifications = generateNotifications();

  const handleDismiss = (id) => {
    setDismissed(prev => new Set([...prev, id]));
    toast.success('Notification dismissed');
  };

  if (notifications.length === 0) {
    return (
      <Card className="border-gray-200">
        <CardContent className="py-8 text-center">
          <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No urgent notifications</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <h3 className="font-semibold text-gray-900">AI Smart Alerts</h3>
        <Badge className="ml-auto bg-purple-100 text-purple-700">
          {notifications.length}
        </Badge>
      </div>

      {notifications.map(notif => {
        const Icon = notif.icon;
        return (
          <Card key={notif.id} className={`border ${notif.color.split(' ').slice(1).join(' ')}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${notif.color.split(' ')[1]}`}>
                  <Icon className={`h-4 w-4 ${notif.color.split(' ')[0]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm text-gray-900">{notif.title}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => handleDismiss(notif.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Link to={createPageUrl(notif.link.replace('/', ''))}>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        {notif.linkText}
                      </Button>
                    </Link>
                    <Badge variant="outline" className="text-xs">
                      {notif.priority}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}