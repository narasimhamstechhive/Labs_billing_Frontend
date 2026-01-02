import React, { useEffect, useState } from 'react';
import { reportsAPI } from '../../services/api';
import { ClipboardList, AlertTriangle, CheckCircle2, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ResultEntry = () => {
    const [samples, setSamples] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [limit] = useState(10);
    const [selectedSample, setSelectedSample] = useState(null);
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(false);

    const fetchSamples = async (pageNum = page) => {
        try {
            const { data } = await reportsAPI.getPending({ page: pageNum, limit });
            setSamples(data.samples || []);
            setPages(data.pages || 1);
            setPage(data.page || 1);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchSamples();
    }, [page]);

    const handleSelectSample = (sample) => {
        setSelectedSample(sample);
        const initialResults = {};
        sample.tests.forEach(t => {
            initialResults[t._id] = {
                value: '',
                remarks: '',
                abnormal: false,
                subtests: []
            };
        });
        setResults(initialResults);
    };

    const handleResultChange = (testId, field, value) => {
        setResults(prev => ({
            ...prev,
            [testId]: {
                ...prev[testId],
                [field]: value
            }
        }));
    };

    const handleAddSubtest = (testId) => {
        setResults(prev => ({
            ...prev,
            [testId]: {
                ...prev[testId],
                subtests: [
                    ...prev[testId].subtests,
                    { testName: '', resultValue: '', unit: '', normalRange: '', abnormal: false }
                ]
            }
        }));
    };

    const handleSubtestChange = (testId, subIndex, field, value) => {
        const newSubtests = [...results[testId].subtests];
        newSubtests[subIndex][field] = value;
        setResults(prev => ({
            ...prev,
            [testId]: {
                ...prev[testId],
                subtests: newSubtests
            }
        }));
    };

    const removeSubtest = (testId, subIndex) => {
        const newSubtests = results[testId].subtests.filter((_, i) => i !== subIndex);
        setResults(prev => ({
            ...prev,
            [testId]: {
                ...prev[testId],
                subtests: newSubtests
            }
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                sampleId: selectedSample._id,
                results: Object.keys(results).map(testId => ({
                    testId,
                    ...results[testId]
                }))
            };
            await reportsAPI.submit(payload);
            toast.success('Results submitted successfully!');
            setSelectedSample(null);
            fetchSamples();
        } catch (err) {
            toast.error('Failed to submit results');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Result Entry</h1>
                    <p className="text-gray-500 mt-1">Enter test results for collected samples</p>
                </div>
                {selectedSample && (
                    <button
                        onClick={() => setSelectedSample(null)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back to Samples</span>
                    </button>
                )}
            </div>


            {!selectedSample ? (
                <div className="bg-white rounded-xl p-6 shadow-soft">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Samples (Ready for Result Entry)</h3>
                    {samples.length === 0 ? (
                        <div className="text-center py-12">
                            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No pending samples for result entry.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {samples.map(s => (
                                <div
                                    key={s._id}
                                    className="border border-gray-200 p-4 rounded-lg hover:border-primary-300 hover:bg-primary-50/30 cursor-pointer transition-all group"
                                    onClick={() => handleSelectSample(s)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-mono text-sm font-semibold text-primary-600">
                                                    {s.sampleId}
                                                </span>
                                                <span className="px-2 py-1 bg-warning-100 text-warning-700 rounded text-xs font-medium">
                                                    {s.sampleType}
                                                </span>
                                            </div>
                                            <p className="font-bold text-lg text-gray-900">{s.patient.name}</p>
                                            <p className="text-sm text-gray-600">
                                                {s.patient.age}Y / {s.patient.gender} • {s.patient.patientId}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-2">
                                                <span className="font-medium">Tests:</span> {s.tests.map(t => t.testName).join(', ')}
                                            </p>
                                        </div>
                                        <button className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg font-medium group-hover:from-primary-700 group-hover:to-primary-600 transition-all shadow-soft">
                                            Enter Results
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {pages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
                            <p className="text-sm text-gray-500 font-medium">
                                Showing page <span className="text-gray-900">{page}</span> of {pages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-all"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={page === pages}
                                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                                    className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-all"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl p-6 shadow-soft">
                    {/* Sample Info */}
                    <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 p-4 rounded-lg mb-6 border border-primary-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Entering Results For</p>
                                <h3 className="text-sm font-bold text-gray-900">{selectedSample.patient.name}</h3>
                                <p className="text-sm text-gray-600">
                                    Sample ID: {selectedSample.sampleId} • {selectedSample.patient.age}Y / {selectedSample.patient.gender}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-600">Sample Type</p>
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                    {selectedSample.sampleType}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Result Entry Form */}
                    <div className="space-y-6">
                        {selectedSample.tests.map(test => (
                            <div key={test._id} className="border border-gray-200 p-5 rounded-lg bg-gray-50">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                                    <div>
                                        <h4 className="font-extrabold text-gray-900 text-xl tracking-tight">{test.testName}</h4>
                                        <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">
                                            Unit: {test.unit || 'N/A'} • Normal Range: {test.normalRanges?.general || `${test.normalRanges?.male?.min || 0} - ${test.normalRanges?.male?.max || 0}`}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleAddSubtest(test._id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Add Sub Test</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Result Value *</label>
                                        <input
                                            placeholder="Enter main value"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all font-bold text-gray-900"
                                            value={results[test._id]?.value || ''}
                                            onChange={e => handleResultChange(test._id, 'value', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Remarks</label>
                                        <input
                                            placeholder="Optional remarks"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all font-medium text-gray-600"
                                            value={results[test._id]?.remarks || ''}
                                            onChange={e => handleResultChange(test._id, 'remarks', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Auto Status</label>
                                        <label className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer transition-all ${results[test._id]?.abnormal ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                            <input
                                                type="checkbox"
                                                checked={results[test._id]?.abnormal || false}
                                                onChange={e => handleResultChange(test._id, 'abnormal', e.target.checked)}
                                                className="w-5 h-5 text-rose-600 rounded-lg focus:ring-rose-500 border-gray-300"
                                            />
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className={`w-4 h-4 ${results[test._id]?.abnormal ? 'animate-pulse' : ''}`} />
                                                <span className="text-sm font-black uppercase tracking-tight">Mark Abnormal</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Subtests List */}
                                {results[test._id]?.subtests?.length > 0 && (
                                    <div className="mt-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-2 mb-2 ml-1">
                                            <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                                            <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em]">Sub Test Parameters</h5>
                                        </div>
                                        <div className="space-y-3">
                                            {results[test._id].subtests.map((sub, sIdx) => (
                                                <div key={sIdx} className="flex items-center gap-3 bg-white p-4 rounded-xl border border-indigo-100/50 shadow-sm relative group">
                                                    <div className="flex-[3]">
                                                        <input
                                                            placeholder="Sub-test Name"
                                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-indigo-400 focus:outline-none transition-colors font-bold text-gray-800"
                                                            value={sub.testName}
                                                            onChange={e => handleSubtestChange(test._id, sIdx, 'testName', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex-[1.5]">
                                                        <input
                                                            placeholder="Result"
                                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-indigo-400 focus:outline-none transition-colors font-black text-indigo-600"
                                                            value={sub.resultValue}
                                                            onChange={e => handleSubtestChange(test._id, sIdx, 'resultValue', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="w-24">
                                                        <input
                                                            placeholder="Units"
                                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-indigo-400 focus:outline-none transition-colors text-gray-500"
                                                            value={sub.unit}
                                                            onChange={e => handleSubtestChange(test._id, sIdx, 'unit', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex-[1.5]">
                                                        <input
                                                            placeholder="Ref range"
                                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-indigo-400 focus:outline-none transition-colors text-gray-500 italic"
                                                            value={sub.normalRange}
                                                            onChange={e => handleSubtestChange(test._id, sIdx, 'normalRange', e.target.value)}
                                                        />
                                                    </div>
                                                    {/* <div className="flex items-center gap-3 px-3 py-2 border rounded-lg cursor-pointer transition-all bg-white border-gray-100 shrink-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={sub.abnormal || false}
                                                            onChange={e => handleSubtestChange(test._id, sIdx, 'abnormal', e.target.checked)}
                                                            className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 border-gray-300"
                                                        />
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Abnormal</span>
                                                    </div> */}
                                                    <button
                                                        onClick={() => removeSubtest(test._id, sIdx)}
                                                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Submit Button */}
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-lg tracking-tight shadow-md disabled:opacity-50 flex items-center gap-3"
                        >
                            {loading ? (
                                <div className="px-2 py-2 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>

                                    <span> REPORT SUBMISSION</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResultEntry;
