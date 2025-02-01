import React from 'react';
import { Modal, Box } from '@mui/material';

function ImageModal({ open, onClose, imageUrl }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        component="img"
        src={imageUrl}
        alt="Full size"
        sx={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          cursor: 'pointer',
        }}
        onClick={onClose}
      />
    </Modal>
  );
}

export default ImageModal;
