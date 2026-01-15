import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  MessageSquare,
  CheckCircle2,
  Clock,
  Home,
  DollarSign,
  Calendar,
  LogOut,
  AlertCircle,
  Upload,
  Building2,
  Lock,
} from 'lucide-react';
import PortalDocumentsTab from '../components/portal/PortalDocumentsTab';
import PortalMessagesTab from '../components/portal/PortalMessagesTab';
import PortalStatusTab from '../components/portal/PortalStatusTab';

export default function BorrowerPortal() {
  const [sessionId, setSessionId] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('sessionId');
    
    if (!sessionIdParam) {
      setError('No session found. Please use your magic link.');
      setLoading(false);
      return;
    }

    setSessionId(sessionIdParam);
    validateSession(sessionIdParam);
  }, []);

  const validateSession = async (id) => {
    try {
      // In a real scenario, verify session on backend
      // For now, retrieve session data
      const session = await base44.asServiceRole.entities.PortalSession.get(id);
      if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
        setError('Session expired or invalid');
        setLoading(false);
        return;
      }

      const borrower = await base44.asServiceRole.entities.Borrower.get(session.borrower_id);
      const loanFile = await base44.asServiceRole.entities.LoanFile.get(session.loan_file_id);

      setSessionData({
        sessionId: id,
        borrower,
        loanFile,
      });
    } catch (err) {
      setError('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    window.location.href = '/BorrowerPortalLogin';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-12 w-48 bg-gray-200 rounded mb-4" />
          <div className="h-64 w-full max-w-2xl bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div>
                <h2 className="font-semibold text-gray-900">Access Error</h2>
                <p className="text-sm text-gray-600 mt-1">{error}</p>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => window.location.href = '/BorrowerPortalLogin'}
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { borrower, loanFile } = sessionData;
  const isClosingSoon = loanFile?.closing_date && 
    new Date(loanFile.closing_date) - new Date() < 7 * 24 * 60 * 60 * 1000;

  const getStatusColor = (status) => {
    const colors = {
      'Lead': 'bg-gray-100 text-gray-800',
      'Application': 'bg-blue-100 text-blue-800',
      'Processing': 'bg-yellow-100 text-yellow-800',
      'Submitted': 'bg-purple-100 text-purple-800',
      'Conditional_Approval': 'bg-indigo-100 text-indigo-800',
      'Clear_to_Close': 'bg-emerald-100 text-emerald-800',
      'Docs_Out': 'bg-teal-100 text-teal-800',
      'Funded': 'bg-green-100 text-green-800',
      'Withdrawn': 'bg-gray-100 text-gray-500',
      'Denied': 'bg-red-100 text-red-800',
    };
    return colors[status?.replace(/ /g, '_')] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <h1 className="font-bold text-lg hidden sm:block">LoanGenius</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-gray-600"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {borrower?.first_name}!
          </h2>
          <p className="text-gray-600 mt-1">Loan {loanFile?.loan_number}</p>
        </div>

        {/* Alerts */}
        {isClosingSoon && (
          <Card className="border-amber-200 bg-amber-50 mb-6">
            <CardContent className="p-4 flex gap-3">
              <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Closing Coming Soon</p>
                <p className="text-sm text-amber-800 mt-0.5">
                  Your closing is scheduled for {new Date(loanFile.closing_date).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">Application Status</span>
                <Badge className={getStatusColor(loanFile?.status)}>
                  {loanFile?.status?.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {['Lead', 'Application', 'Processing'].includes(loanFile?.status) ? (
                    <Clock className="h-4 w-4 text-blue-600" />
                  ) : ['Submitted', 'Conditional_Approval'].includes(loanFile?.status) ? (
                    <Clock className="h-4 w-4 text-purple-600" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-gray-700">Next: Document Review</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-600 mb-3">Key Details</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Loan Amount:</span>
                  <span className="font-medium">${(loanFile?.loan_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Est. Closing:</span>
                  <span className="font-medium">
                    {loanFile?.closing_date ? new Date(loanFile.closing_date).toLocaleDateString() : 'TBD'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="status" className="gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Status</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status">
            <PortalStatusTab loanFile={loanFile} />
          </TabsContent>

          <TabsContent value="documents">
            <PortalDocumentsTab loanFileId={loanFile?.id} sessionId={sessionId} borrower={borrower} />
          </TabsContent>

          <TabsContent value="messages">
            <PortalMessagesTab loanFileId={loanFile?.id} sessionId={sessionId} borrower={borrower} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}