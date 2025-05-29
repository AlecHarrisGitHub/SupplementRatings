import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
                <RouterLink to={`/profile/${comment.user.username}`} style={{ textDecoration: 'none' }}>
                    <Avatar 
                        src={comment.user.profile_image_url || defaultProfileImage} 
                        alt={comment.user.username}
                        sx={{ width: isNested ? 32 : 40, height: isNested ? 32 : 40, mt: 0.5, cursor: 'pointer' }}
                    />
                </RouterLink>
                <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <RouterLink to={`/profile/${comment.user.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ cursor: 'pointer', "&:hover": { textDecoration: 'underline'} }}>
                                {comment.user.username}
                            </Typography>
                        </RouterLink>
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
    const [commentThread, setCommentThread] = useState([]);
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
            
            // Always append rating ID. If selectedComment exists, it's a reply to a comment within this rating.
            formData.append('rating', rating.id); 
            
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
                // Add to the replies of the currently selected comment
                const newReply = { ...response, replies: [] }; // Ensure new reply has an empty replies array

                // Update the commentThread
                setCommentThread(prevThread => {
                    const updatedThread = prevThread.map(commentInThread => {
                        if (commentInThread.id === selectedComment.id) {
                            return {
                                ...commentInThread,
                                replies: [...(commentInThread.replies || []), newReply]
                            };
                        }
                        return commentInThread;
                    });
                    return updatedThread;
                });
                
                // Update selectedComment's replies
                setSelectedComment(prev => ({
                    ...prev,
                    replies: [...(prev.replies || []), newReply]
                }));

                // Also update the localRating's comment structure if the parent is a top-level comment
                const updateRepliesRecursively = (comments, parentId, newReplyData) => {
                    return comments.map(comment => {
                        if (comment.id === parentId) {
                            return { ...comment, replies: [...(comment.replies || []), newReplyData] };
                        }
                        if (comment.replies && comment.replies.length > 0) {
                            return { ...comment, replies: updateRepliesRecursively(comment.replies, parentId, newReplyData) };
                        }
                        return comment;
                    });
                };
                setLocalRating(prevRating => ({
                    ...prevRating,
                    comments: updateRepliesRecursively(prevRating.comments, selectedComment.id, newReply)
                }));

            } else {
                // This is a direct comment to the rating
                const newTopLevelComment = { ...response, replies: [] };
                rating.comments = [...rating.comments, newTopLevelComment];
                setLocalRating(prev => ({...prev, comments: [...prev.comments, newTopLevelComment]}));
            }
            
            onCommentAdded(response); // Pass the new comment data
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Failed to add comment');
        }
    };

    const findCommentById = (comments, commentId) => {
        for (const comment of comments) {
            if (comment.id === commentId) {
                return comment;
            }
            if (comment.replies && comment.replies.length > 0) {
                const foundInReply = findCommentById(comment.replies, commentId);
                if (foundInReply) {
                    return foundInReply;
                }
            }
        }
        return null;
    };
    
    const buildCommentThread = (clickedCommentId) => {
        const thread = [];
        let currentComment = findCommentById(localRating.comments, clickedCommentId);
        
        while (currentComment) {
            thread.unshift(currentComment); // Add to the beginning of the array
            if (currentComment.parent_comment) {
                currentComment = findCommentById(localRating.comments, currentComment.parent_comment);
            } else {
                // This comment is a direct reply to the rating, or the rating itself if we consider it the root
                break; 
            }
        }
        return thread;
    };

    const handleCommentClick = (commentData) => {
        const fullClickedComment = findCommentById(localRating.comments, commentData.id);
        if (!fullClickedComment) {
            console.error("Clicked comment not found in localRating structure");
            // Fallback or error handling
            setSelectedComment({
                ...commentData,
                replies: (commentData.replies || []).map(reply => ({
                    ...reply,
                    upvotes: reply.upvotes || 0,
                    has_upvoted: reply.has_upvoted || false,
                    replies: reply.replies || [] // ensure replies have replies
                }))
            });
            setCommentThread([]); // Clear or set to a default state
            return;
        }

        setSelectedComment({
            ...fullClickedComment,
            replies: (fullClickedComment.replies || []).map(reply => ({
                ...reply,
                upvotes: reply.upvotes || 0,
                has_upvoted: reply.has_upvoted || false,
                replies: reply.replies || []
            }))
        });
        
        // Build the thread from the original rating up to the clicked comment
        const thread = [];
        let currentId = fullClickedComment.id;
        let tempComment = fullClickedComment;

        // Trace back to the top-level comment or the rating
        const traceToTop = (commentId, commentsList) => {
            const path = [];
            function findPath(currentId, currentComments) {
                for (const c of currentComments) {
                    if (c.id === currentId) {
                        path.unshift(c);
                        return true; // Found the target
                    }
                    if (c.replies && c.replies.length > 0) {
                        if (findPath(currentId, c.replies)) {
                            path.unshift(c); // Add parent to path
                            return true;
                        }
                    }
                }
                return false; // Not found in this branch
            }
            findPath(commentId, commentsList);
            return path;
        };
        
        setCommentThread(traceToTop(fullClickedComment.id, localRating.comments));
    };

    const handleBackClick = () => {
        if (commentThread.length > 1) {
            // If in a nested reply view, go up one level
            const parentOfSelected = commentThread[commentThread.length - 2];
            handleCommentClick(parentOfSelected); // This will rebuild the thread up to the parent
        } else if (selectedComment) {
            // If viewing a top-level comment's replies, go back to the main review
            setSelectedComment(null);
            setCommentThread([]);
        } else {
            // If viewing the main review, call the original onBack
            onBack();
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
                onClick={handleBackClick} 
                sx={{ mb: 2 }}
            >
                {commentThread.length > 0 ? 'Back' : (isShowingCommentDetail ? 'Back to Review' : 'Back to Reviews')}
            </Button>

            <Paper elevation={3} sx={{ p: {xs: 2, md: 3}, mb: 3 }}>
                {/* Render the original review details unconditionally at the top */}
                <Box sx={{ mb: 3 }}>
                    {/* Review User Info and Content */}
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
                            {localRating.condition_names && localRating.condition_names.length > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    Intended Purpose: {localRating.condition_names.join(', ')}
                                </Typography>
                            )}
                            {localRating.dosage && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Dosage: {localRating.dosage.replace(/\s+/g, '')}
                                    {(localRating.dosage_frequency && localRating.frequency_unit) ? 
                                        ` ${localRating.dosage_frequency}x / ${localRating.frequency_unit}` : ''}
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
                

                {/* Render the comment thread if a comment is selected */}
                {selectedComment && commentThread.length > 0 && commentThread.map((commentInThread, index) => (
                    <Box key={commentInThread.id} sx={{ mb: 2, ml: index * 2, borderLeft: index > 0 ? '2px solid #eee' : 'none', pl: index > 0 ? 2 : 0 }}>
                        <CommentBox
                            comment={commentInThread}
                            onCommentClick={handleCommentClick} 
                            isNested={true} // Consistently use isNested for thread items for styling (e.g., avatar size)
                            onEdit={updateComment}
                            currentUser={currentUser}
                            onUpvote={() => handleUpvoteComment(commentInThread)}
                        />
                         {/* Divider for all but the last item in the thread */}
                        {index < commentThread.length - 1 && <hr style={{margin: '16px 0', border: 'none', borderTop: '1px dashed #ccc'}} />}
                    </Box>
                ))}


                {/* Reply form - shows if a comment is selected (i.e., we are replying) */}
                {isAuthenticated && selectedComment && (
                    <form 
                        onSubmit={handleSubmitComment} 
                        style={{ 
                            marginTop: '16px', 
                            marginLeft: selectedComment ? ((commentThread.length * 2) + (commentThread.length > 0 ? 2 : 0)) : 0 
                        }}
                    >
                        <Typography variant="subtitle1" sx={{ mb: 1}}>
                            Reply to {selectedComment.user.username}
                        </Typography>
                        <TextField fullWidth multiline rows={3} variant="outlined" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write your reply..." sx={{ mb: 1 }}/>
                        <ImageUpload onFileSelect={setNewImage} selectedFile={newImage} />
                        <Button type="submit" variant="contained" sx={{ mt: 1 }} disabled={!newComment.trim() && !newImage}>
                            Post Reply
                        </Button>
                    </form>
                )}
                
                {/* Display "Comments" or "Replies" section header and list, with indentation if replying */}
                <Box sx={{ ml: selectedComment ? ((commentThread.length * 2) + (commentThread.length > 0 ? 2 : 0)) : 0 }}>
                    {(!selectedComment || (selectedComment && (selectedComment.replies || []).length > 0) ) && (
                         <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                            {selectedComment ? 'Replies to this comment' : 'Comments on this review'}
                        </Typography>
                    )}

                    <List>
                        {/* Render direct replies to the selectedComment, or top-level comments for the rating */}
                        {selectedComment ? (
                            (selectedComment.replies || []).map((reply) => (
                                <CommentBox 
                                    key={reply.id} 
                                    comment={reply}
                                    onCommentClick={handleCommentClick} 
                                    isNested={true} 
                                    onEdit={updateComment}
                                    currentUser={currentUser}
                                    onUpvote={() => handleUpvoteComment(reply)}
                                />
                            ))
                        ) : (
                            (localRating.comments || []).map((commentItem) => (
                                <CommentBox 
                                    key={commentItem.id} 
                                    comment={commentItem}
                                    onCommentClick={handleCommentClick} 
                                    isNested={false} 
                                    onEdit={updateComment}
                                    currentUser={currentUser}
                                    onUpvote={() => handleUpvoteComment(commentItem)}
                                />
                            ))
                        )}
                        
                        {/* Message if no comments or replies */}
                        {selectedComment && (!selectedComment.replies || selectedComment.replies.length === 0) && (
                            <Typography>No replies to this comment yet.</Typography>
                        )}
                        {!selectedComment && (!localRating.comments || localRating.comments.length === 0) && (
                            <Typography>No comments on this review yet.</Typography>
                        )}
                    </List>
                </Box>
            </Paper>

            {selectedImageForModal && (
                <ImageModal imageUrl={selectedImageForModal} onClose={() => setModalOpen(false)} open={modalOpen} />
            )}
        </Box>
    );
}

export default ReviewDetail; 