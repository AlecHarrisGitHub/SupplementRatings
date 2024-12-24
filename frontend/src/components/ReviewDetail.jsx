import React, { useState } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    TextField, 
    Rating as MuiRating, 
    Paper,
    List,
    ListItem,
} from '@mui/material';
import { addComment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

function CommentBox({ comment, onCommentClick, isNested = false }) {
    return (
        <ListItem 
            onClick={() => onCommentClick(comment)}
            sx={{ 
                mb: 2,
                flexDirection: 'column',
                alignItems: 'flex-start',
                bgcolor: 'background.paper',
                borderRadius: 1,
                boxShadow: 1,
                p: 2,
                cursor: 'pointer',
                '&:hover': {
                    bgcolor: 'action.hover'
                },
                ml: isNested ? 3 : 0
            }}
        >
            <Typography variant="subtitle2" fontWeight="bold">
                {comment.user.username}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                {comment.content}
            </Typography>
            {comment.replies?.length > 0 && (
                <Typography variant="caption" sx={{ mt: 1, color: 'primary.main' }}>
                    {comment.replies.length} reply(s)
                </Typography>
            )}
        </ListItem>
    );
}

function ReviewDetail({ rating, onBack, onCommentAdded }) {
    const [newComment, setNewComment] = useState('');
    const { isAuthenticated } = useAuth();
    const [selectedComment, setSelectedComment] = useState(null);

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) {
            toast.error('Please enter a comment');
            return;
        }

        try {
            await addComment({
                rating: selectedComment ? null : rating.id,
                parent_comment: selectedComment ? selectedComment.id : null,
                content: newComment.trim()
            });
            
            setNewComment('');
            // Call the parent's refresh function
            await onCommentAdded();
            toast.success('Comment added successfully!');
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Failed to add comment');
        }
    };

    const handleCommentClick = (comment) => {
        setSelectedComment(comment);
    };

    const currentItem = selectedComment || rating;
    const isShowingComment = !!selectedComment;

    return (
        <Box>
            <Button 
                onClick={isShowingComment ? () => setSelectedComment(null) : onBack} 
                sx={{ mb: 2 }}
            >
                {isShowingComment ? 'Back to Review' : 'Back to Reviews'}
            </Button>

            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                {!isShowingComment ? (
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                                {rating.user.username}
                            </Typography>
                            <MuiRating value={rating.score} readOnly />
                        </Box>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                            Conditions: {rating.condition_names.join(', ')}
                        </Typography>
                        <Typography variant="body1">
                            {rating.comment}
                        </Typography>
                    </Box>
                ) : (
                    // Show Selected Comment
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                            {selectedComment.user.username}
                        </Typography>
                        <Typography variant="body1">
                            {selectedComment.content}
                        </Typography>
                    </Box>
                )}

                <List>
                    {(currentItem.comments || currentItem.replies || []).map((comment) => (
                        <CommentBox 
                            key={comment.id} 
                            comment={comment}
                            onCommentClick={handleCommentClick}
                            isNested={isShowingComment}
                        />
                    ))}
                </List>

                {isAuthenticated && (
                    <Box component="form" onSubmit={handleSubmitComment} sx={{ mt: 3 }}>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            variant="outlined"
                            placeholder={`Reply to ${isShowingComment ? 'comment' : 'review'}...`}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <Button 
                            type="submit" 
                            variant="contained"
                            disabled={!newComment.trim()}
                        >
                            Add Reply
                        </Button>
                    </Box>
                )}
            </Paper>
        </Box>
    );
}

export default ReviewDetail; 