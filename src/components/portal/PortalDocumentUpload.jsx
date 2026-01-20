import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PortalDocumentUpload({ sessionId, requirementId, requirementName }) {
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      // Step 1: Get presigned URL
      const presignResponse = await base44.functions.invoke('documentPresignUpload', {
        sessionId,
        requirementId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });

      // Step 2: Upload to storage
      const uploadUrl = presignResponse.data.uploadUrl;
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      // Step 3: Complete upload
      const completeResponse = await base44.functions.invoke('documentCompleteUpload', {
        sessionId,
        requirementId,
        uploadKey: presignResponse.data.uploadKey,
        fileName: file.name,
        mimeType: file.type,
      });

      return completeResponse.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalRequirements', sessionId] });
      setSelectedFile(null);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
    },
  });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file && isValidFile(file)) {
      setSelectedFile(file);
    }
  };

  const isValidFile = (file) => {
    const maxSize = 25 * 1024 * 1024; // 25MB
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];

    if (file.size > maxSize) {
      toast.error('File size must be less than 25MB');
      return false;
    }

    if (!validTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, and PNG files are allowed');
      return false;
    }

    return true;
  };

  const isLoading = uploadMutation.isPending;

  return (
    <Card className="border-gray-200">
      <CardContent className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Upload Document</h3>

        {selectedFile ? (
          <div className="space-y-4">
            {/* File Preview */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-8 w-8 text-blue-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Upload Progress */}
            {isLoading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <p className="text-sm text-gray-600">Uploading...</p>
                </div>
              </div>
            )}

            {/* Success */}
            {uploadMutation.isSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">Document uploaded successfully!</p>
              </div>
            )}

            {/* Error */}
            {uploadMutation.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">Upload failed. Please try again.</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => uploadMutation.mutate(selectedFile)}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-500"
              >
                {isLoading ? (
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
              <Button
                onClick={() => setSelectedFile(null)}
                disabled={isLoading}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Drag and drop or click to upload</p>
            <p className="text-sm text-gray-600 mt-1">PDF, JPG, PNG up to 25MB</p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleChange}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}