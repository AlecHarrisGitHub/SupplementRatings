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
    Avatar
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import { addComment, updateComment, upvoteRating, upvoteComment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import ImageUpload from './ImageUpload';
import ImageModal from './ImageModal';

const defaultProfileImage = 'http://localhost:8000/media/profile_pics/default.jpg';

// Function to format the date (can be shared if moved to a utils file)
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}/${day}/${year}`;
};

function CommentBox({ comment, onCommentClick, isNested = false, onEdit, currentUser, onUpvote }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment.content);

    const handleEdit = async () => {
        try {
            await onEdit(comment.id, editedContent);
            // Optimistically update, or rely on parent to refresh
            comment.content = editedContent;
            comment.is_edited = true;
            setIsEditing(false);
        } catch (error) {
            toast.error('Failed to update comment');
        }
    };

    const handleUpvoteClick = (e) => {
        e.stopPropagation();
        onUpvote(comment);
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
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                <Avatar 
                    src={comment.user.profile_image_url || defaultProfileImage} 
                    alt={comment.user.username}
                    sx={{ width: isNested ? 32 : 40, height: isNested ? 32 : 40, mt: 0.5 }}
                />
                <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                            {comment.user.username}
                            {comment.is_edited && (
                                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                    (edited)
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
                            <Typography variant="caption" sx={{ ml: 0.5 }}>{comment.upvotes}</Typography>
                        </IconButton>
                    </Box>
                    {!isEditing ? (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>{comment.content}</Typography>
                    ) : (
                        <TextField
                            fullWidth
                            multiline
                            variant="outlined"
                            size="small"
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            sx={{ mt: 1 }}
                        />
                    )}
                    {comment.image_url && !isEditing && (
                        <Box sx={{ mt: 1 }}>
                            <img 
                                src={comment.image_url} 
                                alt="Comment attachment" 
                                style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '4px', cursor: 'pointer' }}
                            />
                        </Box>
                    )}
                    <Box sx={{ mt: 1, display: 'flex', gap: 1}}>
                        {isEditing ? (
                            <>
                                <Button size="small" onClick={handleEdit} variant="contained">Save</Button>
                                <Button size="small" onClick={() => setIsEditing(false)}>Cancel</Button>
                            </>
                        ) : (
                            <>
                                {currentUser && (currentUser.id === comment.user.id || currentUser.username === comment.user.username) && (
                                    <Button size="small" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} sx={{mr:1}}>Edit</Button>
                                )}
                            </>
                        )}
                    </Box>
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            {formatDate(comment.created_at)}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </ListItem>
    );
}

function ReviewDetail({ rating, onBack, onCommentAdded, onEditRating }) {
    const [newComment, setNewComment] = useState('');
    const { isAuthenticated, user: currentUser } = useAuth();
    const [selectedComment, setSelectedComment] = useState(null);
    const [localRating, setLocalRating] = useState(rating);
    const [newImage, setNewImage] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedImageForModal, setSelectedImageForModal] = useState(null);

    const handleUpvoteRating = async () => {
        if (!isAuthenticated) {
            toast.error('Please log in to upvote');
            return;
        }
        if (localRating.user.id === currentUser.id) {
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

    const handleUpvoteComment = async (commentToUpvote) => {
        if (!isAuthenticated) {
            toast.error('Please log in to upvote');
            return;
        }
        if (commentToUpvote.user.id === currentUser.id) {
            toast.error('You cannot upvote your own comment');
            return;
        }

        try {
            const response = await upvoteComment(commentToUpvote.id);
            // Update the comment's upvote count in the local state
            const updateComments = (comments) => {
                return comments.map(c => {
                    if (c.id === commentToUpvote.id) {
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
                if (selectedComment.id === commentToUpvote.id) {
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

    const handleCommentClick = (commentData) => {
        // Always get the latest version of the comment from the rating's comments
        const updatedComment = rating.comments.find(c => c.id === commentData.id);
        if (updatedComment) {
            setSelectedComment({
                ...updatedComment,
                upvotes: commentData.upvotes,
                has_upvoted: commentData.has_upvoted,
                replies: (updatedComment.replies || []).map(reply => ({
                    ...reply,
                    upvotes: reply.upvotes || 0,
                    has_upvoted: reply.has_upvoted || false
                }))
            });
        } else {
            // If we can't find the comment in rating.comments (shouldn't happen), use the original
            setSelectedComment({
                ...commentData,
                upvotes: commentData.upvotes || 0,
                has_upvoted: commentData.has_upvoted || false,
                replies: (commentData.replies || []).map(reply => ({
                    ...reply,
                    upvotes: reply.upvotes || 0,
                    has_upvoted: reply.has_upvoted || false
                }))
            });
        }
    };

    const handleImageClickInModal = (e, imageUrl) => {
        e.stopPropagation();
        setSelectedImageForModal(imageUrl);
        setModalOpen(true);
    };
    
    const currentItem = selectedComment || localRating;
    const isShowingCommentDetail = !!selectedComment;

    // Ensure localRating and its user object are available
    if (!localRating || !localRating.user) {
        return <Typography>Loading review details...</Typography>; // Or some other placeholder
    }

    return (
        <Box>
            <Button 
                onClick={isShowingCommentDetail ? () => setSelectedComment(null) : onBack} 
                sx={{ mb: 2 }}
            >
                {isShowingCommentDetail ? 'Back to Review' : 'Back to Reviews'}
            </Button>

            <Paper elevation={3} sx={{ p: {xs: 2, md: 3}, mb: 3 }}>
                {!isShowingCommentDetail ? (
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                            <Avatar 
                                src={localRating.user.profile_image_url || defaultProfileImage} 
                                alt={localRating.user.username}
                                sx={{ width: 56, height: 56 }}
                            />
                            <Box sx={{ flexGrow: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="h6">
                                        {localRating.user.username}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <IconButton onClick={handleUpvoteRating} color={localRating.has_upvoted ? "primary" : "default"} disabled={!isAuthenticated || localRating.user.id === currentUser?.id}>
                                            <ThumbUpIcon />
                                            {localRating.upvotes}
                                        </IconButton>
                                        {currentUser && currentUser.id === localRating.user.id && (
                                            <Button size="small" onClick={() => onEditRating && onEditRating(localRating)}>Edit</Button>
                                        )}
                                        <MuiRating value={localRating.score} readOnly />
                                    </Box>
                                </Box>
                                {localRating.is_edited && (
                                    <Typography variant="caption" color="text.secondary" gutterBottom>
                                        (edited)
                                    </Typography>
                                )}
                                <Typography variant="body2" color="text.secondary">
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
                            </Box>
                        </Box>
                        {localRating.comment && (
                            <Typography variant="body1" paragraph sx={{whiteSpace: 'pre-wrap'}}>{localRating.comment}</Typography>
                        )}
                        {localRating.image_url && (
                            <Box sx={{ mt: 2, cursor: 'pointer' }} onClick={(e) => handleImageClickInModal(e, localRating.image_url)}>
                                <img src={localRating.image_url} alt="Rating attachment" style={{ maxWidth: '300px', maxHeight: '300px', borderRadius: '4px' }}/>
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ mb: 3 }}> 
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                            <Avatar src={selectedComment.user.profile_image_url || defaultProfileImage} alt={selectedComment.user.username} sx={{ width: 40, height: 40, mt: 0.5 }}/>
                            <Box sx={{ flexGrow: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        {selectedComment.user.username}
                                        {selectedComment.is_edited && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>(edited)</Typography>}
                                    </Typography>
                                    <IconButton onClick={() => handleUpvoteComment(selectedComment)} color={selectedComment.has_upvoted ? "primary" : "default"} disabled={!isAuthenticated || selectedComment.user.id === currentUser?.id}>
                                        <ThumbUpIcon fontSize="small"/>
                                        {selectedComment.upvotes}
                                    </IconButton>
                                </Box>
                                <Typography variant="body1" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{selectedComment.content}</Typography>
                                {selectedComment.image_url && (
                                    <Box sx={{ mt: 1, cursor: 'pointer' }} onClick={(e) => handleImageClickInModal(e, selectedComment.image_url)}>
                                        <img src={selectedComment.image_url} alt="Comment attachment" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '4px' }}/>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>
                )}

                {isAuthenticated && (
                    <form onSubmit={handleSubmitComment} style={{ marginTop: isShowingCommentDetail ? '16px' : '0px' }}>
                        <Typography variant="subtitle1" sx={{ mb: 1}}>
                            {isShowingCommentDetail ? 'Reply to comment' : 'Leave a comment'}
                        </Typography>
                        <TextField fullWidth multiline rows={3} variant="outlined" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write your comment..." sx={{ mb: 1 }}/>
                        <ImageUpload onFileSelect={setNewImage} selectedFile={newImage} />
                        <Button type="submit" variant="contained" sx={{ mt: 1 }} disabled={!newComment.trim() && !newImage}>
                            {isShowingCommentDetail ? 'Post Reply' : 'Post Comment'}
                        </Button>
                    </form>
                )}

                <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                    {isShowingCommentDetail ? 'Replies' : 'Comments'}
                </Typography>
                <List>
                    {(currentItem.comments || currentItem.replies || []).map((commentItem) => (
                        <CommentBox 
                            key={commentItem.id} 
                            comment={commentItem}
                            onCommentClick={handleCommentClick}
                            isNested={isShowingCommentDetail}
                            onEdit={updateComment}
                            currentUser={currentUser}
                            onUpvote={() => handleUpvoteComment(commentItem)}
                        />
                    ))}
                    {((currentItem.comments || currentItem.replies || []).length === 0) && (
                        <Typography>No {isShowingCommentDetail ? 'replies' : 'comments'} yet.</Typography>
                    )}
                </List>
            </Paper>

            {selectedImageForModal && (
                <ImageModal imageUrl={selectedImageForModal} onClose={() => setModalOpen(false)} open={modalOpen} />
            )}
        </Box>
    );
}

export default ReviewDetail; 