import React, { useEffect, useState } from 'react';
import {
    Users,
    TestTube2,
    FileCheck,
    IndianRupee,
    Plus,
    UserPlus,
    Beaker,
    ClipboardList,
    FileText,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Calendar,
    RotateCcw,
    Activity,
    DollarSign,
    BarChart3,
    PieChart,
    Receipt
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { samplesAPI, patientsAPI, billingAPI } from '../../services/api';

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        todayPatients: 0,
        pendingSamples: 0,
        approvedReports: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        totalProfit: 0,
        totalLoss: 0,
        netEarnings: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const getLocalDateString = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [dateFilter, setDateFilter] = useState(getLocalDateString()); // Default to Today (YYYY-MM-DD)

    const [revenueData, setRevenueData] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, [dateFilter]);
    const fetchDashboardData = async () => {
        try {
            // Generate local start/end of day for the search
            let filter = {};
            let chartFilter = {};

            if (dateFilter) {
                const selected = new Date(dateFilter + 'T00:00:00');
                const start = new Date(selected);
                start.setHours(0, 0, 0, 0);
                const end = new Date(selected);
                end.setHours(23, 59, 59, 999);

                filter = {
                    from: start.toISOString(),
                    to: end.toISOString()
                };

                const weekStart = new Date(selected);
                weekStart.setDate(weekStart.getDate() - 7);
                chartFilter = {
                    from: weekStart.toISOString(),
                    to: end.toISOString()
                };
            } else {
                const now = new Date();
                const start = new Date(now);
                start.setHours(0, 0, 0, 0);
                const end = new Date(now);
                end.setHours(23, 59, 59, 999);
                filter = { from: start.toISOString(), to: end.toISOString() };
                chartFilter = {}; // Backend defaults to last 7 days
            }

            // Get today's date range for today's revenue (always today, regardless of filter)
            const now = new Date();
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(now);
            todayEnd.setHours(23, 59, 59, 999);
            const todayFilter = {
                from: todayStart.toISOString(),
                to: todayEnd.toISOString()
            };

            // Optimize: Load critical data first, then secondary data
            const [patientsRes, samplesRes, statsRes, todayStatsRes] = await Promise.all([
                patientsAPI.getAll(filter),
                samplesAPI.getAll(filter),
                billingAPI.getStats(filter),
                billingAPI.getStats(todayFilter) // Always get today's revenue
            ]);

            // Set initial stats immediately for faster UI
            const todayPatients = patientsRes.data.total || 0;
            const sampleStats = samplesRes.data.stats || { pending: 0, collected: 0, processing: 0, approved: 0 };
            const pendingSamples = sampleStats.pending + sampleStats.collected;
            const approvedReports = sampleStats.approved;
            const { totalRevenue, totalProfit, netEarnings } = statsRes.data;
            const { totalRevenue: todayRevenue } = todayStatsRes.data;

            setStats({
                todayPatients,
                pendingSamples,
                approvedReports,
                totalRevenue,
                todayRevenue: todayRevenue || 0,
                totalProfit,
                netEarnings
            });

            // Set loading to false after critical data loads
            setLoading(false);

            // Load non-critical data (charts, invoices) after initial render
            const [dailyRes, invoicesRes] = await Promise.all([
                billingAPI.getDailyStats(chartFilter),
                billingAPI.getInvoices({ limit: 5, page: 1 })
            ]);

            // Activity Table Data
            const activities = (samplesRes.data.samples || [])
                .slice(0, 5)
                .map(s => ({
                    id: s._id,
                    patient: s.patient?.name || 'Unknown',
                    test: s.tests?.length > 1
                        ? `${s.tests[0].testName} + ${s.tests.length - 1} more`
                        : (s.tests?.[0]?.testName || 'General Test'),
                    sampleId: s.sampleId || 'N/A',
                    status: s.status,
                    time: new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
            setRecentActivity(activities);

            // Chart Data
            // Chart Data - Fill in last 7 days to ensure chart is not empty/isolated
            const endDate = dateFilter ? new Date(dateFilter + 'T23:59:59') : new Date();
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date(endDate);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const dayData = dailyRes.data.find(d => d._id === dateStr);

                last7Days.push({
                    name: date.toLocaleDateString([], { weekday: 'short' }),
                    revenue: dayData ? dayData.revenue : 0,
                    profit: dayData ? dayData.profit : 0
                });
            }
            setRevenueData(last7Days);

            // Recent Invoices
            const invoices = (invoicesRes.data.invoices || []).map(inv => ({
                id: inv._id,
                invoiceId: inv.invoiceIds,
                patient: inv.patient?.name || 'Unknown',
                amount: inv.finalAmount || 0,
                status: (inv.balance || 0) <= 0 ? 'Paid' : 'Pending',
                time: new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: new Date(inv.createdAt).toLocaleDateString()
            }));
            setRecentInvoices(invoices);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setLoading(false);
        }
    };

    const StatusBadge = ({ status }) => {
        const colors = {
            'Pending': 'bg-amber-50 text-amber-600 border-amber-100',
            'Collected': 'bg-blue-50 text-blue-600 border-blue-100',
            'Processing': 'bg-indigo-50 text-indigo-600 border-indigo-100',
            'Approved': 'bg-emerald-50 text-emerald-600 border-emerald-100',
            'Rejected': 'bg-rose-50 text-rose-600 border-rose-100'
        };
        const colorClass = colors[status] || 'bg-gray-50 text-gray-600 border-gray-100';
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorClass}`}>
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-gray-400">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard Overview</h1>
                    <p className="text-gray-500 mt-1">Welcome back, Admin • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white px-4 py-2.5 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <Calendar className="w-5 h-5 text-primary-600" />
                        <input
                            type="date"
                            className="bg-transparent border-none outline-none text-sm text-gray-700 font-medium w-36 cursor-pointer"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            title="Filter stats by date"
                        />
                        {dateFilter && (
                            <button 
                                onClick={() => setDateFilter(getLocalDateString())} 
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Reset to today"
                            >
                                <RotateCcw className="w-4 h-4 text-gray-400" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { 
                        label: 'Today\'s Revenue', 
                        value: `₹${stats.todayRevenue.toLocaleString()}`, 
                        icon: IndianRupee, 
                        color: 'text-indigo-600', 
                        bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50',
                        borderColor: 'border-indigo-200',
                        trend: '+12.5%',
                        trendUp: true
                    },
                    { 
                        label: 'Period Revenue', 
                        value: `₹${stats.totalRevenue.toLocaleString()}`, 
                        icon: TrendingUp, 
                        color: 'text-purple-600', 
                        bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
                        borderColor: 'border-purple-200',
                        trend: '+8.2%',
                        trendUp: true
                    },
                    { 
                        label: 'Today\'s Patients', 
                        value: stats.todayPatients.toLocaleString(), 
                        icon: Users, 
                        color: 'text-blue-600', 
                        bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
                        borderColor: 'border-blue-200',
                        trend: '+5.3%',
                        trendUp: true
                    },
                    { 
                        label: 'Pending Samples', 
                        value: stats.pendingSamples.toLocaleString(), 
                        icon: TestTube2, 
                        color: 'text-amber-600', 
                        bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
                        borderColor: 'border-amber-200',
                        trend: '-5.3%',
                        trendUp: false
                    },
                ].map((kpi, idx) => (
                    <div key={idx} className={`bg-white p-6 rounded-2xl border-2 ${kpi.borderColor} hover:shadow-2xl hover:shadow-${kpi.color.split('-')[1]}-200/30 hover:-translate-y-1 transition-all duration-300 group cursor-default relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/50 to-transparent rounded-full -mr-16 -mt-16"></div>
                        <div className="relative z-10 flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{kpi.label}</p>
                                <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-2">{kpi.value}</h3>
                                <div className="flex items-center gap-1.5">
                                    {kpi.trendUp ? (
                                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                                    )}
                                    <span className={`text-xs font-bold ${kpi.trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {kpi.trend}
                                    </span>
                                    <span className="text-xs text-gray-400">vs last period</span>
                                </div>
                            </div>
                            <div className={`p-4 rounded-2xl ${kpi.bg} ${kpi.color} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                                <kpi.icon className="w-7 h-7" strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-gradient-to-br from-white to-gray-50/50 p-3 rounded-2xl border-2 border-gray-100 shadow-lg">
                <div className="mb-3 px-2">
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary-600" />
                        Quick Actions
                    </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: 'New Billing', icon: Plus, path: '/billing', color: 'bg-gradient-to-br from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-200' },
                        { label: 'Register Patient', icon: UserPlus, path: '/registration', color: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 border border-blue-200' },
                        { label: 'Collect Sample', icon: Beaker, path: '/lab/samples', color: 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 hover:from-amber-100 hover:to-amber-200 border border-amber-200' },
                        { label: 'Enter Results', icon: ClipboardList, path: '/lab/results', color: 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 hover:from-indigo-100 hover:to-indigo-200 border border-indigo-200' },
                        { label: 'View Reports', icon: FileText, path: '/reports', color: 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 hover:from-emerald-100 hover:to-emerald-200 border border-emerald-200' },
                    ].map((action, idx) => (
                        <button
                            key={idx}
                            onClick={() => navigate(action.path)}
                            className={`flex flex-col items-center justify-center gap-2.5 p-5 rounded-xl transition-all font-bold text-xs ${action.color} group active:scale-95 hover:scale-105 hover:shadow-lg`}
                        >
                            <action.icon className="w-7 h-7 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" strokeWidth={2.5} />
                            <span className="leading-tight">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Activity Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-gray-100 shadow-xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b-2 border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-100 rounded-xl">
                                <Activity className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 tracking-tight text-lg">Live Lab Activity</h3>
                                <p className="text-xs text-gray-500 font-medium">Real-time sample tracking</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/lab/samples')}
                            className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-sm font-bold flex items-center gap-2"
                        >
                            View All
                            <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 text-[10px] uppercase tracking-widest font-black text-gray-500 border-b-2 border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Patient</th>
                                    <th className="px-6 py-4">Test</th>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentActivity.length > 0 ? recentActivity.map((act) => (
                                    <tr key={act.id} className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-transparent transition-all duration-200 group cursor-pointer">
                                        <td className="px-6 py-4">
                                            <p className="text-gray-900 text-sm font-semibold group-hover:text-primary-700 transition-colors">{act.patient}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">{act.test}</td>
                                        <td className="px-6 py-4 text-xs font-mono text-gray-400 bg-gray-50 rounded px-2 py-1 inline-block">{act.sampleId}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={act.status} />
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-gray-400">{act.time}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                            <TestTube2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p className="text-sm font-medium">No recent activity</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Analytics Segment */}
                <div className="bg-gradient-to-br from-white to-indigo-50/20 rounded-2xl border-2 border-indigo-100 shadow-xl flex flex-col p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-100 rounded-xl">
                                <BarChart3 className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 tracking-tight text-lg">Revenue Analytics</h3>
                                <p className="text-xs font-bold text-gray-400">7-Day Performance</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/analytics')}
                            className="p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Full Analytics"
                        >
                            <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                        </button>
                    </div>

                    <div className="flex-1 h-64 min-h-[250px] bg-white/50 rounded-xl p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0c8ce9" stopOpacity={0.3} />
                                        <stop offset="50%" stopColor="#0c8ce9" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#0c8ce9" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fontWeight: 'bold', fill: '#6b7280' }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ 
                                        borderRadius: '12px', 
                                        border: '2px solid #e5e7eb', 
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', 
                                        fontSize: '12px', 
                                        fontWeight: 'bold',
                                        background: 'white',
                                        padding: '12px'
                                    }}
                                    formatter={(value) => `₹${value.toLocaleString()}`}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#0c8ce9"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRev)"
                                    dot={{ r: 5, fill: '#0c8ce9', strokeWidth: 3, stroke: '#fff' }}
                                    activeDot={{ r: 7, strokeWidth: 0, fill: '#0c8ce9' }}
                                    connectNulls
                                />
                                <Area
                                    type="monotone"
                                    dataKey="profit"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorProfit)"
                                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    connectNulls
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-6 pt-4 border-t-2 border-indigo-100 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Est. Monthly</span>
                            <span className="text-xl font-black text-gray-900">₹{(stats.totalRevenue * 30).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                                <span className="text-xs font-bold text-gray-600">Revenue</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                <span className="text-xs font-bold text-gray-600">Profit</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Features Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Invoices */}
                <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b-2 border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-xl">
                                <FileText className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 tracking-tight text-lg">Recent Invoices</h3>
                                <p className="text-xs text-gray-500 font-medium">Latest billing transactions</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/billing')}
                            className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-bold flex items-center gap-2"
                        >
                            View All
                            <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 text-[10px] uppercase tracking-widest font-black text-gray-500 border-b-2 border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Invoice ID</th>
                                    <th className="px-6 py-4">Patient</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentInvoices.length > 0 ? recentInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gradient-to-r hover:from-emerald-50/30 hover:to-transparent transition-all duration-200 group cursor-pointer">
                                        <td className="px-6 py-4">
                                            <p className="text-gray-900 text-sm font-semibold group-hover:text-emerald-700 transition-colors font-mono">{inv.invoiceId}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">{inv.patient}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{inv.amount.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={inv.status} />
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-gray-400">{inv.time}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p className="text-sm font-medium">No recent invoices</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Summary Stats Widget */}
                <div className="bg-gradient-to-br from-white to-primary-50/20 rounded-2xl border-2 border-primary-100 shadow-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-primary-100 rounded-xl">
                            <BarChart3 className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 tracking-tight text-lg">Performance Summary</h3>
                            <p className="text-xs text-gray-500 font-medium">Key metrics overview</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white/80 rounded-xl p-4 border border-primary-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Collection Rate</span>
                                <span className="text-xs font-bold text-emerald-600">{(stats.approvedReports > 0 ? ((stats.approvedReports / (stats.approvedReports + stats.pendingSamples)) * 100).toFixed(1) : 0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2.5 rounded-full transition-all duration-500" 
                                    style={{ width: `${stats.approvedReports > 0 ? ((stats.approvedReports / (stats.approvedReports + stats.pendingSamples)) * 100) : 0}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/80 rounded-xl p-4 border border-primary-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Avg/Patient</span>
                                </div>
                                <p className="text-2xl font-black text-gray-900">
                                    ₹{stats.todayPatients > 0 ? Math.round(stats.todayRevenue / stats.todayPatients).toLocaleString() : 0}
                                </p>
                            </div>

                            <div className="bg-white/80 rounded-xl p-4 border border-primary-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Efficiency</span>
                                </div>
                                <p className="text-2xl font-black text-gray-900">
                                    {stats.pendingSamples > 0 ? Math.round((stats.approvedReports / (stats.approvedReports + stats.pendingSamples)) * 100) : 100}%
                                </p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 rounded-xl p-4 border-2 border-primary-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Today's Performance</p>
                                    <p className="text-lg font-black text-gray-900">
                                        {stats.todayRevenue > 0 && stats.totalRevenue > 0 
                                            ? `${((stats.todayRevenue / stats.totalRevenue) * 100).toFixed(1)}%` 
                                            : '100%'} of Period
                                    </p>
                                </div>
                                <div className="p-3 bg-primary-200 rounded-xl">
                                    <TrendingUp className="w-6 h-6 text-primary-700" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
