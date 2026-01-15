import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Download } from 'lucide-react';

export default function AdminAuditLogs() {
  const [filters, setFilters] = useState({
    action_type: '',
    entity_type: '',
    severity: ''
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const { data: logs = [] } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => base44.entities.AuditLog.filter(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    )
  });

  const getSeverityColor = (severity) => {
    const colors = {
      'Info': 'bg-blue-100 text-blue-800',
      'Warning': 'bg-yellow-100 text-yellow-800',
      'Error': 'bg-red-100 text-red-800',
      'Critical': 'bg-red-200 text-red-900'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Action Type</label>
              <Input
                placeholder="Create, Update, Delete..."
                value={filters.action_type}
                onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Entity Type</label>
              <Input
                placeholder="deal, document, borrower..."
                value={filters.entity_type}
                onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">All</option>
                <option value="Info">Info</option>
                <option value="Warning">Warning</option>
                <option value="Error">Error</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Logs ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 px-3">Timestamp</th>
                  <th className="text-left py-2 px-3">User</th>
                  <th className="text-left py-2 px-3">Action</th>
                  <th className="text-left py-2 px-3">Entity</th>
                  <th className="text-left py-2 px-3">Severity</th>
                  <th className="text-left py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-3">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">{log.user_id || 'System'}</td>
                    <td className="py-3 px-3">{log.action_type}</td>
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-medium">{log.entity_type}</p>
                        <p className="text-xs text-slate-500">{log.entity_name}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge className={getSeverityColor(log.severity)}>
                        {log.severity}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedLog(log);
                          setShowDetail(true);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Timestamp</p>
                  <p className="font-medium">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">User</p>
                  <p className="font-medium">{selectedLog.user_id || 'System'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Action</p>
                  <p className="font-medium">{selectedLog.action_type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Entity</p>
                  <p className="font-medium">{selectedLog.entity_type}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Description</p>
                <p className="text-sm">{selectedLog.description}</p>
              </div>

              {selectedLog.changed_fields?.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600 mb-2">Changed Fields</p>
                  <div className="bg-slate-50 rounded p-3 text-sm">
                    {selectedLog.changed_fields.join(', ')}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600 mb-1">IP Address</p>
                  <p className="font-mono">{selectedLog.ip_address}</p>
                </div>
                <div>
                  <p className="text-slate-600 mb-1">Severity</p>
                  <Badge className={getSeverityColor(selectedLog.severity)}>
                    {selectedLog.severity}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}