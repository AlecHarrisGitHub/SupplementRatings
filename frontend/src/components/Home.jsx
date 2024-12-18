import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Container, Typography } from '@mui/material';

function Home() {
  return (
    <Container maxWidth="sm" style={styles.container}>
      <Typography variant="h3" gutterBottom>
        Welcome to SupplementRatings
      </Typography>
      <Typography variant="h6" gutterBottom>
        Your trusted source for supplement reviews and ratings.
      </Typography>
      <Button variant="contained" color="primary" component={Link} to="/supplements">
        View Supplements
      </Button>
    </Container>
  );
}

const styles = {
  container: {
    textAlign: 'left',
    marginTop: '50px',
  },
};

export default Home;