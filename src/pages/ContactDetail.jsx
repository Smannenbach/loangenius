import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, User, Building2, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ContactDetail() {
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get('id');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const contacts = await base44.entities.Contact.list();
      return contacts.find(c => c.id === contactId);
    },
    enabled: !!contactId,
  });

  // Fetch deals associated with this contact
  const { data: deals = [] } = useQuery({
    queryKey: ['contact-deals', contactId],
    queryFn: async () => {
      if (!contact) return [];
      return await base44.entities.Deal.filter({ primary_borrower_id: contactId });
    },
    enabled: !!contact,
  });

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen text-center">
        <p className="text-gray-500">Contact not found</p>
        <Link to={createPageUrl('Contacts')} className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Contacts
        </Link>
      </div>
    );
  }

  const getContactName = () => {
    if (contact.contact_type === 'entity') return contact.entity_name;
    return `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
  };

  const getContactIcon = () => {
    return contact.contact_type === 'entity' ? 
      <Building2 className="h-12 w-12 text-blue-600" /> :
      <User className="h-12 w-12 text-blue-600" />;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Link 
          to={createPageUrl('Contacts')}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Contacts
        </Link>

        <Card className="bg-white">
          <CardContent className="py-6">
            <div className="flex items-start gap-4 mb-4">
              {getContactIcon()}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{getContactName()}</h1>
                <p className="text-gray-600 text-sm mt-1">
                  {contact.contact_type === 'entity' ? contact.entity_type : 'Individual'}
                </p>
              </div>
            </div>

            {/* Quick Contact */}
            <div className="space-y-2 mt-4">
              {contact.email && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact.address_city && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{contact.address_city}, {contact.address_state}</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-6">
              <Button 
                className="bg-blue-600 hover:bg-blue-700" 
                size="sm"
                onClick={() => {
                  if (contact.email) {
                    window.location.href = `mailto:${contact.email}`;
                  } else {
                    alert('No email address available');
                  }
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (contact.phone) {
                    window.location.href = `tel:${contact.phone}`;
                  } else {
                    alert('No phone number available');
                  }
                }}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white shadow mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {contact.email && (
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{contact.email}</p>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{contact.phone}</p>
                  </div>
                )}
                {contact.citizenship && (
                  <div>
                    <p className="text-gray-500">Citizenship</p>
                    <p className="font-medium text-gray-900 capitalize">{contact.citizenship}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {contact.contact_type === 'individual' && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-base">Financial Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {contact.credit_score && (
                    <div>
                      <p className="text-gray-500">Credit Score</p>
                      <p className="font-medium text-gray-900">{contact.credit_score}</p>
                    </div>
                  )}
                  {contact.annual_income && (
                    <div>
                      <p className="text-gray-500">Annual Income</p>
                      <p className="font-medium text-gray-900">${(contact.annual_income).toLocaleString()}</p>
                    </div>
                  )}
                  {contact.net_worth && (
                    <div>
                      <p className="text-gray-500">Net Worth</p>
                      <p className="font-medium text-gray-900">${(contact.net_worth).toLocaleString()}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="deals">
          <Card className="bg-white">
            <CardContent className="py-6">
              {deals.length === 0 ? (
                <p className="text-gray-500 text-sm">No deals associated with this contact yet.</p>
              ) : (
                <div className="space-y-3">
                  {deals.map(deal => (
                    <Link key={deal.id} to={createPageUrl(`DealDetail?id=${deal.id}`)}>
                      <div className="p-4 border rounded-lg hover:bg-gray-50 transition">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{deal.deal_number || 'Draft Deal'}</p>
                            <p className="text-sm text-gray-600">{deal.loan_product}</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">{deal.stage}</Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mt-2">
                          ${(deal.loan_amount || 0).toLocaleString()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="bg-white">
            <CardContent className="py-6">
              <p className="text-gray-500 text-sm">No activity recorded yet.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}