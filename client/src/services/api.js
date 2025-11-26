const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3000/api';

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
        headers: this.getHeaders(false), // No auth token required for now
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

  static async updateApplicationStatus(id, status, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/applications/${id}/status`, {
        method: 'PUT',
        headers: this.getHeaders(true), // Include auth token for admin access
        body: JSON.stringify({ status, password }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update application status');
      }

      // Invalidate cache when data is updated
      const cacheKey = getCacheKey(`${API_BASE_URL}/applications`);
      cache.delete(cacheKey);

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
}

export default ApiService;
