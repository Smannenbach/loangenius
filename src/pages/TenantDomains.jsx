import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenantSafe } from '@/components/useBranding';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import {
  Globe,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Copy,
  Star,
  Trash2,
  RefreshCw,
  Loader2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export default function TenantDomains() {
  const { tenant_id, role, tenant_name } = useTenantSafe();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newHostname, setNewHostname] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['tenantDomains', tenant_id],
    queryFn: () => base44.entities.TenantDomain.filter({ tenant_id })
  });

  const createMutation = useMutation({
    mutationFn: (hostname) => base44.functions.invoke('manageTenantDomain', {
      action: 'create',
      hostname
    }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['tenantDomains'] });
      setIsAddOpen(false);
      setNewHostname('');
      setSelectedDomain(response.data.domain);
      toast.success('Domain added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add domain: ' + error.message);
    }
  });

  const verifyMutation = useMutation({
    mutationFn: (domain_id) => base44.functions.invoke('manageTenantDomain', {
      action: 'verify_dns',
      domain_id
    }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['tenantDomains'] });
      if (response.data.verified) {
        toast.success('DNS verified! SSL provisioning started.');
      } else {
        toast.error('DNS verification failed. Check your records.');
      }
    }
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (domain_id) => base44.functions.invoke('manageTenantDomain', {
      action: 'set_primary',
      domain_id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenantDomains'] });
      toast.success('Primary domain updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (domain_id) => base44.functions.invoke('manageTenantDomain', {
      action: 'delete',
      domain_id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenantDomains'] });
      setDeleteConfirmOpen(false);
      setSelectedDomain(null);
      toast.success('Domain deleted');
    }
  });

  const handleAdd = () => {
    if (!newHostname.trim()) {
      toast.error('Please enter a hostname');
      return;
    }
    createMutation.mutate(newHostname.toLowerCase().trim());
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending_dns: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'Pending DNS' },
      pending_ssl: { icon: Clock, color: 'bg-blue-100 text-blue-700', label: 'Provisioning SSL' },
      active: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Active' },
      failed: { icon: AlertCircle, color: 'bg-red-100 text-red-700', label: 'Failed' },
      disabled: { icon: AlertCircle, color: 'bg-gray-100 text-gray-700', label: 'Disabled' },
    };
    return configs[status] || configs.failed;
  };

  if (!['tenant_admin', 'admin'].includes(role)) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <p className="text-gray-600">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="h-7 w-7 text-blue-600" />
          Custom Domains
        </h1>
        <p className="text-gray-500 mt-1">
          Manage custom domains and subdomains for {tenant_name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Domains</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{domains.length}</p>
              </div>
              <Globe className="h-10 w-10 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {domains.filter(d => d.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Setup</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {domains.filter(d => ['pending_dns', 'pending_ssl'].includes(d.status)).length}
                </p>
              </div>
              <Clock className="h-10 w-10 text-yellow-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end mb-6">
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Domain
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </CardContent>
          </Card>
        ) : domains.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Globe className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">No custom domains configured</p>
              <Button variant="outline" onClick={() => setIsAddOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Domain
              </Button>
            </CardContent>
          </Card>
        ) : (
          domains.map((domain) => {
            const config = getStatusConfig(domain.status);
            const StatusIcon = config.icon;

            return (
              <Card key={domain.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{domain.hostname}</h3>
                        {domain.is_primary && (
                          <Badge className="bg-blue-100 text-blue-700 gap-1">
                            <Star className="h-3 w-3" />
                            Primary
                          </Badge>
                        )}
                        <Badge className={config.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                        <Badge variant="outline">{domain.domain_type}</Badge>
                      </div>

                      {domain.domain_type === 'custom' && domain.status === 'pending_dns' && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                          <h4 className="font-medium text-blue-900 flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            DNS Configuration Required
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <p className="text-gray-600 mb-1">Add this TXT record to verify domain ownership:</p>
                              <div className="flex items-center gap-2 bg-white p-3 rounded border font-mono text-xs">
                                <div className="flex-1">
                                  <strong>Name:</strong> _loangenius-verify.{domain.hostname}
                                  <br />
                                  <strong>Value:</strong> {domain.dns_verification_token}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(domain.dns_verification_token)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div>
                              <p className="text-gray-600 mb-1">Add this CNAME record to route traffic:</p>
                              <div className="flex items-center gap-2 bg-white p-3 rounded border font-mono text-xs">
                                <div className="flex-1">
                                  <strong>Name:</strong> {domain.hostname}
                                  <br />
                                  <strong>Value:</strong> {domain.cname_target}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(domain.cname_target)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => verifyMutation.mutate(domain.id)}
                            disabled={verifyMutation.isPending}
                            className="gap-2 w-full"
                          >
                            {verifyMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            Verify DNS Configuration
                          </Button>
                        </div>
                      )}

                      {domain.verification_error && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                          <AlertCircle className="h-4 w-4 inline mr-2" />
                          {domain.verification_error}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {domain.status === 'active' && !domain.is_primary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPrimaryMutation.mutate(domain.id)}
                          disabled={setPrimaryMutation.isPending}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      {!domain.is_primary && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setSelectedDomain(domain);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Domain Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Hostname</Label>
              <Input
                value={newHostname}
                onChange={(e) => setNewHostname(e.target.value)}
                placeholder="portal.yourcompany.com or acme.loangenius.ai"
              />
              <p className="text-xs text-gray-500 mt-2">
                Subdomains on loangenius.ai are instant. Custom domains require DNS verification.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Domain'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedDomain?.hostname}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(selectedDomain?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Domain
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}