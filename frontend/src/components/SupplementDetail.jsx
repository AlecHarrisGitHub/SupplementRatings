import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    Box, 
    Typography, 
    Rating as MuiRating, 
    Button, 
    TextField, 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions,
    Autocomplete,
    Card,
    CardContent,
    Avatar
} from '@mui/material';
import { getSupplementDetails, addRating, addComment, getConditions } from '../services/api';
import { toast } from 'react-toastify';

function SupplementDetail() {
    const { id } = useParams();
    const [supplement, setSupplement] = useState(null);
    const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
    const [ratingScore, setRatingScore] = useState(1);
    const [ratingComment, setRatingComment] = useState('');
    const [conditions, setConditions] = useState([]);
    const [selectedCondition, setSelectedCondition] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyContent, setReplyContent] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [supplementData, conditionsData] = await Promise.all([
                    getSupplementDetails(id),
                    getConditions()
                ]);
                setSupplement(supplementData);
                setConditions(conditionsData);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, [id]);

    const handleRatingSubmit = async () => {
        if (!selectedCondition) {
            toast.error('Please select a condition');
            return;
        }

        try {
            await addRating({
                supplement: id,
                condition: selectedCondition.id,
                score: ratingScore,
                comment: ratingComment || null,
            });
            
            // Refresh supplement data
            const supplementData = await getSupplementDetails(id);
            setSupplement(supplementData);
            
            // Reset form
            setRatingScore(1);
            setRatingComment('');
            setSelectedCondition(null);
            setRatingDialogOpen(false);
            toast.success('Rating added successfully!');
        } catch (error) {
            console.error('Error details:', error.response?.data || error);
            toast.error(error.response?.data?.detail || 'Failed to add rating.');
        }
    };

    const handleReplySubmit = async (ratingId) => {
        if (!replyContent.trim()) {
            toast.error('Reply cannot be empty');
            return;
        }

        try {
            await addComment({
                rating: ratingId,
                content: replyContent,
            });
            
            // Refresh supplement data
            const supplementData = await getSupplementDetails(id);
            setSupplement(supplementData);
            
            // Reset form
            setReplyContent('');
            setReplyingTo(null);
            toast.success('Reply added successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to add reply.');
        }
    };

    if (!supplement) return <Typography>Loading...</Typography>;

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
            <Typography variant="h4" gutterBottom>
                {supplement.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Category: {supplement.category}
            </Typography>

            {/* Ratings Section */}
            <Box sx={{ mt: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5">Ratings</Typography>
                    <Button 
                        variant="contained" 
                        onClick={() => setRatingDialogOpen(true)}
                    >
                        Add Rating
                    </Button>
                </Box>

                {/* Display Ratings */}
                {supplement.ratings.length > 0 ? (
                    supplement.ratings.map((rating) => (
                        <Card key={rating.id} sx={{ mb: 2 }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Avatar sx={{ mr: 1 }}>{rating.user.username[0]}</Avatar>
                                    <Typography variant="subtitle1">
                                        {rating.user.username}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <MuiRating value={rating.score} readOnly />
                                    <Typography variant="body2" sx={{ ml: 1 }}>
                                        for {rating.condition_name}
                                    </Typography>
                                </Box>
                                {rating.comment && (
                                    <Typography variant="body1" sx={{ mt: 1 }}>
                                        {rating.comment}
                                    </Typography>
                                )}

                                {/* Comments Section */}
                                <Box sx={{ mt: 2 }}>
                                    {rating.comments?.map((comment) => (
                                        <Box key={comment.id} sx={{ ml: 4, mt: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Avatar sx={{ width: 24, height: 24, mr: 1 }}>
                                                    {comment.user.username[0]}
                                                </Avatar>
                                                <Typography variant="body2">
                                                    {comment.user.username}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" sx={{ ml: 4 }}>
                                                {comment.content}
                                            </Typography>
                                        </Box>
                                    ))}
                                    
                                    {replyingTo === rating.id ? (
                                        <Box sx={{ ml: 4, mt: 1 }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                value={replyContent}
                                                onChange={(e) => setReplyContent(e.target.value)}
                                                placeholder="Write a reply..."
                                            />
                                            <Box sx={{ mt: 1 }}>
                                                <Button 
                                                    variant="contained" 
                                                    size="small" 
                                                    onClick={() => handleReplySubmit(rating.id)}
                                                    sx={{ mr: 1 }}
                                                >
                                                    Submit
                                                </Button>
                                                <Button 
                                                    size="small"
                                                    onClick={() => {
                                                        setReplyingTo(null);
                                                        setReplyContent('');
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Button 
                                            size="small" 
                                            onClick={() => setReplyingTo(rating.id)}
                                            sx={{ ml: 4, mt: 1 }}
                                        >
                                            Reply
                                        </Button>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Typography>No ratings yet</Typography>
                )}
            </Box>

            {/* Rating Dialog */}
            <Dialog open={ratingDialogOpen} onClose={() => setRatingDialogOpen(false)}>
                <DialogTitle>Add Rating</DialogTitle>
                <DialogContent>
                    <Autocomplete
                        options={conditions}
                        getOptionLabel={(option) => option.name}
                        value={selectedCondition}
                        onChange={(event, newValue) => setSelectedCondition(newValue)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Condition"
                                margin="normal"
                                required
                            />
                        )}
                    />
                    <Box sx={{ my: 2 }}>
                        <Typography component="legend">Score</Typography>
                        <MuiRating
                            value={ratingScore}
                            onChange={(event, newValue) => {
                                setRatingScore(newValue);
                            }}
                        />
                    </Box>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Comment (optional)"
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRatingDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleRatingSubmit} variant="contained">
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default SupplementDetail;