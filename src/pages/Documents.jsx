import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Upload,
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadData, setUploadData] = useState({ name: '', document_type: 'other' });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Please select a file');
      
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      // Create document record
      return await base44.entities.Document.create({
        name: uploadData.name || selectedFile.name,
        document_type: uploadData.document_type,
        file_url,
        file_name: selectedFile.name,
        status: 'pending',
        is_deleted: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
      setIsUploadOpen(false);
      setUploadData({ name: '', document_type: 'other' });
      setSelectedFile(null);
      toast.success('Document uploaded successfully!');
    },
    onError: (error) => {
      toast.error('Upload failed: ' + error.message);
    }
  });

  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      try {
        return await base44.entities.Document.filter({ is_deleted: false });
      } catch (e) {
        // FIX: Log error and show to user instead of silently failing
        console.error('Failed to fetch documents:', e);
        throw e;
      }
    },
  });

  // FIX: Show error state to user
  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 text-red-500" />
            <h3 className="font-medium text-red-800">Failed to load documents</h3>
            <p className="text-red-600 text-sm mt-1">{error.message}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => queryClient.invalidateQueries(['documents'])}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-700',
      requested: 'bg-blue-100 text-blue-700',
      received: 'bg-yellow-100 text-yellow-700',
      under_review: 'bg-purple-100 text-purple-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <p className="text-gray-500 mt-1">Manage loan documents and files</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-500 gap-2"
          onClick={() => setIsUploadOpen(true)}
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-gray-200 mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card className="border-gray-200">
        <CardContent className="p-0">
          {filteredDocuments.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No documents found</p>
              <Button 
                variant="link" 
                className="text-blue-600 mt-2"
                onClick={() => setIsUploadOpen(true)}
              >
                Upload your first document
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{doc.name || 'Untitled'}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500 capitalize">
                          {doc.document_type?.replace(/_/g, ' ')}
                        </span>
                        {doc.expiration_date && (
                          <span className="text-sm text-gray-400">
                            • Expires {new Date(doc.expiration_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(doc.status)}>
                      {getStatusIcon(doc.status)}
                      <span className="ml-1">{doc.status?.replace(/_/g, ' ')}</span>
                    </Badge>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        aria-label="View document"
                        onClick={() => {
                          if (doc.file_url) {
                            window.open(doc.file_url, '_blank');
                          } else {
                            toast.error('No file available to view');
                          }
                        }}
                      >
                        <Eye className="h-4 w-4 text-gray-400" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        aria-label="Download document"
                        onClick={() => {
                          if (doc.file_url) {
                            const a = document.createElement('a');
                            a.href = doc.file_url;
                            a.download = doc.file_name || doc.name || 'document';
                            a.click();
                          } else {
                            toast.error('No file available to download');
                          }
                        }}
                      >
                        <Download className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input
                placeholder="e.g., Bank Statement - January 2024"
                value={uploadData.name}
                onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select
                value={uploadData.document_type}
                onValueChange={(v) => setUploadData({ ...uploadData, document_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_statement">Bank Statement</SelectItem>
                  <SelectItem value="tax_return">Tax Return</SelectItem>
                  <SelectItem value="pay_stub">Pay Stub</SelectItem>
                  <SelectItem value="id_document">ID Document</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="appraisal">Appraisal</SelectItem>
                  <SelectItem value="lease_agreement">Lease Agreement</SelectItem>
                  <SelectItem value="entity_docs">Entity Documents</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  // FIX: Add client-side file size validation
                  const maxSize = 15 * 1024 * 1024; // 15MB
                  if (file.size > maxSize) {
                    toast.error('File size exceeds 15MB limit');
                    e.target.value = '';
                    return;
                  }
                  setSelectedFile(file);
                }}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
              />
              <div 
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to select a file</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOC up to 15MB</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsUploadOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => uploadMutation.mutate()}
                disabled={!selectedFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}