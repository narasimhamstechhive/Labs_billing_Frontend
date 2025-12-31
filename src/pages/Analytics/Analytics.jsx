import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, DollarSign, TestTube, Download, Wallet, CreditCard, Smartphone, ArrowUpRight, ArrowDownRight, Activity, FileText, Users, CheckCircle, Clock, XCircle, Percent, Receipt, AlertCircle, TrendingDown } from 'lucide-react';
import api, { billingAPI } from '../../services/api';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const Analytics = () => {
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState({
        todayRevenue: 0,
        totalRevenue: 0,
        todayCollections: 0,
        totalTests: 0,
        paymentBreakdown: [],
        invoices: [],
        collections: []
    });
    const [loading, setLoading] = useState(false);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const { data: response } = await api.get('/analytics', {
                params: { from: startDate, to: endDate }
            });
            setData(response);
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (startDate && endDate) {
            fetchAnalytics();
        }
    }, [startDate, endDate]);

    const exportToExcel = async () => {
        if (!data || !data.invoices || data.invoices.length === 0) {
            toast.error('No data to export');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Analytics Report');

        // --- STYLING CONSTANTS ---
        const headerStyle = {
            font: { bold: true, size: 12 },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1E7DD' } }, // Light Green
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            },
            alignment: { horizontal: 'center' }
        };

        const borderStyle = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };

        const titleStyle = {
            font: { bold: true, size: 14 },
            alignment: { horizontal: 'center' },
            border: { bottom: { style: 'thick', color: { argb: '006400' } } } // Dark Green underline
        };

        // --- TITLE SECTION ---
        worksheet.mergeCells('B1:F1');
        const titleCell = worksheet.getCell('B1');
        titleCell.value = 'Recent Invoices';
        titleCell.font = { bold: true, size: 16 };
        titleCell.alignment = { horizontal: 'center' };

        worksheet.mergeCells('B2:F2');
        const subTitleCell = worksheet.getCell('B2');
        subTitleCell.value = 'Medilab Diagnostic Center';
        subTitleCell.font = { bold: true, size: 12, color: { argb: '006400' } }; // Dark Green
        subTitleCell.alignment = { horizontal: 'center' };
        subTitleCell.border = { bottom: { style: 'medium', color: { argb: '006400' } } };

        worksheet.addRow([]); // Spacer

        // --- DATE INFO ---
        const dateRow = worksheet.addRow(['', 'From Date:', startDate, 'To Date:', endDate, 'Generated:', new Date().toLocaleString()]);
        dateRow.getCell(2).font = { bold: true };
        dateRow.getCell(4).font = { bold: true };
        dateRow.getCell(6).font = { bold: true };

        worksheet.addRow([]); // Spacer

        // --- SECTION 1: INVOICE LIST ---
        const invHeaderRow = worksheet.addRow(['', 'INVOICE ID', 'PATIENT', 'MOBILE', 'AMOUNT', 'PAID', 'STATUS', 'DATE']);
        invHeaderRow.eachCell((cell, colNumber) => {
            if (colNumber > 1) {
                cell.style = headerStyle;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '198754' } }; // Bootstrap Success Green
                cell.font = { bold: true, color: { argb: 'FFFFFF' } }; // White text
            }
        });

        let totalInvoiceAmount = 0;
        let totalPaidAmount = 0;

        data.invoices.forEach(inv => {
            totalInvoiceAmount += inv.amount || 0;
            totalPaidAmount += inv.paid || 0;
            const row = worksheet.addRow([
                '',
                inv.invoiceId,
                inv.patient,
                inv.mobile,
                inv.amount,
                inv.paid,
                inv.balance <= 0 ? 'Paid' : 'Pending',
                new Date(inv.date).toLocaleDateString()
            ]);
            row.eachCell((cell, colNumber) => {
                if (colNumber > 1) cell.border = borderStyle;
            });
        });

        // Invoice Totals
        worksheet.addRow([]);
        const totalRow1 = worksheet.addRow(['', '', '', '', 'Total Amount:', totalInvoiceAmount.toFixed(2)]);
        totalRow1.getCell(5).font = { bold: true };
        totalRow1.getCell(6).font = { bold: true, color: { argb: '198754' } };

        const totalRow2 = worksheet.addRow(['', '', '', '', 'Total Paid:', totalPaidAmount.toFixed(2)]);
        totalRow2.getCell(5).font = { bold: true };
        totalRow2.getCell(6).font = { bold: true, color: { argb: '198754' } };

        worksheet.addRow([]); // Spacer
        worksheet.addRow([]); // Spacer

        // --- SECTION 2: COLLECTIONS LIST ---
        const colHeaderRow = worksheet.addRow(['', 'Sample ID', 'Patient', 'Test', 'Date', 'Status']);
        colHeaderRow.eachCell((cell, colNumber) => {
            if (colNumber > 1) {
                cell.style = headerStyle;
                cell.value = cell.value.toString().toUpperCase();
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '198754' } };
                cell.font = { bold: true, color: { argb: 'FFFFFF' } };
            }
        });

        const collections = data.collections || [];
        collections.forEach(col => {
            const row = worksheet.addRow([
                '',
                col.sampleId,
                col.patient,
                col.tests,
                new Date(col.date).toLocaleDateString(),
                col.status
            ]);
            row.eachCell((cell, colNumber) => {
                if (colNumber > 1) cell.border = borderStyle;
            });
        });

        worksheet.addRow([]);
        const colTotalRow = worksheet.addRow(['', '', '', '', 'Total Collections:', collections.length]);
        colTotalRow.getCell(5).font = { bold: true };
        colTotalRow.getCell(6).font = { bold: true, color: { argb: '198754' } };

        worksheet.addRow([]); // Spacer
        worksheet.addRow([]); // Spacer

        // --- SECTION 3: PAYMENT METHODS ---
        const payHeaderRow = worksheet.addRow(['', 'METHOD', 'COUNT', 'AMOUNT']);
        payHeaderRow.eachCell((cell, colNumber) => {
            if (colNumber > 1 && colNumber <= 4) {
                cell.style = headerStyle;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '198754' } };
                cell.font = { bold: true, color: { argb: 'FFFFFF' } };
            }
        });

        let cashTotal = 0;
        let cardTotal = 0;
        let upiTotal = 0;

        data.paymentBreakdown.forEach(method => {
            if (method.method === 'Cash') cashTotal = method.amount;
            if (method.method === 'Card') cardTotal = method.amount;
            if (method.method === 'UPI') upiTotal = method.amount;

            const row = worksheet.addRow(['', method.method, method.count, method.amount]);
            row.eachCell((cell, colNumber) => {
                if (colNumber > 1 && colNumber <= 4) cell.border = borderStyle;
            });
        });

        worksheet.addRow([]);
        const paySummaryRow = worksheet.addRow(['', `Cash = ${cashTotal.toFixed(2)}`, `Card = ${cardTotal.toFixed(2)}`, `UPI = ${upiTotal.toFixed(2)}`]);
        paySummaryRow.eachCell((cell, colNumber) => {
            if (colNumber > 1 && colNumber <= 4) {
                cell.font = { bold: true, color: { argb: '198754' } };
                cell.border = borderStyle;
            }
        });

        worksheet.addRow([]); // Spacer

        // --- SECTION 4: TEST COUNTS ---
        const testHeaderRow = worksheet.addRow(['', 'TOTAL TESTS PERFORMED']);
        testHeaderRow.getCell(2).style = headerStyle;
        testHeaderRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '198754' } };
        testHeaderRow.getCell(2).font = { bold: true, color: { argb: 'FFFFFF' } };

        const testDataRow = worksheet.addRow(['', data.totalTests]);
        testDataRow.getCell(2).border = borderStyle;
        testDataRow.getCell(2).alignment = { horizontal: 'center' };

        // Column Widths
        worksheet.getColumn(1).width = 5; // Spacer column
        worksheet.getColumn(2).width = 15;
        worksheet.getColumn(3).width = 25;
        worksheet.getColumn(4).width = 20;
        worksheet.getColumn(5).width = 15;
        worksheet.getColumn(6).width = 15;
        worksheet.getColumn(7).width = 15;
        worksheet.getColumn(8).width = 15;

        // Generate File
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Analytics_Report_${startDate}_to_${endDate}.xlsx`);
        toast.success('Excel exported successfully');
    };

    const dateFilters = [
        { label: 'Today', value: 'today' },
        { label: 'Last 7 Days', value: '7days' },
        { label: 'Last 30 Days', value: '30days' }
    ];

    // Calculate additional stats
    const paidInvoices = data.invoices?.filter(inv => (inv.balance || 0) <= 0) || [];
    const pendingInvoices = data.invoices?.filter(inv => (inv.balance || 0) > 0) || [];
    const totalPaid = data.invoices?.reduce((sum, inv) => sum + (inv.paid || 0), 0) || 0;
    const totalPending = data.invoices?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;
    const totalDiscount = data.invoices?.reduce((sum, inv) => {
        const discount = (inv.amount || 0) - (inv.paid || 0) + (inv.balance || 0);
        return sum + Math.max(0, discount);
    }, 0) || 0;
    
    // Payment method totals
    const cashTotal = data.paymentBreakdown.find(p => p.method === 'Cash')?.amount || 0;
    const cardTotal = data.paymentBreakdown.find(p => p.method === 'Card')?.amount || 0;
    const upiTotal = data.paymentBreakdown.find(p => p.method === 'UPI')?.amount || 0;
    
    // Test-wise revenue (if available in invoice data)
    const testRevenue = {};
    data.invoices?.forEach(inv => {
        if (inv.tests) {
            const tests = inv.tests.split(', ');
            const testAmount = (inv.amount || 0) / (tests.length || 1);
            tests.forEach(test => {
                if (test && test !== 'N/A') {
                    testRevenue[test] = (testRevenue[test] || 0) + testAmount;
                }
            });
        }
    });
    const topTests = Object.entries(testRevenue)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Analytics Dashboard</h1>
                    <p className="text-gray-500 mt-1">Comprehensive revenue and performance insights</p>
                </div>
                <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg shadow-primary-200 hover:shadow-xl font-bold text-sm"
                >
                    <Download className="w-4 h-4" />
                    Download Report
                </button>
            </div>

            {/* Date Filter */}
            <div className="bg-gradient-to-br from-white to-gray-50/50 p-4 rounded-2xl border-2 border-gray-100 shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 rounded-lg">
                            <Calendar className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Date Range</h3>
                            <p className="text-xs text-gray-500">Select period for analysis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 flex-1 justify-end">
                        <div className="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 shadow-sm hover:border-primary-300 transition-colors">
                            <span className="text-sm text-gray-600 font-bold">From:</span>
                            <input
                                type="date"
                                value={startDate}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border-none focus:ring-0 text-sm text-gray-700 font-bold bg-transparent outline-none cursor-pointer"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 shadow-sm hover:border-primary-300 transition-colors">
                            <span className="text-sm text-gray-600 font-bold">To:</span>
                            <input
                                type="date"
                                value={endDate}
                                max={new Date().toISOString().split('T')[0]}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border-none focus:ring-0 text-sm text-gray-700 font-bold bg-transparent outline-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards - Above Period Revenue */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl border border-blue-200 shadow-md p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Total Invoices</h3>
                                <p className="text-[10px] text-gray-500 font-medium">In selected period</p>
                            </div>
                        </div>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{data.invoices?.length || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-white to-purple-50/30 rounded-xl border border-purple-200 shadow-md p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Users className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Collections</h3>
                                <p className="text-[10px] text-gray-500 font-medium">Samples collected</p>
                            </div>
                        </div>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{data.collections?.length || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-white to-orange-50/30 rounded-xl border border-orange-200 shadow-md p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Activity className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Avg. Revenue</h3>
                                <p className="text-[10px] text-gray-500 font-medium">Per invoice</p>
                            </div>
                        </div>
                    </div>
                    <p className="text-2xl font-black text-gray-900">
                        ₹{data.invoices?.length > 0 ? Math.round(data.totalRevenue / data.invoices.length).toLocaleString() : 0}
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Today\'s Revenue',
                        value: `₹${data.todayRevenue.toLocaleString()}`,
                        icon: DollarSign,
                        bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
                        borderColor: 'border-blue-200',
                        iconColor: 'text-blue-600',
                        trend: '+12.5%'
                    },
                    {
                        label: 'Period Revenue',
                        value: `₹${data.totalRevenue.toLocaleString()}`,
                        icon: TrendingUp,
                        bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
                        borderColor: 'border-emerald-200',
                        iconColor: 'text-emerald-600',
                        trend: '+18.3%'
                    },
                    {
                        label: 'Today\'s Collections',
                        value: data.todayCollections.toLocaleString(),
                        icon: Calendar,
                        bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
                        borderColor: 'border-purple-200',
                        iconColor: 'text-purple-600',
                        trend: '+5.2%'
                    },
                    {
                        label: 'Total Tests',
                        value: data.totalTests.toLocaleString(),
                        icon: TestTube,
                        bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50',
                        borderColor: 'border-orange-200',
                        iconColor: 'text-orange-600',
                        trend: '+9.7%'
                    }
                ].map((stat, idx) => (
                    <div key={idx} className={`bg-white ${stat.bg} border ${stat.borderColor} rounded-xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/40 to-transparent rounded-full -mr-12 -mt-12"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`p-2 ${stat.bg} rounded-lg`}>
                                    <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                                </div>
                                <div className="flex items-center gap-1">
                                    <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                                    <span className="text-[10px] font-bold text-emerald-600">{stat.trend}</span>
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Important Analytics Features */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Invoice Status Summary */}
                <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-100 rounded-xl">
                                <Receipt className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 tracking-tight text-lg">Invoice Status</h3>
                                <p className="text-xs font-bold text-gray-400">Payment breakdown</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/30 rounded-xl p-4 border-2 border-emerald-200">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    <span className="text-sm font-black text-gray-700 uppercase tracking-wider">Paid Invoices</span>
                                </div>
                                <span className="text-lg font-black text-emerald-700">{paidInvoices.length}</span>
                            </div>
                            <p className="text-2xl font-black text-gray-900">₹{totalPaid.toLocaleString()}</p>
                        </div>
                        <div className="bg-gradient-to-r from-amber-50 to-amber-100/30 rounded-xl p-4 border-2 border-amber-200">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                    <span className="text-sm font-black text-gray-700 uppercase tracking-wider">Pending Invoices</span>
                                </div>
                                <span className="text-lg font-black text-amber-700">{pendingInvoices.length}</span>
                            </div>
                            <p className="text-2xl font-black text-gray-900">₹{totalPending.toLocaleString()}</p>
                        </div>
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100/30 rounded-xl p-4 border-2 border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Percent className="w-5 h-5 text-blue-600" />
                                    <span className="text-sm font-black text-gray-700 uppercase tracking-wider">Collection Rate</span>
                                </div>
                                <span className="text-lg font-black text-blue-700">
                                    {data.invoices?.length > 0 ? ((paidInvoices.length / data.invoices.length) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                <div 
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500" 
                                    style={{ width: `${data.invoices?.length > 0 ? ((paidInvoices.length / data.invoices.length) * 100) : 0}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Methods & Financial Summary */}
                <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-100 rounded-xl">
                                <Wallet className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 tracking-tight text-lg">Payment Methods</h3>
                                <p className="text-xs font-bold text-gray-400">Revenue by payment type</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border-2 border-emerald-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Wallet className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs font-black text-gray-700 uppercase">Cash</span>
                                </div>
                                <p className="text-xl font-black text-gray-900">₹{cashTotal.toLocaleString()}</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border-2 border-blue-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <CreditCard className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs font-black text-gray-700 uppercase">Card</span>
                                </div>
                                <p className="text-xl font-black text-gray-900">₹{cardTotal.toLocaleString()}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border-2 border-purple-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Smartphone className="w-4 h-4 text-purple-600" />
                                    <span className="text-xs font-black text-gray-700 uppercase">UPI</span>
                                </div>
                                <p className="text-xl font-black text-gray-900">₹{upiTotal.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-red-50 to-red-100/30 rounded-xl p-4 border-2 border-red-200">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <TrendingDown className="w-5 h-5 text-red-600" />
                                    <span className="text-sm font-black text-gray-700 uppercase tracking-wider">Outstanding Amount</span>
                                </div>
                            </div>
                            <p className="text-2xl font-black text-red-700">₹{totalPending.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-1">Requires collection</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Tests by Revenue */}
            {topTests.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-100 rounded-xl">
                                <TestTube className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 tracking-tight text-lg">Top Tests by Revenue</h3>
                                <p className="text-xs font-bold text-gray-400">Most profitable tests</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {topTests.map((test, index) => (
                            <div key={index} className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 rounded-xl p-4 border-2 border-indigo-200 hover:shadow-lg transition-all">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <span className="text-xs font-black text-indigo-700">#{index + 1}</span>
                                    </div>
                                    <p className="text-xs font-black text-gray-700 uppercase tracking-wider truncate">{test.name}</p>
                                </div>
                                <p className="text-lg font-black text-gray-900">₹{Math.round(test.revenue).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Invoices Table */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-xl overflow-hidden">
                <div className="p-6 border-b-2 border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <FileText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 tracking-tight text-lg">Recent Invoices</h3>
                            <p className="text-xs text-gray-500 font-medium">Latest transactions in selected period</p>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 text-[10px] uppercase tracking-widest font-black text-gray-500 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Invoice ID</th>
                                <th className="px-6 py-4">Patient</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Paid</th>
                                <th className="px-6 py-4">Balance</th>
                                <th className="px-6 py-4">Payment</th>
                                <th className="px-6 py-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.invoices && data.invoices.length > 0 ? data.invoices.slice(0, 10).map((inv, index) => (
                                <tr key={index} className="hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-transparent transition-all duration-200">
                                    <td className="px-6 py-4">
                                        <p className="text-gray-900 text-sm font-semibold font-mono">{inv.invoiceId}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{inv.patient}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{inv.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">₹{inv.paid.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-sm font-bold ${inv.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                            ₹{inv.balance.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                            {inv.paymentMode || 'Cash'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-400">
                                        {new Date(inv.date).toLocaleDateString()}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                        <p className="text-sm font-medium">No invoices found for selected period</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default Analytics;

