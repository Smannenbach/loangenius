import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from 'lucide-react';

export default function BrandingSettings() {
  const queryClient = useQueryClient();
  const [branding, setBranding] = useState({
    company_name: '',
    logo_url: '',
    primary_color: '#2563eb',
    nmls_number: '',
    phone: '',
    email: '',
    website: '',
    legal_disclaimer: ''
  });

  const { data: org } = useQuery({
    queryKey: ['organization'],
    queryFn: () => base44.entities.Organization.list()
  });

  const updateBranding = useMutation({
    mutationFn: (data) => fetch('/api/organization/branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateBranding.mutate(branding);
  };

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle>Company Branding</CardTitle>
        <CardDescription>Customize how your company appears on documents</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Company Name</Label>
            <Input 
              value={branding.company_name}
              onChange={(e) => setBranding({...branding, company_name: e.target.value})}
              placeholder="Your Company Name"
            />
          </div>

          <div>
            <Label>Primary Color</Label>
            <Input 
              type="color"
              value={branding.primary_color}
              onChange={(e) => setBranding({...branding, primary_color: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>NMLS Number</Label>
              <Input 
                value={branding.nmls_number}
                onChange={(e) => setBranding({...branding, nmls_number: e.target.value})}
                placeholder="123456"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input 
                value={branding.phone}
                onChange={(e) => setBranding({...branding, phone: e.target.value})}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <Label>Email</Label>
            <Input 
              value={branding.email}
              onChange={(e) => setBranding({...branding, email: e.target.value})}
              placeholder="info@company.com"
            />
          </div>

          <div>
            <Label>Website</Label>
            <Input 
              value={branding.website}
              onChange={(e) => setBranding({...branding, website: e.target.value})}
              placeholder="https://yourcompany.com"
            />
          </div>

          <div>
            <Label>Legal Disclaimer</Label>
            <Textarea 
              value={branding.legal_disclaimer}
              onChange={(e) => setBranding({...branding, legal_disclaimer: e.target.value})}
              rows={3}
              placeholder="Enter any required legal disclaimers..."
            />
          </div>

          <Button type="submit" className="bg-blue-600 hover:bg-blue-500 gap-2" disabled={updateBranding.isPending}>
            <Save className="h-4 w-4" />
            Save Branding
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}