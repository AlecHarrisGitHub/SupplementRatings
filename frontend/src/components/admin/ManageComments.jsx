import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    CircularProgress,
    Alert,
    Paper,
    Pagination,
    TextField,
    InputAdornment
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { toast } from 'react-toastify';
// Import the new function for fetching all comments and the existing delete function
import { searchAllComments, deleteCommentByAdmin } from '../../services/api'; 
import DeleteConfirmationModal from './DeleteConfirmationModal';

const ManageComments = () => {
    const [comments, setComments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedComment, setSelectedComment] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [page, setPage] = useState(1);
    const [count, setCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const itemsPerPage = 10;

    // Backend's /api/comments/ endpoint needs to support general listing + search.
    const fetchComments = useCallback(async (currentPage, currentSearchTerm) => {
        setIsLoading(true);
        setError(null);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const params = { limit: itemsPerPage, offset };
            if (currentSearchTerm) {
                params.search = currentSearchTerm; // Search by content, user, etc.
            }
            // Use the new searchAllComments function
            const data = await searchAllComments(params); 
            
            if (data && (Array.isArray(data) || data.results)) {
                setComments(data.results || data);
                setCount(data.count || (data.results || data).length);
            } else {
                setComments([]);
                setCount(0);
            }
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch comments.';
            setError(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [itemsPerPage]);

    useEffect(() => {
        fetchComments(page, searchTerm);
    }, [page, searchTerm, fetchComments]);

    const handleDeleteClick = (comment) => {
        setSelectedComment(comment);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedComment(null);
    };

    const confirmDeleteComment = async () => {
        if (!selectedComment) return;
        setIsDeleting(true);
        try {
            await deleteCommentByAdmin(selectedComment.id);
            toast.success(`Comment ID ${selectedComment.id} deleted successfully.`);
            fetchComments(page, searchTerm); // Refresh list
            handleModalClose();
        } catch (err) {
            toast.error(err.error || 'Failed to delete comment.');
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        setPage(1);
    };

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom component="div">
                Manage Comments
            </Typography>
            <TextField
                label="Search Comments (e.g., by user, content)"
                variant="outlined"
                fullWidth
                margin="normal"
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
            />
            {isLoading && <CircularProgress size={20} sx={{mb:1}}/>}
            {error && !isLoading && <Alert severity="warning" sx={{ mb: 2 }}>Could not load comments: {error}</Alert>}
            <List sx={{maxHeight: 400, overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px'}}>
                {comments.map((comment) => (
                    <ListItem key={comment.id} divider>
                        <ListItemText 
                            primary={`Comment by: ${comment.user?.username || comment.user} (ID: ${comment.id})`}
                            secondary={`${comment.content?.substring(0, 100)}...`}
                        />
                        <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(comment)}>
                                <DeleteIcon />
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
            {comments.length === 0 && !isLoading && (
                 <Typography sx={{textAlign: 'center', mt: 2}}>No comments found for the current search/filter.</Typography>
            )}
             {count > itemsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Pagination 
                        count={Math.ceil(count / itemsPerPage)} 
                        page={page} 
                        onChange={handlePageChange} 
                        color="primary" 
                    />
                </Box>
            )}
            {selectedComment && (
                <DeleteConfirmationModal
                    open={isModalOpen}
                    onClose={handleModalClose}
                    onConfirm={confirmDeleteComment}
                    title="Delete Comment"
                    message={`Are you sure you want to delete this comment (ID: ${selectedComment.id}) by ${selectedComment.user?.username || selectedComment.user}?`}
                    isDeleting={isDeleting}
                />
            )}
        </Paper>
    );
};

export default ManageComments; 