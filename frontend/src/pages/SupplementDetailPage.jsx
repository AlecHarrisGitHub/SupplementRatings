import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getSupplement } from '../services/api'; // Assuming getSupplement fetches supplement with its ratings
import ReviewDetail from '../components/ReviewDetail';
import { Container, CircularProgress, Typography, Alert, Button, Paper, Rating, Box, Select, MenuItem } from '@mui/material';

function SupplementDetailPage() {
    const { id: supplementId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [supplement, setSupplement] = useState(null);
    const [selectedRating, setSelectedRating] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortOrder, setSortOrder] = useState('likes'); // Added state for sort dropdown

    const { ratingId, commentId } = location.state || {};

    useEffect(() => {
        const fetchSupplementDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const supplementData = await getSupplement(supplementId);
                setSupplement(supplementData);

                if (ratingId) {
                    const foundRating = supplementData.ratings?.find(r => String(r.id) === String(ratingId));
                    if (foundRating) {
                        setSelectedRating(foundRating);
                    } else {
                        console.warn(`Rating with ID ${ratingId} not found in supplement ${supplementId}. Displaying first rating or message.`);
                        // Fallback: select the first rating if available, or handle as needed
                        setSelectedRating(supplementData.ratings?.[0] || null);
                         if (!supplementData.ratings?.[0]) {
                            setError(`No ratings found for this supplement, so cannot display the requested review details for rating ID ${ratingId}.`);
                        }
                    }
                } else if (commentId && supplementData.ratings) {
                    // Defensive code: if we have a commentId but no ratingId, find the rating that contains this comment
                    let containingRating = null;
                    for (const r of supplementData.ratings) {
                        if (r.comments?.some(c => String(c.id) === String(commentId))) {
                            containingRating = r;
                            break;
                        }
                    }
                    if (containingRating) {
                        setSelectedRating(containingRating);
                    } else {
                        // Fallback if comment not found in any rating
                        setSelectedRating(supplementData.ratings?.[0] || null);
                    }
                } else if (supplementData.ratings?.length > 0) {
                    // If no specific ratingId is provided, default to the first rating
                    setSelectedRating(supplementData.ratings[0]);
                } else {
                    setSelectedRating(null); // No ratings available
                    setError('No ratings available for this supplement.');
                }

            } catch (err) {
                console.error("Error fetching supplement details:", err);
                setError(err.message || 'Failed to load supplement details.');
            } finally {
                setLoading(false);
            }
        };

        if (supplementId) {
            fetchSupplementDetails();
        }
    }, [supplementId, ratingId, commentId]); // Re-fetch if supplementId or ratingId from state changes

    // This effect ensures ReviewDetail gets the commentId from the current location state
    // when selectedRating is determined.
    useEffect(() => {
        if (selectedRating && commentId) {
            // The ReviewDetail component itself reads commentId from location.state.
            // We just need to ensure the location state is passed through if we re-navigate
            // or if ReviewDetail's key changes. Here, we ensure location.state is stable.
        }
    }, [selectedRating, commentId, location.state]);


    if (loading) {
        return (
            <Container sx={{ textAlign: 'center', mt: 5 }}>
                <CircularProgress />
                <Typography>Loading supplement details...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container sx={{ textAlign: 'center', mt: 5 }}>
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                <Button variant="outlined" onClick={() => navigate('/supplements')}>
                    Back to Supplements
                </Button>
            </Container>
        );
    }

    if (!supplement) {
        return (
            <Container sx={{ textAlign: 'center', mt: 5 }}>
                <Typography>Supplement not found.</Typography>
                 <Button variant="outlined" onClick={() => navigate('/supplements')}>
                    Back to Supplements
                </Button>
            </Container>
        );
    }
    
    if (!selectedRating && ratingId) {
         return (
            <Container sx={{ textAlign: 'center', mt: 5 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Rating ID {ratingId} was specified but not found for this supplement.
                </Alert>
                <Button variant="outlined" onClick={() => navigate('/supplements')}>
                    Back to Supplements
                </Button>
                 <Button variant="outlined" onClick={() => navigate(`/supplements/${supplementId}`)} sx={{ml: 1}}>
                    View Supplement (general)
                </Button>
            </Container>
        );
    }

    if (!selectedRating) {
        // This case handles if a supplement has NO ratings at all.
        return (
            <Container sx={{ textAlign: 'center', mt: 5 }}>
                <Typography variant="h5">{supplement.name}</Typography>
                <Alert severity="info" sx={{ mb: 2, mt: 2 }}>
                    There are no reviews or comments for this supplement yet.
                </Alert>
                <Button variant="outlined" onClick={() => navigate('/supplements')}>
                    Back to Supplements
                </Button>
            </Container>
        );
    }


    // The ReviewDetail component will internally use useLocation to get commentId
    // So we don't explicitly pass commentId as a prop here.
    // The key for ReviewDetail includes ratingId to ensure it re-renders if a different rating (of the same supplement) is chosen.
    return (
        <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
            <Button 
                onClick={() => navigate('/supplements')}
                sx={{ mb: 2, textTransform: 'none', fontWeight: 'normal', p:0, justifyContent: 'flex-start' }}
            >
                BACK TO LIST
            </Button>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" component="h1" gutterBottom>
                    {supplement.name}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">
                        {supplement.avg_rating !== null && typeof supplement.avg_rating !== 'undefined' && supplement.rating_count > 0 ?
                            `Average Rating: ${parseFloat(supplement.avg_rating).toFixed(1)} (${supplement.rating_count} ${supplement.rating_count === 1 ? 'rating' : 'ratings'})`
                            : 'No ratings yet'}
                    </Typography>
                    <Select
                        size="small"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                    >
                        <MenuItem value="likes">Most Liked</MenuItem>
                        <MenuItem value="recent">Most Recent</MenuItem>
                    </Select>
                </Box>
                
                <ReviewDetail
                    key={selectedRating.id} 
                    rating={selectedRating}
                    onBack={() => {
                        navigate(`/supplements/${supplementId}`, { replace: true, state: {} });
                    }}
                    onCommentAdded={(newComment) => {
                        console.log('Comment added:', newComment);
                    }}
                    onEditRating={(updatedRatingData, isTextOnlyUpdate) => {
                        setSelectedRating(prev => ({...prev, ...updatedRatingData}));
                        setSupplement(prevSup => ({
                            ...prevSup,
                            ratings: prevSup.ratings.map(r => r.id === updatedRatingData.id ? {...r, ...updatedRatingData} : r)
                        }));
                        console.log('Rating edited:', updatedRatingData);
                    }}
                />
            </Paper>
        </Container>
    );
}

export default SupplementDetailPage; 