import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, AlertCircle, Clock, FileText, User, Lock } from 'lucide-react';

export default function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState('audit');

  const { data: auditLogs } = useQuery({
    queryKey: ['auditLogs', orgId],
    queryFn: async () => {
      if (!orgId) return { data: { logs: [], total_logs: 0 } };
      try {
        return await base44.functions.invoke('getAuditLog', { org_id: orgId });
      } catch {
        return { data: { logs: [], total_logs: 0 } };
      }
    },
    enabled: !!orgId,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['userMembership', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.OrgMembership.filter({ user_id: user.email });
    },
    enabled: !!user?.email,
  });

  const orgId = memberships[0]?.org_id;

  const { data: loginHistory } = useQuery({
    queryKey: ['loginHistory', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const history = await base44.entities.LoginHistory.filter({ org_id: orgId });
      return history.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 50);
    },
    enabled: !!orgId,
  });

  const { data: dataAccessLogs } = useQuery({
    queryKey: ['dataAccessLogs', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const logs = await base44.entities.DataAccessLog.filter({ org_id: orgId });
      return logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 50);
    },
    enabled: !!orgId,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
          <p className="text-gray-600 mt-1">Audit logs, access logs, and compliance monitoring</p>
        </div>

        {/* Compliance Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Audit Logs</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {auditLogs?.data?.total_logs || 0}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">User Sessions</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">
                    {loginHistory?.length || 0}
                  </p>
                </div>
                <User className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Data Access Events</p>
                  <p className="text-2xl font-bold text-purple-600 mt-2">
                    {dataAccessLogs?.length || 0}
                  </p>
                </div>
                <Lock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
            <TabsTrigger value="access">Data Access</TabsTrigger>
            <TabsTrigger value="sessions">User Sessions</TabsTrigger>
          </TabsList>

          {/* Audit Trail */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Audit Log</CardTitle>
              </CardHeader>
              <CardContent>
                {auditLogs?.data?.logs && auditLogs.data.logs.length > 0 ? (
                  <div className="space-y-2">
                    {auditLogs.data.logs.slice(0, 20).map((log, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{log.description}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(log.created_date).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {log.action_type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No audit logs</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Access */}
          <TabsContent value="access" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Access Log</CardTitle>
              </CardHeader>
              <CardContent>
                {dataAccessLogs && dataAccessLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-2 px-2 font-medium">User</th>
                          <th className="text-left py-2 px-2 font-medium">Access Type</th>
                          <th className="text-left py-2 px-2 font-medium">Entity</th>
                          <th className="text-center py-2 px-2 font-medium">PII</th>
                          <th className="text-left py-2 px-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataAccessLogs.slice(0, 20).map((log, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-2">
                              <p className="text-xs truncate">{log.user_id}</p>
                            </td>
                            <td className="py-2 px-2 font-medium text-xs">{log.access_type}</td>
                            <td className="py-2 px-2 text-xs">{log.entity_type}</td>
                            <td className="py-2 px-2 text-center">
                              {log.pii_accessed && (
                                <AlertCircle className="h-4 w-4 text-red-600 inline" />
                              )}
                            </td>
                            <td className="py-2 px-2 text-xs">
                              {new Date(log.created_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-600">No access logs</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Sessions */}
          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Login History</CardTitle>
              </CardHeader>
              <CardContent>
                {loginHistory && loginHistory.length > 0 ? (
                  <div className="space-y-2">
                    {loginHistory.slice(0, 20).map((login, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{login.email}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {login.ip_address} • {new Date(login.created_date).toLocaleString()}
                            </p>
                          </div>
                          <Badge
                            className={
                              login.status === 'Success'
                                ? 'bg-green-600'
                                : 'bg-red-600'
                            }
                          >
                            {login.status}
                          </Badge>
                        </div>
                        {login.status !== 'Success' && login.failure_reason && (
                          <p className="text-xs text-red-600 mt-2">{login.failure_reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No login history</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}