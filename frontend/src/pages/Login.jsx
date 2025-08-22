// frontend/src/pages/Login.jsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, loginWithGoogle, fetchGoogleClientId } from '../services/api';
import { toast } from 'react-toastify';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Box,
  Grid
} from '@mui/material';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await loginUser({ username, password });
      if (response.access) {
        login(response.access);
        toast.success('Logged in successfully!');
        navigate("/supplements");
      }
    } catch (error) {
      toast.error(error.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initGoogle = async () => {
      if (!(window.google && googleButtonRef.current)) return;
      try {
        // Prefer server-provided client ID; fall back to env if present
        const serverClientId = await fetchGoogleClientId();
        const clientId = serverClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
          console.warn('Google Client ID not configured.');
          return;
        }
        // Avoid duplicate initialization during React StrictMode or HMR
        if (window._gsiInited === clientId) {
          return;
        }
        if (typeof window.google?.accounts?.id?.cancel === 'function') {
          try { window.google.accounts.id.cancel(); } catch (e) {}
        }
        if (typeof window.google?.accounts?.id?.disableAutoSelect === 'function') {
          try { window.google.accounts.id.disableAutoSelect(); } catch (e) {}
        }
        if (typeof window.google?.accounts?.id?.setLogLevel === 'function') {
          try { window.google.accounts.id.setLogLevel('error'); } catch (e) {}
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: async (response) => {
            try {
              const data = await loginWithGoogle(response.credential);
              if (data.access) {
                login(data.access);
                toast.success('Logged in with Google!');
                navigate('/supplements');
              }
            } catch (err) {
              toast.error(err.message || 'Google login failed');
            }
          },
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
        });
        window._gsiInited = clientId;
      } catch (e) {
        // Ignore init errors
      }
    };
    initGoogle();
  }, [login, navigate]);


  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Login
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <Grid container justifyContent="flex-end">
                <Grid item>
                    <Link to="/forgot-password" variant="body2">
                        Forgot password?
                    </Link>
                </Grid>
            </Grid>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <Box sx={{ mt: 1, mb: 1 }}>
              <div ref={googleButtonRef} style={{ display: 'flex', justifyContent: 'center' }} />
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;
