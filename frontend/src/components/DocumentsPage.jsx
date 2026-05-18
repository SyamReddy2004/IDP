import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FileText, Eye, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await axios.get('/api/v1/documents/');
        setDocuments(response.data);
      } catch (error) {
        console.error("Failed to fetch documents", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  return (
    <div className="flex-1 p-8">
      <h2 className="text-3xl font-bold mb-6 text-white">All Documents</h2>
      
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                <th className="py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                <th className="py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wider">File Name</th>
                <th className="py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wider">Upload Date</th>
                <th className="py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-400">Loading documents...</td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-400">No documents found.</td>
                </tr>
              ) : (
                documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-6 text-white">#{doc.id}</td>
                    <td className="py-4 px-6 text-white flex items-center space-x-3">
                      <FileText className="text-blue-400 w-5 h-5" />
                      <span>{doc.filename}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        doc.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400 border-green-500/20' :
                        doc.status === 'PROCESSING' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/20'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-400">
                      {new Date(doc.upload_time).toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <Link to={`/review/${doc.id}`} className="text-blue-400 hover:text-blue-300 flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>Review</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;
