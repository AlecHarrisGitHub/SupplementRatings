// frontend/src/pages/SupplementDetail.jsx

import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { getSupplement, getRatings, addRating, addComment, getConditions } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Container, Typography, List, ListItem, ListItemText, TextField, Button, Box, Rating as MuiRating, Autocomplete } from '@mui/material';

function SupplementDetail() {
  const { id } = useParams();
  const { auth } = useContext(AuthContext);

  const [supplement, setSupplement] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [ratingScore, setRatingScore] = useState(1);
  const [ratingComment, setRatingComment] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conditions, setConditions] = useState([]);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [searchCondition, setSearchCondition] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [supplementRes, ratingsRes] = await Promise.all([
          getSupplement(id),
          getRatings(id)
        ]);
        setSupplement(supplementRes.data);
        setRatings(ratingsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load supplement details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchConditions = async () => {
      try {
        const response = await getConditions(searchCondition);
        setConditions(response.data);
      } catch (error) {
        console.error('Error fetching conditions:', error);
      }
    };

    if (searchCondition) {
      fetchConditions();
    }
  }, [searchCondition]);

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCondition) {
      toast.error('Please select a condition');
      return;
    }

    try {
      console.log('Sending rating data:', {
        supplement: id,
        condition: selectedCondition.id,
        score: ratingScore,
        comment: ratingComment
      });

      const response = await addRating({
        supplement: id,
        condition: selectedCondition.id,
        score: ratingScore,
        comment: ratingComment || null,
      });
      
      console.log('Rating response:', response);

      setRatings([response.data, ...ratings]);
      setRatingScore(1);
      setRatingComment('');
      setSelectedCondition(null);
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
      const response = await addComment({
        rating: ratingId,
        content: replyContent,
      });
      
      // Update the ratings list to include the new reply
      const updatedRatings = ratings.map(rating => 
        rating.id === ratingId 
          ? { ...rating, replies: [...(rating.replies || []), response.data] }
          : rating
      );
      
      setRatings(updatedRatings);
      setReplyContent('');
      setReplyingTo(null);
      toast.success('Reply added successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to add reply.');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!supplement) return <div>Supplement not found</div>;

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        {supplement.name}
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>Category:</strong> {supplement.category}
      </Typography>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Ratings & Reviews
      </Typography>

      {auth.access ? (
        <Box component="form" onSubmit={handleRatingSubmit} sx={{ mt: 2, mb: 4 }}>
          <Typography variant="h6">Add Your Rating</Typography>
          <Autocomplete
            options={conditions}
            getOptionLabel={(option) => option.name}
            value={selectedCondition}
            onChange={(_, newValue) => setSelectedCondition(newValue)}
            onInputChange={(_, newInputValue) => setSearchCondition(newInputValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Condition"
                required
                margin="normal"
              />
            )}
          />
          <MuiRating
            value={ratingScore}
            onChange={(_, newValue) => {
              if (newValue !== null) {
                setRatingScore(newValue);
              }
            }}
            size="large"
            sx={{ mb: 2 }}
            required
          />
          <TextField
            label="Review (optional)"
            value={ratingComment}
            onChange={(e) => setRatingComment(e.target.value)}
            multiline
            rows={4}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" color="primary">
            Submit Rating
          </Button>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ mt: 2 }}>
          <em>Login to add a rating.</em>
        </Typography>
      )}

      {ratings.length === 0 ? (
        <Typography variant="body2">No ratings yet.</Typography>
      ) : (
        <List>
          {ratings.map((rating) => (
            <ListItem key={rating.id} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <ListItemText
                primary={
                  <>
                    <MuiRating value={rating.score} readOnly size="small" />
                    <Typography component="span" sx={{ ml: 1 }}>
                      by {rating.user.username} for {rating.condition_name}
                    </Typography>
                  </>
                }
                secondary={rating.comment}
              />
              
              {/* Replies */}
              {rating.replies && rating.replies.length > 0 && (
                <List sx={{ pl: 4, width: '100%' }}>
                  {rating.replies.map((reply) => (
                    <ListItem key={reply.id}>
                      <ListItemText
                        primary={`${reply.user.username} replied:`}
                        secondary={reply.content}
                      />
                    </ListItem>
                  ))}
                </List>
              )}

              {/* Reply Form */}
              {auth.access && (
                <Box sx={{ mt: 1, width: '100%' }}>
                  {replyingTo === rating.id ? (
                    <Box sx={{ pl: 4 }}>
                      <TextField
                        label="Your reply"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        multiline
                        rows={2}
                        fullWidth
                        sx={{ mb: 1 }}
                      />
                      <Button
                        onClick={() => handleReplySubmit(rating.id)}
                        variant="contained"
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        Submit Reply
                      </Button>
                      <Button
                        onClick={() => setReplyingTo(null)}
                        variant="outlined"
                        size="small"
                      >
                        Cancel
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      onClick={() => setReplyingTo(rating.id)}
                      variant="text"
                      size="small"
                    >
                      Reply
                    </Button>
                  )}
                </Box>
              )}
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  );
}

export default SupplementDetail;
