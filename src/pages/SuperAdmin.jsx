import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Shield, Zap, TrendingUp } from 'lucide-react';

export default function SuperAdmin() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.asServiceRole.entities.Organization.filter({})
  });

  const filteredOrgs = orgs.filter(o =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.slug.toLowerCase().includes(searchTerm.toLowerCase())
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
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button className="bg-blue-600">New Organization</Button>
          </div>

          <div className="grid gap-4">
            {filteredOrgs.map(org => (
              <Card key={org.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold">{org.name}</h3>
                      <p className="text-sm text-gray-600">{org.slug}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge>{org.subscription_status}</Badge>
                        {org.subscription_status === 'ACTIVE' && (
                          <Badge variant="outline">Professional</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Edit</Button>
                      <Button size="sm" variant="outline">Impersonate</Button>
                      <Button size="sm" variant="destructive">Suspend</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
    </div>
  );
}