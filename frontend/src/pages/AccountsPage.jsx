import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Typography,
    Container,
    List,
    ListItem,
    ListItemText,
    Paper,
    CircularProgress,
    Alert,
    Box,
    Chip,
    Button
} from '@mui/material';
import { format } from 'date-fns';

function AccountsPage() {
    const { user } = useAuth();
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nextPage, setNextPage] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchRatings = async (url) => {
        if (!user) {
            setError("User not found. Please log in.");
            setLoading(false);
            return;
        }
        setLoadingMore(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const newItems = Array.isArray(data.results) ? data.results :
                             (Array.isArray(data) ? data : []);
            const nextPageUrl = data.next || null;

            if (url === '/api/ratings/my_ratings/') {
                setRatings(newItems);
            } else {
                setRatings(prev => [...(Array.isArray(prev) ? prev : []), ...newItems]);
            }
            setNextPage(nextPageUrl);
        } catch (err) {
            console.error("Error fetching ratings:", err);
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchRatings('/api/ratings/my_ratings/');
    }, [user]); // Re-fetch if user changes

    const handleLoadMore = () => {
        if (nextPage) {
            fetchRatings(nextPage);
        }
    };

    if (loading && ratings.length === 0) {
        return <Container sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Container>;
    }

    if (error && ratings.length === 0) {
        return <Container sx={{ mt: 5 }}><Alert severity="error">{error}</Alert></Container>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
                    My Account
                </Typography>
                {user && (
                    <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
                        Welcome back, {user.username}!
                    </Typography>
                )}
                <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, borderBottom: '1px solid #ddd', pb: 1 }}>
                    My Ratings & Reviews
                </Typography>
                {ratings.length === 0 && !loading && !error && (
                    <Typography sx={{ textAlign: 'center', mt: 3 }}>You have not made any ratings yet.</Typography>
                )}
                {error && ratings.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>Could not load all ratings: {error}</Alert>
                )}
                {ratings.length > 0 && (
                    <List>
                        {ratings.map((rating) => (
                            <ListItem key={rating.id} divider sx={{ alignItems: 'flex-start', py: 2 }}>
                                <ListItemText
                                    primaryTypographyProps={{ variant: 'h6', component: 'div' }}
                                    primary={`${rating.supplement} - Score: ${rating.score}/5`}
                                    secondaryTypographyProps={{ component: 'div' }}
                                    secondary={
                                        <>
                                            {rating.comment && <Typography variant="body1" sx={{ my: 1 }}>{rating.comment}</Typography>}
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1, mb: 0.5 }}>
                                                {Array.isArray(rating.condition_names) && rating.condition_names.map(cn => 
                                                    <Chip key={cn} label={`Used for: ${cn}`} size="small" variant="outlined" />
                                                )}
                                                {rating.brands && 
                                                    <Chip label={`Brand: ${rating.brands}`} size="small" variant="outlined" />
                                                }
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Rated on: {format(new Date(rating.created_at), 'PPpp')}
                                            </Typography>
                                            {rating.is_edited && 
                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>(Edited)</Typography>
                                            }
                                        </>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
                {nextPage && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Button variant="contained" onClick={handleLoadMore} disabled={loadingMore}>
                            {loadingMore ? <CircularProgress size={24} /> : 'Load More'}
                        </Button>
                    </Box>
                )}
            </Paper>
        </Container>
    );
}

export default AccountsPage; 