import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, X, File } from 'lucide-react';
import { toast } from 'sonner';

export default function PortalDocumentUploadEnhanced({ 
  sessionId, 
  requirementId, 
  requirementName,
  onUploadComplete 
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('idle'); // idle, preparing, uploading, processing, complete, error

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      setUploadStage('preparing');
      setUploadProgress(10);

      // Step 1: Get presigned URL
      const presignResponse = await base44.functions.invoke('documentPresignUpload', {
        sessionId,
        requirementId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });

      setUploadProgress(25);
      setUploadStage('uploading');

      // Step 2: Upload to storage with progress simulation
      const uploadUrl = presignResponse.data.uploadUrl;
      
      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 75));
      }, 200);

      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      clearInterval(progressInterval);
      setUploadProgress(80);
      setUploadStage('processing');

      // Step 3: Complete upload
      const completeResponse = await base44.functions.invoke('documentCompleteUpload', {
        sessionId,
        requirementId,
        uploadKey: presignResponse.data.uploadKey,
        fileName: file.name,
        mimeType: file.type,
      });

      setUploadProgress(100);
      setUploadStage('complete');

      return completeResponse.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['borrower-requirements'] });
      toast.success('Document uploaded successfully!');
      onUploadComplete?.();
      
      // Reset after delay
      setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress(0);
        setUploadStage('idle');
      }, 2000);
    },
    onError: (error) => {
      setUploadStage('error');
      toast.error('Upload failed: ' + (error.message || 'Please try again'));
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
      validateAndSetFile(files[0]);
    }
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file) => {
    const maxSize = 25 * 1024 * 1024; // 25MB
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    
    if (file.size > maxSize) {
      toast.error('File size must be less than 25MB');
      return;
    }
    
    if (!validTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, and PNG files are allowed');
      return;
    }
    
    setSelectedFile(file);
    setUploadStage('idle');
    setUploadProgress(0);
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (mimeType?.includes('image')) return <File className="h-8 w-8 text-blue-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const getStageText = () => {
    switch (uploadStage) {
      case 'preparing': return 'Preparing upload...';
      case 'uploading': return 'Uploading file...';
      case 'processing': return 'Processing document...';
      case 'complete': return 'Upload complete!';
      case 'error': return 'Upload failed';
      default: return '';
    }
  };

  const isLoading = ['preparing', 'uploading', 'processing'].includes(uploadStage);

  return (
    <div className="space-y-4">
      {selectedFile ? (
        <div className="space-y-4">
          {/* File Preview Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                {getFileIcon(selectedFile.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{selectedFile.name}</p>
                <p className="text-sm text-slate-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type.split('/')[1]?.toUpperCase()}
                </p>
              </div>
              {!isLoading && uploadStage !== 'complete' && (
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadProgress(0);
                    setUploadStage('idle');
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {(isLoading || uploadStage === 'complete') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 flex items-center gap-2">
                  {uploadStage === 'complete' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  )}
                  {getStageText()}
                </span>
                <span className="font-medium text-slate-900">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Error State */}
          {uploadStage === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Upload failed</p>
                <p className="text-xs text-red-600">Please try again or contact support</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setUploadStage('idle');
                  setUploadProgress(0);
                }}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Success State */}
          {uploadStage === 'complete' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800">
                Document uploaded successfully! It will be reviewed shortly.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {uploadStage === 'idle' && (
            <div className="flex gap-3">
              <Button
                onClick={() => uploadMutation.mutate(selectedFile)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-12"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedFile(null)}
                className="h-12"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Drop Zone */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          }`}
        >
          <div className="flex flex-col items-center">
            <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-4 ${
              dragActive ? 'bg-blue-100' : 'bg-slate-100'
            }`}>
              <Upload className={`h-6 w-6 ${dragActive ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
            <p className="font-semibold text-slate-900 mb-1">
              {dragActive ? 'Drop your file here' : 'Drag and drop your file'}
            </p>
            <p className="text-sm text-slate-500 mb-4">or click to browse</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="px-2 py-1 bg-slate-100 rounded">PDF</span>
              <span className="px-2 py-1 bg-slate-100 rounded">JPG</span>
              <span className="px-2 py-1 bg-slate-100 rounded">PNG</span>
              <span className="text-slate-300">•</span>
              <span>Max 25MB</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleChange}
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
          />
        </div>
      )}
    </div>
  );
}