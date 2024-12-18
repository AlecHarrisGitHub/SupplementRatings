import React from 'react';
import UploadCSV from '../components/UploadCSV';
import { Container, Typography } from '@mui/material';

function UploadSupplements() {
  return (
    <Container>
      <Typography variant="h4" sx={{ my: 4 }}>Upload Supplements</Typography>
      <UploadCSV type="supplement" />
    </Container>
  );
}

export default UploadSupplements;
