// frontend/src/components/UploadCSV.jsx

import React, { useState, useContext } from 'react';
import { uploadSupplementsCSV, uploadConditionsCSV } from '../services/api';
import { toast } from 'react-toastify';
import { 
  Button, 
  Typography, 
  Paper, 
  Box,
  LinearProgress,
  IconButton,
  Input,
  Divider
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { styled } from '@mui/material/styles';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

function UploadCSV({ type }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
    } else {
      toast.error('Please select a valid CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const uploadFunction = type === 'conditions' ? uploadConditionsCSV : uploadSupplementsCSV;
      
      console.log('Starting upload for type:', type);
      console.log('File being uploaded:', file);
      console.log('Upload function being used:', uploadFunction.name);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await uploadFunction(file);
      
      console.log('Upload response:', response);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      toast.success(`${type === 'conditions' ? 'Conditions' : 'Supplements'} uploaded successfully!`);
      setFile(null);
      setProgress(0);
    } catch (error) {
      console.error('Upload error details:', error.response?.data || error);
      const errorMessage = error.response?.data?.error || error.message;
      toast.error(`Failed to upload ${type}: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
};

  const clearFile = () => {
    setFile(null);
    setProgress(0);
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Upload {type === 'condition' ? 'Conditions' : 'Supplements'} CSV
        </Typography>
        
        <Box sx={{ my: 3 }}>
          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon />}
            sx={{ mb: 2 }}
          >
            Browse CSV File
            <VisuallyHiddenInput 
              type="file" 
              accept=".csv"
              onChange={handleFileSelect}
            />
          </Button>

          {file && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <Typography variant="body1" sx={{ flexGrow: 1 }}>
                {file.name}
              </Typography>
              <IconButton onClick={clearFile} size="small">
                <DeleteIcon />
              </IconButton>
            </Box>
          )}
        </Box>

        {uploading && (
          <Box sx={{ width: '100%', mb: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={!file || uploading}
          fullWidth
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </Paper>
    </Box>
  );
}

export default UploadCSV;
