// frontend/src/pages/SupplementList.jsx

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupplements } from '../services/api';
import { 
  Container, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Box, 
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';

function SupplementList() {
  const [supplements, setSupplements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSupplements = async () => {
      try {
        setLoading(true);
        const response = await getSupplements();
        setSupplements(response || []);
      } catch (err) {
        console.error('Error fetching supplements:', err);
        setError('Failed to fetch supplements.');
        setSupplements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplements();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Supplements
      </Typography>
      <List>
        {supplements.map((supplement) => (
          <ListItem 
            key={supplement.id} 
            component={Link} 
            to={`/supplements/${supplement.id}`}
            sx={{ 
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
              textDecoration: 'none'
            }}
          >
            <ListItemText primary={supplement.name} />
          </ListItem>
        ))}
      </List>
    </Container>
  );
}

export default SupplementList;