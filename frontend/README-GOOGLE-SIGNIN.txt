Google Sign-In configuration

1. Create a file frontend/.env with:

VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE

2. Restart the frontend dev server after setting it.
3. In Google Cloud Console, add these Authorized JavaScript origins as needed:
   - http://127.0.0.1:5173
   - http://localhost:5173
   - http://127.0.0.1:5174
   - http://localhost:5174

Backend environment:
- Set GOOGLE_OAUTH_CLIENT_ID to the same client ID.
