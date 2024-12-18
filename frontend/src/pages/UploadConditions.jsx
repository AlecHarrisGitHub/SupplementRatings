import React from 'react';
import UploadCSV from '../components/UploadCSV';
import { Container, Typography } from '@mui/material';

function UploadConditions() {
  return (
    <Container>
      <Typography variant="h4" sx={{ my: 4 }}>Upload Conditions</Typography>
      <UploadCSV type="condition" />
    </Container>
  );
}

export default UploadConditions;
