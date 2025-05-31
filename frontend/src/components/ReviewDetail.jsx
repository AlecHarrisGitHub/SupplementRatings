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
const transformRatingToThreadItem = (ratingData, isEditedByParent) => {
    if (!ratingData || !ratingData.user) { 
        return null;
    }
    return {
        id: `review-${ratingData.id}`, 
        user: ratingData.user,
        content: ratingData.comment || '', 
        created_at: ratingData.created_at,
        upvotes: ratingData.upvotes || 0,
        has_upvoted: ratingData.has_upvoted || false,
        image_url: ratingData.image_url, 
        is_edited: isEditedByParent !== undefined ? isEditedByParent : ratingData.is_edited, // Prefer parent's view of edited status

        // Review specific details to be used by CommentBox
        isReviewThreadItem: true, 
        score: ratingData.score,
        condition_names: ratingData.condition_names,
        dosage: ratingData.dosage,
        dosage_frequency: ratingData.dosage_frequency,
        frequency_unit: ratingData.frequency_unit,
        brands: ratingData.brands,
        benefit_names: ratingData.benefit_names,
        side_effect_names: ratingData.side_effect_names,
        // replies and parent_comment are not applicable here or handled differently
        replies: ratingData.comments || [], // For a review item, its 'replies' are its top-level comments
        parent_comment: null, 
    };
};

function CommentBox({ 
    comment, 
    onCommentClick, 
    isNested = false, // Retaining for potential use in the separate reply list, but not for main thread
    onEdit, 
    currentUser, 
    onUpvote,
    isReviewThreadItem = false, // New prop
    onEditRating // New prop for when editing the review item
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment && comment.content !== null && comment.content !== undefined ? comment.content : '');

    useEffect(() => {
        // Sync editedContent if comment content changes from outside
        setEditedContent(comment && comment.content !== null && comment.content !== undefined ? comment.content : '');
    }, [comment?.content]);

    const handleEditSubmit = async () => {
        if (isReviewThreadItem) {
            // For review item, call onEditRating which handles the full rating object.
            // The actual saving and content update for review is managed by ReviewDetail's onEditRating flow.
            if (onEditRating) {
                // We pass the editedContent to onEditRating if it's designed to take partial updates
                // Or onEditRating just triggers a modal. For now, assume ReviewDetail handles content.
                onEditRating(editedContent); // Pass content if needed, or onEditRating knows what to do
            }
            setIsEditing(false); // Close editor after initiating edit
        } else {
            try {
                await onEdit(comment.id, editedContent);
                // Optimistic update handled by parent or state
                setIsEditing(false);
            } catch (error) {
                toast.error('Failed to update comment');
            }
        }
    };
    
    const initiateEdit = (e) => {
        e.stopPropagation();
        if (isReviewThreadItem) {
            if (onEditRating) {
                onEditRating(); // Trigger the main review edit flow (e.g., open modal)
                // Potentially set isEditing to true if CommentBox itself becomes the editor for review text
                // For now, assume onEditRating handles the UI for editing the review's text
            } 
            // For now, do not set isEditing to true for review thread item directly here
            // if the main edit button for the review is separate.
            // If this CommentBox is meant to directly edit the review text, then setIsEditing(true) is needed.
            // For consistency, let's allow review text editing here IF onEditRating is also for opening a modal.
            // If onEditRating directly saves, this local edit state is fine.
            setIsEditing(true); // Allow editing review's main comment text here

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
            // onClick={() => onCommentClick(comment)} // Allow click only if not editing, or manage click area more carefully
            sx={{
                mb: 2,
                flexDirection: 'column',
                alignItems: 'flex-start',
                bgcolor: 'background.paper',
                borderRadius: 1,
                boxShadow: 1,
                p: 2,
                // ml: isNested ? 3 : 0, // No indentation for main thread items
                // cursor: 'pointer', // Make specific elements clickable
            }}
        >
            {/* Top Section: User Info, Upvotes, Stars */}
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                {/* Left Part: Avatar and Username */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => onCommentClick(comment)}>
                    <RouterLink to={`/profile/${comment.user.username}`} style={{ textDecoration: 'none' }}>
                        <Avatar 
                            src={comment.user.profile_image_url || defaultProfileImage} 
                            alt={comment.user.username}
                            sx={{ width: 40, height: 40 }}
                        />
                    </RouterLink>
                    <RouterLink to={`/profile/${comment.user.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{"&:hover": { textDecoration: 'underline'}}}>
                            {comment.user.username}
                        </Typography>
                    </RouterLink>
                    {comment.is_edited && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, fontStyle: 'italic' }}>
                            (edited)
                        </Typography>
                    )}
                </Box>

                {/* Right Part: Upvotes and Stars */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton 
                        onClick={handleUpvoteClick}
                        color={comment.has_upvoted ? "primary" : "default"}
                        size="small"
                        disabled={!currentUser || (comment.user && currentUser.id === comment.user.id)}
                    >
                        <ThumbUpIcon fontSize="small" />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>{comment.upvotes}</Typography>
                    </IconButton>
                    {isReviewThreadItem && (
                        <MuiRating value={comment.score || 0} readOnly size="small" />
                    )}
                </Box>
            </Box>

            {/* Review-Specific Details (only for review item) */}
            {isReviewThreadItem && (
                <Box sx={{width: '100%', mb: 1}}>
                    {comment.condition_names && comment.condition_names.length > 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{mb: 0.5}}>
                            Intended Purpose: {comment.condition_names.join(', ')}
                        </Typography>
                    )}
                    {comment.benefit_names && comment.benefit_names.length > 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{mb: 0.5}}>
                            Benefits For: {comment.benefit_names.join(', ')}
                        </Typography>
                    )}
                    {comment.side_effect_names && comment.side_effect_names.length > 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{mb: 0.5}}>
                            Side Effects: {comment.side_effect_names.join(', ')}
                        </Typography>
                    )}
                    {comment.dosage && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Dosage: {comment.dosage.replace(/\s+/g, '')}
                            {(comment.dosage_frequency && comment.frequency_unit) ? 
                                ` ${comment.dosage_frequency}x / ${comment.frequency_unit}` : ''}
                        </Typography>
                    )}
                    {comment.brands && (
                        <Typography variant="body2" color="text.secondary">
                            Brands Used: {comment.brands}
                        </Typography>
                    )}
                </Box>
            )}

            {/* Content Section: Text and Image */}
            <Box sx={{ width: '100%', mb: 1}}>
                {!isEditing ? (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{comment.content}</Typography>
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
                            // Add onClick for modal if needed here, or ensure parent handles it
                        />
                    </Box>
                )}
            </Box>

            {/* Bottom Section: Edit Button and Date */}
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Box>
                    {isEditing ? (
                        <>
                            <Button size="small" onClick={handleEditSubmit} variant="contained" sx={{mr:1}}>Save</Button>
                            <Button size="small" onClick={() => setIsEditing(false)}>Cancel</Button>
                        </>
                    ) : (
                        <>
                            {currentUser && (currentUser.id === comment.user.id || currentUser.username === comment.user.username) && (
                                <Button size="small" onClick={initiateEdit} sx={{mr:1}}>
                                    {isReviewThreadItem ? 'Edit Review Details' : 'Edit'}
                                </Button>
                            )}
                        </>
                    )}
                     {comment.is_edited && !isEditing && !isReviewThreadItem && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic'}}>
                            (edited)
                        </Typography>
                    )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                    {formatDate(comment.created_at)}
                </Typography>
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
            const updatedRatingData = {
                ...localRating,
                upvotes: response.upvotes_count,
                has_upvoted: !localRating.has_upvoted
            };
            setLocalRating(updatedRatingData);
            // Update the review item in the thread if it exists
            setCommentThread(prevThread => prevThread.map(item => 
                item.isReviewThreadItem ? transformRatingToThreadItem(updatedRatingData, item.is_edited) : item
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
                if (item.id === commentToUpvote.id) {
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
        const reviewItem = transformRatingToThreadItem(localRating, localRating.is_edited); // Pass current edited state
        if (!reviewItem) {
            setCommentThread([]);
            return;
        }

        if (selectedComment && localRating && localRating.comments) {
            const pathToComment = traceToTop(selectedComment.id, localRating.comments);
            setCommentThread([reviewItem, ...pathToComment]);
        } else {
            setCommentThread([reviewItem]); // Default: thread contains only the review item
        }
    }, [localRating, selectedComment]);

    const handleCommentClick = (commentData) => {
        if (commentData.isReviewThreadItem) {
            // Clicking the review item in the thread means we are focusing on the review itself
            // So, clear any selected sub-comment to show top-level replies to the review.
            setSelectedComment(null);
            // useEffect will reconstruct thread with just reviewItem
            return;
        }

        const fullClickedComment = findCommentById(localRating.comments, commentData.id);

        if (!fullClickedComment) {
            console.error("Clicked comment not found in localRating structure:", commentData.id);
            setSelectedComment(null); 
            return;
        }
        
        setSelectedComment(fullClickedComment); 
        // useEffect will build the thread: [reviewItem, ...pathToSelectedComment]
    };

    const handleBackClick = () => {
        const reviewItem = commentThread.length > 0 && commentThread[0].isReviewThreadItem ? commentThread[0] : null;

        if (selectedComment) {
            const currentFullSelectedComment = findCommentById(localRating.comments, selectedComment.id);
            if (currentFullSelectedComment && currentFullSelectedComment.parent_comment) {
                const parentObj = findCommentById(localRating.comments, currentFullSelectedComment.parent_comment);
                if (parentObj) {
                    setSelectedComment(parentObj); // Go to parent, useEffect updates thread
                } else {
                    setSelectedComment(null); // Parent not found, go to review + its top-level comments
                }
            } else {
                // No parent_comment or selected comment is stale, so it's a top-level comment (or should be treated as such).
                // Clicking back from a top-level comment shows the review and its top-level comments.
                setSelectedComment(null); 
            }
        } else {
            // No selectedComment. If thread has more than review, means we were viewing review + top-level comments.
            // This state (selectedComment = null, thread has only review) is the base.
            // So, 'Back' from here means go to the previous page/view entirely.
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

    console.log('Current localRating in ReviewDetail:', localRating); // <-- ADD THIS LOG

    return (
        <Box>
            <Button 
                onClick={handleBackClick} 
                sx={{ mb: 2 }}
            >
                {selectedComment ? 'Back to parent' : 'Back to Reviews'}
            </Button>

            {/* Comment Thread Paper - Always visible if localRating exists */}
            {localRating && localRating.user && (
                <Paper elevation={1} sx={{ p: {xs: 1, md: 2}, mb: 3, border: '1px solid #e0e0e0' }}>
                    {commentThread.map((item, index) => {
                        if (item.isReviewThreadItem) { // <-- ADD CONDITIONAL LOG
                            console.log('Review Item passed to CommentBox:', item);
                        }
                        return (
                            <React.Fragment key={item.id}>
                                <CommentBox
                                    comment={item}
                                    onCommentClick={handleCommentClick}
                                    isNested={false} // All items in thread are not visually nested
                                    onEdit={item.isReviewThreadItem ? (editedText) => {
                                        // This is a simplified edit path for the review's main comment text
                                        // directly via CommentBox. onEditRating prop on ReviewDetail is for 
                                        // more complex edits (e.g. score, conditions via modal)
                                        const updatedLocalRating = { 
                                            ...localRating, 
                                            comment: editedText, 
                                            is_edited: true 
                                        };
                                        setLocalRating(updatedLocalRating);
                                        // Propagate to parent if necessary
                                        if(onEditRating) onEditRating(updatedLocalRating, true); // Indicate it's a text-only update
                                        
                                        // Update in thread
                                         setCommentThread(prev => prev.map(ct => ct.id === item.id ? {...ct, content: editedText, is_edited: true} : ct));

                                    } : updateComment} 
                                    currentUser={currentUser}
                                    onUpvote={() => item.isReviewThreadItem ? handleUpvoteRating() : handleUpvoteComment(item)}
                                    isReviewThreadItem={item.isReviewThreadItem}
                                    onEditRating={item.isReviewThreadItem ? () => onEditRating(localRating) : undefined}
                                />
                                {index < commentThread.length - 1 && <hr style={{margin: '16px 0', border: 'none', borderTop: '1px dashed #ccc'}} />}
                            </React.Fragment>
                        );
                    })}
                </Paper>
            )}

            {/* Reply form - shows if a comment (not the review item) is selected */}
            {isAuthenticated && selectedComment && !selectedComment.isReviewThreadItem && (
                <Paper elevation={1} sx={{p:2, mb:3}}>
                    <form 
                        onSubmit={handleSubmitComment} 
                        style={{ marginTop: '0px' /* Adjusted from 24px, relies on Paper padding */ }}
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
                </Paper>
            )}

            {/* Replies / Top-Level Comments Section */}
            <Box sx={{ mt: 2 }}>
                { (selectedComment && (selectedComment.replies || []).length > 0) || 
                  (!selectedComment && localRating && (localRating.comments || []).length > 0) ? (
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {selectedComment ? `Replies to ${selectedComment.user.username}` : `Comments on this review`}
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
                </List>
            </Box>
            

            {selectedImageForModal && (
                <ImageModal imageUrl={selectedImageForModal} onClose={() => setModalOpen(false)} open={modalOpen} />
            )}
        </Box>
    );
}

export default ReviewDetail; 