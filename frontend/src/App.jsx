import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Customers from '@/pages/Customers';
import CustomerDetail from '@/pages/CustomerDetail';
import ShipmentList from '@/pages/ShipmentList';
import AddShipment from '@/pages/AddShipment';
import ShipmentDetail from '@/pages/ShipmentDetail';
import Billing from '@/pages/Billing';
import Courier from '@/pages/Courier';
import ClosedJobs from '@/pages/ClosedJobs';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import DoDocumentsPage from '@/pages/DoDocumentsPage';
import FilingDocumentsPage from '@/pages/FilingDocumentsPage';
import KycDocumentsPage from '@/pages/KycDocumentsPage';
import Unauthorized from '@/pages/Unauthorized';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected routes inside Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="shipments" element={<ShipmentList />} />
              <Route path="shipments/new" element={<AddShipment />} />
              <Route path="shipments/:id" element={<ShipmentDetail />} />
              <Route path="do-documents" element={<DoDocumentsPage />} />
              <Route path="filing-documents" element={<FilingDocumentsPage />} />
              <Route path="kyc-documents" element={<KycDocumentsPage />} />
              <Route path="billing" element={<Billing />} />
              <Route path="courier" element={<Courier />} />
              <Route path="closed-jobs" element={<ClosedJobs />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <Settings />
                </ProtectedRoute>
              } />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
