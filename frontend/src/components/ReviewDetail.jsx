import React, { useState, useEffect, useRef } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
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
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
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

    const replyCount = (comment.replies && Array.isArray(comment.replies)) ? comment.replies.length : 0;

    return (
        <ListItem 
            id={`comment-${comment.id}`}
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
            {/* Top Section: User Info, Upvotes, Stars */}
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                {/* Left Part: Avatar and Username */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
                    {isReviewThreadItem && currentUser && (currentUser.id === comment.user.id || currentUser.username === comment.user.username) && !isEditing && (
                         <Button size="small" onClick={initiateEdit} sx={{mr: 1}}>Edit</Button>
                    )}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {!isEditing && typeof replyCount === 'number' && replyCount >= 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 0.5 }}> 
                            <ForumOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', mr: 0.5 }} />
                            <Typography variant="caption" color="text.secondary">
                                {replyCount}
                            </Typography>
                        </Box>
                    )}
                    {isEditing ? (
                        <>
                            <Button size="small" onClick={handleEditSubmit} variant="contained">Save</Button>
                            <Button size="small" onClick={() => setIsEditing(false)}>Cancel</Button>
                        </>
                    ) : (
                        <>
                            {currentUser && (currentUser.id === comment.user.id || currentUser.username === comment.user.username) && !isReviewThreadItem && (
                                <Button size="small" onClick={initiateEdit}>
                                    Edit
                                </Button>
                            )}
                        </>
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
    console.log('[ReviewDetail] Component rendering. Rating ID:', rating?.id);

    const { user: currentUser } = useAuth();
    const [newComment, setNewComment] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [replyToComment, setReplyToComment] = useState(null); // Stores the comment object being replied to
    const [currentRating, setCurrentRating] = useState(rating);
    const [thread, setThread] = useState([]);
    const [activeCommentThread, setActiveCommentThread] = useState(null); // ID of the comment being replied to, to show its thread
    const [isImageModalOpen, setImageModalOpen] = useState(false);
    const [modalImageUrl, setModalImageUrl] = useState('');
    const [newCommentImage, setNewCommentImage] = useState(null); // State for the new comment's image
    const commentInputRef = useRef(null);
    const location = useLocation(); // Added useLocation hook

    useEffect(() => {
        console.log('[ReviewDetail DeepLinkEffect] Triggered. Rating ID:', rating?.id, 'Location state:', location.state);
        setCurrentRating(rating);
        const initialThreadItem = transformRatingToThreadItem(rating, rating.is_edited);
        if (initialThreadItem) {
            setThread([initialThreadItem]);
        } else {
            setThread([]);
        }

        const { commentId: targetCommentId, ratingId: locationRatingId } = location.state || {};
        console.log('[ReviewDetail DeepLinkEffect] Target Comment ID:', targetCommentId, 'Target Rating ID:', locationRatingId);

        if (rating && targetCommentId && String(rating.id) === String(locationRatingId)) {
            console.log('[ReviewDetail DeepLinkEffect] Rating ID matches. Attempting to find comment thread.');
            const pathToComment = traceToTop(targetCommentId, rating.comments || []);
            if (pathToComment.length > 0) {
                console.log('[ReviewDetail DeepLinkEffect] Path to comment found:', pathToComment);
                setThread([initialThreadItem, ...pathToComment]);
                setReplyToComment(pathToComment[pathToComment.length - 1]);
            } else {
                console.warn(`[ReviewDetail DeepLinkEffect] Deep link target commentId ${targetCommentId} not found in rating ${rating.id}`);
                setReplyToComment(null);
                // Ensure thread is reset if path not found
                if (initialThreadItem) {
                    setThread([initialThreadItem]);
                }
            }
        } else {
            setReplyToComment(null);
            if (initialThreadItem) {
                setThread([initialThreadItem]);
            }
        }
    }, [rating, location.state]);

    useEffect(() => {
        // This effect handles scrolling to a specific comment if commentId is in location state
        const { commentId, ratingId: locationRatingId } = location.state || {};

        if (commentId && currentRating && String(currentRating.id) === String(locationRatingId)) {
            const commentElement = document.getElementById(`comment-${commentId}`);
            if (commentElement) {
                commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Optionally, add a temporary highlight effect
                commentElement.style.transition = 'background-color 0.5s ease-in-out';
                commentElement.style.backgroundColor = '#f0f8ff'; // AliceBlue for highlight
                setTimeout(() => {
                    commentElement.style.backgroundColor = ''; // Reset background
                }, 2000); // Highlight for 2 seconds
            }
        }
    }, [location.state, currentRating]);

    const handleUpvoteRating = async () => {
        if (!currentUser) {
            toast.error('Please log in to upvote');
            return;
        }
        if (rating.user.id === currentUser.id) {
            toast.error('You cannot upvote your own rating');
            return;
        }

        try {
            const response = await upvoteRating(currentRating.id);
            const updatedRatingData = {
                ...currentRating,
                upvotes: response.upvotes_count,
                has_upvoted: !currentRating.has_upvoted
            };
            setCurrentRating(updatedRatingData);
            // Update the review item in the thread if it exists
            setThread(prevThread => prevThread.map(item => 
                item.isReviewThreadItem ? transformRatingToThreadItem(updatedRatingData, item.is_edited) : item
            ));

        } catch (error) {
            toast.error('Failed to upvote rating');
        }
    };

    const handleUpvoteComment = async (commentToUpvote) => {
        if (!currentUser) {
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
                    if (c.replies && c.replies.length > 0) {
                        const newReplies = updateComments(c.replies);
                        if (newReplies !== c.replies) {
                            return { ...c, replies: newReplies };
                        }
                    }
                    return c;
                });
            };

            // Update both the local rating and the parent rating
            const updatedComments = updateComments(currentRating.comments);
            
            // Update local rating state
            setCurrentRating(prev => ({
                ...prev,
                comments: updatedComments
            }));

            // Update selected comment if we're viewing replies
            if (replyToComment) {
                if (replyToComment.id === commentToUpvote.id) {
                    // If the upvoted comment is the selected comment
                    setReplyToComment(prev => ({
                        ...prev,
                        upvotes: response.upvotes,
                        has_upvoted: !prev.has_upvoted
                    }));
                } else {
                    // If the upvoted comment is in the replies
                    setReplyToComment(prev => ({
                        ...prev,
                        replies: updateComments(prev.replies || [])
                    }));
                }
            }

            // Update the parent rating's comments
            rating.comments = updatedComments;

            // Update comment in the thread
            setThread(prevThread => prevThread.map(item => {
                if (item.id === commentToUpvote.id) {
                    return { ...item, upvotes: response.upvotes, has_upvoted: !item.has_upvoted };
                }
                return item;
            }));
            
            // Update selectedComment if it's the one upvoted
            if (replyToComment && replyToComment.id === commentToUpvote.id) {
                 setReplyToComment(prev => ({ ...prev, upvotes: response.upvotes, has_upvoted: !prev.has_upvoted }));
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
            
            // Always append rating ID. If replyToComment exists, it's a reply to a comment within this rating.
            formData.append('rating', rating.id); 
            
            // Only append parent_comment if we're replying to a comment
            if (replyToComment) {
                formData.append('parent_comment', replyToComment.id);
            }
            
            formData.append('content', newComment.trim());
            
            // Handle image for new comments (top-level or replies)
            if (newCommentImage) {
                formData.append('image', newCommentImage);
            }

            const response = await addComment(formData);
            
            // Reset form
            setNewComment('');
            setNewCommentImage(null); // Reset image state
            if (replyToComment) {
                setReplyToComment(null);
            }
            
            // Update the UI
            if (replyToComment) {
                // Add to the replies of the currently selected comment
                const newReply = { ...response, replies: [] };

                const updateRepliesRecursivelyInComments = (comments, parentId, newReplyData) => {
                    return comments.map(comment => {
                        if (comment.id === parentId) {
                            return { ...comment, replies: [...(comment.replies || []), newReplyData] };
                        }
                        if (comment.replies && comment.replies.length > 0) {
                            const newReplies = updateRepliesRecursivelyInComments(comment.replies, parentId, newReplyData);
                            if (newReplies !== comment.replies) {
                                return { ...comment, replies: newReplies };
                            }
                        }
                        return comment;
                    });
                };
                
                const updatedLocalComments = updateRepliesRecursivelyInComments(currentRating.comments, replyToComment.id, newReply);
                const newLocalRating = {...currentRating, comments: updatedLocalComments };
                setCurrentRating(newLocalRating);
                
                // Update selectedComment's replies
                setReplyToComment(prev => ({
                    ...prev,
                    replies: [...(prev.replies || []), newReply]
                }));

                // Update the comment in the thread if the selectedComment is part of the thread
                setThread(prevThread => {
                    return prevThread.map(item => {
                        if (item.id === replyToComment.id) {
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
                    ...currentRating,
                    comments: [...(currentRating.comments || []), newTopLevelComment]
                };
                setCurrentRating(newLocalRating);
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
            if (String(comment.id) === String(commentId)) {
                return comment; // Return direct reference
            }
            if (comment.replies && comment.replies.length > 0) {
                const foundInReply = findCommentById(comment.replies, commentId);
                if (foundInReply) {
                    return foundInReply; // Return direct reference
                }
            }
        }
        return null;
    };
    
    const traceToTop = (targetCommentId, allComments) => {
        const commentMap = new Map();
        const buildMap = (comments) => {
            for (const comment of comments) {
                commentMap.set(String(comment.id), comment);
                if (comment.replies) {
                    buildMap(comment.replies);
                }
            }
        };
        buildMap(allComments);

        const path = [];
        let currentComment = commentMap.get(String(targetCommentId));

        while (currentComment) {
            path.unshift(currentComment);
            if (currentComment.parent_comment) {
                currentComment = commentMap.get(String(currentComment.parent_comment));
            } else {
                currentComment = null;
            }
        }
        return path;
    };

    const handleCommentClick = (commentData) => {
        // If the clicked item is the review at the top of the thread,
        // reset the view to just the review and its top-level comments.
        if (commentData.isReviewThreadItem) {
            setReplyToComment(null);
            const reviewItem = transformRatingToThreadItem(currentRating);
            if (reviewItem) {
                setThread([reviewItem]);
            }
            return;
        }

        // For any other comment, find its full data and trace its path to build the new thread.
        const fullClickedComment = findCommentById(currentRating.comments, commentData.id);

        if (!fullClickedComment) {
            console.error("Clicked comment not found in currentRating structure:", commentData.id);
            setReplyToComment(null); 
            return;
        }
        
        setReplyToComment(fullClickedComment);
        const newThreadPath = traceToTop(fullClickedComment.id, currentRating.comments);
        const reviewItem = transformRatingToThreadItem(currentRating);
        if(reviewItem) {
            setThread([reviewItem, ...newThreadPath]);
        }
    };

    const handleBackClick = () => {
        const reviewItem = thread.length > 0 && thread[0].isReviewThreadItem ? thread[0] : null;

        if (replyToComment) {
            const currentFullSelectedComment = findCommentById(currentRating.comments, replyToComment.id);
            if (currentFullSelectedComment && currentFullSelectedComment.parent_comment) {
                const parentObj = findCommentById(currentRating.comments, currentFullSelectedComment.parent_comment);
                if (parentObj) {
                    setReplyToComment(parentObj);
                    const newThreadPath = traceToTop(parentObj.id, currentRating.comments);
                    const reviewItem = transformRatingToThreadItem(currentRating);
                    if (reviewItem) {
                        setThread([reviewItem, ...newThreadPath]);
                    }
                } else {
                    setReplyToComment(null); // Parent not found, go to review + its top-level comments
                    const reviewItem = transformRatingToThreadItem(currentRating);
                    if(reviewItem) setThread([reviewItem]);
                }
            } else {
                // No parent_comment or selected comment is stale, so it's a top-level comment (or should be treated as such).
                // Clicking back from a top-level comment shows the review and its top-level comments.
                setReplyToComment(null); 
                const reviewItem = transformRatingToThreadItem(currentRating);
                if(reviewItem) setThread([reviewItem]);
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
        setModalImageUrl(imageUrl);
        setImageModalOpen(true);
    };
    
    const currentItem = replyToComment || currentRating;
    const isShowingCommentDetail = !!replyToComment;

    // Ensure currentRating and its user object are available
    if (!currentRating || !currentRating.user) {
        return <Typography>Loading review details...</Typography>; // Or some other placeholder
    }

    console.log('Current currentRating in ReviewDetail:', currentRating); // <-- ADD THIS LOG

    return (
        <Box>
            <Button 
                onClick={handleBackClick} 
                sx={{ mb: 2 }}
            >
                {replyToComment ? 'Back to parent' : 'Back to Reviews'}
            </Button>

            {/* Comment Thread Paper - Always visible if currentRating exists */}
            {currentRating && currentRating.user && (
                <Paper elevation={1} sx={{ p: {xs: 1, md: 2}, mb: 3, border: '1px solid #e0e0e0' }}>
                    {thread.map((item, index) => {
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
                                            ...currentRating, 
                                            comment: editedText, 
                                            is_edited: true 
                                        };
                                        setCurrentRating(updatedLocalRating);
                                        // Propagate to parent if necessary
                                        if(onEditRating) onEditRating(updatedLocalRating, true); // Indicate it's a text-only update
                                        
                                        // Update in thread
                                         setThread(prev => prev.map(ct => ct.id === item.id ? {...ct, content: editedText, is_edited: true} : ct));

                                    } : updateComment} 
                                    currentUser={currentUser}
                                    onUpvote={() => item.isReviewThreadItem ? handleUpvoteRating() : handleUpvoteComment(item)}
                                    isReviewThreadItem={item.isReviewThreadItem}
                                    onEditRating={item.isReviewThreadItem ? () => onEditRating(currentRating) : undefined}
                                />
                                {index < thread.length - 1 && <hr style={{margin: '16px 0', border: 'none', borderTop: '1px dashed #ccc'}} />}
                            </React.Fragment>
                        );
                    })}
                </Paper>
            )}

            {/* Reply form - shows if a comment (not the review item) is selected */}
            {currentUser && (
                <Paper elevation={1} sx={{p:2, mb:3}}>
                    <form 
                        onSubmit={handleSubmitComment} 
                        style={{ marginTop: '0px' /* Adjusted from 24px, relies on Paper padding */ }}
                    >
                        <Typography variant="subtitle1" sx={{ mb: 1}}>
                            {replyToComment ? `Reply to ${replyToComment.user.username}` : 'Add a comment to this review'}
                        </Typography>
                        <TextField fullWidth multiline rows={3} variant="outlined" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write your reply..." sx={{ mb: 1 }}/>
                        <ImageUpload 
                            onFileSelect={setNewCommentImage} 
                            selectedFile={newCommentImage} 
                        />
                        <Button type="submit" variant="contained" sx={{ mt: 1 }} disabled={!newComment.trim() && !newCommentImage}>
                            Post Reply
                        </Button>
                    </form>
                </Paper>
            )}

            {/* Replies / Top-Level Comments Section */}
            <Box sx={{ mt: 2 }}>
                { (replyToComment && (replyToComment.replies || []).length > 0) || 
                  (!replyToComment && currentRating && (currentRating.comments || []).length > 0) ? (
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {replyToComment ? `Replies to ${replyToComment.user.username}` : `Comments on this review`}
                    </Typography>
                ) : (
                  <Typography sx={{mt:2}}>
                    {replyToComment ? 'No replies to this comment yet.' : 'No comments on this review yet.'}
                  </Typography>
                )}

                <List>
                    {replyToComment ? (
                        (replyToComment.replies || []).map((reply) => (
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
                        (currentRating?.comments || []).map((commentItem) => (
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
            

            {modalImageUrl && (
                <ImageModal imageUrl={modalImageUrl} onClose={() => setImageModalOpen(false)} open={isImageModalOpen} />
            )}
        </Box>
    );
}

export default ReviewDetail; 