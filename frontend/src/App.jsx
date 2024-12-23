import React from 'react';
import { Routes, Route } from 'react-router-dom';
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

function App() {
    return (
        <div>
            <Navbar />
            <ToastContainer />
            <Routes>
                <Route path="/" element={<SearchableSupplementList />} />
                <Route path="/supplements" element={<SearchableSupplementList />} />
                <Route path="/login" element={<Login />} />
                <Route path="/logout" element={<Logout />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/upload-supplements" element={<UploadCSV type="supplements" />} />
                <Route path="/upload-conditions" element={<UploadCSV type="conditions" />} />
                <Route path="*" element={<NotFound />} />
                <Route path="/verify-email/:token" element={<EmailVerification />} />
            </Routes>
        </div>
    );
}

export default App;
