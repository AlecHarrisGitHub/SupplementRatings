import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupplements } from '../services/api';
import { Container, Typography, List, ListItem, ListItemText } from '@mui/material';

function SupplementList() {
  const [supplements, setSupplements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSupplements = async () => {
      try {
        const response = await getSupplements();
        setSupplements(response.data);
      } catch (err) {
        setError('Failed to fetch supplements.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplements();
  }, []);

  if (loading) return <div>Loading supplements...</div>;
  if (error) return <div>{error}</div>;

  return (
    <Container style={styles.container}>
      <Typography variant="h4" gutterBottom>
        Supplements
      </Typography>
      <List>
        {supplements.map((supplement) => (
          <ListItem key={supplement.id} button component={Link} to={`/supplements/${supplement.id}`}>
            <ListItemText primary={supplement.name} />
          </ListItem>
        ))}
      </List>
    </Container>
  );
}

const styles = {
  container: {
    padding: '20px',
  },
};

export default SupplementList;