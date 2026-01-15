import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, MessageSquare, Eye, Edit, FileOutput, MessageCircle } from 'lucide-react';
import QuoteGeneratorModal from './QuoteGeneratorModal';

export default function LeadDetailModal({ lead, onEdit, trigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  const contactMethods = [
    {
      icon: Phone,
      label: 'Call Mobile',
      value: lead.mobile_phone,
      action: () => window.location.href = `tel:${lead.mobile_phone}`,
    },
    {
      icon: Mail,
      label: 'Email Home',
      value: lead.home_email,
      action: () => window.location.href = `mailto:${lead.home_email}`,
    },
    {
      icon: Mail,
      label: 'Email Work',
      value: lead.work_email,
      action: () => window.location.href = `mailto:${lead.work_email}`,
    },
    {
      icon: MessageSquare,
      label: 'SMS',
      value: lead.mobile_phone,
      action: () => alert('SMS integration coming soon'),
    },
  ].filter(m => m.value);

  return (
    <>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1">
            <Eye className="h-3 w-3" />
            View
          </Button>
        )}
      </DialogTrigger>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{lead.first_name} {lead.last_name}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Contact Cards */}
              <div className="grid grid-cols-2 gap-3">
                {contactMethods.map((method, idx) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={idx}
                      onClick={method.action}
                      className="p-3 border rounded-lg hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="flex items-start gap-2">
                        <Icon className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500">{method.label}</p>
                          <p className="text-sm font-medium truncate">{method.value}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Key Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 uppercase">FICO Score</p>
                  <p className="text-lg font-semibold">{lead.fico_score || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <p className="text-lg font-semibold capitalize">{lead.status}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Loan Amount</p>
                  <p className="text-lg font-semibold">${lead.loan_amount ? (lead.loan_amount / 1000).toFixed(0) + 'K' : 'TBD'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Loan Type</p>
                  <p className="text-lg font-semibold">{lead.loan_type || 'TBD'}</p>
                </div>
              </div>

              {/* Property Info */}
              {lead.property_street && (
                <div className="p-4 border rounded-lg">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Property</p>
                  <p className="font-medium">{lead.property_street}</p>
                  <p className="text-sm text-gray-600">
                    {lead.property_city}, {lead.property_state} {lead.property_zip}
                  </p>
                  {lead.estimated_value && (
                    <p className="text-sm mt-2">
                      <span className="text-gray-600">Estimated Value: </span>
                      <span className="font-semibold">${parseFloat(lead.estimated_value).toLocaleString()}</span>
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <div className="space-y-3 text-sm">
                {lead.first_name && <div><span className="text-gray-600">First Name:</span> {lead.first_name}</div>}
                {lead.last_name && <div><span className="text-gray-600">Last Name:</span> {lead.last_name}</div>}
                {lead.property_type && <div><span className="text-gray-600">Property Type:</span> {lead.property_type}</div>}
                {lead.occupancy && <div><span className="text-gray-600">Occupancy:</span> {lead.occupancy}</div>}
                {lead.loan_purpose && <div><span className="text-gray-600">Loan Purpose:</span> {lead.loan_purpose}</div>}
                {lead.current_rate && <div><span className="text-gray-600">Current Rate:</span> {lead.current_rate}%</div>}
                {lead.current_balance && <div><span className="text-gray-600">Current Balance:</span> ${parseFloat(lead.current_balance).toLocaleString()}</div>}
                {lead.property_taxes && <div><span className="text-gray-600">Property Taxes:</span> ${parseFloat(lead.property_taxes).toLocaleString()}</div>}
                {lead.annual_homeowners_insurance && <div><span className="text-gray-600">Homeowners Insurance:</span> ${parseFloat(lead.annual_homeowners_insurance).toLocaleString()}</div>}
                {lead.monthly_rental_income && <div><span className="text-gray-600">Monthly Rental Income:</span> ${parseFloat(lead.monthly_rental_income).toLocaleString()}</div>}
                {lead.source && <div><span className="text-gray-600">Source:</span> {lead.source}</div>}
                {lead.notes && <div><span className="text-gray-600">Notes:</span> {lead.notes}</div>}
              </div>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-3">
              <Button 
                onClick={() => {
                  setQuoteModalOpen(true);
                }} 
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <FileOutput className="h-4 w-4" />
                Generate Quote
              </Button>
              <Button 
                onClick={() => {
                  onEdit(lead);
                  setIsOpen(false);
                }}
                variant="outline"
                className="w-full gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Lead
              </Button>
              <Button 
                onClick={() => alert('Coming soon: Send message to lead')}
                variant="outline"
                className="w-full gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Send Message
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {quoteModalOpen && (
        <QuoteGeneratorModal
          isOpen={quoteModalOpen}
          onClose={() => setQuoteModalOpen(false)}
          lead={lead}
        />
      )}
    </>
  );
}