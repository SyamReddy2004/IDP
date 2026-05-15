import React, { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Check, X, Edit2, Save, Download } from 'lucide-react';

const initialData = [
  { id: 1, field: 'Invoice Number', extractedValue: 'INV-2023-001', confidence: 0.98 },
  { id: 2, field: 'Date', extractedValue: '2023-10-24', confidence: 0.95 },
  { id: 3, field: 'Total Amount', extractedValue: '$1,250.00', confidence: 0.89 },
  { id: 4, field: 'Vendor Name', extractedValue: 'Acme Corp', confidence: 0.99 },
];

const ReviewPage = () => {
  const [data, setData] = useState(initialData);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleEdit = (row) => {
    setEditingId(row.original.id);
    setEditValue(row.original.extractedValue);
  };

  const handleSave = (id) => {
    setData(data.map(item => item.id === id ? { ...item, extractedValue: editValue } : item));
    setEditingId(null);
  };

  const columns = [
    {
      accessorKey: 'field',
      header: 'Field',
      cell: info => <span className="font-medium text-gray-200">{info.getValue()}</span>,
    },
    {
      accessorKey: 'extractedValue',
      header: 'Extracted Value',
      cell: ({ row }) => {
        if (editingId === row.original.id) {
          return (
            <input
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              className="bg-gray-800 text-white border border-blue-500 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          );
        }
        return <span className="text-white">{row.original.extractedValue}</span>;
      },
    },
    {
      accessorKey: 'confidence',
      header: 'Confidence',
      cell: info => {
        const val = info.getValue();
        const color = val > 0.95 ? 'text-green-400' : val > 0.85 ? 'text-yellow-400' : 'text-red-400';
        return <span className={`${color} font-medium`}>{(val * 100).toFixed(1)}%</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        if (editingId === row.original.id) {
          return (
            <div className="flex space-x-2">
              <button onClick={() => handleSave(row.original.id)} className="text-green-400 hover:text-green-300">
                <Save size={18} />
              </button>
              <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-300">
                <X size={18} />
              </button>
            </div>
          );
        }
        return (
          <button onClick={() => handleEdit(row)} className="text-blue-400 hover:text-blue-300">
            <Edit2 size={18} />
          </button>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex-1 p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Review Document</h2>
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2">
          <Check size={18} />
          <span>Approve Document</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Document Preview Panel */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col min-h-[600px]">
          <h3 className="text-lg font-semibold text-white mb-4">Original Document</h3>
          <div className="flex-1 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">Document Image Preview</span>
          </div>
        </div>

        {/* Extracted Data Panel */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Extracted Entities</h3>
            <button className="text-gray-400 hover:text-white transition-colors">
              <Download size={20} />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-gray-700">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="py-3 px-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
