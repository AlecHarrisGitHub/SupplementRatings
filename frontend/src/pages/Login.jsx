// frontend/src/pages/Login.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/api';
import { toast } from 'react-toastify';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Box 
} from '@mui/material';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting login with:', { username });
      const response = await loginUser({ username, password });
      console.log('Login response:', response);
      
      if (response.access) {
        const userData = {
          username: username,
          id: response.id,
          is_staff: response.is_staff
        };
        console.log('Setting user data:', userData);
        login(response.access, response.is_staff, userData);
        toast.success('Logged in successfully!');
        navigate('/supplements');
      }
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error('Login failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

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
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              sx={{ mt: 3, mb: 2 }}
            >
              Login
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;
