import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';
import Login from './pages/Auth/Login';
import Layout from './components/Layout/Layout';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

// Lazy load components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const PatientRegistration = lazy(() => import('./pages/Registration/PatientRegistration'));
const TestMaster = lazy(() => import('./pages/Lab/TestMaster'));
const DepartmentMaster = lazy(() => import('./pages/Lab/DepartmentMaster'));
const SampleCollection = lazy(() => import('./pages/Lab/SampleCollection'));
const ResultEntry = lazy(() => import('./pages/Lab/ResultEntry'));
const Billing = lazy(() => import('./pages/Billing/Billing'));
const Transactions = lazy(() => import('./pages/Transactions/Transactions'));
const Reports = lazy(() => import('./pages/Reports/Reports'));
const Settings = lazy(() => import('./pages/Settings/Settings'));
const Analytics = lazy(() => import('./pages/Analytics/Analytics'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

// Simple Auth Guard Component
const ProtectedRoute = ({ children }) => {
  const userInfo = localStorage.getItem('userInfo');
  if (!userInfo) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public Route Guard (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Toaster position="top-center" reverseOrder={false} />
        <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route 
            path="dashboard" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Dashboard />
              </Suspense>
            } 
          />
          <Route 
            path="registration" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <PatientRegistration />
              </Suspense>
            } 
          />
          <Route 
            path="lab/departments" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <DepartmentMaster />
              </Suspense>
            } 
          />
          <Route 
            path="lab/tests" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <TestMaster />
              </Suspense>
            } 
          />
          <Route 
            path="lab/samples" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <SampleCollection />
              </Suspense>
            } 
          />
          <Route 
            path="lab/results" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <ResultEntry />
              </Suspense>
            } 
          />
          <Route 
            path="billing" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Billing />
              </Suspense>
            } 
          />
          <Route 
            path="transactions" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Transactions />
              </Suspense>
            } 
          />
          <Route 
            path="reports" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Reports />
              </Suspense>
            } 
          />
          <Route 
            path="analytics" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Analytics />
              </Suspense>
            } 
          />
          <Route 
            path="settings" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Settings />
              </Suspense>
            } 
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
