import React, { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Upload,
  X,
  FileText,
  Image,
  File,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

/**
 * Get file icon based on MIME type
 */
function getFileIcon(file) {
  const type = file.type || '';
  if (type.startsWith('image/')) return Image;
  if (type.includes('pdf') || type.includes('document')) return FileText;
  return File;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate file against constraints
 */
function validateFile(file, options) {
  const { maxSize, accept } = options;
  const errors = [];

  if (maxSize && file.size > maxSize) {
    errors.push(`File size exceeds ${formatFileSize(maxSize)}`);
  }

  if (accept) {
    const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    const fileType = file.type.toLowerCase();

    const isAccepted = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExt === type;
      }
      if (type.endsWith('/*')) {
        return fileType.startsWith(type.replace('/*', '/'));
      }
      return fileType === type;
    });

    if (!isAccepted) {
      errors.push('File type not accepted');
    }
  }

  return errors;
}

/**
 * Single file item component
 */
function FileItem({ file, onRemove, status = 'idle', error }) {
  const Icon = getFileIcon(file);

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        status === 'error' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
      )}
    >
      <div className="flex-shrink-0">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      <div className="flex items-center gap-2">
        {status === 'uploading' && (
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
        )}
        {status === 'success' && (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
        {status === 'error' && (
          <AlertCircle className="h-4 w-4 text-red-500" />
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(file)}
            className="p-1 hover:bg-gray-200 rounded"
            type="button"
            aria-label="Remove file"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Drag and drop file upload component
 *
 * @param {Object} props
 * @param {Function} props.onFilesSelected - Callback when files are selected
 * @param {Function} props.onUpload - Callback to upload files (should return Promise)
 * @param {string} props.accept - Accepted file types (e.g., "image/*,.pdf")
 * @param {number} props.maxSize - Max file size in bytes
 * @param {number} props.maxFiles - Max number of files
 * @param {boolean} props.multiple - Allow multiple files
 * @param {boolean} props.disabled - Disable the upload zone
 * @param {string} props.className - Additional CSS classes
 */
export default function FileUpload({
  onFilesSelected,
  onUpload,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 10,
  multiple = true,
  disabled = false,
  className,
  children,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileStatuses, setFileStatuses] = useState({});
  const inputRef = useRef(null);

  const handleFiles = useCallback((newFiles) => {
    const fileArray = Array.from(newFiles);

    // Limit number of files
    const filesToAdd = multiple ? fileArray.slice(0, maxFiles - files.length) : [fileArray[0]];

    // Validate each file
    const validatedFiles = filesToAdd.map(file => {
      const errors = validateFile(file, { maxSize, accept });
      return { file, errors };
    });

    // Add files with their validation status
    const newFileStatuses = {};
    validatedFiles.forEach(({ file, errors }) => {
      newFileStatuses[file.name] = {
        status: errors.length > 0 ? 'error' : 'idle',
        error: errors[0] || null,
      };
    });

    const validFiles = validatedFiles.filter(f => f.errors.length === 0).map(f => f.file);

    if (multiple) {
      setFiles(prev => [...prev, ...validFiles]);
    } else {
      setFiles(validFiles);
    }

    setFileStatuses(prev => ({ ...prev, ...newFileStatuses }));

    if (onFilesSelected) {
      onFilesSelected(validFiles);
    }
  }, [files.length, maxFiles, maxSize, accept, multiple, onFilesSelected]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles?.length) {
      handleFiles(droppedFiles);
    }
  }, [disabled, handleFiles]);

  const handleInputChange = useCallback((e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles?.length) {
      handleFiles(selectedFiles);
    }
    // Reset input
    e.target.value = '';
  }, [handleFiles]);

  const handleRemove = useCallback((fileToRemove) => {
    setFiles(prev => prev.filter(f => f !== fileToRemove));
    setFileStatuses(prev => {
      const newStatuses = { ...prev };
      delete newStatuses[fileToRemove.name];
      return newStatuses;
    });
  }, []);

  const handleUpload = useCallback(async () => {
    if (!onUpload || files.length === 0) return;

    for (const file of files) {
      setFileStatuses(prev => ({
        ...prev,
        [file.name]: { status: 'uploading', error: null },
      }));

      try {
        await onUpload(file);
        setFileStatuses(prev => ({
          ...prev,
          [file.name]: { status: 'success', error: null },
        }));
      } catch (err) {
        setFileStatuses(prev => ({
          ...prev,
          [file.name]: { status: 'error', error: err.message },
        }));
      }
    }
  }, [files, onUpload]);

  const openFilePicker = () => inputRef.current?.click();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFilePicker}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        {children || (
          <>
            <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700">
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              or <span className="text-blue-600">browse</span> to upload
            </p>
            {accept && (
              <p className="text-xs text-gray-400 mt-2">
                Accepted: {accept}
              </p>
            )}
            {maxSize && (
              <p className="text-xs text-gray-400">
                Max size: {formatFileSize(maxSize)}
              </p>
            )}
          </>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <FileItem
              key={`${file.name}-${index}`}
              file={file}
              onRemove={handleRemove}
              status={fileStatuses[file.name]?.status || 'idle'}
              error={fileStatuses[file.name]?.error}
            />
          ))}
        </div>
      )}

      {/* Upload button */}
      {onUpload && files.length > 0 && (
        <Button
          onClick={handleUpload}
          disabled={files.every(f => fileStatuses[f.name]?.status === 'success')}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload {files.length} file{files.length > 1 ? 's' : ''}
        </Button>
      )}
    </div>
  );
}

/**
 * Compact file upload button
 */
export function FileUploadButton({
  onFileSelected,
  accept,
  children,
  disabled,
  className,
  ...props
}) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onFileSelected) {
      onFileSelected(file);
    }
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
      <Button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={className}
        {...props}
      >
        {children || (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </>
        )}
      </Button>
    </>
  );
}
