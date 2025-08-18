// frontend/src/components/UploadCSV.jsx

import React, { useState, useContext } from 'react';
import { uploadSupplementsCSV, uploadConditionsCSV, uploadBrandsCSV, addSupplement, addBrand, addCondition } from '../services/api';
import { toast } from 'react-toastify';
import { 
  Button, 
  Typography, 
  Paper, 
  Box,
  LinearProgress,
  IconButton,
  Input,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
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
  const [manualOpen, setManualOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [dosageUnit, setDosageUnit] = useState('');

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
    } else {
      toast.error('Please select a valid CSV file');
    }
  };

  const resetManualForm = () => {
    setName('');
    setCategory('');
    setDosageUnit('');
  };

  const handleManualSubmit = async () => {
    try {
      if (type === 'brands') {
        if (!name.trim()) {
          toast.error('Please enter a brand name');
          return;
        }
        await addBrand({ name: name.trim() });
        toast.success('Brand added');
      } else if (type === 'conditions') {
        if (!name.trim()) {
          toast.error('Please enter a purpose name');
          return;
        }
        await addCondition({ name: name.trim() });
        toast.success('Purpose added');
      } else {
        if (!name.trim() || !category.trim()) {
          toast.error('Please enter supplement name and category');
          return;
        }
        await addSupplement({ name: name.trim(), category: category.trim(), dosage_unit: dosageUnit.trim() });
        toast.success('Supplement added');
      }
      setManualOpen(false);
      resetManualForm();
    } catch (error) {
      const message = error?.data?.error || error?.message || 'Failed to add item';
      toast.error(message);
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
      const uploadFunction = 
      type === 'conditions' ? uploadConditionsCSV : 
      type == 'brands' ? uploadBrandsCSV :
      uploadSupplementsCSV;
      
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
      
      toast.success(`${type === 'conditions' ? 'Conditions' : type === 'brands' ? 'Brands' : 'Supplements'} uploaded successfully!`);
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
          Upload {type === 'conditions' ? 'Purposes' : type === 'brands' ? 'Brands' : 'Supplements'} CSV
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setManualOpen(true)}
          >
            Add manually
          </Button>
        </Box>

        <Divider sx={{ my: 2 }}>or</Divider>

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

      <Dialog open={manualOpen} onClose={() => setManualOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {type === 'conditions' ? 'Add Purpose' : type === 'brands' ? 'Add Brand' : 'Add Supplement'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {type === 'brands' || type === 'conditions' ? (
              <TextField
                label={type === 'brands' ? 'Brand name' : 'Purpose name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                fullWidth
              />
            ) : (
              <>
                <TextField
                  label="Supplement name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  fullWidth
                />
                <TextField
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Dose unit (optional)"
                  value={dosageUnit}
                  onChange={(e) => setDosageUnit(e.target.value)}
                  fullWidth
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setManualOpen(false); }}>Cancel</Button>
          <Button variant="contained" onClick={handleManualSubmit}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UploadCSV;
