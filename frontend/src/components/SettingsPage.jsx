import React from 'react';
import { Settings as SettingsIcon, Database, Key, Palette } from 'lucide-react';

const SettingsPage = () => {
  return (
    <div className="flex-1 p-8">
      <h2 className="text-3xl font-bold mb-6 text-white flex items-center space-x-3">
        <SettingsIcon className="w-8 h-8 text-gray-400" />
        <span>Settings</span>
      </h2>
      
      <div className="grid grid-cols-1 max-w-4xl gap-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Palette className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-semibold text-white">Appearance</h3>
          </div>
          <p className="text-gray-400 mb-4">Customize the IDP system interface.</p>
          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <span className="text-gray-300">Dark Mode</span>
            <div className="w-12 h-6 bg-blue-600 rounded-full flex items-center p-1 justify-end cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Key className="w-6 h-6 text-green-400" />
            <h3 className="text-xl font-semibold text-white">API Integrations</h3>
          </div>
          <p className="text-gray-400 mb-4">Configure external API keys for advanced OCR capabilities.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">OpenAI API Key (Optional)</label>
              <input type="password" placeholder="sk-..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Save Keys
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
