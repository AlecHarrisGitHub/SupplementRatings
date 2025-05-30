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
    IconButton,
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import { addComment, updateComment, upvoteRating, upvoteComment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import ImageUpload from './ImageUpload';
import ImageModal from './ImageModal';

function CommentBox({ comment, onCommentClick, isNested = false, onEdit, currentUser, onUpvote }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment.content);

    const handleEdit = async () => {
        try {
            const updatedComment = await onEdit(comment.id, editedContent);
            comment.content = editedContent;
            comment.is_edited = true;
            setIsEditing(false);
        } catch (error) {
            toast.error('Failed to update comment');
        }
    };

    const handleUpvoteClick = (e) => {
        e.stopPropagation(); // Prevent comment click event
        onUpvote(comment);
    };

    const handleImageClick = (e, imageUrl) => {
        e.stopPropagation();
        // Implement the logic to open the image modal with the image URL
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
            <Box sx={{ 
                width: '100%',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start'
            }}>
                <Typography variant="subtitle2" fontWeight="bold">
                    {comment.user.username}
                    {comment.is_edited && (
                        <Typography component="span" variant="caption" color="text.secondary">
                            {" (edited)"}
                        </Typography>
                    )}
                </Typography>
                <IconButton 
                    onClick={handleUpvoteClick}
                    color={comment.has_upvoted ? "primary" : "default"}
                    size="small"
                    disabled={!currentUser || comment.user.id === currentUser.id}
                >
                    <ThumbUpIcon fontSize="small" />
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                        {comment.upvotes}
                    </Typography>
                </IconButton>
            </Box>
            
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
                    <Typography variant="body1" sx={{ mt: 1, mb: comment.image_url ? 2 : 0 }}>
                        {comment.content}
                    </Typography>
                    
                    {comment.image_url && (
                        <Box sx={{ mt: 1, mb: 2 }}>
                            <img 
                                src={comment.image_url}
                                alt="Comment attachment"
                                style={{ 
                                    maxWidth: '200px',
                                    maxHeight: '200px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleImageClick(e, comment.image_url);
                                }}
                            />
                        </Box>
                    )}
                    
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
    const [localRating, setLocalRating] = useState(rating);
    const [newImage, setNewImage] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    const handleUpvoteRating = async () => {
        if (!isAuthenticated) {
            toast.error('Please log in to upvote');
            return;
        }
        if (localRating.user.id === user.id) {
            toast.error('You cannot upvote your own rating');
            return;
        }

        try {
            const response = await upvoteRating(localRating.id);
            setLocalRating(prev => ({
                ...prev,
                upvotes: response.upvotes_count,
                has_upvoted: !prev.has_upvoted
            }));
        } catch (error) {
            toast.error('Failed to upvote rating');
        }
    };

    const handleUpvoteComment = async (comment) => {
        if (!isAuthenticated) {
            toast.error('Please log in to upvote');
            return;
        }
        if (comment.user.id === user.id) {
            toast.error('You cannot upvote your own comment');
            return;
        }

        try {
            const response = await upvoteComment(comment.id);
            // Update the comment's upvote count in the local state
            const updateComments = (comments) => {
                return comments.map(c => {
                    if (c.id === comment.id) {
                        return {
                            ...c,
                            upvotes: response.upvotes,
                            has_upvoted: !c.has_upvoted
                        };
                    }
                    if (c.replies) {
                        return {
                            ...c,
                            replies: updateComments(c.replies)
                        };
                    }
                    return c;
                });
            };

            // Update both the local rating and the parent rating
            const updatedComments = updateComments(localRating.comments);
            
            // Update local rating state
            setLocalRating(prev => ({
                ...prev,
                comments: updatedComments
            }));

            // Update selected comment if we're viewing replies
            if (selectedComment) {
                if (selectedComment.id === comment.id) {
                    // If the upvoted comment is the selected comment
                    setSelectedComment(prev => ({
                        ...prev,
                        upvotes: response.upvotes,
                        has_upvoted: !prev.has_upvoted
                    }));
                } else {
                    // If the upvoted comment is in the replies
                    setSelectedComment(prev => ({
                        ...prev,
                        replies: updateComments(prev.replies || [])
                    }));
                }
            }

            // Update the parent rating's comments
            rating.comments = updatedComments;

        } catch (error) {
            toast.error('Failed to upvote comment');
        }
    };

    console.log('Rating in ReviewDetail:', rating); // Debug log

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            
            // Only append rating ID if we're commenting on a rating
            if (!selectedComment) {
                formData.append('rating', rating.id);
            }
            
            // Only append parent_comment if we're replying to a comment
            if (selectedComment) {
                formData.append('parent_comment', selectedComment.id);
            }
            
            formData.append('content', newComment.trim());
            
            // Only append image if one is selected
            if (newImage) {
                formData.append('image', newImage);
            }

            const response = await addComment(formData);
            
            // Reset form
            setNewComment('');
            setNewImage(null);
            
            // Update the UI
            if (selectedComment) {
                const updatedReplies = [...selectedComment.replies, response];
                setSelectedComment(prev => ({
                    ...prev,
                    replies: updatedReplies
                }));
            } else {
                rating.comments = [...rating.comments, response];
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
            setSelectedComment({
                ...updatedComment,
                upvotes: comment.upvotes,
                has_upvoted: comment.has_upvoted,
                replies: (updatedComment.replies || []).map(reply => ({
                    ...reply,
                    upvotes: reply.upvotes || 0,
                    has_upvoted: reply.has_upvoted || false
                }))
            });
        } else {
            // If we can't find the comment in rating.comments (shouldn't happen), use the original
            setSelectedComment({
                ...comment,
                upvotes: comment.upvotes || 0,
                has_upvoted: comment.has_upvoted || false,
                replies: (comment.replies || []).map(reply => ({
                    ...reply,
                    upvotes: reply.upvotes || 0,
                    has_upvoted: reply.has_upvoted || false
                }))
            });
        }
    };

    const handleImageClick = (e, imageUrl) => {
        e.stopPropagation();
        setSelectedImage(imageUrl);
        setModalOpen(true);
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
                                {localRating.user.username}
                                {localRating.is_edited && (
                                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                        (edited)
                                    </Typography>
                                )}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <IconButton 
                                    onClick={handleUpvoteRating}
                                    color={localRating.has_upvoted ? "primary" : "default"}
                                    disabled={!isAuthenticated || localRating.user.id === user?.id}
                                >
                                    <ThumbUpIcon />
                                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                                        {localRating.upvotes}
                                    </Typography>
                                </IconButton>
                                {user && user.id === localRating.user.id && (
                                    <Button 
                                        size="small"
                                        onClick={() => onEditRating && onEditRating(localRating)}
                                    >
                                        Edit
                                    </Button>
                                )}
                                <MuiRating value={localRating.score} readOnly />
                            </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Purpose: {localRating.condition_names.join(', ')}
                        </Typography>
                        {(localRating.dosage || localRating.dosage_frequency) && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Dosage: {localRating.dosage?.replace(/\s+/g, '')}
                                {localRating.dosage_frequency && localRating.frequency_unit && 
                                    ` ${localRating.dosage_frequency}x / ${localRating.frequency_unit}`}
                            </Typography>
                        )}
                        {localRating.brands && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Brands Used: {localRating.brands}
                            </Typography>
                        )}
                        {localRating.comment && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body1">
                                    {localRating.comment}
                                </Typography>
                                {localRating.image_url && (
                                    <Box sx={{ mt: 2 }}>
                                        <img 
                                            src={localRating.image_url}
                                            alt="Rating attachment"
                                            style={{ 
                                                maxWidth: '300px',
                                                maxHeight: '300px',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                            onClick={(e) => handleImageClick(e, localRating.image_url)}
                                        />
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                ) : (
                    // Show Selected Comment
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                                {selectedComment.user.username}
                                {selectedComment.is_edited && (
                                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                        (edited)
                                    </Typography>
                                )}
                            </Typography>
                            <IconButton 
                                onClick={() => handleUpvoteComment(selectedComment)}
                                color={selectedComment.has_upvoted ? "primary" : "default"}
                                disabled={!isAuthenticated || selectedComment.user.id === user?.id}
                            >
                                <ThumbUpIcon />
                                <Typography variant="caption" sx={{ ml: 0.5 }}>
                                    {selectedComment.upvotes}
                                </Typography>
                            </IconButton>
                        </Box>
                        <Typography variant="body1">
                            {selectedComment.content}
                        </Typography>
                        {selectedComment.image_url && (
                            <Box sx={{ mt: 2 }}>
                                <img 
                                    src={selectedComment.image_url}
                                    alt="Comment attachment"
                                    style={{ 
                                        maxWidth: '300px',
                                        maxHeight: '300px',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                    onClick={(e) => handleImageClick(e, selectedComment.image_url)}
                                />
                            </Box>
                        )}
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
                            onUpvote={handleUpvoteComment}
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
                        <ImageUpload 
                            onImageSelect={(file) => setNewImage(file)}
                            currentImage={null}
                        />
                        <Button 
                            type="submit" 
                            variant="contained"
                            disabled={!newComment.trim()}
                            sx={{ mt: 2 }}
                        >
                            Add Reply
                        </Button>
                    </Box>
                )}
            </Paper>

            <ImageModal 
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                imageUrl={selectedImage}
            />
        </Box>
    );
}

export default ReviewDetail; 