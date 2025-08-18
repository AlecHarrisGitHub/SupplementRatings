import React, { useState } from 'react';
import { Container, Box, Card, CardContent, Typography, TextField, Button, Stack, Link as MuiLink } from '@mui/material';
import { toast } from 'react-hot-toast';
import { sendContactMessage } from '../services/api';

const SUPPORT_EMAIL = 'supplementratings.contact@gmail.com';

function Contact() {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [subject, setSubject] = useState('');
	const [message, setMessage] = useState('');

	const isFormValid = name.trim() && email.trim() && message.trim();
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (!isFormValid || submitting) {
			if (!isFormValid) toast.error('Please fill out your name, email, and message.');
			return;
		}

		try {
			setSubmitting(true);
			await sendContactMessage({ name, email, subject, message });
			toast.success('Your message has been sent. Thank you!');
			setName('');
			setEmail('');
			setSubject('');
			setMessage('');
		} catch (error) {
			const msg = error?.data?.error || error?.message || 'Failed to send your message. Please try again.';
			toast.error(msg);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
			<Box sx={{ textAlign: 'center', mb: 3 }}>
				<Typography variant="h4" component="h1" gutterBottom>
					Contact Us
				</Typography>
				<Typography variant="body1" color="text.secondary">
					Have feedback, questions, or issues? Send us a message and we’ll get back to you.
				</Typography>
			</Box>

			<Card elevation={3}>
				<CardContent>
					<Box component="form" onSubmit={handleSubmit} noValidate>
						<Stack spacing={2.5}>
							<TextField
								label="Your Name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								fullWidth
							/>
							<TextField
								label="Your Email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								fullWidth
							/>
							<TextField
								label="Subject (optional)"
								value={subject}
								onChange={(e) => setSubject(e.target.value)}
								fullWidth
							/>
							<TextField
								label="Message"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								minRows={5}
								multiline
								required
								fullWidth
							/>
							<Button type="submit" variant="contained" size="large" disabled={!isFormValid || submitting}>
								Send Message
							</Button>
							<Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
								Or email us directly at{' '}
								<MuiLink href={`mailto:${SUPPORT_EMAIL}`} underline="hover">
									{SUPPORT_EMAIL}
								</MuiLink>
							</Typography>
						</Stack>
					</Box>
				</CardContent>
			</Card>
		</Container>
	);
}

export default Contact;


