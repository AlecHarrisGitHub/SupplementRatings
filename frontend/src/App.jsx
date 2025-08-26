import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import AmazonBanner from './components/AmazonBanner';
import { BannerProvider } from './context/BannerContext';
import Login from './pages/Login';
import Logout from './pages/Logout';
import Signup from './pages/Signup';
import SearchableSupplementList from './components/SearchableSupplementList';
import SupplementDetailPage from './pages/SupplementDetailPage';
import UploadCSV from './components/UploadCSV';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import NotFound from './pages/NotFound';
import Contact from './pages/Contact';
import EmailVerification from './pages/EmailVerification';
import { Toaster } from 'react-hot-toast';
import UploadBrands from './pages/UploadBrands';
import AdminDashboard from './pages/AdminDashboard';
import PrivateRoute from './components/PrivateRoute';
import AccountsPage from './pages/AccountsPage';
import UserProfilePage from './pages/UserProfilePage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPasswordConfirm from './pages/ResetPasswordConfirm';
import SessionWarning from './components/SessionWarning';
import { useAuth } from './context/AuthContext';
import { sessionManager } from './services/api';

function App() {
    const { isAuthenticated } = useAuth();
    const [sessionWarningOpen, setSessionWarningOpen] = useState(false);
    const [sessionTimeRemaining, setSessionTimeRemaining] = useState(120); // 2 minutes

    useEffect(() => {
        if (!isAuthenticated) return;

        // Override the session manager's warning function to show our custom dialog
        const originalShowWarning = sessionManager.showSessionWarning;
        sessionManager.showSessionWarning = () => {
            setSessionWarningOpen(true);
        };

        // Override the session manager's expired function
        const originalHandleExpired = sessionManager.handleSessionExpired;
        sessionManager.handleSessionExpired = () => {
            setSessionWarningOpen(false);
            originalHandleExpired();
        };

        return () => {
            // Restore original functions
            sessionManager.showSessionWarning = originalShowWarning;
            sessionManager.handleSessionExpired = originalHandleExpired;
        };
    }, [isAuthenticated]);

    const handleExtendSession = async () => {
        try {
            await sessionManager.refreshToken();
            setSessionWarningOpen(false);
        } catch (error) {
            console.error('Failed to extend session:', error);
            // If refresh fails, the session manager will handle logout
        }
    };

    const handleLogoutNow = () => {
        setSessionWarningOpen(false);
        sessionManager.handleSessionExpired();
    };

    return (
        <BannerProvider>
            <AmazonBanner />
            <Navbar />
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
            <Toaster position="top-center" />
            <SessionWarning
                open={sessionWarningOpen}
                onExtend={handleExtendSession}
                onLogout={handleLogoutNow}
                timeRemaining={sessionTimeRemaining}
            />
            <Routes>
                <Route path="/" element={<Navigate to="/supplements" replace />} />
                <Route path="/supplements" element={<SearchableSupplementList />} />
                <Route path="/supplements/:id" element={<SupplementDetailPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/logout" element={<Logout />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password-confirm/:uidb64/:token" element={<ResetPasswordConfirm />} />
                <Route path="/upload-supplements" element={<PrivateRoute adminOnly={true}><UploadCSV type="supplements" /></PrivateRoute>} />
                <Route path="/upload-conditions" element={<PrivateRoute adminOnly={true}><UploadCSV type="conditions" /></PrivateRoute>} />
                <Route path="/upload-brands" element={<PrivateRoute adminOnly={true}><UploadBrands /></PrivateRoute>} />
                <Route path="/admin-dashboard" element={<PrivateRoute adminOnly={true}><AdminDashboard /></PrivateRoute>} />
                <Route path="/verify-email/:token" element={<EmailVerification />} />
                <Route path="/accounts" element={<PrivateRoute><AccountsPage /></PrivateRoute>} />
                <Route path="/profile/:username" element={<UserProfilePage />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BannerProvider>
    );
}

export default App;
