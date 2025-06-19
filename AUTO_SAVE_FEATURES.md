# Auto-Save and Session Management Features

## Overview
This document describes the auto-save and session management features implemented to prevent data loss when users are writing supplement reviews.

## Features Implemented

### 1. Extended Session Duration
- **Access Token Lifetime**: Extended from 30 minutes to 4 hours
- **Refresh Token Lifetime**: Extended from 7 days to 30 days
- **Location**: `SupplementRatings/settings.py`

### 2. Automatic Token Refresh
- **Background Refresh**: Tokens are automatically refreshed 5 minutes before expiration
- **Retry Logic**: Up to 3 failed refresh attempts before logout
- **Seamless Experience**: Users don't experience interruptions during normal usage

### 3. Session Warning System
- **Warning Dialog**: Shows 2 minutes before session expiration
- **Countdown Timer**: Visual countdown with progress bar
- **User Options**: 
  - Extend session (attempts token refresh)
  - Logout immediately
- **Non-dismissible**: Prevents accidental dismissal

### 4. Auto-Save Functionality
- **Form Data Backup**: Automatically saves form data to localStorage every 30 seconds
- **Data Restoration**: Automatically restores form data when user returns to the page
- **Smart Detection**: Only saves when form data has actually changed
- **Cross-Session Persistence**: Data persists across browser sessions (up to 24 hours)

### 5. Form Protection
- **Unsaved Changes Warning**: Warns users when closing forms with unsaved changes
- **Automatic Cleanup**: Clears saved data after successful form submission
- **Data Validation**: Ensures only valid form data is saved

## Technical Implementation

### Session Manager (`frontend/src/services/api.js`)
```javascript
class SessionManager {
    // Token refresh scheduling
    scheduleTokenRefresh()
    
    // Warning notification scheduling
    scheduleWarning()
    
    // Automatic token refresh
    refreshToken()
    
    // Form data management
    saveFormDataToStorage()
    loadFormDataFromStorage()
    clearFormDataFromStorage()
}
```

### Auto-Save Hook (`frontend/src/hooks/useAutoSave.js`)
```javascript
const useAutoSave = (formKey, formData, saveFunction, options) => {
    // Automatic saving every 30 seconds
    // Data restoration on component mount
    // Manual save and clear functions
}
```

### Session Warning Component (`frontend/src/components/SessionWarning.jsx`)
- Material-UI dialog with countdown timer
- Progress bar showing time remaining
- Extend session and logout options

## User Experience

### Writing Reviews
1. **Auto-Save**: Form data is automatically saved every 30 seconds
2. **Session Warning**: If session is about to expire, user gets a warning dialog
3. **Data Restoration**: If user returns to the page, their work is automatically restored
4. **Unsaved Changes**: Warning when trying to close form with unsaved changes

### Session Management
1. **Seamless Refresh**: Tokens are refreshed automatically in the background
2. **Warning System**: Users are notified 2 minutes before session expiration
3. **Graceful Degradation**: If refresh fails, user is logged out with clear messaging

## Configuration

### Token Lifetimes
```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=4),      # 4 hours
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),     # 30 days
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
}
```

### Auto-Save Settings
- **Interval**: 30 seconds
- **Storage Duration**: 24 hours
- **Form Types**: Rating forms, comment forms

### Session Warning Settings
- **Warning Time**: 2 minutes before expiration
- **Refresh Attempts**: 3 attempts before logout
- **Retry Delay**: 30 seconds between attempts

## Benefits

1. **Data Loss Prevention**: Users never lose their work due to session expiration
2. **Improved UX**: Longer sessions mean fewer interruptions
3. **Automatic Recovery**: Form data is automatically restored
4. **Clear Communication**: Users are informed about session status
5. **Graceful Handling**: Smooth handling of session expiration

## Security Considerations

1. **Token Rotation**: Refresh tokens are rotated on each use
2. **Blacklisting**: Used tokens are blacklisted
3. **Secure Storage**: Form data is stored locally, not on server
4. **Automatic Cleanup**: Old data is automatically removed
5. **Limited Scope**: Only form data is saved, not sensitive information

## Future Enhancements

1. **Server-Side Auto-Save**: Save drafts to server for cross-device access
2. **Collaborative Editing**: Real-time collaboration on reviews
3. **Version History**: Track changes and allow rollback
4. **Offline Support**: Work offline with sync when connection restored
5. **Advanced Notifications**: Browser notifications for session warnings 