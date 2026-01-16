import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MessageSquare, Eye, Edit, FileOutput, MessageCircle, CheckCircle2, AlertCircle, Loader, ArrowRight, ClipboardList, Clock, Plus, Calculator, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import QuoteGeneratorModal from './QuoteGeneratorModal';

export default function LeadDetailModal({ lead, onEdit, trigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const queryClient = useQueryClient();

  // Fetch tasks for this lead
  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['lead-tasks', lead.id],
    queryFn: async () => {
      try {
        return await base44.entities.Task.filter({ lead_id: lead.id });
      } catch {
        return [];
      }
    },
    enabled: isOpen,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (title) => {
      return base44.entities.Task.create({
        org_id: lead.org_id,
        lead_id: lead.id,
        title,
        status: 'pending',
        priority: 'medium',
      });
    },
    onSuccess: () => {
      refetchTasks();
      setNewTaskTitle('');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return base44.entities.Task.update(id, { status });
    },
    onSuccess: () => refetchTasks(),
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ type, value }) => {
      return await base44.functions.invoke('verifyLeadContact', {
        lead_id: lead.id,
        type,
        value,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('convertLeadToLoanApp', {
        lead_id: lead.id,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      alert(`Lead converted to Loan Application! ID: ${data.data.loan_application_id}`);
      setIsOpen(false);
    },
  });

  const contactMethods = [
    {
      icon: Phone,
      label: 'Mobile Phone',
      value: lead.mobile_phone,
      verified: lead.mobile_phone_verified,
      type: 'phone',
      action: () => window.location.href = `tel:${lead.mobile_phone}`,
    },
    {
      icon: Mail,
      label: 'Home Email',
      value: lead.home_email,
      verified: lead.home_email_verified,
      type: 'email',
      action: () => window.location.href = `mailto:${lead.home_email}`,
    },
    {
      icon: Mail,
      label: 'Work Email',
      value: lead.work_email,
      verified: lead.work_email_verified,
      type: 'email',
      action: () => window.location.href = `mailto:${lead.work_email}`,
    },
    {
      icon: Phone,
      label: 'Home Phone',
      value: lead.home_phone,
      verified: lead.home_phone_verified,
      type: 'phone',
      action: () => window.location.href = `tel:${lead.home_phone}`,
    },
    {
      icon: Phone,
      label: 'Work Phone',
      value: lead.work_phone,
      verified: lead.work_phone_verified,
      type: 'phone',
      action: () => window.location.href = `tel:${lead.work_phone}`,
    },
  ].filter(m => m.value);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="sm" className="gap-1">
              <Eye className="h-3 w-3" />
              View
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{lead.first_name} {lead.last_name}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
              <TabsTrigger value="calculator">Calculator</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Contact Cards */}
              <div className="space-y-2">
                {contactMethods.map((method, idx) => {
                  const Icon = method.icon;
                  const isVerifying = verifyMutation.isPending;
                  return (
                    <div
                      key={idx}
                      className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={method.action}
                          className="flex-1 text-left flex items-start gap-2"
                        >
                          <Icon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500">{method.label}</p>
                            <p className="text-sm font-medium truncate">{method.value}</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {method.verified ? (
                            <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => verifyMutation.mutate({ type: method.type, value: method.value })}
                              disabled={isVerifying}
                            >
                              {isVerifying ? (
                                <Loader className="h-3 w-3 animate-spin" />
                              ) : (
                                'Verify'
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
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

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a new task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && newTaskTitle.trim() && createTaskMutation.mutate(newTaskTitle)}
                  className="flex-1"
                />
                <Button 
                  size="sm" 
                  onClick={() => newTaskTitle.trim() && createTaskMutation.mutate(newTaskTitle)}
                  disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No tasks yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <button
                        onClick={() => updateTaskMutation.mutate({ 
                          id: task.id, 
                          status: task.status === 'completed' ? 'pending' : 'completed' 
                        })}
                        className="flex-shrink-0"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      <span className={`flex-1 text-sm ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                        {task.title}
                      </span>
                      <Badge className={task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Calculator Tab */}
            <TabsContent value="calculator" className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium flex items-center gap-2 mb-3">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  Quick DSCR Calculator
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Loan Amount</p>
                    <p className="font-semibold">${lead.loan_amount ? lead.loan_amount.toLocaleString() : 'TBD'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Property Value</p>
                    <p className="font-semibold">${lead.estimated_value ? parseFloat(lead.estimated_value).toLocaleString() : 'TBD'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Monthly Rent</p>
                    <p className="font-semibold">${lead.monthly_rental_income ? parseFloat(lead.monthly_rental_income).toLocaleString() : 'TBD'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">LTV Ratio</p>
                    <p className="font-semibold">
                      {lead.loan_amount && lead.estimated_value 
                        ? ((lead.loan_amount / lead.estimated_value) * 100).toFixed(1) + '%' 
                        : 'TBD'}
                    </p>
                  </div>
                  {lead.loan_amount && lead.monthly_rental_income && (
                    <>
                      <div>
                        <p className="text-gray-600">Est. Monthly P&I</p>
                        <p className="font-semibold">
                          ${((lead.loan_amount * 0.07 / 12) / (1 - Math.pow(1 + 0.07/12, -360))).toFixed(0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Est. DSCR</p>
                        <p className="font-semibold">
                          {(lead.monthly_rental_income / ((lead.loan_amount * 0.07 / 12) / (1 - Math.pow(1 + 0.07/12, -360)))).toFixed(2)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <Button 
                onClick={() => setQuoteModalOpen(true)} 
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <FileOutput className="h-4 w-4" />
                Open Full Quote Generator
              </Button>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-3">
              {lead.status !== 'converted' && (
                <Button 
                  onClick={() => convertMutation.mutate()}
                  disabled={convertMutation.isPending}
                  className="w-full gap-2 bg-green-600 hover:bg-green-700"
                >
                  {convertMutation.isPending ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      Convert to Loan Application
                    </>
                  )}
                </Button>
              )}
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
                onClick={() => {
                  const email = lead.home_email || lead.work_email;
                  if (email) {
                    window.location.href = `mailto:${email}?subject=Regarding your loan inquiry`;
                  } else {
                    alert('No email address available for this lead');
                  }
                }}
                variant="outline"
                className="w-full gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Send Email
              </Button>
              <Button 
                onClick={() => {
                  const phone = lead.mobile_phone || lead.home_phone || lead.work_phone;
                  if (phone) {
                    window.location.href = `sms:${phone}`;
                  } else {
                    alert('No phone number available for this lead');
                  }
                }}
                variant="outline"
                className="w-full gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Send SMS
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