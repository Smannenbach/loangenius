import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Shield, Zap, TrendingUp, Plus, Building2, Users, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import CreateOrganizationModal from '@/components/admin/CreateOrganizationModal';

export default function SuperAdmin() {
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const queryClient = useQueryClient();

  // Fetch TenantAccounts (primary) and Organizations (legacy)
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => base44.entities.TenantAccount.list('-created_date')
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list('-created_date')
  });

  // Suspend/Activate mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return base44.entities.TenantAccount.update(id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Status updated');
    },
  });

  // Combine tenants and orgs for display
  const allOrganizations = tenants.length > 0 ? tenants : orgs;

  const filteredOrgs = allOrganizations.filter(o =>
    (o.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.slug || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.admin_email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 mb-8">
        <Shield className="h-8 w-8 text-red-600" />
        <h1 className="text-3xl font-bold">Super Admin Panel</h1>
      </div>

      <Tabs defaultValue="organizations">
        <TabsList>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="tiers">Subscription Tiers</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-4">
          {/* Quick Add Dropdown */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search organizations by name, slug, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Organization Selector */}
            <Select value={selectedTenant?.id || ''} onValueChange={(id) => {
              const t = allOrganizations.find(o => o.id === id);
              setSelectedTenant(t);
            }}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select organization..." />
              </SelectTrigger>
              <SelectContent>
                {allOrganizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{org.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => setCreateModalOpen(true)} className="bg-blue-600 gap-2">
              <Plus className="h-4 w-4" />
              New Organization
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-gray-600">Total</span>
                </div>
                <p className="text-2xl font-bold mt-1">{allOrganizations.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-600">Active</span>
                </div>
                <p className="text-2xl font-bold mt-1">{allOrganizations.filter(o => o.status === 'active').length}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm text-gray-600">Trial</span>
                </div>
                <p className="text-2xl font-bold mt-1">{allOrganizations.filter(o => o.status === 'trial').length}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  <span className="text-sm text-gray-600">MRR</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  ${allOrganizations.filter(o => o.status === 'active').reduce((sum, o) => {
                    const prices = { starter: 49, professional: 149, enterprise: 499 };
                    return sum + (prices[o.plan_id] || 0);
                  }, 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Organizations List */}
          <div className="grid gap-4">
            {tenantsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              </div>
            ) : filteredOrgs.length === 0 ? (
              <Card className="p-8 text-center">
                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No organizations found</p>
                <Button onClick={() => setCreateModalOpen(true)} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Organization
                </Button>
              </Card>
            ) : (
              filteredOrgs.map(org => (
                <Card key={org.id} className={selectedTenant?.id === org.id ? 'ring-2 ring-blue-500' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          {org.name}
                          {org.plan_id === 'enterprise' && (
                            <Badge className="bg-purple-100 text-purple-800">Enterprise</Badge>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">{org.slug}.loangenius.ai</p>
                        {org.admin_email && (
                          <p className="text-sm text-gray-500">{org.admin_email}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Badge className={
                            org.status === 'active' ? 'bg-green-100 text-green-800' :
                            org.status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                            org.status === 'suspended' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {org.status || org.subscription_status}
                          </Badge>
                          <Badge variant="outline">{org.plan_id || 'starter'}</Badge>
                          {org.trial_ends_at && org.status === 'trial' && (
                            <Badge variant="outline" className="text-orange-600">
                              Trial ends: {new Date(org.trial_ends_at).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setEditingOrg(org);
                            setCreateModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="outline">Impersonate</Button>
                        {org.status === 'active' || org.status === 'trial' ? (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => statusMutation.mutate({ id: org.id, status: 'suspended' })}
                            disabled={statusMutation.isPending}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={() => statusMutation.mutate({ id: org.id, status: 'active' })}
                            disabled={statusMutation.isPending}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Subscription Tiers Tab */}
        <TabsContent value="tiers" className="space-y-4">
          <Button className="bg-blue-600">+ New Tier</Button>
          
          <div className="grid gap-4">
            {[
              { name: 'Starter', price: 49, users: 3, deals: 50 },
              { name: 'Professional', price: 149, users: 10, deals: 200 },
              { name: 'Enterprise', price: 499, users: null, deals: null }
            ].map(tier => (
              <Card key={tier.name}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold">{tier.name}</h3>
                      <p className="text-2xl font-bold text-blue-600 mt-2">${tier.price}/mo</p>
                      <div className="text-sm text-gray-600 mt-2 space-y-1">
                        <p>Max Users: {tier.users || 'Unlimited'}</p>
                        <p>Max Deals: {tier.deals || 'Unlimited'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Edit</Button>
                      <Button size="sm" variant="outline">Delete</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          <Button className="gap-2">
            <Zap className="h-4 w-4" />
            Add Feature
          </Button>

          <div className="grid gap-4">
            {[
              { code: 'deals', name: 'Deal Management', category: 'core', premium: false },
              { code: 'borrower_portal', name: 'Borrower Portal', category: 'portal', premium: false },
              { code: 'ai_assistant', name: 'AI Assistant', category: 'ai', premium: true },
              { code: 'advanced_reports', name: 'Advanced Reports', category: 'analytics', premium: true }
            ].map(feature => (
              <div key={feature.code} className="p-4 border rounded flex justify-between items-center">
                <div>
                  <p className="font-medium">{feature.name}</p>
                  <p className="text-sm text-gray-600">{feature.code}</p>
                  <Badge variant={feature.premium ? 'destructive' : 'secondary'} className="mt-2">
                    {feature.premium ? 'Premium' : 'Standard'}
                  </Badge>
                </div>
                <Button size="sm" variant="outline">Edit</Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Total Organizations</p>
                <p className="text-4xl font-bold mt-2">{orgs.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Monthly Recurring Revenue</p>
                <p className="text-4xl font-bold mt-2">$12,450</p>
                <p className="text-sm text-green-600 mt-2">+15.2% vs last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Active Subscriptions</p>
                <p className="text-4xl font-bold mt-2">{orgs.filter(o => o.subscription_status === 'ACTIVE').length}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Organization Modal */}
      <CreateOrganizationModal 
        open={createModalOpen} 
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setEditingOrg(null);
        }}
        editOrg={editingOrg}
      />
    </div>
  );
}