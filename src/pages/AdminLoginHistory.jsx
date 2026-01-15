import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function AdminLoginHistory() {
  const { data: loginHistory = [] } = useQuery({
    queryKey: ['login-history'],
    queryFn: () => base44.entities.LoginHistory.filter({})
  });

  const getStatusIcon = (status) => {
    if (status === 'Success') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusColor = (status) => {
    if (status === 'Success') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Login History</h1>
        <p className="text-slate-600">Track all user login attempts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Logins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 px-3">Timestamp</th>
                  <th className="text-left py-2 px-3">Email</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">IP Address</th>
                  <th className="text-left py-2 px-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.sort((a, b) => 
                  new Date(b.created_at) - new Date(a.created_at)
                ).slice(0, 50).map(log => (
                  <tr key={log.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-3">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">{log.email}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs">{log.ip_address}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {log.failure_reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}