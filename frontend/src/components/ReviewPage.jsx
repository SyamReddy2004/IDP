import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Check, Download, Edit2, Save, X, Loader2, FileText, Table2, AlignLeft } from 'lucide-react';

const ReviewPage = () => {
  const { id } = useParams();
  const [documentInfo, setDocumentInfo] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [approved, setApproved] = useState(false);
  const [approving, setApproving] = useState(false);
  const [overallConfidence, setOverallConfidence] = useState(null);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const response = await axios.get(`/api/v1/documents/${id}`);
        setDocumentInfo(response.data);
        if (response.data.extracted_data) {
          setData(response.data.extracted_data);
          // Pick overall_confidence from first item if present
          const first = response.data.extracted_data[0];
          if (first && first.overall_confidence !== undefined) {
            setOverallConfidence(first.overall_confidence);
          }
        }
        if (response.data.status === 'APPROVED') {
          setApproved(true);
        }
      } catch (error) {
        console.error("Error fetching doc:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await axios.post(`/api/v1/documents/${id}/approve`);
      setApproved(true);
    } catch (error) {
      console.error("Approve failed:", error);
      alert("Failed to approve document.");
    } finally {
      setApproving(false);
    }
  };

  const handleEdit = (rowId, currentValue) => {
    setEditingId(rowId);
    setEditValue(currentValue);
  };

  const handleSave = (rowId) => {
    setData(data.map(item => item.id === rowId ? { ...item, extractedValue: editValue } : item));
    setEditingId(null);
  };

  const handleDownload = () => {
    const csvRows = [['Field', 'Extracted Value']];
    data.forEach(row => {
      csvRows.push([row.field, `"${row.extractedValue}"`]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const link = window.document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `extracted_data_${id}.csv`);
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) return (
    <div className="flex-1 p-8 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="ml-3 text-white text-xl">Loading document data...</span>
    </div>
  );

  if (!documentInfo) return (
    <div className="flex-1 p-8 flex items-center justify-center">
      <span className="text-white text-xl">Document not found.</span>
    </div>
  );

  const mediaUrl = `/media/${documentInfo.filename}`;
  const summary = data.find(d => d.type === 'summary');
  const entities = data.filter(d => d.type === 'entity');
  const tableRows = data.filter(d => d.type === 'table');
  const other = data.filter(d => !d.type || (d.type !== 'summary' && d.type !== 'entity' && d.type !== 'table'));

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{documentInfo.filename}</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-400 text-sm">Document Review</p>
            {overallConfidence !== null && (
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                overallConfidence >= 0.85 ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                overallConfidence >= 0.6  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                                            'bg-red-500/10 text-red-400 border-red-500/30'
              }`}>
                Overall Confidence: {(overallConfidence * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDownload}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Download size={16} /> Download CSV
          </button>
          {approved ? (
            <div className="bg-green-600/20 border border-green-500/30 text-green-400 px-5 py-2 rounded-lg font-semibold flex items-center gap-2">
              <Check size={18} /> Approved
            </div>
          ) : (
            <button onClick={handleApprove} disabled={approving}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-green-500/20">
              {approving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {approving ? 'Approving...' : 'Approve Document'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Document Preview */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col h-[820px]">
          <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <FileText size={16} className="text-blue-400" /> Original Document
          </h3>
          <div className="flex-1 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            {documentInfo.filename.toLowerCase().endsWith('.pdf') ? (
              <iframe src={mediaUrl} className="w-full h-full border-none" title="Document Preview" />
            ) : (
              <img src={mediaUrl} alt="Document Preview" className="w-full h-full object-contain" />
            )}
          </div>
        </div>

        {/* Right: Extracted Data */}
        <div className="flex flex-col gap-4 h-[820px] overflow-y-auto pr-1">

          {/* Summary Block */}
          {summary && (
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlignLeft size={16} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">Document Summary</h3>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed">{summary.extractedValue}</p>
            </div>
          )}

          {/* Entities Table */}
          {(entities.length > 0 || other.length > 0) && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText size={14} className="text-yellow-400" /> Extracted Entities
                </h3>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-900/40">
                    <th className="py-2 px-4 text-xs font-semibold text-gray-400 uppercase">Field</th>
                    <th className="py-2 px-4 text-xs font-semibold text-gray-400 uppercase">Value</th>
                    <th className="py-2 px-4 text-xs font-semibold text-gray-400 uppercase text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {[...entities, ...other].map(row => (
                    <tr key={row.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="py-2.5 px-4 text-xs text-gray-300 font-medium whitespace-nowrap">{row.field}</td>
                      <td className="py-2.5 px-4 text-sm text-white">
                        {editingId === row.id ? (
                          <input autoFocus type="text" value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="bg-gray-900 border border-blue-500 rounded px-2 py-1 w-full text-white text-sm focus:outline-none" />
                        ) : row.extractedValue}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {editingId === row.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleSave(row.id)} className="text-green-400 bg-green-400/10 p-1 rounded hover:bg-green-400/20"><Save size={14} /></button>
                            <button onClick={() => setEditingId(null)} className="text-red-400 bg-red-400/10 p-1 rounded hover:bg-red-400/20"><X size={14} /></button>
                          </div>
                        ) : (
                          <button onClick={() => handleEdit(row.id, row.extractedValue)} className="text-blue-400 bg-blue-400/10 p-1 rounded hover:bg-blue-400/20 transition-colors"><Edit2 size={14} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Rows */}
          {tableRows.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Table2 size={14} className="text-purple-400" /> Reconstructed Table Data
                </h3>
              </div>
              <div className="divide-y divide-gray-700">
                {tableRows.map(row => (
                  <div key={row.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-gray-700/30">
                    <span className="text-xs text-purple-400 font-semibold mt-0.5 whitespace-nowrap">{row.field}</span>
                    <span className="text-sm text-gray-200 font-mono">{row.extractedValue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
