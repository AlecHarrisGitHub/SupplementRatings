import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Logout from './pages/Logout';
import Signup from './pages/Signup';
import SearchableSupplementList from './components/SearchableSupplementList';
import SupplementDetailPage from './pages/SupplementDetailPage';
import UploadCSV from './components/UploadCSV';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import NotFound from './pages/NotFound';
import EmailVerification from './pages/EmailVerification';
import { Toaster } from 'react-hot-toast';
import UploadBrands from './pages/UploadBrands';
import AdminDashboard from './pages/AdminDashboard';
import PrivateRoute from './components/PrivateRoute';
import AccountsPage from './pages/AccountsPage';
import UserProfilePage from './pages/UserProfilePage';

function App() {
    return (
        <div>
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
            <Routes>
                <Route path="/" element={<Navigate to="/supplements" replace />} />
                <Route path="/supplements" element={<SearchableSupplementList />} />
                <Route path="/supplements/:id" element={<SupplementDetailPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/logout" element={<Logout />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/upload-supplements" element={<PrivateRoute adminOnly={true}><UploadCSV type="supplements" /></PrivateRoute>} />
                <Route path="/upload-conditions" element={<PrivateRoute adminOnly={true}><UploadCSV type="conditions" /></PrivateRoute>} />
                <Route path="/upload-brands" element={<PrivateRoute adminOnly={true}><UploadBrands /></PrivateRoute>} />
                <Route path="/admin-dashboard" element={<PrivateRoute adminOnly={true}><AdminDashboard /></PrivateRoute>} />
                <Route path="/verify-email/:token" element={<EmailVerification />} />
                <Route path="/accounts" element={<PrivateRoute><AccountsPage /></PrivateRoute>} />
                <Route path="/profile/:username" element={<UserProfilePage />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </div>
    );
}

export default App;
