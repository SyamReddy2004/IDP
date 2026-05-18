import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Upload = () => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const onDrop = useCallback(acceptedFiles => {
    setFiles(prev => [...prev, ...acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    }))]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  });

  const removeFile = name => {
    setFiles(files => files.filter(file => file.name !== name));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      const response = await axios.post('/api/v1/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log("Upload successful:", response.data);
      navigate(`/review/${response.data.id}`);

    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload document. Please make sure the backend is running.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
      <h2 className="text-3xl font-bold mb-6 text-white">Upload Documents</h2>
      
      <div 
        {...getRootProps()} 
        className={`p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer
          ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-800/80'}`}
      >
        <input {...getInputProps()} />
        <div className="bg-gray-700 p-4 rounded-full mb-4">
          <UploadIcon className="w-8 h-8 text-blue-400" />
        </div>
        <p className="text-xl font-semibold text-gray-200 mb-2">
          {isDragActive ? "Drop the files here ..." : "Drag & drop files here"}
        </p>
        <p className="text-gray-400 mb-6">or click to select files from your computer</p>
        <div className="text-sm text-gray-500">
          Supported files: PDF, DOCX, JPEG, PNG
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-white mb-4">Selected Files ({files.length})</h3>
          <div className="space-y-3">
            {files.map(file => (
              <div key={file.name} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-700 rounded-lg text-blue-400">
                    <File size={24} />
                  </div>
                  <div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-xs font-medium border border-yellow-500/20">
                    Ready
                  </span>
                  <button onClick={() => removeFile(file.name)} className="text-gray-400 hover:text-red-400 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/30 flex items-center space-x-2"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadIcon size={20} />}
              <span>{isUploading ? 'Processing...' : `Process ${files.length} File${files.length > 1 ? 's' : ''}`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
