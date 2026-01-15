import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users, LayoutGrid, Mail, Settings as SettingsIcon, Lock, BarChart3,
  ChevronRight, AlertCircle
} from 'lucide-react';

export default function AdminSettings() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Check admin role
  if (user && user.role !== 'admin') {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700 font-medium">Admin access required</span>
        </div>
      </div>
    );
  }

  const [activeSection, setActiveSection] = useState('users');

  const sections = [
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'system', label: 'System Config', icon: LayoutGrid },
    { id: 'communications', label: 'Communications', icon: Mail },
    { id: 'integrations', label: 'Integrations', icon: SettingsIcon },
    { id: 'security', label: 'Data & Security', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="grid grid-cols-4 gap-6 p-6">
        {/* Sidebar */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="font-bold text-gray-900">Admin Settings</h3>
            </div>
            <nav className="divide-y">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 transition ${
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{section.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="col-span-3">
          {activeSection === 'users' && <TeamManagementSection />}
          {activeSection === 'system' && <SystemConfigSection />}
          {activeSection === 'communications' && <CommunicationsSection />}
          {activeSection === 'integrations' && <IntegrationsSection />}
          {activeSection === 'security' && <SecuritySection />}
        </div>
      </div>
    </div>
  );
}

function TeamManagementSection() {
  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Team Management</CardTitle>
          <Button className="bg-blue-600 hover:bg-blue-700">+ Add User</Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 text-sm">Manage team members and their roles.</p>
      </CardContent>
    </Card>
  );
}

function SystemConfigSection() {
  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Fee Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm mb-4">Configure standard fees for loan estimates.</p>
          <Button variant="outline">Manage Fees</Button>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Document Types</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm mb-4">Define document requirements and categories.</p>
          <Button variant="outline">Manage Documents</Button>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Loan Products</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm mb-4">Configure loan product parameters and guidelines.</p>
          <Button variant="outline">Manage Products</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CommunicationsSection() {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Email Templates</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 text-sm mb-4">Manage email templates with merge field support.</p>
        <Button variant="outline">Manage Templates</Button>
      </CardContent>
    </Card>
  );
}

function IntegrationsSection() {
  return (
    <div className="space-y-4">
      {['SendGrid (Email)', 'Twilio (SMS)', 'DocuSign', 'Zapier', 'OpenAI'].map(integration => (
        <Card key={integration} className="bg-white">
          <CardContent className="py-4 flex justify-between items-center">
            <span className="font-medium text-gray-900">{integration}</span>
            <Button variant="outline" size="sm">Configure</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SecuritySection() {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Audit Log & Security</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 text-sm">View organization audit logs and security settings.</p>
      </CardContent>
    </Card>
  );
}