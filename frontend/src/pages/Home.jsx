// frontend/src/pages/Home.jsx

import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div style={styles.container}>
      <h1>Welcome to SupplementRatings</h1>
      <p>Your trusted source for supplement reviews and ratings.</p>
      <Link to="/supplements" style={styles.button}>
        View Supplements
      </Link>
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    marginTop: '50px',
  },
  button: {
    display: 'inline-block',
    padding: '10px 20px',
    marginTop: '20px',
    backgroundColor: '#28a745',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '5px',
  },
};

export default Home;
