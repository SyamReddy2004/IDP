import React from 'react';
import { Upload, FileText, Settings, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div className="flex-1 p-8">
      <h2 className="text-3xl font-bold mb-6 text-white">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-300">Total Documents</h3>
            <FileText className="text-blue-500" />
          </div>
          <p className="text-4xl font-bold text-white">124</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-300">Processing</h3>
            <Activity className="text-yellow-500" />
          </div>
          <p className="text-4xl font-bold text-white">3</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-300">Completed Today</h3>
            <Upload className="text-green-500" />
          </div>
          <p className="text-4xl font-bold text-white">12</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg shadow-black/20">
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Recent Documents</h3>
          <Link to="/upload" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Upload New
          </Link>
        </div>
        <div className="p-6">
          <p className="text-gray-400 text-center py-8">No documents uploaded yet.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
