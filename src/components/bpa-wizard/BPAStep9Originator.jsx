import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Briefcase, CheckCircle, Building2, User } from 'lucide-react';

export default function BPAStep9Originator({ formData, updateFormData, errors, isPortal }) {
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

  const { data: orgSettings } = useQuery({
    queryKey: ['orgSettings', memberships[0]?.org_id],
    queryFn: async () => {
      if (!memberships[0]?.org_id) return null;
      const settings = await base44.entities.OrgSettings.filter({ org_id: memberships[0].org_id });
      return settings[0];
    },
    enabled: !!memberships[0]?.org_id,
  });

  const updateOriginator = (field, value) => {
    updateFormData({
      originator: { ...formData.originator, [field]: value },
    });
  };

  // For borrower portal, show read-only originator info
  if (isPortal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Loan Originator Information</h3>
        </div>

        <div className="p-6 bg-gray-50 rounded-lg border text-center">
          <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h4 className="font-semibold text-gray-700 mb-2">
            {orgSettings?.company_name || 'Your Lending Institution'}
          </h4>
          <p className="text-gray-500 text-sm">
            Loan originator information will be completed by your loan officer.
          </p>
          {orgSettings?.nmls_id && (
            <p className="text-gray-500 text-sm mt-2">
              NMLS# {orgSettings.nmls_id}
            </p>
          )}
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Application Complete</span>
          </div>
          <p className="text-sm text-green-600 mt-2">
            Click "Submit Application" to send your application for review.
          </p>
        </div>
      </div>
    );
  }

  // For LO portal, show editable fields
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Loan Originator Information</h3>
      </div>

      {/* Organization Info */}
      <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <Label className="text-base font-semibold">Loan Originator Organization</Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input
              value={formData.originator.organization_name || orgSettings?.company_name || ''}
              onChange={(e) => updateOriginator('organization_name', e.target.value)}
              placeholder="ABC Mortgage Company"
            />
          </div>
          <div className="space-y-2">
            <Label>Organization NMLS ID</Label>
            <Input
              value={formData.originator.organization_nmls_id || orgSettings?.nmls_id || ''}
              onChange={(e) => updateOriginator('organization_nmls_id', e.target.value)}
              placeholder="123456"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Organization Address</Label>
          <Input
            value={formData.originator.organization_address || orgSettings?.address || ''}
            onChange={(e) => updateOriginator('organization_address', e.target.value)}
            placeholder="123 Main St, Suite 100, Los Angeles, CA 90001"
          />
        </div>
      </div>

      {/* Individual Originator Info */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-gray-600" />
          <Label className="text-base font-semibold">Loan Originator (Individual)</Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Originator Name</Label>
            <Input
              value={formData.originator.originator_name || user?.full_name || ''}
              onChange={(e) => updateOriginator('originator_name', e.target.value)}
              placeholder="John Smith"
            />
          </div>
          <div className="space-y-2">
            <Label>Originator NMLS ID</Label>
            <Input
              value={formData.originator.originator_nmls_id || memberships[0]?.nmls_id || ''}
              onChange={(e) => updateOriginator('originator_nmls_id', e.target.value)}
              placeholder="987654"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>State License ID</Label>
            <Input
              value={formData.originator.originator_state_license_id}
              onChange={(e) => updateOriginator('originator_state_license_id', e.target.value)}
              placeholder="CA-DBO 12345"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.originator.originator_email || user?.email || ''}
              onChange={(e) => updateOriginator('originator_email', e.target.value)}
              placeholder="john@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={formData.originator.originator_phone}
              onChange={(e) => updateOriginator('originator_phone', e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={formData.originator.originator_address}
              onChange={(e) => updateOriginator('originator_address', e.target.value)}
              placeholder="123 Main St, Los Angeles, CA 90001"
            />
          </div>
        </div>
      </div>

      {/* Originator Signature */}
      <div className="space-y-4 p-4 border rounded-lg">
        <Label className="text-base font-semibold">Loan Originator Signature</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type Your Full Name to Sign</Label>
            <Input
              placeholder="Type your full legal name"
              value={formData.originator.originator_signature}
              onChange={(e) => updateOriginator('originator_signature', e.target.value)}
              className="font-signature text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={formData.originator.originator_signature_date || new Date().toISOString().split('T')[0]}
              onChange={(e) => updateOriginator('originator_signature_date', e.target.value)}
            />
          </div>
        </div>

        {formData.originator.originator_signature && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            Loan originator signature captured
          </div>
        )}
      </div>

      {/* Ready to Submit */}
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Application Complete</span>
        </div>
        <p className="text-sm text-green-600 mt-2">
          Review all information and click "Submit Application" to finalize. 
          A MISMO 3.4 XML export will be available after submission.
        </p>
      </div>

      <style jsx global>{`
        .font-signature {
          font-family: 'Brush Script MT', cursive, sans-serif;
        }
      `}</style>
    </div>
  );
}