import React, { useState, useEffect } from 'react';
import { Receipt, Download, Printer, Search, Calendar, ChevronLeft, ChevronRight, FileText, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { billingAPI } from '../../services/api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const Transactions = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportDates, setExportDates] = useState({ from: '', to: '' });
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    useEffect(() => {
        fetchInvoices();
    }, [page]);

    // Debounce search to avoid too many API calls
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (page === 1) {
                fetchInvoices();
            } else {
                setPage(1);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, dateFilter]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit,
                ...(searchTerm && { keyword: searchTerm }),
                ...(dateFilter.from && dateFilter.to && {
                    from: new Date(dateFilter.from).toISOString(),
                    to: new Date(dateFilter.to + 'T23:59:59').toISOString()
                })
            };

            const { data } = await billingAPI.getInvoices(params);
            setInvoices(data.invoices || []);
            setPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            toast.error('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadInvoice = async (invoice) => {
        try {
            // Use invoiceIds (human-readable ID) instead of MongoDB _id
            const invoiceId = invoice?.invoiceIds || invoice?._id;
            if (!invoiceId) {
                throw new Error('Invoice ID not found');
            }
            
            const response = await billingAPI.printInvoice(invoiceId);

            // Check if response is HTML
            if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
                // Create a visible window to show the invoice
                const printWindow = window.open('', '_blank', 'width=800,height=900');
                if (!printWindow) {
                    throw new Error('Please allow popups to view invoices');
                }

                // Wait for window to be fully ready (not about:blank)
                await new Promise((resolve) => {
                    const checkReady = () => {
                        try {
                            if (printWindow.document && printWindow.document.readyState !== 'loading') {
                                resolve();
                            } else {
                                setTimeout(checkReady, 50);
                            }
                        } catch (e) {
                            setTimeout(checkReady, 50);
                        }
                    };
                    checkReady();
                });

                // Add download button to the invoice HTML
                let invoiceHTML = response.data;
                
                // Inject download button before closing body tag
                const downloadButtonHTML = `
                    <div style="text-align: center; margin: 20px 0; padding: 20px;">
                        <button id="downloadInvoiceBtn" style="
                            background: #2563eb;
                            color: white;
                            border: none;
                            padding: 12px 30px;
                            font-size: 16px;
                            font-weight: bold;
                            border-radius: 8px;
                            cursor: pointer;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                            transition: all 0.3s;
                        " onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
                            📥 Download Document
                        </button>
                    </div>
                    <script>
                        (function() {
                            const invoiceData = ${JSON.stringify({ invoiceId, invoiceIds: invoice.invoiceIds })};
                            
                            document.getElementById('downloadInvoiceBtn').addEventListener('click', async function() {
                                const btn = this;
                                btn.disabled = true;
                                btn.textContent = '⏳ Generating PDF...';
                                btn.style.background = '#6b7280';
                                
                                try {
                                    // Import html2pdf
                                    const script = document.createElement('script');
                                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                                    document.head.appendChild(script);
                                    
                                    await new Promise((resolve) => {
                                        script.onload = resolve;
                                        setTimeout(resolve, 2000);
                                    });
                                    
                                    // Get the invoice container - exactly what's visible on the page
                                    const invoiceContainer = document.querySelector('.invoice-container');
                                    if (!invoiceContainer) {
                                        throw new Error('Invoice container not found');
                                    }
                                    
                                    // Ensure container is visible and properly styled
                                    invoiceContainer.style.display = 'block';
                                    invoiceContainer.style.visibility = 'visible';
                                    invoiceContainer.style.opacity = '1';
                                    invoiceContainer.style.position = 'relative';
                                    
                                    // Wait for all images to load completely
                                    const images = invoiceContainer.querySelectorAll('img');
                                    await Promise.all(Array.from(images).map(img => {
                                        if (img.complete && img.naturalHeight !== 0) {
                                            return Promise.resolve();
                                        }
                                        return new Promise(resolve => {
                                            const timeout = setTimeout(resolve, 5000);
                                            img.onload = () => { clearTimeout(timeout); resolve(); };
                                            img.onerror = () => { clearTimeout(timeout); resolve(); };
                                        });
                                    }));
                                    
                                    // Wait for all content to render
                                    await new Promise(resolve => {
                                        requestAnimationFrame(() => {
                                            requestAnimationFrame(() => {
                                                setTimeout(resolve, 1000);
                                            });
                                        });
                                    });
                                    
                                    // Get actual dimensions of the content
                                    const containerWidth = invoiceContainer.offsetWidth || invoiceContainer.scrollWidth || 794;
                                    const containerHeight = invoiceContainer.offsetHeight || invoiceContainer.scrollHeight || 1123;
                                    
                                    const opt = {
                                        margin: [5, 5, 5, 5],
                                        filename: 'invoice-' + invoiceData.invoiceIds + '.pdf',
                                        image: { 
                                            type: 'jpeg', 
                                            quality: 0.98 
                                        },
                                        html2canvas: { 
                                            scale: 2,
                                            useCORS: true,
                                            logging: false,
                                            backgroundColor: '#ffffff',
                                            width: containerWidth,
                                            height: containerHeight,
                                            windowWidth: window.innerWidth,
                                            windowHeight: window.innerHeight,
                                            allowTaint: true,
                                            letterRendering: true,
                                            removeContainer: false,
                                            x: 0,
                                            y: 0,
                                            scrollX: 0,
                                            scrollY: 0,
                                            onclone: (clonedDoc, element) => {
                                                // Preserve all styles exactly as they appear
                                                const clonedContainer = clonedDoc.querySelector('.invoice-container');
                                                if (clonedContainer) {
                                                    // Ensure all styles are preserved
                                                    clonedContainer.style.display = 'block';
                                                    clonedContainer.style.visibility = 'visible';
                                                    clonedContainer.style.opacity = '1';
                                                    clonedContainer.style.position = 'relative';
                                                    clonedContainer.style.background = '#ffffff';
                                                    
                                                    // Make sure all child elements are visible
                                                    const allElements = clonedContainer.querySelectorAll('*');
                                                    allElements.forEach(el => {
                                                        const computedStyle = window.getComputedStyle(el);
                                                        if (computedStyle.display === 'none') {
                                                            el.style.display = 'block';
                                                        }
                                                        if (computedStyle.visibility === 'hidden') {
                                                            el.style.visibility = 'visible';
                                                        }
                                                        if (computedStyle.opacity === '0') {
                                                            el.style.opacity = '1';
                                                        }
                                                    });
                                                }
                                            }
                                        },
                                        jsPDF: { 
                                            unit: 'mm', 
                                            format: 'a4', 
                                            orientation: 'portrait',
                                            compress: true
                                        },
                                        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                                    };
                                    
                                    // Generate PDF from the exact visible content
                                    await html2pdf().set(opt).from(invoiceContainer).save();
                                    
                                    btn.textContent = '✅ Downloaded!';
                                    btn.style.background = '#10b981';
                                    setTimeout(() => {
                                        btn.disabled = false;
                                        btn.textContent = '📥 Download Document';
                                        btn.style.background = '#2563eb';
                                    }, 2000);
                                } catch (error) {
                                    console.error('Download error:', error);
                                    btn.textContent = '❌ Error - Try Again';
                                    btn.style.background = '#ef4444';
                                    btn.disabled = false;
                                    alert('Failed to download PDF: ' + error.message);
                                }
                            });
                        })();
                    </script>
                `;
                
                // Insert button before closing body tag
                invoiceHTML = invoiceHTML.replace('</body>', downloadButtonHTML + '</body>');

                // Write the invoice HTML with download button
                printWindow.document.open();
                printWindow.document.write(invoiceHTML);
                printWindow.document.close();

                // Wait for window content to fully load
                await new Promise((resolve) => {
                    const checkContent = () => {
                        try {
                            if (printWindow.document.readyState === 'complete') {
                                const container = printWindow.document.querySelector('.invoice-container');
                                const downloadBtn = printWindow.document.getElementById('downloadInvoiceBtn');
                                if (container && downloadBtn) {
                                    setTimeout(resolve, 500);
                                } else {
                                    setTimeout(checkContent, 100);
                                }
                            } else {
                                setTimeout(checkContent, 100);
                            }
                        } catch (e) {
                            setTimeout(checkContent, 100);
                        }
                    };
                    setTimeout(() => resolve(), 3000);
                    checkContent();
                });
                
                toast.success('Invoice opened. Click "Download Document" button to download PDF.');
            } else {
                throw new Error('Invalid response format. Expected HTML.');
            }
        } catch (err) {
            console.error('Download error:', err);
            if (printWindow) {
                printWindow.close();
            }
            toast.dismiss(toastId);
            toast.error(err.message || 'Failed to download invoice as PDF');
        }
    };

    const handlePrintInvoice = async (invoice) => {
        console.log('Printing Invoice:', invoice);
        const printWindow = window.open('', '_blank');
        if (!printWindow) return toast.error('Please allow popups to print invoices');

        printWindow.document.write('<html><head><title>Generating Invoice...</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>Generating Invoice...</h2><p>Please wait a moment.</p></div></body></html>');

        try {
            // Use invoiceIds (human-readable ID) instead of MongoDB _id
            const invoiceId = invoice?.invoiceIds || invoice?._id;
            if (!invoiceId) {
                throw new Error('Invoice ID not found');
            }
            
            const response = await billingAPI.printInvoice(invoiceId);

            // Check if response is HTML
            if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
                printWindow.document.open();
                printWindow.document.write(response.data);
                printWindow.document.close();
                
                // Wait for window content to fully load (same as download)
                await new Promise((resolve) => {
                    if (printWindow.document.readyState === 'complete') {
                        setTimeout(resolve, 500);
                    } else {
                        printWindow.onload = () => setTimeout(resolve, 500);
                        setTimeout(resolve, 2000); // Fallback timeout
                    }
                });

                // Wait for all images to load (same as download)
                const images = printWindow.document.querySelectorAll('img');
                const imagePromises = Array.from(images).map(img => {
                    if (img.complete && img.naturalHeight !== 0) {
                        return Promise.resolve();
                    }
                    return new Promise((resolve) => {
                        const timeout = setTimeout(() => resolve(), 3000);
                        img.onload = () => {
                            clearTimeout(timeout);
                            resolve();
                        };
                        img.onerror = () => {
                            clearTimeout(timeout);
                            resolve(); // Continue even if image fails
                        };
                    });
                });

                await Promise.all(imagePromises);
                
                // Additional wait to ensure all content is fully rendered (same as download)
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Auto print after content loads
                printWindow.print();
            } else {
                throw new Error('Invalid response format. Expected HTML but received: ' + typeof response.data);
            }
        } catch (err) {
            printWindow.close();
            console.error('Print error:', err);
            toast.error(err.message || 'Failed to open print window');
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchInvoices();
    };

    const clearFilters = () => {
        setSearchTerm('');
        setDateFilter({ from: '', to: '' });
        setPage(1);
    };

    const handleDeleteInvoice = async (invoice) => {
        const toastId = toast.loading('Deleting invoice...');
        try {
            await billingAPI.deleteInvoice(invoice._id);
            toast.dismiss(toastId);
            toast.success('Invoice deleted successfully');
            setDeleteConfirm(null);
            fetchInvoices(); // Refresh list
        } catch (error) {
            toast.dismiss(toastId);
            toast.error(error.response?.data?.message || 'Failed to delete invoice');
        }
    };

    const handleExportInvoices = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Generating report...');
        try {
            const { data } = await billingAPI.getInvoices({
                from: exportDates.from,
                to: exportDates.to,
                limit: 5000
            });

            const invoiceList = data.invoices || [];

            if (invoiceList.length === 0) {
                toast.dismiss(toastId);
                toast.error('No invoices found for selected period');
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Transactions');

            worksheet.columns = [
                { width: 20 }, { width: 25 }, { width: 15 }, { width: 15 },
                { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
            ];

            worksheet.mergeCells('B1:D1');
            const titleCell = worksheet.getCell('B1');
            titleCell.value = 'Transaction Report';
            titleCell.font = { bold: true, size: 14 };
            titleCell.alignment = { horizontal: 'center' };

            worksheet.mergeCells('B2:D2');
            const labCell = worksheet.getCell('B2');
            labCell.value = 'Medilab Diagnostic Center';
            labCell.font = { bold: true, size: 12 };
            labCell.alignment = { horizontal: 'center' };

            worksheet.getCell('A4').value = 'From Date:';
            worksheet.getCell('A4').font = { bold: true };
            worksheet.getCell('B4').value = new Date(exportDates.from).toLocaleDateString();

            worksheet.getCell('A5').value = 'To Date:';
            worksheet.getCell('A5').font = { bold: true };
            worksheet.getCell('B5').value = new Date(exportDates.to).toLocaleDateString();

            const headerRow = worksheet.getRow(7);
            headerRow.values = ['Invoice ID', 'Patient', 'Mobile', 'Amount', 'Paid', 'Balance', 'Status', 'Date'];
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF2F855A' }
                };
                cell.alignment = { horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            let totalAmount = 0;
            let totalPaid = 0;

            invoiceList.forEach((inv) => {
                const amount = inv.finalAmount || 0;
                const paid = inv.paidAmount || 0;
                totalAmount += amount;
                totalPaid += paid;

                const row = worksheet.addRow([
                    inv.invoiceIds,
                    inv.patient?.name || 'N/A',
                    inv.patient?.mobile || 'N/A',
                    amount,
                    paid,
                    inv.balance || 0,
                    inv.status,
                    new Date(inv.createdAt).toLocaleDateString()
                ]);

                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    if (colNumber === 1 || colNumber === 7 || colNumber === 8) {
                        cell.alignment = { horizontal: 'center' };
                    }
                });
            });

            worksheet.addRow([]);
            const summaryRow1 = worksheet.addRow(['', '', 'Total Amount:', totalAmount]);
            summaryRow1.getCell(3).font = { bold: true };
            summaryRow1.getCell(4).font = { bold: true };

            const summaryRow2 = worksheet.addRow(['', '', 'Total Paid:', totalPaid]);
            summaryRow2.getCell(3).font = { bold: true };
            summaryRow2.getCell(4).font = { bold: true };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `transactions_${exportDates.from}_to_${exportDates.to}.xlsx`);

            setShowExportModal(false);
            setExportDates({ from: '', to: '' });
            toast.dismiss(toastId);
            toast.success('Report downloaded successfully!');
        } catch (err) {
            console.error(err);
            toast.dismiss(toastId);
            toast.error('Failed to export transactions');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
                    <p className="text-gray-500 mt-1">View and manage all invoice transactions</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-soft p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search by Patient</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Patient name or mobile"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={dateFilter.from}
                                onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={dateFilter.to}
                                onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-4">
                    <button
                        onClick={handleSearch}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                    >
                        Search
                    </button>
                    <button
                        onClick={clearFilters}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-soft overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">All Transactions</h3>
                            <p className="text-sm text-gray-500">Total: {total} invoices</p>
                        </div>
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-success-600 text-white text-sm font-medium rounded-lg hover:bg-success-700 transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Download Report
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        <p className="mt-4 text-gray-500">Loading transactions...</p>
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="p-12 text-center">
                        <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No transactions found</p>
                        <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 text-[10px] uppercase tracking-widest font-black text-gray-400">
                                    <tr>
                                        <th className="px-6 py-4">Invoice ID</th>
                                        <th className="px-6 py-4">Patient</th>
                                        <th className="px-6 py-4">Mobile</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4">Paid</th>
                                        <th className="px-6 py-4">Balance</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Payment Mode</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {invoices.map(inv => (
                                        <tr key={inv._id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-xs font-bold text-gray-400">{inv.invoiceIds}</td>
                                            <td className="px-6 py-4">
                                                <p className="text-gray-900 font-medium">{inv.patient?.name || 'N/A'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{inv.patient?.mobile || 'N/A'}</td>
                                            <td className="px-6 py-4 font-black text-gray-900">₹{inv.finalAmount?.toFixed(2) || '0.00'}</td>
                                            <td className="px-6 py-4 font-bold text-success-600">₹{inv.paidAmount?.toFixed(2) || '0.00'}</td>
                                            <td className="px-6 py-4 font-bold text-error-600">₹{inv.balance?.toFixed(2) || '0.00'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        inv.status === 'Partial' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                            'bg-rose-50 text-rose-600 border-rose-100'
                                                    }`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                                    {inv.paymentMode || 'Cash'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-gray-400">
                                                {new Date(inv.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleDownloadInvoice(inv)}
                                                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                        title="Download PDF"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handlePrintInvoice(inv)}
                                                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                                        title="Print"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(inv)}
                                                        className="p-2 text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pages > 1 && (
                            <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                                    <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
                                    <span className="font-medium">{total}</span> transactions
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                                            let pageNum;
                                            if (pages <= 5) {
                                                pageNum = i + 1;
                                            } else if (page <= 3) {
                                                pageNum = i + 1;
                                            } else if (page >= pages - 2) {
                                                pageNum = pages - 4 + i;
                                            } else {
                                                pageNum = page - 2 + i;
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setPage(pageNum)}
                                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${page === pageNum
                                                            ? 'bg-primary-600 text-white'
                                                            : 'text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => setPage(p => Math.min(pages, p + 1))}
                                        disabled={page === pages}
                                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Export Modal */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-success-600 text-white">
                            <h3 className="text-lg font-bold">Export Transactions</h3>
                            <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleExportInvoices} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-success-500/20 focus:border-success-500 outline-none"
                                    value={exportDates.from}
                                    onChange={e => setExportDates(p => ({ ...p, from: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-success-500/20 focus:border-success-500 outline-none"
                                    value={exportDates.to}
                                    onChange={e => setExportDates(p => ({ ...p, to: e.target.value }))}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-2.5 bg-success-600 text-white rounded-lg font-semibold hover:bg-success-700 transition-colors shadow-sm"
                            >
                                Download Excel
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-error-600 text-white">
                            <h3 className="text-lg font-bold">Delete Invoice</h3>
                            <button onClick={() => setDeleteConfirm(null)} className="p-1 hover:bg-white/10 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-4">
                                Are you sure you want to delete invoice <span className="font-bold">{deleteConfirm.invoiceIds}</span>?
                                This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteInvoice(deleteConfirm)}
                                    className="flex-1 px-4 py-2 bg-error-600 text-white rounded-lg font-medium hover:bg-error-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Transactions;

