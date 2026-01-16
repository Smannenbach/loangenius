import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, CheckCircle, AlertCircle, Search, Filter, FileText } from 'lucide-react';

export default function AuditComplianceViewer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAgent, setFilterAgent] = useState('all');

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['agentAuditLogs'],
    queryFn: async () => {
      try {
        return await base44.entities.AuditLog.filter({});
      } catch {
        return [];
      }
    }
  });

  const mockLogs = [
    {
      id: '1',
      agent_name: 'Document Intelligence',
      action: 'document_classified',
      details: 'Classified lease agreement with 98% confidence',
      timestamp: new Date('2026-01-16T10:30:00'),
      status: 'success',
      deal_id: 'DL-202601-0042'
    },
    {
      id: '2',
      agent_name: 'DSCR Underwriter',
      action: 'dscr_calculated',
      details: 'DSCR ratio: 1.32, verified within guidelines',
      timestamp: new Date('2026-01-16T10:28:00'),
      status: 'success',
      deal_id: 'DL-202601-0042'
    },
    {
      id: '3',
      agent_name: 'Fraud Detection',
      action: 'fraud_check',
      details: 'No fraud indicators detected',
      timestamp: new Date('2026-01-16T10:25:00'),
      status: 'success',
      deal_id: 'DL-202601-0041'
    },
    {
      id: '4',
      agent_name: 'Compliance Audit',
      action: 'compliance_check',
      details: 'Warning: Missing HMDA data for borrower',
      timestamp: new Date('2026-01-16T10:20:00'),
      status: 'warning',
      deal_id: 'DL-202601-0040'
    },
    {
      id: '5',
      agent_name: 'Pricing & Lock',
      action: 'rate_locked',
      details: 'Rate locked at 7.25% for 30 days',
      timestamp: new Date('2026-01-16T10:15:00'),
      status: 'success',
      deal_id: 'DL-202601-0039'
    },
  ];

  const logsToDisplay = auditLogs.length > 0 ? auditLogs : mockLogs;

  const filteredLogs = logsToDisplay.filter(log => {
    const matchSearch = !searchTerm || 
      log.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.deal_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchAgent = filterAgent === 'all' || log.agent_name === filterAgent;
    return matchSearch && matchAgent;
  });

  const agents = [...new Set(logsToDisplay.map(l => l.agent_name))];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="h-8 w-8 text-green-600" />
          Audit & Compliance Viewer
        </h1>
        <p className="text-gray-500 mt-1">Track agent actions, decisions, and compliance events</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Actions</p>
                <p className="text-2xl font-bold text-gray-900">{logsToDisplay.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {((logsToDisplay.filter(l => l.status === 'success').length / logsToDisplay.length) * 100).toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {logsToDisplay.filter(l => l.status === 'warning').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterAgent} onValueChange={setFilterAgent}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map(agent => (
                  <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLogs.map(log => (
              <div key={log.id} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {log.status === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {log.status === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                    {log.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                    <span className="font-semibold text-gray-900">{log.agent_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{log.action}</Badge>
                    {log.deal_id && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{log.deal_id}</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700">{log.details}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(log.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}