import React, { useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CancelIcon from '@mui/icons-material/Cancel';

function ImageUpload({ onImageSelect, currentImage }) {
    const [previewUrl, setPreviewUrl] = useState(currentImage || null);

    const handleImageSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            onImageSelect(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        setPreviewUrl(null);
        onImageSelect(null);
    };

    return (
        <Box sx={{ mt: 2 }}>
            {previewUrl ? (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <img 
                        src={previewUrl} 
                        alt="Preview" 
                        style={{ maxWidth: '200px', maxHeight: '200px' }} 
                    />
                    <IconButton 
                        onClick={handleRemoveImage}
                        sx={{ 
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            bgcolor: 'background.paper'
                        }}
                    >
                        <CancelIcon />
                    </IconButton>
                </Box>
            ) : (
                <Box>
                    <input
                        accept="image/*"
                        type="file"
                        id="image-upload"
                        style={{ display: 'none' }}
                        onChange={handleImageSelect}
                    />
                    <label htmlFor="image-upload">
                        <IconButton component="span">
                            <AddPhotoAlternateIcon />
                        </IconButton>
                        <Typography variant="caption" component="span">
                            Add Image
                        </Typography>
                    </label>
                </Box>
            )}
        </Box>
    );
}

export default ImageUpload; 