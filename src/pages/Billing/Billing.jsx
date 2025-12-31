import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Receipt, IndianRupee, CreditCard, Smartphone, Wallet, Download, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPatients, getTests, createInvoice, registerPatient, default as api } from '../../services/api';

const Billing = () => {
    const [patients, setPatients] = useState([]);
    const [availableTests, setAvailableTests] = useState([]);
    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [selectedTests, setSelectedTests] = useState([]);
    const [discountAmount, setDiscountAmount] = useState("");
    const [paidAmount, setPaidAmount] = useState("");
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [successMessage, setSuccessMessage] = useState('');
    const [lastGeneratedInvoice, setLastGeneratedInvoice] = useState(null);
    const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
    const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
    const [newPatientFormData, setNewPatientFormData] = useState({
        name: '',
        age: '',
        gender: 'Male',
        mobile: '',
        referringDoctor: ''
    });
    const [formFieldErrors, setFormFieldErrors] = useState({});

    // Validation Helper (Same as PatientRegistration)
    const validateField = (name, value) => {
        let error = '';
        switch (name) {
            case 'name':
                if (value && !/^[a-zA-Z\s]+$/.test(value)) {
                    error = 'Only letters are allowed';
                }
                break;
            case 'mobile':
                if (value && !/^\d{10}$/.test(value)) {
                    error = 'Phone number must be exactly 10 digits';
                }
                break;
            case 'age':
                if (value !== '' && !/^\d+$/.test(value)) {
                    error = 'Age must be a whole number';
                }
                break;
            case 'referringDoctor':
                if (value && !/^[a-zA-Z\s\.]+$/.test(value)) {
                    error = 'Doctor name must contain only letters';
                }
                break;
            default:
                break;
        }
        return error;
    };

    const handlePatientChange = (e) => {
        let { name, value } = e.target;
        let currentError = '';

        // 1. Filter restricted characters
        if (name === 'name' || name === 'referringDoctor') {
            const allowedRegex = name === 'name' ? /[^a-zA-Z\s]/g : /[^a-zA-Z\s\.]/g;
            const filteredValue = value.replace(allowedRegex, '');
            if (filteredValue !== value) {
                currentError = name === 'name' ? 'Only letters are allowed' : 'Doctor name must contain only letters';
                value = filteredValue;
            }
        } else if (name === 'age' || name === 'mobile') {
            const filteredValue = value.replace(/\D/g, '');
            if (filteredValue !== value) {
                currentError = name === 'age' ? 'Age must be a whole number' : 'Phone number must be exactly 10 digits';
                value = filteredValue;
            }
            if (name === 'mobile' && value.length > 10) return; // Block > 10 digits
        }

        setNewPatientFormData(prev => ({ ...prev, [name]: value }));

        // 2. Validate
        const validationError = validateField(name, value);
        if (currentError && !validationError) {
            setFormFieldErrors(prev => ({ ...prev, [name]: currentError }));
        } else {
            setFormFieldErrors(prev => ({ ...prev, [name]: validationError }));
        }
    };

    useEffect(() => {
        fetchAvailableTests();
        
        // Load billing form data from localStorage
        const savedBillingData = localStorage.getItem('billingFormData');
        if (savedBillingData) {
            try {
                const data = JSON.parse(savedBillingData);
                if (data.selectedPatientId) {
                    // Fetch patient data if ID exists
                    getPatients({ keyword: '' }).then(({ data: patientsData }) => {
                        const patient = patientsData.patients?.find(p => p._id === data.selectedPatientId);
                        if (patient) setSelectedPatient(patient);
                    });
                }
                if (data.discount !== undefined && data.discount !== null && data.discount !== 0) {
                    setDiscountAmount(String(data.discount));
                } else {
                    setDiscountAmount("");
                }
                if (data.paidAmount !== undefined && data.paidAmount !== null && data.paidAmount !== 0) {
                    setPaidAmount(String(data.paidAmount));
                } else {
                    setPaidAmount("");
                }
                if (data.paymentMode) setPaymentMode(data.paymentMode);
                if (data.search) setPatientSearchQuery(data.search);
                if (data.newPatient) setNewPatientFormData(data.newPatient);
            } catch (err) {
                console.error('Error loading billing form data:', err);
            }
        }
    }, []);

    // Debounced Patient Search Effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (patientSearchQuery.length >= 2) {
                getPatients({ keyword: patientSearchQuery }).then(({ data }) => setPatients(data.patients || []));
            } else if (patientSearchQuery.length === 0) {
                setPatients([]);
            }
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [patientSearchQuery]);


    const fetchAvailableTests = async () => {
        try {
            const { data } = await getTests({ limit: 1000 }); // Get all/most tests for billing
            setAvailableTests(data.tests || []);
        } catch (err) {
            console.error('Failed to fetch tests:', err);
            toast.error('Failed to load tests');
        }
    };

    // Restore selected tests when tests are loaded (only on initial load)
    const [hasTestsRestored, setHasTestsRestored] = useState(false);
    useEffect(() => {
        if (availableTests.length > 0 && !hasTestsRestored) {
            const savedBillingData = localStorage.getItem('billingFormData');
            if (savedBillingData) {
                try {
                    const formData = JSON.parse(savedBillingData);
                    if (formData.selectedTestIds && formData.selectedTestIds.length > 0) {
                        const restoredTests = formData.selectedTestIds
                            .map(testId => availableTests.find(test => test._id === testId))
                            .filter(Boolean);
                        if (restoredTests.length > 0) {
                            setSelectedTests(restoredTests);
                        }
                    }
                    setHasTestsRestored(true);
                } catch (err) {
                    console.error('Error restoring tests:', err);
                    setHasTestsRestored(true);
                }
            } else {
                setHasTestsRestored(true);
            }
        }
    }, [availableTests.length, hasTestsRestored]);

    const handleSearchPatients = async (e) => {
        e.preventDefault();
        try {
            const { data } = await getPatients({ keyword: patientSearchQuery });
            setPatients(data.patients || []);
        } catch (err) {
            console.error('Failed to search patients:', err);
            toast.error('Failed to search patients');
        }
    };

    const handleAddTestToInvoice = (testId) => {
        const testToAdd = availableTests.find(test => test._id === testId);
        if (testToAdd && !selectedTests.find(test => test._id === testId)) {
            setSelectedTests(prevTests => [...prevTests, testToAdd]);
        }
    };

    const handleRemoveTestFromInvoice = (testIndex) => {
        setSelectedTests(prevTests => prevTests.filter((_, index) => index !== testIndex));
    };

    // Save billing form data to localStorage whenever it changes
    useEffect(() => {
        const billingFormData = {
            selectedPatientId: selectedPatient?._id || null,
            selectedTestIds: selectedTests.map(test => test._id),
            discount: discountAmount === "" ? 0 : (Number(discountAmount) || 0),
            paidAmount: paidAmount === "" ? 0 : (Number(paidAmount) || 0),
            paymentMode,
            search: patientSearchQuery,
            newPatient: newPatientFormData
        };
        localStorage.setItem('billingFormData', JSON.stringify(billingFormData));
    }, [selectedPatient, selectedTests, discountAmount, paidAmount, paymentMode, patientSearchQuery, newPatientFormData]);

    // Calculate billing amounts
    const subtotalAmount = selectedTests.reduce((total, test) => total + test.price, 0);
    const discountValue = discountAmount === "" || discountAmount === null ? 0 : Number(discountAmount) || 0;
    const paidAmountValue = paidAmount === "" || paidAmount === null ? 0 : Number(paidAmount) || 0;
    const totalAmount = subtotalAmount - discountValue;
    const balanceAmount = Math.max(0, totalAmount - paidAmountValue);

    const handleGenerateInvoice = async () => {
        if (!selectedPatient) {
            toast.error('Please select a patient');
            return;
        }
        if (selectedTests.length === 0) {
            toast.error('Please select at least one test');
            return;
        }

        setIsGeneratingInvoice(true);
        try {
            const invoicePayload = {
                patientId: selectedPatient._id,
                tests: selectedTests.map(test => test._id),
                discount: discountValue,
                paidAmount: paidAmountValue,
                paymentMode
            };
            const { data } = await createInvoice(invoicePayload);
            setSuccessMessage(`Invoice Generated Successfully! Invoice ID: ${data.invoiceIds}`);
            setLastGeneratedInvoice(data);
            
            // Clear form and localStorage
            setSelectedPatient(null);
            setSelectedTests([]);
            setDiscountAmount("");
            setPaidAmount("");
            setPatientSearchQuery('');
            setNewPatientFormData({
                name: '',
                age: '',
                gender: 'Male',
                mobile: '',
                referringDoctor: ''
            });
            setHasTestsRestored(false);
            // Clear billing form data from localStorage
            localStorage.removeItem('billingFormData');

            // Scroll to top to show success message
            window.scrollTo({ top: 0, behavior: 'smooth' });

            setTimeout(() => {
                setSuccessMessage('');
                setLastGeneratedInvoice(null);
            }, 30000); // Longer visibility
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to generate invoice');
        } finally {
            setIsGeneratingInvoice(false);
        }
    };

    const handleDownloadInvoiceAsPDF = async (invoice) => {
        try {
            // Use invoiceIds (human-readable ID) instead of MongoDB _id
            const invoiceId = invoice?.invoiceIds || invoice?._id;
            if (!invoiceId) {
                throw new Error('Invoice ID not found');
            }
            
            const apiUrl = `/billing/print/${invoiceId}`;
            console.log('Download API URL:', apiUrl, 'Invoice ID:', invoiceId);
            const response = await api.get(apiUrl, {
                responseType: 'text',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

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
            toast.error(err.message || 'Failed to open invoice');
        }
    };

    const handlePrintInvoiceDocument = async (invoice) => {
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
            
            const apiUrl = `/billing/print/${invoiceId}`;
            console.log('Print API URL:', apiUrl, 'Invoice ID:', invoiceId);
            const response = await api.get(apiUrl, {
                responseType: 'text',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

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

    const handleRegisterNewPatient = async (e) => {
        e.preventDefault();

        // Final Validation
        const errors = {};
        Object.keys(newPatientFormData).forEach(key => {
            const error = validateField(key, newPatientFormData[key]);
            if (error) errors[key] = error;
        });

        if (Object.keys(errors).length > 0) {
            setFormFieldErrors(errors);
            toast.error(errors[Object.keys(errors)[0]]);
            return;
        }

        try {
            // Format age securely
            const patientData = { ...newPatientFormData };
            if (patientData.age) {
                patientData.age = `${patientData.age} Years`;
            }

            const { data } = await registerPatient(patientData);
            setSelectedPatient(data);
            setIsAddPatientModalOpen(false);
            setNewPatientFormData({ name: '', age: '', gender: 'Male', mobile: '', referringDoctor: '' });
            setFormFieldErrors({});
            toast.success('Patient registered successfully!');
        } catch (err) {
            console.error('Failed to register patient:', err);
            if (err.response?.status === 400 && err.response?.data?.patient) {
                toast.error(err.response.data.message);
                setSelectedPatient(err.response.data.patient);
                setIsAddPatientModalOpen(false);
            } else {
                toast.error(err.response?.data?.message || 'Failed to register patient');
            }
        }
    };


    return (
        <div className="space-y-4 pb-8">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
            </div>

            {successMessage && (
                <div className="mx-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-green-700 font-medium">{successMessage}</p>
                        {lastGeneratedInvoice && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePrintInvoiceDocument(lastGeneratedInvoice)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all"
                                >
                                    <Receipt className="w-4 h-4" />
                                    <span>Print</span>
                                </button>
                                <button
                                    onClick={() => handleDownloadInvoiceAsPDF(lastGeneratedInvoice)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Download</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-12 gap-4 px-6">
                {/* Left Column - Patient Info */}
                <div className="col-span-12 lg:col-span-3 bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900">Patient Information</h3>
                        <button
                            onClick={() => setIsAddPatientModalOpen(true)}
                            className="text-blue-600 hover:text-blue-700"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="mb-3">
                        <input
                            type="text"
                            placeholder="Search by Name, Mobile or ID"
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            value={patientSearchQuery}
                            onChange={e => setPatientSearchQuery(e.target.value)}
                        />
                    </div>

                    {selectedPatient ? (
                        <div className="bg-blue-50 border border-blue-200 rounded p-2 relative">
                            <button
                                onClick={() => setSelectedPatient(null)}
                                className="absolute top-1 right-1 text-red-500 hover:text-red-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                            <div className="pr-5">
                                <p className="font-semibold text-gray-900 text-xs mb-0.5">{selectedPatient.name}</p>
                                <p className="text-xs text-gray-600">ID: {selectedPatient.patientId}</p>
                                <p className="text-xs text-gray-600">Age: {selectedPatient.age} / {selectedPatient.gender}</p>
                                <p className="text-xs text-gray-600">Mobile: {selectedPatient.mobile}</p>
                                {selectedPatient.referringDoctor && (
                                    <p className="text-xs text-blue-700 mt-0.5">Ref. Dr: {selectedPatient.referringDoctor}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {patients.map(p => (
                                <div
                                    key={p._id}
                                    className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => setSelectedPatient(p)}
                                >
                                    <p className="font-medium text-xs text-gray-900">{p.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {p.mobile} • {p.patientId}
                                    </p>
                                </div>
                            ))}
                            {patients.length === 0 && patientSearchQuery.length >= 2 && (
                                <p className="text-center text-gray-400 text-xs py-2">No patients found</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Middle Column - Test Selection */}
                <div className="col-span-12 lg:col-span-4 bg-white border border-gray-200 rounded-lg p-4">
                    <div className="mb-3 pb-2 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900">Select Tests</h3>
                    </div>

                    <div className="mb-3">
                        <select
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            onChange={(e) => handleAddTestToInvoice(e.target.value)}
                            value=""
                        >
                            <option value="">-- Select Test --</option>
                            {availableTests.map(test => (
                                <option key={test._id} value={test._id}>{test.testName} - ₹{test.price}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {selectedTests.map((t, index) => (
                            <div key={index} className="flex items-center justify-between p-1.5 bg-gray-50 border border-gray-200 rounded">
                                <div className="flex-1">
                                    <p className="font-medium text-xs text-gray-900">{t.testName}</p>
                                    <p className="text-xs text-gray-500">{t.department?.name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs text-gray-900">₹{t.price}</span>
                                    <button
                                        onClick={() => removeTest(index)}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {selectedTests.length === 0 && (
                            <p className="text-center text-gray-400 text-xs py-4">No tests selected</p>
                        )}
                    </div>
                </div>

                {/* Right Column - Payment Summary */}
                <div className="col-span-12 lg:col-span-5 bg-white border border-gray-200 rounded-lg p-5">
                    <div className="mb-4 pb-3 border-b border-gray-200">
                        <h3 className="text-base font-semibold text-gray-900">Payment Summary</h3>
                    </div>

                    <div className="space-y-3 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Total Amount</label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-semibold text-gray-900">
                                ₹{subtotalAmount}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Discount</label>
                            <input
                                type="number"
                                value={discountAmount}
                                onChange={e => setDiscountAmount(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Final Amount</label>
                            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm font-bold text-blue-700">
                                ₹{totalAmount}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Paid Amount</label>
                            <input
                                type="number"
                                value={paidAmount}
                                onChange={e => setPaidAmount(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Balance</label>
                            <div className={`px-3 py-2 border rounded text-sm font-bold ${balanceAmount > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                                ₹{balanceAmount}
                            </div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">Payment Mode</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'Cash', icon: Wallet },
                                { value: 'UPI', icon: Smartphone },
                                { value: 'Card', icon: CreditCard }
                            ].map(mode => {
                                const Icon = mode.icon;
                                return (
                                    <button
                                        key={mode.value}
                                        onClick={() => setPaymentMode(mode.value)}
                                        className={`p-2 border-2 rounded text-xs font-medium transition-all ${paymentMode === mode.value
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4 mx-auto mb-1" />
                                        <span>{mode.value}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={handleGenerateInvoice}
                        disabled={isGeneratingInvoice || !selectedPatient || selectedTests.length === 0}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                    >
                        {isGeneratingInvoice ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Receipt className="w-4 h-4" />
                                <span>Generate Bill</span>
                            </>
                        )}
                    </button>
                </div>
            </div>


            {/* Quick Add Patient Modal */}
            {
                isAddPatientModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-primary-600 text-white">
                                <div className="flex items-center gap-3">
                                    <UserPlus className="w-6 h-6" />
                                    <h3 className="text-xl font-bold">Register New Patient</h3>
                                </div>
                                <button
                                    onClick={() => setIsAddPatientModalOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleRegisterNewPatient} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input
                                        required
                                        name="name"
                                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition-all ${formFieldErrors.name ? 'border-error-500 focus:ring-error-500/20' : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-400'
                                            }`}
                                        value={newPatientFormData.name}
                                        onChange={handlePatientChange}
                                        placeholder="Enter full name"
                                    />
                                    {formFieldErrors.name && (
                                        <p className="mt-1 text-xs text-error-600 animate-fade-in">{formFieldErrors.name}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                                        <input
                                            required
                                            name="mobile"
                                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition-all ${formFieldErrors.mobile ? 'border-error-500 focus:ring-error-500/20' : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-400'
                                                }`}
                                            value={newPatientFormData.mobile}
                                            onChange={handlePatientChange}
                                            placeholder="10-digit mobile"
                                        />
                                        {formFieldErrors.mobile && (
                                            <p className="mt-1 text-xs text-error-600 animate-fade-in">{formFieldErrors.mobile}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                                        <input
                                            required
                                            type="number"
                                            name="age"
                                            min="0"
                                            onKeyDown={(e) => ['e', 'E', '.', '-', '+'].includes(e.key) && e.preventDefault()}
                                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition-all ${formFieldErrors.age ? 'border-error-500 focus:ring-error-500/20' : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-400'
                                                }`}
                                            value={newPatientFormData.age}
                                            onChange={handlePatientChange}
                                            placeholder="Age"
                                        />
                                        {formFieldErrors.age && (
                                            <p className="mt-1 text-xs text-error-600 animate-fade-in">{formFieldErrors.age}</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                                    <div className="flex gap-2">
                                        {['Male', 'Female', 'Other'].map(g => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setNewPatientFormData(prev => ({ ...prev, gender: g }))}
                                                className={`flex-1 py-2 rounded-lg border-2 font-medium transition-all ${newPatientFormData.gender === g
                                                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                                                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Referring Doctor (Optional)</label>
                                    <input
                                        name="referringDoctor"
                                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition-all ${formFieldErrors.referringDoctor ? 'border-error-500 focus:ring-error-500/20' : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-400'
                                            }`}
                                        value={newPatientFormData.referringDoctor}
                                        onChange={handlePatientChange}
                                        placeholder="Doctor Name"
                                    />
                                    {formFieldErrors.referringDoctor && (
                                        <p className="mt-1 text-xs text-error-600 animate-fade-in">{formFieldErrors.referringDoctor}</p>
                                    )}
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddPatient(false)}
                                        className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-all shadow-md shadow-primary-500/20"
                                    >
                                        Register Patient
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Billing;
