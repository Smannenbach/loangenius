import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, Clock, AlertCircle, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function PortalDocumentCenter({ dealId, borrowerEmail, tasks = [] }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: ['portalDocuments', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      try {
        return await base44.entities.Document.filter({ deal_id: dealId });
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      return await base44.entities.Document.create({
        org_id: 'default',
        deal_id: dealId,
        document_type: 'other',
        file_name: file.name,
        file_url: file_url,
        uploaded_by: borrowerEmail,
        status: 'pending_review',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['borrowerTasks'] });
      toast.success('Document uploaded successfully!');
    },
    onError: (error) => {
      toast.error('Upload failed: ' + error.message);
    },
  });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const pendingUploads = tasks.filter(t => t.task_type === 'document_upload' && t.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Upload Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="block">
            <input
              type="file"
              onChange={handleFileChange}
              disabled={uploading || !dealId}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <Button
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700 h-12"
              disabled={uploading || !dealId}
              onClick={(e) => e.currentTarget.previousElementSibling.click()}
            >
              {uploading ? (
                <>
                  <Clock className="h-5 w-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Choose File to Upload
                </>
              )}
            </Button>
          </label>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Accepted: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
          </p>
        </CardContent>
      </Card>

      {/* Required Documents */}
      {pendingUploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Required Documents ({pendingUploads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingUploads.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="font-medium text-sm">{task.title}</p>
                    {task.description && <p className="text-xs text-gray-500 mt-1">{task.description}</p>}
                  </div>
                  <Badge variant="outline" className="text-orange-700">Required</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            My Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">{doc.file_name}</p>
                      <p className="text-xs text-gray-500">
                        Uploaded {new Date(doc.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                      doc.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {doc.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {doc.status === 'pending_review' && <Clock className="h-3 w-3 mr-1" />}
                      {doc.status?.replace(/_/g, ' ')}
                    </Badge>
                    {doc.file_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.file_url, '_blank')}
                        className="gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}