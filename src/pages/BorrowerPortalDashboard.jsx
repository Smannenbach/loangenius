import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Home, FileText, MessageSquare, CheckCircle2, Clock, 
  Upload, Bell, User, ChevronRight, Sparkles, 
  FileCheck, AlertCircle, Calendar, Phone, Mail,
  Building2, DollarSign, TrendingUp, Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PortalChatWidget from '@/components/portal/PortalChatWidget';
import PortalApplicationStatus from '@/components/portal/PortalApplicationStatus';
import PortalDocumentCenter from '@/components/portal/PortalDocumentCenter';
import PortalMessageCenter from '@/components/portal/PortalMessageCenter';
import PortalPreQualResults from '@/components/portal/PortalPreQualResults';
import PortalResources from '@/components/portal/PortalResources';
import PortalDashboardSummary from '@/components/portal/PortalDashboardSummary';
import PortalDocumentStatusTracker from '@/components/portal/PortalDocumentStatusTracker';
import PortalSecureMessaging from '@/components/portal/PortalSecureMessaging';
import PortalEducationResources from '@/components/portal/PortalEducationResources';

export default function BorrowerPortalDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [chatOpen, setChatOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Get borrower's deals
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['borrowerDeals', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      // Find deals where user is a borrower
      const borrowers = await base44.entities.Borrower.filter({ email: user.email });
      if (borrowers.length === 0) return [];
      
      const dealBorrowers = await base44.entities.DealBorrower.filter({ 
        borrower_id: borrowers[0].id 
      });
      
      if (dealBorrowers.length === 0) return [];
      
      const dealIds = dealBorrowers.map(db => db.deal_id);
      const allDeals = await base44.entities.Deal.filter({});
      return allDeals.filter(d => dealIds.includes(d.id));
    },
    enabled: !!user?.email
  });

  // Get pre-qualification results
  const { data: preQuals = [] } = useQuery({
    queryKey: ['borrowerPreQuals', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const borrowers = await base44.entities.Borrower.filter({ email: user.email });
      if (borrowers.length === 0) return [];
      return await base44.entities.PreQualification.filter({ borrower_id: borrowers[0].id });
    },
    enabled: !!user?.email
  });

  // Get tasks assigned to borrower
  const { data: tasks = [] } = useQuery({
    queryKey: ['borrowerTasks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Task.filter({ 
        assigned_to: user.email,
        is_visible_to_borrower: true
      });
    },
    enabled: !!user?.email
  });

  // Get unread notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['borrowerNotifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Notification.filter({ 
        recipient_email: user.email
      });
    },
    enabled: !!user?.email
  });

  // Define activeDeal BEFORE it's used in documentRequirements query
  const activeDeal = deals[0];

  // Get document requirements - must come AFTER activeDeal is defined
  const { data: documentRequirements = [] } = useQuery({
    queryKey: ['borrowerDocRequirements', activeDeal?.id],
    queryFn: async () => {
      if (!activeDeal?.id) return [];
      try {
        return await base44.entities.DealDocumentRequirement.filter({ 
          deal_id: activeDeal.id 
        });
      } catch {
        return [];
      }
    },
    enabled: !!activeDeal?.id
  });
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const latestPreQual = preQuals && preQuals.length > 0 ? preQuals[0] : null;

  // Generate next steps from tasks and document requirements
  const nextSteps = [
    ...pendingTasks.map(t => ({
      title: t.title,
      description: t.description,
      due_date: t.due_date
    })),
    ...(documentRequirements.filter(r => r.status === 'pending' && r.is_required).length > 0 ? [{
      title: 'Upload Required Documents',
      description: `${documentRequirements.filter(r => r.status === 'pending' && r.is_required).length} documents needed`,
      due_date: null
    }] : [])
  ].slice(0, 5);

  // Generate key dates
  const keyDates = activeDeal ? [
    {
      label: 'Application Submitted',
      date: activeDeal.application_date || activeDeal.created_date,
      status: 'completed'
    },
    ...(activeDeal.stage === 'underwriting' || activeDeal.stage === 'approved' ? [{
      label: 'Estimated Appraisal',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Appraisal typically ordered within 7 days',
      status: 'upcoming'
    }] : []),
    ...(activeDeal.stage === 'approved' || activeDeal.stage === 'closing' ? [{
      label: 'Estimated Closing',
      date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Target closing date (subject to change)',
      status: 'upcoming'
    }] : [])
  ] : [];

  const getStageProgress = (stage) => {
    const stages = ['inquiry', 'application', 'processing', 'underwriting', 'approved', 'closing', 'funded'];
    const idx = stages.indexOf(stage);
    return idx >= 0 ? Math.round(((idx + 1) / stages.length) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-900">My Loan Portal</h1>
                <p className="text-sm text-gray-500">Welcome back, {user?.full_name || 'Borrower'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </Button>
              <Button 
                onClick={() => setChatOpen(true)}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <MessageSquare className="h-4 w-4" />
                Chat with Us
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-6 bg-white shadow-sm">
            <TabsTrigger value="overview" className="gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Status</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
              {documentRequirements.filter(r => r.status === 'pending' && r.is_required).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                  {documentRequirements.filter(r => r.status === 'pending' && r.is_required).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="education" className="gap-2">
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Learn</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Resources</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <PortalDashboardSummary 
              deal={activeDeal}
              nextSteps={nextSteps}
              keyDates={keyDates}
            />
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-6">
            <PortalDocumentStatusTracker requirements={documentRequirements} />
            
            {activeDeal && (
              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Loan Progress
                    </CardTitle>
                    <Badge className="bg-blue-600">{activeDeal.deal_number}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <PortalApplicationStatus deal={activeDeal} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <PortalDocumentCenter 
              dealId={activeDeal?.id} 
              borrowerEmail={user?.email}
            />
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <PortalSecureMessaging 
              dealId={activeDeal?.id}
              borrowerEmail={user?.email}
            />
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="education">
            <PortalEducationResources />
          </TabsContent>

          {/* Legacy sections for compatibility */}
          <TabsContent value="overview-legacy" className="space-y-6">
            {/* Application Status Card */}
            {activeDeal ? (
              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Application Status
                    </CardTitle>
                    <Badge className="bg-blue-600">{activeDeal.deal_number}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <PortalApplicationStatus deal={activeDeal} />
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="font-semibold text-gray-900 mb-2">No Active Application</h3>
                  <p className="text-gray-500 mb-4">Start your loan application to track progress here</p>
                  <Link to={createPageUrl('BorrowerOnboarding')}>
                    <Button className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Start Application
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions & Tasks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pending Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    Action Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingTasks.length > 0 ? (
                    <div className="space-y-3">
                      {pendingTasks.slice(0, 4).map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-center gap-3">
                            {task.task_type === 'document_upload' ? (
                              <Upload className="h-5 w-5 text-orange-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-orange-600" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{task.title}</p>
                              {task.due_date && (
                                <p className="text-xs text-gray-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => setActiveTab('documents')}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">You're all caught up!</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pre-Qual Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    Pre-Qualification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {preQuals && preQuals.length > 0 && latestPreQual ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        {latestPreQual.status === 'passed' && (
                          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                          </div>
                        )}
                        {latestPreQual.status === 'needs_review' && (
                          <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-yellow-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold capitalize">{latestPreQual.status.replace('_', ' ')}</p>
                          <p className="text-sm text-gray-500">
                            LTV: {latestPreQual.ltv_ratio?.toFixed(1)}% • DSCR: {latestPreQual.dscr_ratio?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setActiveTab('prequal')}
                      >
                        View Full Results
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Sparkles className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500 mb-3">Check if you pre-qualify</p>
                      <Link to={createPageUrl('BorrowerOnboarding')}>
                        <Button variant="outline" className="gap-2">
                          <Sparkles className="h-4 w-4" />
                          Get Pre-Qualified
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Loan Officer Contact */}
            {activeDeal && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-500" />
                    Your Loan Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                        LO
                      </div>
                      <div>
                        <p className="font-semibold">Loan Officer</p>
                        <p className="text-sm text-gray-500">{activeDeal.assigned_to_user_id || 'Assigned'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-2">
                        <Phone className="h-4 w-4" />
                        Call
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>
                      <Button size="sm" className="gap-2" onClick={() => setChatOpen(true)}>
                        <MessageSquare className="h-4 w-4" />
                        Chat
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab - New Enhanced Version */}
          <TabsContent value="documents">
            <PortalDocumentCenter 
              dealId={activeDeal?.id} 
              borrowerEmail={user?.email}
            />
          </TabsContent>

          {/* Messages Tab - New Secure Messaging */}
          <TabsContent value="messages">
            <PortalSecureMessaging 
              dealId={activeDeal?.id}
              borrowerEmail={user?.email}
            />
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources">
            <PortalResources />
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Chat Widget */}
      <PortalChatWidget 
        isOpen={chatOpen} 
        onClose={() => setChatOpen(false)}
        dealId={activeDeal?.id}
        borrowerEmail={user?.email}
      />
    </div>
  );
}

export { BorrowerPortalDashboard };