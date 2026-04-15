// Determine API base URL based on environment
function getApiBaseUrl() {
  // Check if running in Capacitor (mobile app)
  const isCapacitor = typeof window !== 'undefined' &&
    (window.Capacitor || window.ionic ||
      /capacitor/i.test(navigator.userAgent) ||
      /ionic/i.test(navigator.userAgent));

  // In Capacitor (mobile app), always use production deployment URL
  // No localhost - mobile apps must connect to the deployed backend
  if (isCapacitor) {
    return import.meta.env.VITE_PRODUCTION_API_URL || 'https://msp-miu.tech/api';
  }

  // Web app: use production URL in production, development URL in development
  if (import.meta.env.PROD) {
    // Production web app - use production API URL from env or relative URL as fallback
    return import.meta.env.VITE_PRODUCTION_API_URL || '/api';
  }

  // Development web app - use development API URL from env or localhost as fallback
  return import.meta.env.VITE_DEVELOPMENT_API_URL || 'http://localhost:3000/api';
}

const API_BASE_URL = getApiBaseUrl();

// Simple cache implementation
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(url, options = {}) {
  return `${url}_${JSON.stringify(options)}`;
}

function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

class ApiService {
  // Get auth token from localStorage
  static getAuthToken() {
    return localStorage.getItem('authToken');
  }

  // Set auth token in localStorage
  static setAuthToken(token) {
    localStorage.setItem('authToken', token);
  }

  // Remove auth token from localStorage
  static removeAuthToken() {
    localStorage.removeItem('authToken');
  }

  // Get headers with auth token if available
  static getHeaders(includeAuth = false) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Login method
  static async login(university_id, password) {
    try {
      console.log('API Service - Attempting login for university ID:', university_id);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ university_id, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      // Store the token if login is successful
      if (result.token) {
        this.setAuthToken(result.token);
      }

      return result;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }

  // Logout method
  static async logout() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders(true),
      });

      // Parse response if available
      if (response.ok) {
        const result = await response.json();
        console.log('Logout successful:', result.message);
      }

      // Remove token regardless of response (client-side logout)
      this.removeAuthToken();

      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      // Remove token even if logout fails (ensure client-side logout)
      this.removeAuthToken();
      return true; // Return true since token is removed client-side
    }
  }

  // Quick logout - removes token and redirects (no API call)
  static logoutAndRedirect(redirectPath = '/') {
    this.removeAuthToken();
    window.location.href = redirectPath;
  }

  // Logout with callback (useful for React Router navigation)
  static async logoutWithCallback(callback) {
    try {
      await this.logout();
      if (callback && typeof callback === 'function') {
        callback();
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Still execute callback even if logout fails
      if (callback && typeof callback === 'function') {
        callback();
      } else {
        window.location.href = '/';
      }
    }
  }

  // Check if token is expired
  static isTokenExpired() {
    const token = this.getAuthToken();
    if (!token) return true;

    try {
      // Decode JWT token (without verification, just to check expiration)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= exp;
    } catch (error) {
      // If token is malformed, consider it expired
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  // Check if user is authenticated (token exists and is not expired)
  static isAuthenticated() {
    const token = this.getAuthToken();
    if (!token) return false;

    // Check if token is expired
    if (this.isTokenExpired()) {
      // Token expired, remove it
      this.removeAuthToken();
      return false;
    }

    return true;
  }

  // Check authentication and handle token expiration
  static checkAuthAndHandleExpiration() {
    if (this.isTokenExpired()) {
      this.removeAuthToken();
      return false;
    }
    return true;
  }

  static async getProfile() {
    try {
      // Check if token is expired before making request
      if (this.isTokenExpired()) {
        this.removeAuthToken();
        throw new Error('Token expired. Please login again.');
      }

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: this.getHeaders(true),
      });

      // Handle 401 Unauthorized (token expired or invalid)
      if (response.status === 401) {
        this.removeAuthToken();
        throw new Error('Token expired. Please login again.');
      }

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to fetch profile');
      }

      const result = await response.json();
      return result.user;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  }

  static async updateProfile(profileData, profilePictureFile = null, scheduleFile = null) {
    try {
      // Check if token is expired before making request
      if (this.isTokenExpired()) {
        this.removeAuthToken();
        throw new Error('Token expired. Please login again.');
      }

      const formData = new FormData();

      // Add text fields
      if (profileData.full_name) {
        formData.append('full_name', profileData.full_name);
      }

      // Add files if provided
      if (profilePictureFile) {
        formData.append('profile_picture', profilePictureFile);
      }

      if (scheduleFile) {
        formData.append('schedule', scheduleFile);
      }

      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: formData,
      });

      // Handle 401 Unauthorized (token expired or invalid)
      if (response.status === 401) {
        this.removeAuthToken();
        throw new Error('Token expired. Please login again.');
      }

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to update profile');
      }

      const result = await response.json();
      return result.user;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Activate account - set password for user by token or email
  static async activateAccount(token, password, email = null) {
    try {
      const body = { password };

      // Prefer token over email for security
      if (token) {
        body.token = token;
      } else if (email) {
        body.email = email;
      } else {
        throw new Error('Token or email is required');
      }

      const response = await fetch(`${API_BASE_URL}/auth/activate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Account activation failed');
      }

      return result;
    } catch (error) {
      console.error('Error during account activation:', error);
      throw error;
    }
  }

  // Verify activation token and get email
  static async verifyActivationToken(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-activation-token`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Token verification failed');
      }

      return result;
    } catch (error) {
      console.error('Error verifying activation token:', error);
      throw error;
    }
  }

  // Request password reset
  static async forgotPassword(university_id = null, email = null) {
    try {
      if (!university_id && !email) {
        throw new Error('University ID or email is required');
      }

      const body = {};
      if (university_id) {
        body.university_id = university_id;
      }
      if (email) {
        body.email = email;
      }

      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to request password reset');
      }

      return result;
    } catch (error) {
      console.error('Error requesting password reset:', error);
      throw error;
    }
  }

  // Reset password using token
  static async resetPassword(token, password) {
    try {
      if (!token) {
        throw new Error('Reset token is required');
      }
      if (!password) {
        throw new Error('New password is required');
      }

      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ token, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      return result;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  static async submitApplication(formData) {
    try {
      console.log('API Service - Sending data:', formData);
      console.log('API Service - JSON stringified:', JSON.stringify(formData));

      const response = await fetch(`${API_BASE_URL}/applications`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(formData),
      });

      console.log('API Service - Response status:', response.status);
      const result = await response.json();
      console.log('API Service - Response data:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application');
      }

      return result;
    } catch (error) {
      console.error('Error submitting application:', error);
      throw error;
    }
  }


  static async getAllApplications(filters = {}) {
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters.first_choice) queryParams.append('first_choice', filters.first_choice);
      if (filters.second_choice) queryParams.append('second_choice', filters.second_choice);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.faculty) queryParams.append('faculty', filters.faculty);
      if (filters.year) queryParams.append('year', filters.year);
      if (filters.search) queryParams.append('search', filters.search);

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/applications${queryString ? `?${queryString}` : ''}`;

      const cacheKey = getCacheKey(url, filters);
      const cachedData = getCachedData(cacheKey);

      if (cachedData) {
        console.log('Returning cached applications data');
        return cachedData;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(true), // Include auth token for protected route
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch applications');
      }

      // Cache the result
      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }
  }

  static async updateApplicationStatus(id, status) {
    try {
      const response = await fetch(`${API_BASE_URL}/applications/${id}/status`, {
        method: 'PUT',
        headers: this.getHeaders(true), // Include auth token for admin access
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update application status');
      }

      // Invalidate cache when data is updated
      cache.clear();

      return result;
    } catch (error) {
      console.error('Error updating application status:', error);
      throw error;
    }
  }

  static async updateApplicationComment(id, comment) {
    try {
      const response = await fetch(`${API_BASE_URL}/applications/${id}/comment`, {
        method: 'PUT',
        headers: this.getHeaders(true), // Include auth token for admin access
        body: JSON.stringify({ comment }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update application comment');
      }

      // Invalidate cache when data is updated
      const cacheKey = getCacheKey(`${API_BASE_URL}/applications`);
      cache.delete(cacheKey);

      return result;
    } catch (error) {
      console.error('Error updating application comment:', error);
      throw error;
    }
  }

  static async deleteApplication(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/applications/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(true), // Include auth token for admin access
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete application');
      }

      // Invalidate cache when data is updated
      const cacheKey = getCacheKey(`${API_BASE_URL}/applications`);
      cache.delete(cacheKey);

      return result;
    } catch (error) {
      console.error('Error deleting application:', error);
      throw error;
    }
  }

  // Get all events with optional filters
  static async getEvents(filters = {}) {
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.upcoming) queryParams.append('upcoming', filters.upcoming);
      if (filters.past) queryParams.append('past', filters.past);

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/events${queryString ? `?${queryString}` : ''}`;

      const cacheKey = getCacheKey(url, filters);
      const cachedData = getCachedData(cacheKey);

      if (cachedData) {
        console.log('Returning cached events data');
        return cachedData;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch events');
      }

      const data = result.data || result;

      // Cache the result
      setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  // Get event by ID
  static async getEventById(id) {
    try {
      const cacheKey = getCacheKey(`${API_BASE_URL}/events/${id}`);
      const cachedData = getCachedData(cacheKey);

      if (cachedData) {
        console.log('Returning cached event data');
        return cachedData;
      }

      const response = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch event');
      }

      const data = result.data || result;

      // Cache the result
      setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching event:', error);
      throw error;
    }
  }

  // ========== Announcements API Methods ==========

  // Get all announcements
  static async getAnnouncements(includeInactive = false) {
    try {
      const queryParams = new URLSearchParams();
      if (includeInactive) queryParams.append('includeInactive', 'true');

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/announcements${queryString ? `?${queryString}` : ''}`;

      const cacheKey = getCacheKey(url);
      const cachedData = getCachedData(cacheKey);

      if (cachedData) {
        console.log('Returning cached announcements data');
        return cachedData;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error(`Expected JSON but received ${contentType || 'unknown content type'}. The API endpoint may not be available.`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch announcements');
      }

      const data = result.data || result;

      // Cache the result
      setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching announcements:', error);
      throw error;
    }
  }

  // Get announcement by ID
  static async getAnnouncementById(id) {
    try {
      const cacheKey = getCacheKey(`${API_BASE_URL}/announcements/${id}`);
      const cachedData = getCachedData(cacheKey);

      if (cachedData) {
        console.log('Returning cached announcement data');
        return cachedData;
      }

      const response = await fetch(`${API_BASE_URL}/announcements/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch announcement');
      }

      const data = result.data || result;

      // Cache the result
      setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching announcement:', error);
      throw error;
    }
  }

  // Create a new announcement (admin/board only)
  static async createAnnouncement(announcementData) {
    try {
      const headers = this.getHeaders(true);

      // Debug: Log if token is being sent
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch(`${API_BASE_URL}/announcements`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(announcementData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Use the actual error message from the server
        const errorMessage = result.error || result.message || 'Failed to create announcement';

        // Provide more specific error messages
        if (response.status === 403) {
          throw new Error(errorMessage || 'Access denied. You do not have permission to create announcements.');
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else {
          throw new Error(errorMessage);
        }
      }

      // Clear announcements cache
      this.clearCache('announcements');

      return result.data;
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }
  }

  // Update an announcement (admin/board only)
  static async updateAnnouncement(id, announcementData) {
    try {
      const response = await fetch(`${API_BASE_URL}/announcements/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(announcementData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update announcement');
      }

      // Clear announcements cache
      this.clearCache('announcements');

      return result.data;
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw error;
    }
  }

  // Delete an announcement (admin/board only)
  static async deleteAnnouncement(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/announcements/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(true),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete announcement');
      }

      // Clear announcements cache
      this.clearCache('announcements');

      return result;
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw error;
    }
  }

  // Create a new event (admin only)
  static async createEvent(eventData) {
    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: this.getHeaders(true), // Include auth token for admin access
        body: JSON.stringify(eventData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create event');
      }

      // Invalidate events cache when new event is created
      const cacheKey = getCacheKey(`${API_BASE_URL}/events`);
      cache.delete(cacheKey);

      return result.data || result;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  // Update an event (admin only)
  static async updateEvent(id, eventData) {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(true), // Include auth token for admin access
        body: JSON.stringify(eventData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update event');
      }

      // Invalidate events cache when event is updated
      const cacheKey = getCacheKey(`${API_BASE_URL}/events`);
      cache.delete(cacheKey);
      const eventCacheKey = getCacheKey(`${API_BASE_URL}/events/${id}`);
      cache.delete(eventCacheKey);

      return result.data || result;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  // Delete an event (admin only)
  static async deleteEvent(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(true), // Include auth token for admin access
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete event');
      }

      // Invalidate events cache when event is deleted
      const cacheKey = getCacheKey(`${API_BASE_URL}/events`);
      cache.delete(cacheKey);
      const eventCacheKey = getCacheKey(`${API_BASE_URL}/events/${id}`);
      cache.delete(eventCacheKey);

      return result;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // ========== Event Feedback API Methods ==========

  // Get all feedback for an event
  static async getEventFeedback(eventId) {
    try {
      const cacheKey = getCacheKey(`${API_BASE_URL}/events/${eventId}/feedback`);
      const cachedData = getCachedData(cacheKey);

      if (cachedData) {
        return cachedData;
      }

      const response = await fetch(`${API_BASE_URL}/events/${eventId}/feedback`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch feedback');
      }

      const data = result.data || result;

      // Cache the result
      setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching event feedback:', error);
      throw error;
    }
  }

  // Add feedback to an event (guests can submit)
  static async addEventFeedback(eventId, feedback) {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/feedback`, {
        method: 'POST',
        headers: this.getHeaders(), // No auth required for guests
        body: JSON.stringify({ feedback }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      // Invalidate feedback cache for this event
      const cacheKey = getCacheKey(`${API_BASE_URL}/events/${eventId}/feedback`);
      cache.delete(cacheKey);

      return result.data || result;
    } catch (error) {
      console.error('Error adding feedback:', error);
      throw error;
    }
  }

  // Delete feedback (admin/board only)
  static async deleteEventFeedback(eventId, feedbackId) {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/feedback/${feedbackId}`, {
        method: 'DELETE',
        headers: this.getHeaders(true), // Include auth token for admin/board
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete feedback');
      }

      // Invalidate feedback cache for this event
      const cacheKey = getCacheKey(`${API_BASE_URL}/events/${eventId}/feedback`);
      cache.delete(cacheKey);

      return result;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw error;
    }
  }

  // Submit attendance request
  static async submitAttendanceRequest(formData) {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit attendance request');
      }

      return result;
    } catch (error) {
      console.error('Error submitting attendance request:', error);
      throw error;
    }
  }

  // Get all attendance requests (with optional filters)
  static async getAttendanceRequests(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.event_id) queryParams.append('event_id', filters.event_id);
      if (filters.attended !== undefined) queryParams.append('attended', filters.attended);
      if (filters.search) queryParams.append('search', filters.search);

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/attendance${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(true), // Include auth token for admin access
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch attendance requests');
      }

      return result.data || result;
    } catch (error) {
      console.error('Error fetching attendance requests:', error);
      throw error;
    }
  }

  // Update attendance request (update attended status)
  static async updateAttendanceRequest(requestId, attended) {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/${requestId}`, {
        method: 'PUT',
        headers: this.getHeaders(true), // Include auth token for admin access
        body: JSON.stringify({ attended }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update attendance request');
      }

      return result;
    } catch (error) {
      console.error('Error updating attendance request:', error);
      throw error;
    }
  }

  // Delete attendance request by ID
  static async deleteAttendanceRequest(requestId) {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/${requestId}`, {
        method: 'DELETE',
        headers: this.getHeaders(true), // Include auth token for admin access
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete attendance request');
      }

      return result;
    } catch (error) {
      console.error('Error deleting attendance request:', error);
      throw error;
    }
  }

  // Export attendance requests to CSV
  static async exportAttendanceRequestsToCSV(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.event_id) queryParams.append('event_id', filters.event_id);
      if (filters.attended !== undefined) queryParams.append('attended', filters.attended);
      if (filters.search) queryParams.append('search', filters.search);

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/attendance/export/csv${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(true), // Include auth token for admin access
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to export attendance requests');
      }

      // Get the CSV content as text
      const csvContent = await response.text();

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `attendance_review_${new Date().toISOString().split('T')[0]}.csv`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create a blob and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const urlObj = URL.createObjectURL(blob);

      link.setAttribute('href', urlObj);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the object URL
      setTimeout(() => URL.revokeObjectURL(urlObj), 100);

      return { success: true };
    } catch (error) {
      console.error('Error exporting attendance requests to CSV:', error);
      throw error;
    }
  }

  // Get all images from cloud storage
  static async getImages() {
    try {
      const response = await fetch(`${API_BASE_URL}/cloud/images`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch images');
      }

      return result.images || [];
    } catch (error) {
      console.error('Error fetching images:', error);
      throw error;
    }
  }

  /**
   * Generic method to get assets by type from cloud storage
   * @param {string} assetType - Type of asset: 'slides', 'videos', 'codes', 'assets', 'event-thumbnails', 'documents'
   * @returns {Promise<Array>} Array of asset objects
   */
  static async getAssets(assetType = 'assets') {
    try {
      const response = await fetch(`${API_BASE_URL}/cloud/assets/${assetType}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to fetch ${assetType}`);
      }

      return result[assetType] || [];
    } catch (error) {
      console.error(`Error fetching ${assetType}:`, error);
      throw error;
    }
  }

  // Legacy convenience methods for backward compatibility
  static async getSlides() {
    return this.getAssets('slides');
  }

  static async getVideos() {
    return this.getAssets('videos');
  }

  static async getCodes() {
    return this.getAssets('codes');
  }

  static async getDocuments() {
    return this.getAssets('documents');
  }

  static async getEventThumbnails() {
    return this.getAssets('event-thumbnails');
  }

  /**
   * Upload a file to R2 storage
   * @param {File} file - The file to upload
   * @param {string} type - The upload type (assets, codes, events, images, mobile, slides)
   * @returns {Promise<{success: boolean, url: string, key: string}>}
   */
  static async uploadFile(file, type) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required for file upload');
      }

      const response = await fetch(`${API_BASE_URL}/upload/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // ===== COMPETITIONS API =====

  /**
   * Get all competitions with optional filters
   * @param {Object} filters - Optional filters (status, etc.)
   * @returns {Promise<Array>}
   */
  static async getCompetitions(filters = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (filters.status) {
        queryParams.append('status', filters.status);
      }

      const url = `${API_BASE_URL}/competitions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(false),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch competitions');
      }

      return result.data || result;
    } catch (error) {
      console.error('Error fetching competitions:', error);
      throw error;
    }
  }

  /**
   * Get a single competition by ID
   * @param {number} id - Competition ID
   * @returns {Promise<Object>}
   */
  static async getCompetitionById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/competitions/${id}`, {
        method: 'GET',
        headers: this.getHeaders(false),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch competition');
      }

      return result.data || result;
    } catch (error) {
      console.error(`Error fetching competition ${id}:`, error);
      throw error;
    }
  }

  /** Public task list for task_quiz competitions (empty array for other types). */
  static async getCompetitionTasks(competitionId) {
    const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/tasks`, {
      method: 'GET',
      headers: this.getHeaders(false),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch tasks');
    return result.data || [];
  }

  // =====================
  // QUIZZES
  // =====================

  static async getQuizById(quizId) {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      method: 'GET',
      headers: this.getHeaders(true),
    });
    let result = {};
    try {
      const text = await response.text();
      result = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Quiz request failed (${response.status})`);
    }
    if (!response.ok) {
      const msg = [result.error, result.details].filter(Boolean).join(' — ');
      throw new Error(msg || `Failed to fetch quiz (${response.status})`);
    }
    return result.data || result;
  }

  static async getQuizAttemptByUser(quizId, userId) {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/attempts/${userId}`, {
      method: 'GET',
      headers: this.getHeaders(true),
    });
    if (response.status === 404) return null;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch attempt');
    return result.data || result;
  }

  static async createQuizAttempt(payload) {
    const response = await fetch(`${API_BASE_URL}/quiz_attempts`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create attempt');
    return result.data || result;
  }

  static async saveQuizAnswer(attemptId, payload) {
    const response = await fetch(`${API_BASE_URL}/quiz_attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to save answer');
    return result.data || result;
  }

  static async submitQuizAttempt(attemptId, payload = {}) {
    const response = await fetch(`${API_BASE_URL}/quiz_attempts/${attemptId}`, {
      method: 'PATCH',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to submit attempt');
    return result.data || result;
  }

  /**
   * Get user's team for a specific competition
   * @param {number} competitionId - Competition ID
   * @returns {Promise<Object|null>}
   */
  static async getUserTeamForCompetition(competitionId) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/my-team`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          return null; // User doesn't have a team
        }
        throw new Error(result.error || 'Failed to fetch team');
      }

      return result.data || result;
    } catch (error) {
      console.error(`Error fetching user team for competition ${competitionId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new competition (admin/board only)
   * @param {Object} competitionData - Competition data
   * @returns {Promise<Object>}
   */
  static async createCompetition(competitionData) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/competitions`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(competitionData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create competition');
      }

      return result.data || result;
    } catch (error) {
      console.error('Error creating competition:', error);
      throw error;
    }
  }

  /**
   * Update competition (admin/board only)
   * @param {number} id - Competition ID
   * @param {Object} competitionData - Updated competition data
   * @returns {Promise<Object>}
   */
  static async updateCompetition(id, competitionData) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/competitions/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(competitionData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update competition');
      }

      return result.data || result;
    } catch (error) {
      console.error(`Error updating competition ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete competition (admin only)
   * @param {number} id - Competition ID
   * @returns {Promise<Object>}
   */
  static async deleteCompetition(id) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/competitions/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(true),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete competition');
      }

      return result;
    } catch (error) {
      console.error(`Error deleting competition ${id}:`, error);
      throw error;
    }
  }

  // =====================
  // TEAMS
  // =====================

  /**
   * Create a new team for a competition
   * @param {Object} teamData - { competition_id, team_name }
   * @returns {Promise<Object>}
   */
  static async createTeam(teamData) {
    try {
      const token = this.getAuthToken();

      const response = await fetch(`${API_BASE_URL}/teams`, {
        method: 'POST',
        headers: this.getHeaders(!!token),
        body: JSON.stringify(teamData),
      });

      const result = await response.json();

      if (!response.ok) {
        const serverMessage = [result.error, result.details].filter(Boolean).join(' - ');
        throw new Error(serverMessage || 'Failed to create team');
      }

      return result.data || result;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  /**
   * Get team by ID
   * @param {number} teamId - Team ID
   * @returns {Promise<Object>}
   */
  static async getTeamById(teamId) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch team');
      }

      return result.data || result;
    } catch (error) {
      console.error(`Error fetching team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Get all teams for a competition
   * @param {number} competitionId - Competition ID
   * @returns {Promise<Array>}
   */
  static async getCompetitionTeams(competitionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/teams`, {
        method: 'GET',
        headers: this.getHeaders(false),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch teams');
      }

      return result.data || result;
    } catch (error) {
      console.error(`Error fetching teams for competition ${competitionId}:`, error);
      throw error;
    }
  }

  /**
   * Invite member to team via email
   * @param {number} teamId - Team ID
   * @param {string} email - Email address to invite
   * @param {Object} memberDetails - Optional member details { name, university_id }
   * @returns {Promise<Object>}
   */
  static async inviteToTeam(teamId, email, memberDetails = {}) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/invite`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({ email, ...memberDetails }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation');
      }

      return result;
    } catch (error) {
      console.error('Error inviting to team:', error);
      throw error;
    }
  }

  /**
   * Verify team invitation token and get invitation details
   * @param {string} token - Invitation token
   * @returns {Promise<Object>} - Invitation details including userExists flag
   */
  static async verifyTeamInvitation(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/teams/verify-invitation?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: this.getHeaders(false),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify invitation');
      }

      return result;
    } catch (error) {
      console.error('Error verifying invitation:', error);
      throw error;
    }
  }

  /**
   * Accept team invitation for NEW user (create account with password)
   * @param {string} token - Invitation token
   * @param {string} password - Password to set for the new account
   * @returns {Promise<Object>} - Returns authToken and user data
   */
  static async acceptTeamInvitationNewUser(token, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/teams/accept-invitation-new-user`, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({ token, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept invitation');
      }

      // Store auth token if provided
      if (result.token) {
        this.setAuthToken(result.token);
      }

      return result;
    } catch (error) {
      console.error('Error accepting invitation (new user):', error);
      throw error;
    }
  }

  /**
   * Accept team invitation for EXISTING user
   * @param {string} token - Invitation token
   * @returns {Promise<Object>}
   */
  static async acceptTeamInvitation(token) {
    try {
      const authToken = this.getAuthToken();
      if (!authToken) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/teams/accept-invitation`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept invitation');
      }

      return result;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Decline team invitation
   * @param {string} token - Invitation token
   * @returns {Promise<Object>}
   */
  static async declineTeamInvitation(token) {
    try {
      const authToken = this.getAuthToken();
      if (!authToken) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/teams/invitations/${token}/decline`, {
        method: 'POST',
        headers: this.getHeaders(true),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to decline invitation');
      }

      return result;
    } catch (error) {
      console.error('Error declining invitation:', error);
      throw error;
    }
  }

  // =====================
  // SUBMISSIONS
  // =====================

  /**
   * Create or update submission (requires FormData for file upload)
   * @param {FormData} formData - Form data with file and submission details
   * @returns {Promise<Object>}
   */
  static async createSubmission(formData) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/submissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit work');
      }

      return result.data || result;
    } catch (error) {
      console.error('Error creating submission:', error);
      throw error;
    }
  }

  /**
   * Get team submission for a competition
   * @param {number|string} competitionId - Competition ID
   * @param {number|string} teamId - Team ID
   * @returns {Promise<Object|null>}
   */
  static async getTeamSubmission(competitionId, teamId, taskId = null) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const q =
        taskId != null && taskId !== ''
          ? `?task_id=${encodeURIComponent(String(taskId))}`
          : '';
      const response = await fetch(
        `${API_BASE_URL}/submissions/competitions/${competitionId}/teams/${teamId}${q}`,
        {
          method: 'GET',
          headers: this.getHeaders(true),
        }
      );

      if (response.status === 404) {
        return null; // No submission yet
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch submission');
      }

      return result.data || result;
    } catch (error) {
      console.error(`Error fetching submission for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Get all submissions for a competition (admin/board only)
   * @param {number} competitionId - Competition ID
   * @returns {Promise<Array>}
   */
  static async getCompetitionSubmissions(competitionId) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/submissions/competition/${competitionId}`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch submissions');
      }

      return result.data || result;
    } catch (error) {
      console.error(`Error fetching submissions for competition ${competitionId}:`, error);
      throw error;
    }
  }

  /**
   * Grade a submission (admin/board only)
   * @param {number} submissionId - Submission ID
   * @param {number} score - Score (0-100)
   * @param {string} feedback - Optional feedback text
   * @returns {Promise<Object>}
   */
  static async gradeSubmission(submissionId, score, feedback = '') {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/submissions/${submissionId}/grade`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify({ score, feedback }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to grade submission');
      }

      return result.data || result;
    } catch (error) {
      console.error(`Error grading submission ${submissionId}:`, error);
      throw error;
    }
  }


  // Admin Panel Part

  /**
   * Check if the current user has admin panel access
   * @returns {Promise<Object>} - { success, boardMember }
   */
  static async checkAdminAccess() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      if (!response.ok) {
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      console.error('Error checking admin access:', error);
      return { success: false };
    }
  }

  /**
   * Get admin dashboard statistics
   */
  static async getAdminDashboard() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch dashboard stats');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching admin dashboard:', error);
      throw error;
    }
  }

  /**
   * Get all competitions (admin)
   */
  static async getAdminCompetitions() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/competitions`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch competitions');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching admin competitions:', error);
      throw error;
    }
  }

  /**
   * Create competition (admin)
   */
  static async createAdminCompetition(data) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/competitions`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create competition');
      }

      return result.data;
    } catch (error) {
      console.error('Error creating competition:', error);
      throw error;
    }
  }

  /**
   * Update competition (admin)
   */
  static async updateAdminCompetition(id, data) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/competitions/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update competition');
      }

      return result.data;
    } catch (error) {
      console.error('Error updating competition:', error);
      throw error;
    }
  }

  /**
   * Delete competition (admin)
   */
  static async deleteAdminCompetition(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/competitions/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(true),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete competition');
      }

      return result;
    } catch (error) {
      console.error('Error deleting competition:', error);
      throw error;
    }
  }

  /** Full quiz for admin (includes is_correct on options). competitionId = competition_id. */
  static async getAdminQuiz(competitionId) {
    const response = await fetch(`${API_BASE_URL}/admin/competitions/${competitionId}/quiz`, {
      method: 'GET',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to load quiz');
    return result.data;
  }

  static async patchAdminQuiz(competitionId, body) {
    const response = await fetch(`${API_BASE_URL}/admin/competitions/${competitionId}/quiz`, {
      method: 'PATCH',
      headers: this.getHeaders(true),
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update quiz');
    return result.data;
  }

  static async createAdminQuizQuestion(competitionId, body) {
    const response = await fetch(`${API_BASE_URL}/admin/competitions/${competitionId}/quiz/questions`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create question');
    return result.data;
  }

  static async updateAdminQuizQuestion(questionId, body) {
    const response = await fetch(`${API_BASE_URL}/admin/quiz/questions/${questionId}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update question');
    return result.data;
  }

  static async deleteAdminQuizQuestion(questionId) {
    const response = await fetch(`${API_BASE_URL}/admin/quiz/questions/${questionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete question');
    return result.data;
  }

  static async createAdminQuizOption(questionId, body) {
    const response = await fetch(`${API_BASE_URL}/admin/quiz/questions/${questionId}/options`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create option');
    return result.data;
  }

  static async updateAdminQuizOption(optionId, body) {
    const response = await fetch(`${API_BASE_URL}/admin/quiz/options/${optionId}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update option');
    return result.data;
  }

  static async deleteAdminQuizOption(optionId) {
    const response = await fetch(`${API_BASE_URL}/admin/quiz/options/${optionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete option');
    return result.data;
  }

  static async createAdminCompetitionTask(competitionId, body) {
    const response = await fetch(`${API_BASE_URL}/admin/competitions/${competitionId}/tasks`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create task');
    return result.data;
  }

  static async updateAdminCompetitionTask(taskId, body) {
    const response = await fetch(`${API_BASE_URL}/admin/competition-tasks/${taskId}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update task');
    return result.data;
  }

  /**
   * Upload a task reference asset to R2 under competitions_tasks_assets/{competitionId}/{taskId}/...
   * Updates the task's assets_url. Admin only.
   */
  static async uploadCompetitionTaskAsset(taskId, file) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/admin/competition-tasks/${taskId}/asset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to upload task asset');
    return result;
  }

  static async deleteAdminCompetitionTask(taskId) {
    const response = await fetch(`${API_BASE_URL}/admin/competition-tasks/${taskId}`, {
      method: 'DELETE',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete task');
    return result.data;
  }

  /**
   * Get attendance requests (admin)
   */
  static async getAdminAttendance(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.event_id) queryParams.append('event_id', filters.event_id);
      if (filters.attended !== undefined) queryParams.append('attended', filters.attended);
      if (filters.date) queryParams.append('date', filters.date);

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/admin/attendance${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch attendance');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching admin attendance:', error);
      throw error;
    }
  }

  /**
   * Update attendance status (admin)
   */
  static async updateAdminAttendance(id, attended) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/attendance/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify({ attended }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update attendance');
      }

      return result.data;
    } catch (error) {
      console.error('Error updating admin attendance:', error);
      throw error;
    }
  }

  /**
   * Get registrations (admin)
   */
  static async getAdminRegistrations(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/admin/registrations${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch registrations');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching admin registrations:', error);
      throw error;
    }
  }

  /**
   * Update registration status (admin)
   */
  static async updateAdminRegistration(id, status) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/registrations/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update registration');
      }

      return result.data;
    } catch (error) {
      console.error('Error updating admin registration:', error);
      throw error;
    }
  }

  /**
   * Get admin notifications (actions on competitions, attendance, registrations)
   * Only accessible for President, Vice President, and Head of Software Development
   */
  static async getAdminNotifications(limit = 50) {
    try {
      const queryParams = new URLSearchParams();
      if (limit) {
        queryParams.append('limit', String(limit));
      }

      const url = `${API_BASE_URL}/admin/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''
        }`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch admin notifications');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
      throw error;
    }
  }

  /**
   * Get all suggestions (admin)
   */
  static async getAdminSuggestions() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/suggestions`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch suggestions');
      return result.data;
    } catch (error) {
      console.error('Error fetching admin suggestions:', error);
      throw error;
    }
  }

  /**
   * Get all event feedback (admin)
   */
  static async getAdminFeedback() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/feedback`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch feedback');
      return result.data;
    } catch (error) {
      console.error('Error fetching admin feedback:', error);
      throw error;
    }
  }
  // ==========================================
  // Admin Teams Management
  // ==========================================

  /**
   * Get all teams for a specific competition (admin)
   */
  static async getAdminCompetitionTeams(competitionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/competitions/${competitionId}/teams`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch teams');
      return result.data;
    } catch (error) {
      console.error('Error fetching admin competition teams:', error);
      throw error;
    }
  }

  /**
   * Create a team for a competition (admin)
   */
  static async createAdminTeam(competitionId, teamData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/competitions/${competitionId}/teams`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(teamData)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create team');
      return result.data;
    } catch (error) {
      console.error('Error creating admin team:', error);
      throw error;
    }
  }

  /**
   * Update an existing team (admin)
   */
  static async updateAdminTeam(teamId, teamData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/teams/${teamId}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(teamData)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update team');
      return result.data;
    } catch (error) {
      console.error('Error updating admin team:', error);
      throw error;
    }
  }

  /**
   * Delete a team (admin)
   */
  static async deleteAdminTeam(teamId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/teams/${teamId}`, {
        method: 'DELETE',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete team');
      return result;
    } catch (error) {
      console.error('Error deleting admin team:', error);
      throw error;
    }
  }
  // Clear cache for a specific key pattern
  static clearCache(pattern) {
    const keysToDelete = [];
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => cache.delete(key));
  }
}

export default ApiService;