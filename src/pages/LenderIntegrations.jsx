import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2, Plus, Search, Globe, Settings, Zap, Upload, Check, 
  AlertCircle, Loader2, ExternalLink, Send, FileCode, MoreVertical,
  Edit, Trash2, RefreshCw, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function LenderIntegrations() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [newIntegration, setNewIntegration] = useState({
    lender_name: '',
    lender_type: 'DSCR',
    api_type: 'MISMO_34',
    api_endpoint: '',
    submission_email: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    supported_products: [],
    min_loan_amount: '',
    max_loan_amount: '',
    min_dscr: '',
    max_ltv: ''
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

  const orgId = memberships[0]?.org_id || user?.org_id || 'default';

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['lenderIntegrations', orgId],
    queryFn: async () => {
      try {
        return await base44.entities.LenderIntegration.filter({ org_id: orgId });
      } catch {
        return [];
      }
    }
  });

  const { data: recentSubmissions = [] } = useQuery({
    queryKey: ['recentSubmissions', orgId],
    queryFn: async () => {
      try {
        return await base44.entities.LenderSubmission.filter({ org_id: orgId });
      } catch {
        return [];
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.LenderIntegration.create({
        ...data,
        org_id: orgId,
        status: 'active',
        total_submissions: 0,
        successful_submissions: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lenderIntegrations'] });
      setIsAddOpen(false);
      resetForm();
      toast.success('Lender integration added!');
    },
    onError: (error) => {
      toast.error('Failed to add integration: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LenderIntegration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lenderIntegrations'] });
      toast.success('Integration deleted');
    }
  });

  const resetForm = () => {
    setNewIntegration({
      lender_name: '',
      lender_type: 'DSCR',
      api_type: 'MISMO_34',
      api_endpoint: '',
      submission_email: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      supported_products: [],
      min_loan_amount: '',
      max_loan_amount: '',
      min_dscr: '',
      max_ltv: ''
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      pending_approval: 'bg-yellow-100 text-yellow-700'
    };
    return <Badge className={styles[status] || styles.inactive}>{status}</Badge>;
  };

  const getApiTypeBadge = (type) => {
    const styles = {
      'MISMO_34': 'bg-blue-100 text-blue-700',
      'REST_API': 'bg-purple-100 text-purple-700',
      'SFTP': 'bg-orange-100 text-orange-700',
      'EMAIL': 'bg-green-100 text-green-700',
      'MANUAL': 'bg-gray-100 text-gray-700'
    };
    return <Badge className={styles[type] || styles.MANUAL}>{type.replace('_', ' ')}</Badge>;
  };

  const stats = {
    total: integrations.length,
    active: integrations.filter(i => i.status === 'active').length,
    totalSubmissions: integrations.reduce((sum, i) => sum + (i.total_submissions || 0), 0),
    successRate: integrations.reduce((sum, i) => sum + (i.successful_submissions || 0), 0)
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Zap className="h-8 w-8 text-blue-600" />
            Lender Integrations
          </h1>
          <p className="text-gray-500 mt-1">Connect and submit loans to wholesale lenders</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="h-4 w-4" />
              Add Lender Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Lender Integration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Lender Name *</Label>
                  <Input
                    value={newIntegration.lender_name}
                    onChange={(e) => setNewIntegration({ ...newIntegration, lender_name: e.target.value })}
                    placeholder="ABC Lending"
                  />
                </div>
                <div>
                  <Label>Lender Type</Label>
                  <Select 
                    value={newIntegration.lender_type} 
                    onValueChange={(v) => setNewIntegration({ ...newIntegration, lender_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DSCR">DSCR</SelectItem>
                      <SelectItem value="Non-QM">Non-QM</SelectItem>
                      <SelectItem value="Hard Money">Hard Money</SelectItem>
                      <SelectItem value="Bridge">Bridge</SelectItem>
                      <SelectItem value="Portfolio">Portfolio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Integration Type</Label>
                  <Select 
                    value={newIntegration.api_type} 
                    onValueChange={(v) => setNewIntegration({ ...newIntegration, api_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MISMO_34">MISMO 3.4 XML</SelectItem>
                      <SelectItem value="REST_API">REST API</SelectItem>
                      <SelectItem value="SFTP">SFTP Upload</SelectItem>
                      <SelectItem value="EMAIL">Email Submission</SelectItem>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newIntegration.api_type === 'REST_API' && (
                <div>
                  <Label>API Endpoint URL</Label>
                  <Input
                    value={newIntegration.api_endpoint}
                    onChange={(e) => setNewIntegration({ ...newIntegration, api_endpoint: e.target.value })}
                    placeholder="https://api.lender.com/submit"
                  />
                </div>
              )}

              {newIntegration.api_type === 'EMAIL' && (
                <div>
                  <Label>Submission Email</Label>
                  <Input
                    type="email"
                    value={newIntegration.submission_email}
                    onChange={(e) => setNewIntegration({ ...newIntegration, submission_email: e.target.value })}
                    placeholder="submissions@lender.com"
                  />
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Name</Label>
                    <Input
                      value={newIntegration.contact_name}
                      onChange={(e) => setNewIntegration({ ...newIntegration, contact_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={newIntegration.contact_email}
                      onChange={(e) => setNewIntegration({ ...newIntegration, contact_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      value={newIntegration.contact_phone}
                      onChange={(e) => setNewIntegration({ ...newIntegration, contact_phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Loan Parameters</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Min Loan Amount</Label>
                    <Input
                      type="number"
                      value={newIntegration.min_loan_amount}
                      onChange={(e) => setNewIntegration({ ...newIntegration, min_loan_amount: e.target.value })}
                      placeholder="75000"
                    />
                  </div>
                  <div>
                    <Label>Max Loan Amount</Label>
                    <Input
                      type="number"
                      value={newIntegration.max_loan_amount}
                      onChange={(e) => setNewIntegration({ ...newIntegration, max_loan_amount: e.target.value })}
                      placeholder="5000000"
                    />
                  </div>
                  <div>
                    <Label>Min DSCR</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newIntegration.min_dscr}
                      onChange={(e) => setNewIntegration({ ...newIntegration, min_dscr: e.target.value })}
                      placeholder="0.75"
                    />
                  </div>
                  <div>
                    <Label>Max LTV (%)</Label>
                    <Input
                      type="number"
                      value={newIntegration.max_ltv}
                      onChange={(e) => setNewIntegration({ ...newIntegration, max_ltv: e.target.value })}
                      placeholder="80"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if (!newIntegration.lender_name) {
                      toast.error('Please enter lender name');
                      return;
                    }
                    createMutation.mutate(newIntegration);
                  }}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Adding...' : 'Add Integration'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Integrations</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Active</p>
                <p className="text-2xl font-bold text-green-900">{stats.active}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Submissions</p>
                <p className="text-2xl font-bold text-purple-900">{stats.totalSubmissions}</p>
              </div>
              <Send className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Successful</p>
                <p className="text-2xl font-bold text-orange-900">{stats.successRate}</p>
              </div>
              <Check className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="integrations">
        <TabsList className="mb-6">
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="submissions">Recent Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-500 mt-2">Loading integrations...</p>
            </div>
          ) : integrations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">No Integrations Yet</h3>
                <p className="text-gray-500 mb-4">Add lender integrations to submit loans directly</p>
                <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Integration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.map((integration) => (
                <Card key={integration.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{integration.lender_name}</CardTitle>
                          <div className="flex gap-2 mt-1">
                            {getStatusBadge(integration.status)}
                            {getApiTypeBadge(integration.api_type)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <span className="ml-1 font-medium">{integration.lender_type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Submissions:</span>
                        <span className="ml-1 font-medium">{integration.total_submissions || 0}</span>
                      </div>
                      {integration.min_dscr && (
                        <div>
                          <span className="text-gray-500">Min DSCR:</span>
                          <span className="ml-1 font-medium">{integration.min_dscr}</span>
                        </div>
                      )}
                      {integration.max_ltv && (
                        <div>
                          <span className="text-gray-500">Max LTV:</span>
                          <span className="ml-1 font-medium">{integration.max_ltv}%</span>
                        </div>
                      )}
                    </div>
                    {integration.contact_email && (
                      <p className="text-xs text-gray-500">{integration.contact_email}</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings className="h-4 w-4 mr-1" />
                        Configure
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(integration.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions">
          {recentSubmissions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Send className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">No Submissions Yet</h3>
                <p className="text-gray-500">Submissions will appear here after you submit deals to lenders</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Lender</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Deal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Submitted</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{sub.lender_name}</td>
                        <td className="px-4 py-3 text-sm">{sub.deal_id?.slice(0, 8)}...</td>
                        <td className="px-4 py-3">
                          <Badge className={
                            sub.status === 'approved' ? 'bg-green-100 text-green-700' :
                            sub.status === 'denied' ? 'bg-red-100 text-red-700' :
                            sub.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {sub.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {getApiTypeBadge(sub.submission_method || 'MANUAL')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}