import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, Upload, MessageSquare, History, FileText, Download } from 'lucide-react';

export default function BorrowerPortal() {
  const [activeTab, setActiveTab] = useState('documents');
  const [uploadedFile, setUploadedFile] = useState(null);

  // Sample data - in production would come from deal/document entities
  const deal = {
    dealNumber: 'DL-2024-001',
    loanOfficer: 'John Smith',
    loanAmount: 500000,
    interestRate: 6.5,
  };

  const documents = [
    { id: 1, name: 'Business Purpose Letter', type: 'anti_steering_letter', status: 'received', dueDate: '2026-01-20' },
    { id: 2, name: 'Credit Report', type: 'credit_report', status: 'received', dueDate: '2026-01-25' },
    { id: 3, name: 'Government ID', type: 'government_id', status: 'pending', dueDate: '2026-01-18' },
    { id: 4, name: 'Lease Agreement', type: 'lease_agreement', status: 'requested', dueDate: '2026-01-22' },
    { id: 5, name: 'Property Insurance', type: 'property_insurance', status: 'pending', dueDate: '2026-01-25' },
    { id: 6, name: 'Appraisal Report', type: 'appraisal', status: 'requested', dueDate: '2026-01-30' },
  ];

  const timeline = [
    { date: '2026-01-10', event: 'Loan Application Received', status: 'completed' },
    { date: '2026-01-12', event: 'Documents Requested', status: 'completed' },
    { date: '2026-01-20', event: 'Processing Review', status: 'in_progress' },
    { date: '2026-02-05', event: 'Underwriting', status: 'pending' },
    { date: '2026-02-20', event: 'Clear to Close', status: 'pending' },
  ];

  const getStatusColor = (status) => {
    const colors = {
      received: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      requested: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    const icons = {
      completed: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      in_progress: <Clock className="h-5 w-5 text-blue-600" />,
      pending: <AlertCircle className="h-5 w-5 text-gray-400" />,
    };
    return icons[status] || <AlertCircle className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Loan Application</h1>
              <p className="text-gray-500 mt-2">Deal #{deal.dealNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Loan Officer</p>
              <p className="font-medium text-gray-900">{deal.loanOfficer}</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase">Loan Amount</p>
              <p className="text-xl font-bold text-blue-600">${(deal.loanAmount / 1000).toFixed(0)}K</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase">Interest Rate</p>
              <p className="text-xl font-bold text-green-600">{deal.interestRate}%</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase">Status</p>
              <p className="text-xl font-bold text-purple-600">Processing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          {[
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'timeline', label: 'Timeline', icon: History },
            { id: 'messages', label: 'Messages', icon: MessageSquare },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Document Checklist */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle>Required Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                    <div className="flex items-start gap-4 flex-1">
                      <FileText className="h-5 w-5 text-gray-400 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">{doc.name}</p>
                        <p className="text-sm text-gray-500">Due: {new Date(doc.dueDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(doc.status)}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Upload Area */}
            <Card className="border-gray-200 border-2 border-dashed">
              <CardContent className="p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Upload Documents</h3>
                <p className="text-sm text-gray-500 mb-4">Drag files here or click to browse</p>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setUploadedFile(e.target.files?.[0]?.name)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button asChild className="bg-blue-600 hover:bg-blue-500">
                    <span>Select Files</span>
                  </Button>
                </label>
                {uploadedFile && (
                  <p className="text-sm text-green-600 mt-3">✓ {uploadedFile} ready to upload</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Timeline */}
        {activeTab === 'timeline' && (
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="space-y-6">
                {timeline.map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      {getStatusIcon(item.status)}
                      {idx < timeline.length - 1 && <div className="w-1 h-12 bg-gray-200 mt-2" />}
                    </div>
                    <div className="pb-6">
                      <p className="font-medium text-gray-900">{item.event}</p>
                      <p className="text-sm text-gray-500">{new Date(item.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        {activeTab === 'messages' && (
          <Card className="border-gray-200">
            <CardContent className="p-6 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>No messages yet. Your loan officer will reach out here.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}