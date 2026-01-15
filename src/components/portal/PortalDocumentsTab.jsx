import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, CheckCircle2, Clock, AlertCircle, Loader2, Download } from 'lucide-react';

export default function PortalDocumentsTab({ sessionId }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const fileInputRef = React.useRef(null);

  const { data: requirementsData = {}, isLoading } = useQuery({
    queryKey: ['portalRequirements', sessionId],
    queryFn: async () => {
      const response = await base44.functions.invoke('portalRequirements', {
        sessionId,
      });
      return response.data || {};
    },
    enabled: !!sessionId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      if (!selectedRequirement) {
        throw new Error('Please select a requirement to upload');
      }
      setUploading(true);
      try {
        const response = await base44.functions.invoke('portalDocuments', {
          action: 'completeUpload',
          sessionId,
          requirementId: selectedRequirement.id,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          hash: '', // In production, calculate SHA256
        });
        return response.data;
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalRequirements', sessionId] });
      setUploading(false);
      setSelectedRequirement(null);
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

  const requirements_by_category = requirementsData.requirements_by_category || {};
  const total = requirementsData.total || 0;
  const completed = requirementsData.completed || 0;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  const allRequirements = Object.values(requirements_by_category).flat();
  const pendingRequirements = allRequirements.filter(r => !['approved', 'rejected'].includes(r.status));

  return (
    <div className="space-y-4">
      {/* Upload Progress */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Documents Complete</span>
            <span className="text-sm font-medium text-gray-900">{completed} of {total}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Upload Area */}
      {pendingRequirements.length > 0 && (
        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Document to Upload</label>
                <select
                  value={selectedRequirement?.id || ''}
                  onChange={(e) => {
                    const req = allRequirements.find(r => r.id === e.target.value);
                    setSelectedRequirement(req || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Choose a requirement...</option>
                  {pendingRequirements.map(req => (
                    <option key={req.id} value={req.id}>
                      {req.display_name} {req.is_required ? '(Required)' : '(Optional)'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRequirement && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium">{selectedRequirement.display_name}</p>
                  {selectedRequirement.instructions && (
                    <p className="text-xs text-blue-700 mt-1">{selectedRequirement.instructions}</p>
                  )}
                </div>
              )}

              <div
                className="text-center cursor-pointer p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
                onClick={() => selectedRequirement && fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-spin" />
                    <p className="text-sm text-gray-600">Uploading...</p>
                  </>
                ) : selectedRequirement ? (
                  <>
                    <Upload className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <p className="font-medium text-gray-900">Upload {selectedRequirement.display_name}</p>
                    <p className="text-sm text-gray-500 mt-1">Drag and drop or click to browse</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="font-medium text-gray-500">Select a document first</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading || !selectedRequirement}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requirements by Category */}
      {Object.entries(requirements_by_category).map(([category, reqs]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-3 capitalize text-gray-900">{category}</h3>
          <div className="space-y-2">
            {reqs.map(req => (
              <Card key={req.id} className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(req.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900">{req.display_name}</p>
                      {req.instructions && (
                        <p className="text-xs text-gray-600 mt-1">{req.instructions}</p>
                      )}
                      {req.due_date && (
                        <p className="text-xs text-gray-500 mt-1">Due: {new Date(req.due_date).toLocaleDateString()}</p>
                      )}
                      {req.documents?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {req.documents.map(doc => (
                            <p key={doc.id} className="text-xs text-gray-600">
                              📎 {doc.file_name}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <Badge className={getStatusColor(req.status)}>
                      {req.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Tips */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-blue-900 mb-2">📋 Pro Tips</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Use clear photos in good lighting for document scans</li>
            <li>• Make sure all four corners of the document are visible</li>
            <li>• File types accepted: PDF, JPG, PNG (max 25MB)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}