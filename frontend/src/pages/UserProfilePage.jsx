import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { 
    Box, 
    Typography, 
    CircularProgress, 
    Container, 
    Paper, 
    Avatar, 
    List, 
    ListItem, 
    ListItemText,
    Rating as MuiRating, // Renamed to avoid conflict with model field
    Divider,
    Link
} from '@mui/material';
import { getUserPublicProfile } from '../services/api'; // We will create this API call
import { toast } from 'react-toastify';

const defaultProfileImage = 'http://localhost:8000/media/profile_pics/default.jpg';

// Helper to format date (MM/DD/YYYY)
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
};

function UserProfilePage() {
    const { username } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const data = await getUserPublicProfile(username);
                setProfile(data);
                setError(null);
            } catch (err) {
                console.error("Error fetching public profile:", err);
                toast.error(err.response?.data?.error || 'Failed to load profile.');
                setError(err.response?.data?.error || 'Profile not found or an error occurred.');
                setProfile(null);
            } finally {
                setLoading(false);
            }
        };

        if (username) {
            fetchProfile();
        }
    }, [username]);

    if (loading) {
        return (
            <Container sx={{ textAlign: 'center', mt: 5 }}>
                <CircularProgress />
                <Typography>Loading profile...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container sx={{ textAlign: 'center', mt: 5 }}>
                <Typography variant="h5" color="error">
                    {error}
                </Typography>
            </Container>
        );
    }

    if (!profile || !profile.user) {
        return (
            <Container sx={{ textAlign: 'center', mt: 5 }}>
                <Typography variant="h5">User profile not found.</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar 
                        src={profile.user.profile_image_url || defaultProfileImage} 
                        alt={profile.user.username}
                        sx={{ width: 80, height: 80, mr: 2 }}
                    />
                    <Typography variant="h4" component="h1">
                        {profile.user.username}
                    </Typography>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h5" component="h2" gutterBottom>
                    Ratings by {profile.user.username}
                </Typography>
                {profile.ratings && profile.ratings.length > 0 ? (
                    <List>
                        {profile.ratings.map((rating) => (
                            <Paper 
                                key={rating.id} 
                                elevation={1} 
                                sx={{ mb: 2, p: 2, cursor: 'pointer', "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" } }}
                                onClick={() => navigate(`/supplements/${rating.supplement}`, { state: { ratingId: rating.id } })}
                            >
                                <ListItemText 
                                    primary={
                                        <Typography variant="subtitle1" sx={{fontWeight: 'bold', color: 'primary.main'}}>
                                            {rating.supplement_name || 'Supplement Name Missing'} 
                                        </Typography>
                                    }
                                    secondaryTypographyProps={{ component: 'div' }}
                                    secondary={
                                        <Box>
                                            <MuiRating value={rating.score} readOnly size="small" sx={{ my: 0.5 }}/>
                                            {rating.comment && <Typography variant="body2" color="text.secondary" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>{rating.comment}</Typography>}
                                            {rating.condition_names && rating.condition_names.length > 0 && 
                                                <Typography variant="caption" display="block" color="text.secondary">Intended Purpose: {rating.condition_names.join(', ')}</Typography>}
                                            {rating.benefit_names && rating.benefit_names.length > 0 && 
                                                <Typography variant="caption" display="block" color="text.secondary">Benefits For: {rating.benefit_names.join(', ')}</Typography>}
                                            {rating.side_effect_names && rating.side_effect_names.length > 0 && 
                                                <Typography variant="caption" display="block" color="text.secondary">Side Effects: {rating.side_effect_names.join(', ')}</Typography>}
                                            {rating.brands && 
                                                <Typography variant="caption" display="block" color="text.secondary">Brand(s): {rating.brands}</Typography>}
                                            {(rating.dosage || rating.dosage_frequency) && (
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    Dosage: {rating.dosage}{rating.dosage_frequency && rating.frequency_unit && ` ${rating.dosage_frequency}x / ${rating.frequency_unit}`}
                                                </Typography>
                                            )}
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 1}}>
                                                {formatDate(rating.created_at)}
                                            </Typography>
                                        </Box>
                                    }
                                />
                                {rating.image_url && (
                                    <Box sx={{ mt: 1, textAlign: 'center' }}>
                                        <img 
                                            src={rating.image_url} 
                                            alt={`Rating for ${rating.supplement_name}`}
                                            style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '4px' }}
                                        />
                                    </Box>
                                )}
                            </Paper>
                        ))}
                    </List>
                ) : (
                    <Typography>This user has not submitted any ratings yet.</Typography>
                )}

                <Divider sx={{ my: 3 }} />

                <Typography variant="h5" component="h2" gutterBottom>
                    Comments by {profile.user.username}
                </Typography>
                {profile.comments && profile.comments.length > 0 ? (
                    <List>
                        {profile.comments.map((comment) => (
                            <Paper 
                                key={comment.id} 
                                elevation={1} 
                                sx={{ mb: 2, p: 2, cursor: 'pointer', "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" } }}
                                onClick={() => navigate(`/supplements/${comment.supplement_id}`, { state: { commentId: comment.id, ratingId: comment.rating_id } })}
                            >
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                            {comment.supplement_name || 'View Supplement'}
                                        </Typography>
                                    }
                                    secondaryTypographyProps={{ component: 'div' }}
                                    secondary={
                                        <Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                                                {comment.content}
                                            </Typography>
                                            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    {comment.parent_comment && " (in reply to another comment)"}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {formatDate(comment.created_at)} {comment.is_edited && "(edited)"}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    }
                                />
                            </Paper>
                        ))}
                    </List>
                ) : (
                    <Typography>This user has not submitted any comments yet.</Typography>
                )}

            </Paper>
        </Container>
    );
}

export default UserProfilePage; 