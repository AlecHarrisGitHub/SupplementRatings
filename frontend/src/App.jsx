import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Logout from './pages/Logout';
import Signup from './pages/Signup';
import SearchableSupplementList from './components/SearchableSupplementList';
import UploadCSV from './components/UploadCSV';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import NotFound from './pages/NotFound';
import EmailVerification from './pages/EmailVerification';
import { Toaster } from 'react-hot-toast';
import UploadBrands from './pages/UploadBrands';

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
                <Route path="/login" element={<Login />} />
                <Route path="/logout" element={<Logout />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/upload-supplements" element={<UploadCSV type="supplements" />} />
                <Route path="/upload-conditions" element={<UploadCSV type="conditions" />} />
                <Route path="/verify-email/:token" element={<EmailVerification />} />
                <Route path="/upload-brands" element={<UploadBrands />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </div>
    );
}

export default App;
