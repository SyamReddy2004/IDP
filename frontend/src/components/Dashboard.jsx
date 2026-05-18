import React, { useEffect, useState } from 'react';
import { Upload, FileText, Settings, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState({ total: 0, processing: 0, completed: 0 });
  const [recentDocs, setRecentDocs] = useState([]);

  useEffect(() => {
    // Fetch actual data to replace hardcoded values
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/v1/documents/');
        const docs = response.data;
        
        setStats({
          total: docs.length,
          processing: docs.filter(d => d.status === 'PROCESSING').length,
          completed: docs.filter(d => d.status === 'COMPLETED').length
        });
        
        setRecentDocs(docs.slice(0, 5));
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex-1 p-8">
      <h2 className="text-3xl font-bold mb-6 text-white">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-300">Total Documents</h3>
            <FileText className="text-blue-500" />
          </div>
          <p className="text-4xl font-bold text-white">{stats.total}</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-300">Processing</h3>
            <Activity className="text-yellow-500" />
          </div>
          <p className="text-4xl font-bold text-white">{stats.processing}</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-300">Completed</h3>
            <Upload className="text-green-500" />
          </div>
          <p className="text-4xl font-bold text-white">{stats.completed}</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg shadow-black/20">
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Recent Documents</h3>
          <Link to="/upload" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Upload New
          </Link>
        </div>
        <div className="p-0">
          {recentDocs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No documents uploaded yet.</p>
          ) : (
            <table className="w-full text-left">
              <tbody className="divide-y divide-gray-700">
                {recentDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-700/50">
                    <td className="py-4 px-6 text-white flex items-center space-x-3">
                      <FileText className="text-blue-400 w-5 h-5" />
                      <span>{doc.filename}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs font-medium">
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link to={`/review/${doc.id}`} className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
