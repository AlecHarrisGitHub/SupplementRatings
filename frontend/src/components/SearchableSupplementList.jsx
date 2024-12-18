import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    TextField, 
    List, 
    ListItem, 
    ListItemText, 
    Typography, 
    Box, 
    Paper,
    Autocomplete
} from '@mui/material';
import { getSupplements, getConditions } from '../services/api';

function SearchableSupplementList() {
    const [searchTerm, setSearchTerm] = useState('');
    const [supplements, setSupplements] = useState([]);
    const [conditions, setConditions] = useState([]);
    const [selectedCondition, setSelectedCondition] = useState(null);

    useEffect(() => {
        const fetchConditions = async () => {
            try {
                const data = await getConditions();
                setConditions(data);
            } catch (error) {
                console.error('Error fetching conditions:', error);
            }
        };
        fetchConditions();
    }, []);

    useEffect(() => {
        const fetchSupplements = async () => {
            try {
                const params = {};
                if (searchTerm) params.name = searchTerm;
                if (selectedCondition) params.condition = selectedCondition.name;
                
                const data = await getSupplements(params);
                setSupplements(data);
            } catch (error) {
                console.error('Error fetching supplements:', error);
            }
        };
        fetchSupplements();
    }, [searchTerm, selectedCondition]);

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
            <TextField
                fullWidth
                label="Search Supplements"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 2 }}
            />

            <Autocomplete
                options={conditions}
                getOptionLabel={(option) => option.name}
                value={selectedCondition}
                onChange={(event, newValue) => setSelectedCondition(newValue)}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Filter by Condition"
                        variant="outlined"
                    />
                )}
                sx={{ mb: 3 }}
            />

            <Paper elevation={2}>
                <List>
                    {supplements.length > 0 ? (
                        supplements.map((supplement) => (
                            <ListItem
                                key={supplement.id}
                                component={Link}
                                to={`/supplement/${supplement.id}`}
                                sx={{
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                    },
                                }}
                            >
                                <ListItemText
                                    primary={supplement.name}
                                    secondary={`Category: ${supplement.category}`}
                                />
                            </ListItem>
                        ))
                    ) : (
                        <ListItem>
                            <ListItemText primary="No supplements found" />
                        </ListItem>
                    )}
                </List>
            </Paper>
        </Box>
    );
}

export default SearchableSupplementList; 