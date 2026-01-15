import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, CheckCircle2, Clock, AlertCircle, Loader2, Download } from 'lucide-react';

export default function PortalDocumentsTab({ loanFileId, sessionId, borrower }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['portalDocuments', loanFileId],
    queryFn: async () => {
      const response = await base44.functions.invoke('portalDocuments', {
        action: 'getDocuments',
        loanFileId,
        sessionId,
      });
      return response.data.documents || {};
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      setUploading(true);
      try {
        // Call backend function to handle upload server-side
        const response = await base44.functions.invoke('portalDocuments', {
          action: 'presignUpload',
          sessionId,
          requirementId: null, // Will be set by user in UI
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        });
        return response.data;
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalDocuments', loanFileId] });
      setUploading(false);
    },
  });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'Approved') return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (status === 'Uploaded') return <Clock className="h-5 w-5 text-yellow-600" />;
    if (status === 'Pending') return <AlertCircle className="h-5 w-5 text-gray-400" />;
    return <FileText className="h-5 w-5 text-gray-400" />;
  };

  const getStatusColor = (status) => {
    if (status === 'Approved') return 'bg-green-100 text-green-800';
    if (status === 'Uploaded') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const uploadedCount = Object.values(documents).filter(d => d.uploaded).length;
  const requiredCount = Object.values(documents).filter(d => d.isRequired).length;
  const progress = requiredCount > 0 ? (uploadedCount / requiredCount) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Upload Progress */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Documents Uploaded</span>
            <span className="text-sm font-medium text-gray-900">{uploadedCount} of {requiredCount} required</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
        <CardContent className="p-6">
          <div
            className="text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-gray-600">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="font-medium text-gray-900">Upload documents</p>
                <p className="text-sm text-gray-500 mt-1">Drag and drop or click to browse</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </CardContent>
      </Card>

      {/* Required Documents */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Required Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
            </div>
          ) : Object.keys(documents).length === 0 ? (
            <p className="text-gray-500 text-center py-4">No documents required at this time</p>
          ) : (
            Object.entries(documents).map(([key, doc]) => (
              <div key={key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                {getStatusIcon(doc.status)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{doc.template.name}</p>
                  {doc.template.help_text && (
                    <p className="text-xs text-gray-600 mt-1">{doc.template.help_text}</p>
                  )}
                  {doc.uploaded && (
                    <p className="text-xs text-gray-500 mt-1">
                      Uploaded: {new Date(doc.uploaded.updated_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(doc.status)}>
                    {doc.status}
                  </Badge>
                  {doc.uploaded && (
                    <a href={doc.uploaded.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-blue-900 mb-2">📋 Pro Tips</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Use clear photos in good lighting for document scans</li>
            <li>• Make sure all four corners of the document are visible</li>
            <li>• File types accepted: PDF, JPG, PNG</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}