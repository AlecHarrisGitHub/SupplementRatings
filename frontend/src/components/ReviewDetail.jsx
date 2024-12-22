import React, { useState } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    TextField, 
    Rating, 
    Paper,
    List,
    ListItem,
    Divider
} from '@mui/material';
import { addComment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

function ReviewDetail({ rating, onBack, onCommentAdded }) {
    const [newComment, setNewComment] = useState('');
    const { isAuthenticated } = useAuth();

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) {
            toast.error('Please enter a comment');
            return;
        }

        try {
            await addComment({
                rating: rating.id,
                content: newComment.trim()
            });
            
            setNewComment('');
            await onCommentAdded();
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Failed to add comment');
        }
    };

    return (
        <Box>
            <Button onClick={onBack} sx={{ mb: 2 }}>
                Back to Reviews
            </Button>

            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                {/* Main Review */}
                <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                            {rating.user.username}
                        </Typography>
                        <Rating value={rating.score} readOnly />
                    </Box>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                        Condition: {rating.condition_name}
                    </Typography>
                    <Typography variant="body1">
                        {rating.comment}
                    </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Comments Section */}
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Comments
                </Typography>
                
                <List>
                    {rating.comments?.map((comment) => (
                        <ListItem 
                            key={comment.id}
                            sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'flex-start',
                                mb: 2 
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight="bold">
                                {comment.user.username}
                            </Typography>
                            <Typography variant="body2">
                                {comment.content}
                            </Typography>
                        </ListItem>
                    ))}
                </List>

                {/* Add Comment Form */}
                {isAuthenticated && (
                    <Box component="form" onSubmit={handleSubmitComment} sx={{ mt: 3 }}>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            variant="outlined"
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <Button 
                            type="submit" 
                            variant="contained"
                            disabled={!newComment.trim()}
                        >
                            Add Comment
                        </Button>
                    </Box>
                )}
            </Paper>
        </Box>
    );
}

export default ReviewDetail; 