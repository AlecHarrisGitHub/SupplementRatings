import React from 'react';
import UploadCSV from '../components/UploadCSV';
import { Container } from '@mui/material';

function UploadBrands() {
  return (
    <Container>
      <UploadCSV type="brands" />
    </Container>
  );
}

export default UploadBrands; 