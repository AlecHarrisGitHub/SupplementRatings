// frontend/src/pages/Signup.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, TextField, Button, Typography, Paper } from '@mui/material';
import { registerUser } from '../services/api';
import { toast } from 'react-toastify';

function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerUser({ username, email, password });
      toast.success('Registration successful! Please check your email to verify your account.');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = error.message || 'Registration failed'; // Use message from interceptor as a good default

      // Check for specific username conflict within error.data for a more tailored message
      if (error.data?.username && Array.isArray(error.data.username) && error.data.username.length > 0) {
        const usernameError = error.data.username[0];
        if (usernameError.toLowerCase().includes('already exists')) {
          errorMessage = 'Username already exists. Please choose a different one.';
        } else {
          errorMessage = usernameError; 
        }
      } else if (error.data?.email && Array.isArray(error.data.email) && error.data.email.length > 0) {
        const emailError = error.data.email[0];
        if (emailError.toLowerCase().includes('already exists') || emailError.toLowerCase().includes('email already exists')) {
          errorMessage = 'This email is already registered. Please use a different email or try logging in.';
        } else {
          errorMessage = emailError;
        }
      }
      // No need for error.response?.data?.error as error.data is the source now and error.message covers general cases.

      toast.error(errorMessage);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Sign Up
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
              label="Email"
              type="email"
              variant="outlined"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              Sign Up
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}

export default Signup;
