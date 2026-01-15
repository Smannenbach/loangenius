import React, { useState, useRef } from 'react';
import { Upload, Camera, X, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SmartDocumentUploader({ onUploadComplete, maxSize = 10, acceptedTypes = ['pdf', 'jpg', 'jpeg', 'png'] }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!acceptedTypes.includes(ext)) {
      return `Invalid file type. Accepted: ${acceptedTypes.join(', ')}`;
    }
    if (file.size > maxSize * 1024 * 1024) {
      return `File too large. Max size: ${maxSize}MB`;
    }
    return null;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const processFiles = (files) => {
    files.forEach(file => {
      const error = validateFile(file);
      const uploadId = Math.random().toString(36).substr(2, 9);
      
      setUploads(prev => [...prev, {
        id: uploadId,
        name: file.name,
        progress: 0,
        status: error ? 'error' : 'uploading',
        error,
        file,
      }]);

      if (!error) {
        uploadFile(uploadId, file);
      }
    });
  };

  const uploadFile = async (uploadId, file) => {
    try {
      const { base44 } = await import('@/api/base44Client');
      const { url } = await base44.integrations.Core.UploadFile({ file });
      
      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, status: 'success', url, progress: 100 } : u
      ));
      
      if (onUploadComplete) {
        onUploadComplete({ name: file.name, url });
      }
    } catch (error) {
      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, status: 'error', error: error.message } : u
      ));
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (error) {
      alert('Camera access denied: ' + error.message);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    canvas.toBlob(blob => {
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      processFiles([file]);
      closeCamera();
    }, 'image/jpeg', 0.85);
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Drag-Drop Zone */}
      {!isCameraOpen && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
          }`}
        >
          <Upload className="h-8 w-8 mx-auto mb-3 text-gray-400" />
          <p className="font-medium text-gray-900 mb-1">Drag files here or click to browse</p>
          <p className="text-sm text-gray-500 mb-4">
            Accepted: {acceptedTypes.join(', ').toUpperCase()} (max {maxSize}MB)
          </p>
          
          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Browse Files
            </Button>
            <Button
              variant="outline"
              onClick={openCamera}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              Take Photo
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.map(t => `.${t}`).join(',')}
            onChange={(e) => processFiles(Array.from(e.target.files))}
            className="hidden"
          />
        </div>
      )}

      {/* Camera Capture */}
      {isCameraOpen && (
        <div className="bg-black rounded-lg overflow-hidden space-y-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full bg-black"
            style={{ aspectRatio: '4/5' }}
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="flex gap-2 p-4 bg-gray-900">
            <Button
              onClick={capturePhoto}
              className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
            >
              <Camera className="h-4 w-4" />
              Capture
            </Button>
            <Button
              variant="outline"
              onClick={closeCamera}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Upload List */}
      {uploads.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
          {uploads.map(upload => (
            <div key={upload.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {upload.status === 'uploading' && <Loader className="h-4 w-4 animate-spin text-blue-500" />}
                  {upload.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {upload.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  <span className="text-sm font-medium text-gray-900">{upload.name}</span>
                </div>
                {upload.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded h-1">
                    <div
                      className="bg-blue-500 h-1 rounded transition-all"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
                {upload.error && <p className="text-xs text-red-600">{upload.error}</p>}
              </div>
              {upload.status === 'error' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploads(prev => prev.filter(u => u.id !== upload.id))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}