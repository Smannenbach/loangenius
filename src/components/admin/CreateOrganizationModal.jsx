import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { Loader2, Building2, Mail, Globe, CreditCard } from 'lucide-react';

const PLANS = [
  { id: 'starter', name: 'Starter', price: 49, seats: 3, deals: 50 },
  { id: 'professional', name: 'Professional', price: 149, seats: 10, deals: 200 },
  { id: 'enterprise', name: 'Enterprise', price: 499, seats: null, deals: null },
];

export default function CreateOrganizationModal({ open, onOpenChange, editOrg = null }) {
  const queryClient = useQueryClient();
  const isEditing = !!editOrg;
  
  const [formData, setFormData] = useState({
    name: editOrg?.name || '',
    slug: editOrg?.slug || '',
    admin_email: editOrg?.admin_email || '',
    plan_id: editOrg?.plan_id || 'starter',
    status: editOrg?.status || 'trial',
    primary_domain: editOrg?.primary_domain || '',
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Generate slug from name if not provided
      const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const tenantData = {
        name: data.name,
        slug,
        admin_email: data.admin_email,
        plan_id: data.plan_id,
        status: data.status,
        primary_domain: data.primary_domain || `${slug}.loangenius.ai`,
        subscription_status: data.status === 'active' ? 'active' : 'trialing',
        trial_ends_at: data.status === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : null,
        feature_flags_json: { white_label: data.plan_id === 'enterprise' },
        usage_limits_json: {
          max_users: PLANS.find(p => p.id === data.plan_id)?.seats || 999,
          max_deals: PLANS.find(p => p.id === data.plan_id)?.deals || 999999,
        },
      };

      if (isEditing) {
        return base44.entities.TenantAccount.update(editOrg.id, tenantData);
      } else {
        // Create TenantAccount
        const tenant = await base44.entities.TenantAccount.create(tenantData);
        
        // Also create Organization for backward compatibility
        await base44.entities.Organization.create({
          name: data.name,
          slug,
          admin_email: data.admin_email,
          subscription_status: tenantData.subscription_status,
          subscription_tier: data.plan_id,
        });
        
        return tenant;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success(isEditing ? 'Organization updated!' : 'Organization created!');
      onOpenChange(false);
      setFormData({ name: '', slug: '', admin_email: '', plan_id: 'starter', status: 'trial', primary_domain: '' });
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            {isEditing ? 'Edit Organization' : 'Create New Organization'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update organization details' : 'Add a new lending company to the platform'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Company Name *</Label>
              <Input
                placeholder="Acme Lending"
                value={formData.name}
                onChange={handleNameChange}
              />
            </div>
            
            <div>
              <Label>Slug (URL)</Label>
              <div className="flex items-center">
                <Input
                  placeholder="acme-lending"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="rounded-r-none"
                />
                <span className="px-3 py-2 bg-gray-100 border border-l-0 rounded-r-md text-sm text-gray-500">
                  .loangenius.ai
                </span>
              </div>
            </div>

            <div>
              <Label>Custom Domain</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="loans.acme.com"
                  value={formData.primary_domain}
                  onChange={(e) => setFormData({ ...formData, primary_domain: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="col-span-2">
              <Label>Admin Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="admin@acmelending.com"
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label>Subscription Plan</Label>
              <Select value={formData.plan_id} onValueChange={(v) => setFormData({ ...formData, plan_id: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>{plan.name}</span>
                        <span className="text-gray-500">${plan.price}/mo</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (14 days)</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Plan Preview */}
          {formData.plan_id && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-medium text-blue-900">
                {PLANS.find(p => p.id === formData.plan_id)?.name} Plan Includes:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• {PLANS.find(p => p.id === formData.plan_id)?.seats || 'Unlimited'} user seats</li>
                <li>• {PLANS.find(p => p.id === formData.plan_id)?.deals || 'Unlimited'} deals/month</li>
                {formData.plan_id === 'enterprise' && <li>• White-label branding</li>}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || !formData.admin_email || createMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-500"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Organization' : 'Create Organization'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}