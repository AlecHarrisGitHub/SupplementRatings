import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSupplements } from '../services/api'
import { Container, Typography, List, ListItem, ListItemText } from '@mui/material'

function SupplementList() {
  const [supplements, setSupplements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchSupplements = async () => {
      try {
        setLoading(true)
        const response = await getSupplements()
        // console.log('API Response:', response)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const supplementsData = Array.isArray(response) ? response : response.data
        setSupplements(supplementsData || [])
      } catch (err) {
        console.error('Error fetching supplements:', err)
        setError('Failed to fetch supplements.')
      } finally {
        setLoading(false)
      }
    }

    fetchSupplements()
  }, [])

  if (loading) return <div>Loading supplements...</div>
  if (error) return <div>{error}</div>
  if (!supplements || supplements.length === 0) return <div>No supplements found.</div>

  return (
    <Container style={styles.container}>
      <Typography variant="h4" gutterBottom>
        Supplements
      </Typography>
      <List>
        {supplements.map((supplement) => (
          <ListItem 
            key={supplement.id} 
            button 
            component={Link} 
            to={`/supplements/${supplement.id}`}
          >
            <ListItemText primary={supplement.name} />
          </ListItem>
        ))}
      </List>
    </Container>
  )
}

const styles = {
  container: {
    textAlign: 'left',
    marginTop: '50px',
  },
}

export default SupplementList 