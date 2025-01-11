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
import { addComment, updateComment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

function CommentBox({ comment, onCommentClick, isNested = false, onEdit, currentUser }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment.content);

    const handleEdit = async () => {
        try {
            const updatedComment = await onEdit(comment.id, editedContent);
            // Immediately update the comment content
            comment.content = editedContent;
            comment.is_edited = true;
            setIsEditing(false);
        } catch (error) {
            toast.error('Failed to update comment');
        }
    };

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
                ml: isNested ? 3 : 0,
                cursor: 'pointer',
                '&:hover': {
                    bgcolor: 'action.hover'
                }
            }}
        >
            <Typography variant="subtitle2" fontWeight="bold">
                {comment.user.username}
                {comment.is_edited && (
                    <Typography component="span" variant="caption" color="text.secondary">
                        {" (edited)"}
                    </Typography>
                )}
            </Typography>
            
            {isEditing ? (
                <Box onClick={(e) => e.stopPropagation()} sx={{ width: '100%', mt: 1 }}>
                    <TextField
                        fullWidth
                        multiline
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        sx={{ mb: 1 }}
                    />
                    <Button onClick={handleEdit} variant="contained" size="small" sx={{ mr: 1 }}>
                        Save
                    </Button>
                    <Button onClick={() => setIsEditing(false)} size="small">
                        Cancel
                    </Button>
                </Box>
            ) : (
                <>
                    <Typography variant="body2" color="text.secondary">
                        {comment.content}
                    </Typography>
                    {currentUser && (currentUser.id === comment.user.id || currentUser.username === comment.user.username) && (
                        <Button 
                            size="small" 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditing(true);
                            }}
                            sx={{ mt: 1 }}
                        >
                            Edit
                        </Button>
                    )}
                </>
            )}
        </ListItem>
    );
}

function ReviewDetail({ rating, onBack, onCommentAdded, onEditRating }) {
    const [newComment, setNewComment] = useState('');
    const { isAuthenticated, user } = useAuth();
    const [selectedComment, setSelectedComment] = useState(null);

    console.log('Rating in ReviewDetail:', rating); // Debug log

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) {
            toast.error('Please enter a comment');
            return;
        }

        try {
            const response = await addComment({
                rating: selectedComment ? null : rating.id,
                parent_comment: selectedComment ? selectedComment.id : null,
                content: newComment.trim()
            });
            
            setNewComment('');
            
            if (selectedComment) {
                // If replying to a comment, update both the selected comment and the rating's comments
                const updatedReplies = [...(selectedComment.replies || []), response];
                const updatedComment = { ...selectedComment, replies: updatedReplies };
                setSelectedComment(updatedComment);
                
                // Update the comment in rating.comments array
                rating.comments = rating.comments.map(c => 
                    c.id === selectedComment.id ? updatedComment : c
                );
            } else {
                // If commenting on the rating, update the comments
                rating.comments = [...(rating.comments || []), response];
            }
            
            onCommentAdded();
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Failed to add comment');
        }
    };

    const handleCommentClick = (comment) => {
        // Always get the latest version of the comment from the rating's comments
        const updatedComment = rating.comments.find(c => c.id === comment.id);
        if (updatedComment) {
            setSelectedComment(updatedComment);
        } else {
            // If we can't find the comment in rating.comments (shouldn't happen), use the original
            setSelectedComment(comment);
        }
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
                                {rating.is_edited && (
                                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                        (edited)
                                    </Typography>
                                )}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {user && user.id === rating.user.id && (
                                    <Button 
                                        size="small"
                                        onClick={() => onEditRating && onEditRating(rating)}
                                    >
                                        Edit
                                    </Button>
                                )}
                                <MuiRating value={rating.score} readOnly />
                            </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Conditions: {rating.condition_names.join(', ')}
                        </Typography>
                        {rating.dosage && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Dosage: {rating.dosage.replace(/\s+/g, '')}
                            </Typography>
                        )}
                        {rating.brands && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Brands Used: {rating.brands}
                            </Typography>
                        )}
                        {rating.comment && (
                            <Typography variant="body1" sx={{ mt: 2 }}>
                                {rating.comment}
                            </Typography>
                        )}
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
                            onEdit={async (commentId, content) => {
                                try {
                                    console.log('Editing comment. Current user:', user); // Debug log
                                    const updatedComment = await updateComment(commentId, content);
                                    if (isShowingComment) {
                                        // If editing a reply
                                        const updatedReplies = currentItem.replies.map(c => 
                                            c.id === commentId ? {...updatedComment, is_edited: true} : c
                                        );
                                        setSelectedComment(prev => ({
                                            ...prev,
                                            replies: updatedReplies
                                        }));
                                    } else {
                                        // If editing a main comment
                                        const updatedComments = rating.comments.map(c => 
                                            c.id === commentId ? {...updatedComment, is_edited: true} : c
                                        );
                                        rating.comments = updatedComments;
                                        // Force a re-render by creating a new array
                                        setSelectedComment(null); // Reset selected comment to trigger re-render
                                    }
                                    // Still call the parent's refresh function but don't wait for it
                                    onCommentAdded();
                                } catch (error) {
                                    console.error('Error updating comment:', error);
                                    toast.error('Failed to update comment');
                                }
                            }}
                            currentUser={user}
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