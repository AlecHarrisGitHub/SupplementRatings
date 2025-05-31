import React, { useState, useEffect } from 'react';
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

// Helper to shape rating into a comment-like object for the thread
const transformRatingToThreadItem = (ratingData) => {
    if (!ratingData || !ratingData.user) { // Guard against incomplete rating data
        return null;
    }
    return {
        id: `review-${ratingData.id}`, // Unique ID for key prop
        user: ratingData.user,
        content: ratingData.comment || '', // The main text of the review
        created_at: ratingData.created_at,
        upvotes: ratingData.upvotes || 0,
        has_upvoted: ratingData.has_upvoted || false,
        image_url: ratingData.image_url, // Review's own image
        
        isReviewItem: true, // Custom flag
        score: ratingData.score,
        condition_names: ratingData.condition_names,
        dosage: ratingData.dosage,
        dosage_frequency: ratingData.dosage_frequency,
        frequency_unit: ratingData.frequency_unit,
        brands: ratingData.brands,
        is_edited: ratingData.is_edited, // Include is_edited for review item

        replies: [], // Represents that it doesn't have 'replies' in the same way comments do in this structure
        parent_comment: null, // Root item
    };
};

function CommentBox({ comment, onCommentClick, isNested = false, onEdit, currentUser, onUpvote, isReviewItem = false, onEditReview }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment.content);

    const handleEditSubmit = async () => {
        if (isReviewItem) {
            // For reviews, onEditReview is expected to handle the full rating object
            // This internal edit state is for comment content only.
            // The main review edit button should be used.
            setIsEditing(false); // Just close editor
        } else {
            try {
                await onEdit(comment.id, editedContent);
                comment.content = editedContent;
                comment.is_edited = true;
                setIsEditing(false);
            } catch (error) {
                toast.error('Failed to update comment');
            }
        }
    };
    
    const initiateEdit = (e) => {
        e.stopPropagation();
        if (isReviewItem) {
            // If it's a review item, trigger the main review edit flow if available
            if (onEditReview) {
                 onEditReview(); // This prop should be passed if review is editable via this box
            }
            // Do not set isEditing to true for review item here,
            // as its edit mechanism is different.
        } else {
            setIsEditing(true);
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
                                <Button size="small" onClick={handleEditSubmit} variant="contained">Save</Button>
                                <Button size="small" onClick={() => setIsEditing(false)}>Cancel</Button>
                            </>
                        ) : (
                            <>
                                {currentUser && (currentUser.id === comment.user.id || currentUser.username === comment.user.username) && (
                                    <Button size="small" onClick={initiateEdit} sx={{mr:1}}>Edit</Button>
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
        if (rating.user.id === currentUser.id) {
            toast.error('You cannot upvote your own rating');
            return;
        }

        try {
            const response = await upvoteRating(localRating.id);
            const updatedRating = {
                ...localRating,
                upvotes: response.upvotes_count,
                has_upvoted: !localRating.has_upvoted
            };
            setLocalRating(updatedRating);
            // Update the review item in the thread if it exists
            setCommentThread(prevThread => prevThread.map(item => 
                item.isReviewItem && item.id === `review-${localRating.id}` ? transformRatingToThreadItem(updatedRating) : item
            ));
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

            // Update comment in the commentThread
            setCommentThread(prevThread => prevThread.map(item => {
                if (item.id === commentToUpvote.id && !item.isReviewItem) {
                    return { ...item, upvotes: response.upvotes, has_upvoted: !item.has_upvoted };
                }
                return item;
            }));
            
            // Update selectedComment if it's the one upvoted
            if (selectedComment && selectedComment.id === commentToUpvote.id) {
                 setSelectedComment(prev => ({ ...prev, upvotes: response.upvotes, has_upvoted: !prev.has_upvoted }));
            }

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
                const newReply = { ...response, replies: [] };

                const updateRepliesRecursivelyInComments = (comments, parentId, newReplyData) => {
                    return comments.map(comment => {
                        if (comment.id === parentId) {
                            return { ...comment, replies: [...(comment.replies || []), newReplyData] };
                        }
                        if (comment.replies && comment.replies.length > 0) {
                            return { ...comment, replies: updateRepliesRecursivelyInComments(comment.replies, parentId, newReplyData) };
                        }
                        return comment;
                    });
                };
                
                const updatedLocalComments = updateRepliesRecursivelyInComments(localRating.comments, selectedComment.id, newReply);
                const newLocalRating = {...localRating, comments: updatedLocalComments };
                setLocalRating(newLocalRating);
                
                // Update selectedComment's replies
                setSelectedComment(prev => ({
                    ...prev,
                    replies: [...(prev.replies || []), newReply]
                }));

                // Update the comment in the thread if the selectedComment is part of the thread
                setCommentThread(prevThread => {
                    return prevThread.map(item => {
                        if (item.id === selectedComment.id) {
                            return {
                                ...item,
                                replies: [...(item.replies || []), newReply]
                            };
                        }
                        return item;
                    });
                });
                // Propagate to parent component
                rating.comments = updatedLocalComments;

            } else {
                // This is a direct comment to the rating
                const newTopLevelComment = { ...response, replies: [] };
                const newLocalRating = {
                    ...localRating,
                    comments: [...(localRating.comments || []), newTopLevelComment]
                };
                setLocalRating(newLocalRating);
                // Propagate to parent component
                rating.comments = newLocalRating.comments;
            }
            
            onCommentAdded(response);
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Failed to add comment');
        }
    };

    const findCommentById = (comments, commentId) => {
        for (const comment of comments) {
            if (comment.id === commentId) {
                return { ...comment, replies: comment.replies || [] }; // Ensure replies array exists
            }
            if (comment.replies && comment.replies.length > 0) {
                const foundInReply = findCommentById(comment.replies, commentId);
                if (foundInReply) {
                    return { ...foundInReply, replies: foundInReply.replies || [] };
                }
            }
        }
        return null;
    };
    
    // Builds array of comment objects from top-level to the targetCommentId
    const traceToTop = (targetCommentId, allComments) => {
        const path = [];
        function findPath(currentId, comments) {
            for (const c of comments) {
                if (c.id === currentId) {
                    path.unshift({ ...c, replies: c.replies || [] });
                    return true; 
                }
                if (c.replies && c.replies.length > 0) {
                    if (findPath(currentId, c.replies)) {
                        path.unshift({ ...c, replies: c.replies || [] }); 
                        return true;
                    }
                }
            }
            return false;
        }
        findPath(targetCommentId, allComments);
        return path;
    };

    useEffect(() => {
        if (localRating && localRating.user) {
            const reviewItem = transformRatingToThreadItem(localRating);
            if (reviewItem) {
                 if (selectedComment) {
                    // If a comment is selected, ensure the thread reflects it
                    const pathToComment = traceToTop(selectedComment.id, localRating.comments);
                    setCommentThread([reviewItem, ...pathToComment]);
                } else {
                    // Default: show only the review item in the thread
                    setCommentThread([reviewItem]);
                }
            }
        } else {
            setCommentThread([]); // Clear thread if localRating is not available
        }
    }, [localRating, selectedComment]); // Rerun when localRating or selectedComment changes

    const handleCommentClick = (commentData) => {
        // Ensure commentData has an id. If it's the review item, do nothing or handle differently.
        if (commentData.isReviewItem) {
            // Clicking the review item in the thread could, for example, clear selectedComment
            // For now, let's make it a no-op to prevent issues.
            // Or, if it's the review item, maybe we set selectedComment to null
             setSelectedComment(null);
             const reviewItem = transformRatingToThreadItem(localRating);
             if (reviewItem) setCommentThread([reviewItem]);
            return;
        }

        const fullClickedComment = findCommentById(localRating.comments, commentData.id);

        if (!fullClickedComment) {
            console.error("Clicked comment not found in localRating structure:", commentData.id);
            // Fallback: just show the review
            setSelectedComment(null);
            const reviewItem = transformRatingToThreadItem(localRating);
            if (reviewItem) setCommentThread([reviewItem]);
            return;
        }
        
        setSelectedComment(fullClickedComment); // Set the actual selected comment object
        
        const reviewItem = transformRatingToThreadItem(localRating);
        if(reviewItem){
            const pathToComment = traceToTop(fullClickedComment.id, localRating.comments);
            setCommentThread([reviewItem, ...pathToComment]);
        }
    };

    const handleBackClick = () => {
        if (selectedComment) {
            const currentFullSelectedComment = findCommentById(localRating.comments, selectedComment.id);
            if (currentFullSelectedComment && currentFullSelectedComment.parent_comment) {
                const parentObj = findCommentById(localRating.comments, currentFullSelectedComment.parent_comment);
                if (parentObj) {
                    handleCommentClick(parentObj); // This will set selectedComment to parent and rebuild thread
                } else {
                    // Parent not found, revert to review view
                    setSelectedComment(null);
                    // useEffect will handle resetting commentThread to just reviewItem
                }
            } else {
                // No parent_comment means it's a top-level comment, or selectedComment is stale. Go to review view.
                setSelectedComment(null);
                // useEffect will handle resetting commentThread
            }
        } else {
            // No selectedComment, means we are viewing the review (or review + top level comments)
            // and the thread only contains the review item. So, go fully back.
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
                {/* Adjust "Back" button text based on state */}
                {selectedComment ? 'Back to parent comment' : (commentThread.length > 1 ? 'Back to Review' : 'Back to Reviews')}
            </Button>

            <Paper elevation={3} sx={{ p: {xs: 2, md: 3}, mb: 3 }}>
                {/* Render the comment thread */}
                {commentThread.map((item, index) => (
                    <React.Fragment key={item.id}>
                        <Box sx={{ mb: 2 /* No more ml, borderLeft, pl for indentation */ }}>
                            {item.isReviewItem && (
                                <Box sx={{ mb: 2, pb: 2, borderBottom: commentThread.length > 1 ? '1px solid #eee' : 'none' }}>
                                    {/* Review specific details */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <Typography variant="h6">
                                            Review by {item.user.username} 
                                            {item.is_edited && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>(edited)</Typography>}
                                        </Typography>
                                        <MuiRating value={item.score} readOnly />
                                    </Box>
                                    {currentUser && currentUser.id === item.user.id && (
                                        <Button size="small" onClick={() => onEditRating && onEditRating(localRating)} sx={{mb:1}}>Edit Review</Button>
                                    )}
                                    {item.condition_names && item.condition_names.length > 0 && (
                                        <Typography variant="body2" color="text.secondary">
                                            Intended Purpose: {item.condition_names.join(', ')}
                                        </Typography>
                                    )}
                                    {item.dosage && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Dosage: {item.dosage.replace(/\\s+/g, '')}
                                            {(item.dosage_frequency && item.frequency_unit) ? 
                                                ` ${item.dosage_frequency}x / ${item.frequency_unit}` : ''}
                                        </Typography>
                                    )}
                                    {item.brands && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Brands Used: {item.brands}
                                        </Typography>
                                    )}
                                    {/* The actual review comment text will be rendered by CommentBox below */}
                                </Box>
                            )}
                            <CommentBox
                                comment={item} // For review item, 'content' is review's main comment.
                                onCommentClick={handleCommentClick}
                                isNested={false} // All items in thread are not visually nested for uniform size
                                onEdit={item.isReviewItem ? () => {} : updateComment} // Review edit handled above
                                currentUser={currentUser}
                                onUpvote={() => item.isReviewItem ? handleUpvoteRating() : handleUpvoteComment(item)}
                                isReviewItem={item.isReviewItem} // Pass this to CommentBox if it needs to know
                                onEditReview={item.isReviewItem ? () => onEditRating && onEditRating(localRating) : undefined}
                            />
                        </Box>
                        {/* Divider for all items in the thread, including between review and first comment if thread > 1 */}
                        {index < commentThread.length - 1 && <hr style={{margin: '16px 0', border: 'none', borderTop: '1px dashed #ccc'}} />}
                    </React.Fragment>
                ))}

                {/* Reply form - shows if a comment is selected (i.e., we are replying to an actual comment) */}
                {isAuthenticated && selectedComment && !selectedComment.isReviewItem && (
                    <form 
                        onSubmit={handleSubmitComment} 
                        style={{ 
                            marginTop: '24px', // Give more space after the thread
                            // No specific marginLeft needed as items are not indented.
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
            </Paper>

            {/* Replies Section - MOVED OUTSIDE AND BELOW the main Paper */}
            {/* This section shows direct replies to selectedComment, or top-level comments if !selectedComment */}
            <Box sx={{ mt: 4, /* Increased margin from Paper */ }}>
                { (selectedComment && (selectedComment.replies || []).length > 0) || (!selectedComment && (localRating?.comments || []).length > 0) ? (
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {selectedComment ? `Replies to ${selectedComment.user.username}'s comment` : `Comments on this review`}
                    </Typography>
                ) : (
                  <Typography sx={{mt:2}}>
                    {selectedComment ? 'No replies to this comment yet.' : 'No comments on this review yet.'}
                  </Typography>
                )}

                <List>
                    {selectedComment ? (
                        (selectedComment.replies || []).map((reply) => (
                            <CommentBox 
                                key={reply.id} 
                                comment={reply}
                                onCommentClick={handleCommentClick} 
                                isNested={true} // Direct replies under a comment can be nested
                                onEdit={updateComment}
                                currentUser={currentUser}
                                onUpvote={() => handleUpvoteComment(reply)}
                            />
                        ))
                    ) : (
                        (localRating?.comments || []).map((commentItem) => (
                            <CommentBox 
                                key={commentItem.id} 
                                comment={commentItem}
                                onCommentClick={handleCommentClick} 
                                isNested={false} // Top-level comments are not nested relative to the review itself
                                onEdit={updateComment}
                                currentUser={currentUser}
                                onUpvote={() => handleUpvoteComment(commentItem)}
                            />
                        ))
                    )}
                    {/* Specific "no replies/comments" messages handled by the Typography above the List now */}
                </List>
            </Box>
            

            {selectedImageForModal && (
                <ImageModal imageUrl={selectedImageForModal} onClose={() => setModalOpen(false)} open={modalOpen} />
            )}
        </Box>
    );
}

export default ReviewDetail; 