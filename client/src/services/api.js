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

/** Append page/limit query params when present on options. */
function appendPaginationParams(queryParams, options = {}) {
  if (options.page != null && options.page !== '') {
    queryParams.append('page', String(options.page));
  }
  if (options.limit != null && options.limit !== '') {
    queryParams.append('limit', String(options.limit));
  }
}

/** Append season_id when present (current | all | numeric). */
function appendSeasonParams(queryParams, options = {}) {
  if (options.season_id != null && options.season_id !== '') {
    queryParams.append('season_id', String(options.season_id));
  }
}

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

  /**
   * Check whether an applicant is eligible to apply before they fill the full form.
   * Called after step 0 (Personal Info) on the /become-member page.
   *
   * @param {{ university_id: string, full_name: string, email: string }} payload
   * @returns {Promise<{ eligible: boolean, reason?: string, message?: string, warning?: string }>}
   */
  static async checkApplicationEligibility(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/applications/check-eligibility`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to check eligibility');
      }

      return result;
    } catch (error) {
      console.error('Error checking application eligibility:', error);
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
      appendPaginationParams(queryParams, filters);
      appendSeasonParams(queryParams, filters);

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
      appendPaginationParams(queryParams, filters);
      appendSeasonParams(queryParams, filters);

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

      // Cache the full paginated result
      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  static async getSponsors(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      appendPaginationParams(queryParams, filters);
      appendSeasonParams(queryParams, filters);
      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/sponsors${queryString ? `?${queryString}` : ''}`;
      const cacheKey = getCacheKey(url, filters);
      const cachedData = getCachedData(cacheKey);

      if (cachedData) {
        return cachedData;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch sponsors');
      }

      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      throw error;
    }
  }

  static async createSponsor(payload) {
    const response = await fetch(`${API_BASE_URL}/sponsors`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create sponsor');
    this.clearCache('sponsors');
    return result;
  }

  static async updateSponsor(id, payload) {
    const response = await fetch(`${API_BASE_URL}/sponsors/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update sponsor');
    this.clearCache('sponsors');
    return result;
  }

  static async deleteSponsor(id) {
    const response = await fetch(`${API_BASE_URL}/sponsors/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete sponsor');
    this.clearCache('sponsors');
    return result;
  }

  static async getBoard(filters = {}) {
    const queryParams = new URLSearchParams();
    appendPaginationParams(queryParams, filters);
    appendSeasonParams(queryParams, filters);
    if (filters.includeHidden) queryParams.set('includeHidden', 'true');
    const qs = queryParams.toString();
    const response = await fetch(`${API_BASE_URL}/board${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: this.getHeaders(filters.includeHidden),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch board');
    return result;
  }

  static async createBoardMember(payload) {
    const response = await fetch(`${API_BASE_URL}/board`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create board member');
    return result;
  }

  static async updateBoardMember(id, payload) {
    const response = await fetch(`${API_BASE_URL}/board/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update board member');
    return result;
  }

  /** Send a board account activation email to a single board member. */
  static async sendBoardActivationEmail(id) {
    const response = await fetch(
      `${API_BASE_URL}/board/${id}/send-activation-email`,
      {
        method: 'POST',
        headers: this.getHeaders(true),
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to send board activation email');
    return result;
  }

  static async getMyBoardMembership() {
    const response = await fetch(`${API_BASE_URL}/board/me`, {
      method: 'GET',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch board membership');
    return result;
  }

  static async updateMyBoardPhoto(photoUrlOrFile) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    let body;
    const headers = { Authorization: `Bearer ${token}` };

    if (photoUrlOrFile instanceof File || photoUrlOrFile instanceof Blob) {
      body = new FormData();
      body.append('photo', photoUrlOrFile);
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ photo_url: photoUrlOrFile });
    }

    const response = await fetch(`${API_BASE_URL}/board/me/photo`, {
      method: 'PUT',
      headers,
      body,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update Meet the Board photo');
    return result;
  }

  static async deleteBoardMember(id) {
    const response = await fetch(`${API_BASE_URL}/board/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete board member');
    return result;
  }

  static async getDepartments(filters = {}) {
    const queryParams = new URLSearchParams();
    appendPaginationParams(queryParams, filters);
    const qs = queryParams.toString();
    const response = await fetch(`${API_BASE_URL}/departments${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch departments');
    return result;
  }

  static async createDepartment(payload) {
    const response = await fetch(`${API_BASE_URL}/departments`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create department');
    return result;
  }

  static async updateDepartment(id, payload) {
    const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update department');
    return result;
  }

  static async deleteDepartment(id) {
    const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete department');
    return result;
  }

  static async getSiteContent(keys) {
    const query = keys?.length ? `?keys=${keys.join(',')}` : '';
    const response = await fetch(`${API_BASE_URL}/site-content${query}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch site content');
    return result;
  }

  static async getSiteContentKey(key) {
    const response = await fetch(`${API_BASE_URL}/site-content/${key}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch site content');
    return result;
  }

  static async updateSiteContent(key, value) {
    const response = await fetch(`${API_BASE_URL}/site-content/${key}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify({ value }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update site content');
    return result;
  }

  static async resetSiteContent(key) {
    const response = await fetch(`${API_BASE_URL}/site-content/${key}/reset`, {
      method: 'POST',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to reset site content');
    return result;
  }

  static async deleteCloudObject(key) {
    const response = await fetch(`${API_BASE_URL}/cloud/object`, {
      method: 'DELETE',
      headers: this.getHeaders(true),
      body: JSON.stringify({ key }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete media');
    return result;
  }

  /**
   * Replace an existing cloud object in-place (same R2 key).
   * @param {string} key - Existing object key (e.g. Images/foo.jpg)
   * @param {File} file - Replacement file (same extension required)
   */
  static async replaceCloudObject(key, file) {
    const token = this.getAuthToken();
    if (!token) throw new Error('Authentication required');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', key);
    const response = await fetch(`${API_BASE_URL}/cloud/object`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to replace media');
    return result;
  }

  static async getMembers(filters = {}) {
    const queryParams = new URLSearchParams();
    appendPaginationParams(queryParams, filters);
    appendSeasonParams(queryParams, filters);
    if (filters.search) queryParams.set('search', filters.search);
    if (filters.department_id) queryParams.set('department_id', filters.department_id);
    if (filters.faculty) queryParams.set('faculty', filters.faculty);
    const qs = queryParams.toString();
    const response = await fetch(`${API_BASE_URL}/members${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch members');
    return result;
  }

  static async updateMember(id, payload) {
    const response = await fetch(`${API_BASE_URL}/members/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update member');
    return result;
  }

  static async deleteMember(id) {
    const response = await fetch(`${API_BASE_URL}/members/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete member');
    return result;
  }

  /** Export members (per faculty) + board as a ZIP of CSV files. */
  static async exportMembersAndBoardToCSV(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      appendSeasonParams(queryParams, filters);
      const qs = queryParams.toString();
      const url = `${API_BASE_URL}/members/export/csv${qs ? `?${qs}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to export members/board');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `MSP - MIU Members & Board ${new Date().getFullYear()}.zip`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      }

      const link = document.createElement('a');
      const urlObj = URL.createObjectURL(blob);
      link.setAttribute('href', urlObj);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(urlObj), 100);

      return { success: true };
    } catch (error) {
      console.error('Error exporting members/board to CSV:', error);
      throw error;
    }
  }

  /** Send activation emails to members without an activated account (optional season filter). */
  static async sendMemberActivationEmails(filters = {}) {
    const queryParams = new URLSearchParams();
    appendSeasonParams(queryParams, filters);
    const qs = queryParams.toString();
    const response = await fetch(
      `${API_BASE_URL}/members/send-activation-emails${qs ? `?${qs}` : ''}`,
      {
        method: 'POST',
        headers: this.getHeaders(true),
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to send activation emails');
    return result;
  }

  /** Send an account-creation / activation email to a single member. */
  static async sendMemberActivationEmail(id) {
    const response = await fetch(
      `${API_BASE_URL}/members/${id}/send-activation-email`,
      {
        method: 'POST',
        headers: this.getHeaders(true),
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to send activation email');
    return result;
  }

  // ── Email templates (Email Management) ──────────────────────────
  static async getEmailTemplates() {
    const response = await fetch(`${API_BASE_URL}/email-templates`, {
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to load email templates');
    return result;
  }

  static async getEmailTemplate(key) {
    const response = await fetch(`${API_BASE_URL}/email-templates/${encodeURIComponent(key)}`, {
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to load email template');
    return result;
  }

  static async updateEmailTemplate(key, payload) {
    const response = await fetch(`${API_BASE_URL}/email-templates/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update email template');
    return result;
  }

  static async resetEmailTemplate(key) {
    const response = await fetch(`${API_BASE_URL}/email-templates/${encodeURIComponent(key)}/reset`, {
      method: 'POST',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to reset email template');
    return result;
  }

  static async sendEmailTemplateTest(key, body = {}) {
    const response = await fetch(`${API_BASE_URL}/email-templates/${encodeURIComponent(key)}/test`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to send test email');
    return result;
  }

  static async getDepartmentWhatsAppLinks() {
    const response = await fetch(`${API_BASE_URL}/email-templates/departments/whatsapp`, {
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to load WhatsApp links');
    return result;
  }

  static async updateDepartmentWhatsApp(id, whatsapp_group_url) {
    const response = await fetch(
      `${API_BASE_URL}/email-templates/departments/${id}/whatsapp`,
      {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify({ whatsapp_group_url }),
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update WhatsApp link');
    return result;
  }

  static async sendEmailMemberActivation(filters = {}) {
    const queryParams = new URLSearchParams();
    appendSeasonParams(queryParams, filters);
    const qs = queryParams.toString();
    const response = await fetch(
      `${API_BASE_URL}/email-templates/send/member-activation${qs ? `?${qs}` : ''}`,
      { method: 'POST', headers: this.getHeaders(true) }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to send member activation emails');
    return result;
  }

  static async sendEmailBoardActivation(filters = {}) {
    const queryParams = new URLSearchParams();
    appendSeasonParams(queryParams, filters);
    const qs = queryParams.toString();
    const response = await fetch(
      `${API_BASE_URL}/email-templates/send/board-activation${qs ? `?${qs}` : ''}`,
      { method: 'POST', headers: this.getHeaders(true) }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to send board activation emails');
    return result;
  }

  static async sendEmailMemberAcceptance(filters = {}) {
    const queryParams = new URLSearchParams();
    appendSeasonParams(queryParams, filters);
    const qs = queryParams.toString();
    const response = await fetch(
      `${API_BASE_URL}/email-templates/send/member-acceptance${qs ? `?${qs}` : ''}`,
      { method: 'POST', headers: this.getHeaders(true) }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to send acceptance emails');
    return result;
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
  // options: { includeInactive?: boolean, forAdmin?: boolean, page?: number, limit?: number }
  static async getAnnouncements(includeInactiveOrOptions = false) {
    try {
      const options =
        typeof includeInactiveOrOptions === 'object' && includeInactiveOrOptions !== null
          ? includeInactiveOrOptions
          : { includeInactive: !!includeInactiveOrOptions };

      const queryParams = new URLSearchParams();
      if (options.includeInactive) queryParams.append('includeInactive', 'true');
      if (options.forAdmin) queryParams.append('forAdmin', 'true');
      appendPaginationParams(queryParams, options);
      appendSeasonParams(queryParams, options);

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/announcements${queryString ? `?${queryString}` : ''}`;

      const cacheKey = getCacheKey(url, options);
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

      // Cache the full paginated result
      setCachedData(cacheKey, result);
      return result;
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
  // Returns { data, emailJob?, message }
  static async createAnnouncement(announcementData) {
    try {
      const headers = this.getHeaders(true);

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
        const errorMessage = result.error || result.message || 'Failed to create announcement';

        if (response.status === 403) {
          throw new Error(errorMessage || 'Access denied. You do not have permission to create announcements.');
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else {
          throw new Error(errorMessage);
        }
      }

      this.clearCache('announcements');

      return {
        data: result.data,
        emailJob: result.emailJob || null,
        message: result.message || 'Announcement created successfully',
      };
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }
  }

  static async getAnnouncementEmailJob(jobId) {
    const response = await fetch(`${API_BASE_URL}/announcements/email-jobs/${jobId}`, {
      method: 'GET',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch email job status');
    }
    return result.data;
  }

  // Approve an announcement and dispatch email broadcast (President/VP only)
  static async approveAnnouncement(id, editData = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}/announcements/${id}/approve`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(editData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve announcement');
      }

      this.clearCache('announcements');
      return result;
    } catch (error) {
      console.error('Error approving announcement:', error);
      throw error;
    }
  }

  // Refuse / reject an announcement email broadcast (President/VP only)
  static async rejectAnnouncement(id, reason = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/announcements/${id}/reject`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify({ reason }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to refuse announcement');
      }

      this.clearCache('announcements');
      return result;
    } catch (error) {
      console.error('Error refusing announcement:', error);
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
  static async getEventFeedback(eventId, filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      appendPaginationParams(queryParams, filters);
      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/events/${eventId}/feedback${queryString ? `?${queryString}` : ''}`;
      const cacheKey = getCacheKey(url, filters);
      const cachedData = getCachedData(cacheKey);

      if (cachedData) {
        return cachedData;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch feedback');
      }

      setCachedData(cacheKey, result);
      return result;
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

  /** Public suggestion form — auth optional (links member when logged in). */
  static async submitSuggestion(payload) {
    try {
      const includeAuth = this.isAuthenticated();
      const response = await fetch(`${API_BASE_URL}/suggestions`, {
        method: 'POST',
        headers: this.getHeaders(includeAuth),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit suggestion');
      }

      return result;
    } catch (error) {
      console.error('Error submitting suggestion:', error);
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
      appendPaginationParams(queryParams, filters);

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

      return result;
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
  static async getImages(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      appendPaginationParams(queryParams, filters);
      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/cloud/images${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch images');
      }

      return result;
    } catch (error) {
      console.error('Error fetching images:', error);
      throw error;
    }
  }

  /**
   * Generic method to get assets by type from cloud storage
   * @param {string} assetType - Type of asset: 'slides', 'videos', 'codes', 'assets', 'event-thumbnails', 'documents'
   * @param {Object} filters - Optional page/limit
   * @returns {Promise<Object>} Paginated result with type array + pagination
   */
  static async getAssets(assetType = 'assets', filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      appendPaginationParams(queryParams, filters);
      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/cloud/assets/${assetType}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to fetch ${assetType}`);
      }

      return result;
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
   * @param {string} type - The upload type (assets, board_photos, codes, events, images, mobile, slides, courses, …)
   * @param {Record<string, string|number>} [query] - Optional query (course_id, lesson_id, kind)
   * @returns {Promise<{success: boolean, url: string, key: string}>}
   */
  static async uploadFile(file, type, query = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required for file upload');
      }

      const params = new URLSearchParams();
      Object.entries(query || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
      });
      const qs = params.toString();
      const url = `${API_BASE_URL}/upload/${type}${qs ? `?${qs}` : ''}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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

  // ===== COURSES API =====

  static async getCourses(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') queryParams.append(k, String(v));
    });
    const queryString = queryParams.toString();
    const response = await fetch(`${API_BASE_URL}/courses${queryString ? `?${queryString}` : ''}`, {
      headers: this.getHeaders()
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch courses');
    return result;
  }

  static async getAdminCourses(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') queryParams.append(k, String(v));
    });
    const queryString = queryParams.toString();
    const response = await fetch(`${API_BASE_URL}/courses/admin/list${queryString ? `?${queryString}` : ''}`, {
      headers: this.getHeaders(true)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch courses');
    return result;
  }

  static async getCourseById(id, { admin = false } = {}) {
    const url = admin
      ? `${API_BASE_URL}/courses/${id}/admin`
      : `${API_BASE_URL}/courses/${id}`;
    const response = await fetch(url, { headers: this.getHeaders(admin) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch course');
    return result.data || result;
  }

  static async createCourse(data) {
    const response = await fetch(`${API_BASE_URL}/courses`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create course');
    return result.data || result;
  }

  static async updateCourse(id, data) {
    const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update course');
    return result.data || result;
  }

  static async updateCourseStatus(id, status) {
    const response = await fetch(`${API_BASE_URL}/courses/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify({ status })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update status');
    return result;
  }

  static async deleteCourse(id) {
    const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(true)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete course');
    return result;
  }

  static async createCourseLesson(courseId, data) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/lessons`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create lesson');
    return result.data || result;
  }

  static async updateCourseLesson(courseId, lessonId, data) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update lesson');
    return result.data || result;
  }

  static async deleteCourseLesson(courseId, lessonId) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}`, {
      method: 'DELETE',
      headers: this.getHeaders(true)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete lesson');
    return result;
  }

  static async reorderCourseLessons(courseId, order) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/lessons/reorder`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify({ order })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to reorder lessons');
    return result;
  }

  static async createCourseMaterial(courseId, lessonId, data) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/materials`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create material');
    return result.data || result;
  }

  static async updateCourseMaterial(courseId, lessonId, materialId, data) {
    const response = await fetch(
      `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/materials/${materialId}`,
      {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(data)
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update material');
    return result.data || result;
  }

  static async deleteCourseMaterial(courseId, lessonId, materialId) {
    const response = await fetch(
      `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/materials/${materialId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(true)
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete material');
    return result;
  }

  static async enrollInCourse(courseId, data) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) {
      const err = new Error(result.error || 'Failed to enroll');
      err.status = response.status;
      err.data = result.data;
      throw err;
    }
    return result;
  }

  static async enrollInCourseWithAccount(courseId) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/enroll/me`, {
      method: 'POST',
      headers: this.getHeaders(true)
    });
    const result = await response.json();
    if (!response.ok) {
      const err = new Error(result.error || 'Failed to enroll with account');
      err.status = response.status;
      err.data = result.data;
      throw err;
    }
    return result;
  }

  static async markCourseLessonComplete(courseId, { token, lesson_id }) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/progress`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ token, lesson_id })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to mark complete');
    return result.data || result;
  }

  static async getCourseMyProgress(courseId, token) {
    const response = await fetch(
      `${API_BASE_URL}/courses/${courseId}/my-progress?token=${encodeURIComponent(token)}`,
      { headers: this.getHeaders() }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to get progress');
    return result.data || result;
  }

  static async updateCourseEnrollmentName(courseId, { token, full_name }) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/enrollment/name`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ token, full_name })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update certificate name');
    return result;
  }

  static async getCourseEnrollments(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && k !== 'course_id') {
        queryParams.append(k, String(v));
      }
    });
    const qs = queryParams.toString();
    const base = filters.course_id
      ? `${API_BASE_URL}/courses/${filters.course_id}/enrollments`
      : `${API_BASE_URL}/courses/admin/enrollments`;
    const response = await fetch(`${base}${qs ? `?${qs}` : ''}`, {
      headers: this.getHeaders(true)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch enrollments');
    return result;
  }

  static async updateCourseEnrollment(enrollmentId, data, courseId) {
    const url = courseId
      ? `${API_BASE_URL}/courses/${courseId}/enrollments/${enrollmentId}`
      : `${API_BASE_URL}/courses/admin/enrollments/${enrollmentId}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update enrollment');
    return result.data || result;
  }

  static async deleteCourseEnrollment(enrollmentId, courseId) {
    const url = courseId
      ? `${API_BASE_URL}/courses/${courseId}/enrollments/${enrollmentId}`
      : `${API_BASE_URL}/courses/admin/enrollments/${enrollmentId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(true)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete enrollment');
    return result;
  }

  static async getCourseLessonAttendance(courseId, lessonId) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/attendance`, {
      headers: this.getHeaders(true)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch lesson attendance');
    return result.data || result;
  }

  static async updateCourseLessonAttendance(courseId, lessonId, enrollmentId, data) {
    const response = await fetch(
      `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/attendance/${enrollmentId}`,
      {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(data)
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update lesson attendance');
    return result.data || result;
  }

  static async bulkUpdateCourseLessonAttendance(courseId, lessonId, data) {
    const response = await fetch(
      `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/attendance`,
      {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(data)
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to bulk update lesson attendance');
    return result.data || result;
  }

  static async exportCourseEnrollmentsCsv(courseId) {
    const url = courseId
      ? `${API_BASE_URL}/courses/${courseId}/enrollments/export`
      : `${API_BASE_URL}/courses/admin/enrollments/export`;
    const response = await fetch(url, { headers: this.getHeaders(true) });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'Failed to export CSV');
    }
    return response.blob();
  }

  // ── Course Announcements & Communications ──────────────────────
  static async getCourseAnnouncements(courseId, filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') queryParams.append(k, String(v));
    });
    const qs = queryParams.toString();
    const response = await fetch(
      `${API_BASE_URL}/courses/${courseId}/announcements${qs ? `?${qs}` : ''}`,
      { headers: this.getHeaders(true) }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch course announcements');
    return result;
  }

  static async getCourseAnnouncementById(courseId, announcementId) {
    const response = await fetch(
      `${API_BASE_URL}/courses/${courseId}/announcements/${announcementId}`,
      { headers: this.getHeaders(true) }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch course announcement');
    return result.data || result;
  }

  static async getCourseRecipientsPreview(courseId, params = {}) {
    const response = await fetch(
      `${API_BASE_URL}/courses/${courseId}/announcements/recipients-preview`,
      {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(params)
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to preview recipients');
    return result.data || result;
  }

  static async createCourseAnnouncement(courseId, data) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/announcements`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create course announcement');
    return result;
  }

  static async sendDirectCourseMemberMessage(courseId, data) {
    const response = await fetch(
      `${API_BASE_URL}/courses/${courseId}/announcements/message-member`,
      {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(data)
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to send message to member');
    return result;
  }

  static async updateCourseAnnouncement(courseId, announcementId, data) {
    const response = await fetch(
      `${API_BASE_URL}/courses/${courseId}/announcements/${announcementId}`,
      {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(data)
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update course announcement');
    return result;
  }

  static async deleteCourseAnnouncement(courseId, announcementId, { hard = false } = {}) {
    const response = await fetch(
      `${API_BASE_URL}/courses/${courseId}/announcements/${announcementId}${hard ? '?hard=1' : ''}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(true)
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete course announcement');
    return result;
  }

  static async resendCourseAnnouncementEmails(courseId, announcementId) {
    const response = await fetch(
      `${API_BASE_URL}/courses/${courseId}/announcements/${announcementId}/resend-emails`,
      {
        method: 'POST',
        headers: this.getHeaders(true)
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to resend announcement emails');
    return result;
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
      appendPaginationParams(queryParams, filters);
      appendSeasonParams(queryParams, filters);

      const url = `${API_BASE_URL}/competitions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(false),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch competitions');
      }

      return result;
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
  static async getCompetitionTasks(competitionId, filters = {}) {
    const queryParams = new URLSearchParams();
    appendPaginationParams(queryParams, filters);
    const qs = queryParams.toString();
    const response = await fetch(
      `${API_BASE_URL}/competitions/${competitionId}/tasks${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        headers: this.getHeaders(false),
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch tasks');
    return result;
  }

  /** Admin task list for task_quiz competitions (no unlock gate, requires auth). */
  static async getAdminCompetitionTasks(competitionId, filters = {}) {
    const queryParams = new URLSearchParams();
    appendPaginationParams(queryParams, filters);
    const qs = queryParams.toString();
    const response = await fetch(
      `${API_BASE_URL}/admin/competitions/${competitionId}/tasks${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        headers: this.getHeaders(true),
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch tasks');
    return result;
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
  static async getCompetitionTeams(competitionId, filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      appendPaginationParams(queryParams, filters);
      const qs = queryParams.toString();
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/teams${qs ? `?${qs}` : ''}`,
        {
          method: 'GET',
          headers: this.getHeaders(false),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch teams');
      }

      return result;
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
  static async getCompetitionSubmissions(competitionId, filters = {}) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const queryParams = new URLSearchParams();
      appendPaginationParams(queryParams, filters);
      const qs = queryParams.toString();

      const response = await fetch(
        `${API_BASE_URL}/submissions/competitions/${competitionId}${qs ? `?${qs}` : ''}`,
        {
          method: 'GET',
          headers: this.getHeaders(true),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch submissions');
      }

      return result;
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

  static async getSubmissionEvaluation(submissionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/evaluation/${submissionId}`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load submission evaluation');
      }
      return result.data || result;
    } catch (error) {
      console.error(`Error loading evaluation for submission ${submissionId}:`, error);
      throw error;
    }
  }

  static async submitJudgeScore(submissionId, payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/evaluation/judge/${submissionId}`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit judge score');
      }
      return result.data || result;
    } catch (error) {
      console.error(`Error submitting judge score for ${submissionId}:`, error);
      throw error;
    }
  }

  /**
   * Competitor task_quiz marks page data (team member scoped).
   */
  static async getMyTaskQuizEvaluation(competitionId, teamId) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${API_BASE_URL}/evaluation/my-task-quiz/${competitionId}/team/${teamId}`,
        {
          method: 'GET',
          headers: this.getHeaders(true),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch marks');
      }
      return result.data || result;
    } catch (error) {
      console.error('Error fetching task quiz marks:', error);
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
   * Search board, members, and users for linking season board rows.
   * @param {string} q
   */
  static async searchAdminPeople(q) {
    const queryParams = new URLSearchParams();
    if (q) queryParams.set('q', q);
    const qs = queryParams.toString();
    const response = await fetch(
      `${API_BASE_URL}/admin/people-search${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        headers: this.getHeaders(true),
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to search people');
    return result;
  }

  /**
   * Fetch recent in-memory server logs (full admin only).
   * @param {{ level?: string, type?: string, q?: string, limit?: number, sinceId?: number }} [filters]
   */
  static async getAdminLogs(filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.level) queryParams.set('level', filters.level);
    if (filters.type) queryParams.set('type', filters.type);
    if (filters.q) queryParams.set('q', filters.q);
    if (filters.limit) queryParams.set('limit', String(filters.limit));
    if (filters.sinceId != null) queryParams.set('sinceId', String(filters.sinceId));
    const qs = queryParams.toString();
    const response = await fetch(
      `${API_BASE_URL}/admin/logs${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        headers: this.getHeaders(true),
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch logs');
    return result;
  }

  /**
   * Get current log level / buffer meta (full admin only).
   */
  static async getAdminLogsMeta() {
    const response = await fetch(`${API_BASE_URL}/admin/logs/meta`, {
      method: 'GET',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch log settings');
    return result;
  }

  /**
   * Set runtime log level (full admin only).
   * @param {string} level
   */
  static async setAdminLogLevel(level) {
    const response = await fetch(`${API_BASE_URL}/admin/logs/level`, {
      method: 'PATCH',
      headers: this.getHeaders(true),
      body: JSON.stringify({ level }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update log level');
    return result;
  }

  /**
   * Clear in-memory log buffer (full admin only).
   */
  static async clearAdminLogs() {
    const response = await fetch(`${API_BASE_URL}/admin/logs`, {
      method: 'DELETE',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to clear logs');
    return result;
  }

  /**
   * Get admin dashboard statistics
   */
  static async getAdminDashboard(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      appendSeasonParams(queryParams, filters);
      const qs = queryParams.toString();
      const response = await fetch(`${API_BASE_URL}/admin/dashboard${qs ? `?${qs}` : ''}`, {
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
  static async getAdminCompetitions(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      appendPaginationParams(queryParams, filters);
      appendSeasonParams(queryParams, filters);
      const qs = queryParams.toString();
      const response = await fetch(
        `${API_BASE_URL}/admin/competitions${qs ? `?${qs}` : ''}`,
        {
          method: 'GET',
          headers: this.getHeaders(true),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch competitions');
      }

      return result;
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
      if (filters.attended !== undefined && filters.attended !== '') {
        queryParams.append('attended', filters.attended);
      }
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.date) queryParams.append('date', filters.date);
      appendPaginationParams(queryParams, filters);

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

      return result;
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
      appendPaginationParams(queryParams, filters);
      appendSeasonParams(queryParams, filters);

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

      return result;
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
  static async getAdminNotifications(filtersOrLimit = 50) {
    try {
      const filters =
        typeof filtersOrLimit === 'object' && filtersOrLimit !== null
          ? filtersOrLimit
          : { limit: filtersOrLimit, page: 1 };

      const queryParams = new URLSearchParams();
      appendPaginationParams(queryParams, {
        page: filters.page ?? 1,
        limit: filters.limit ?? 50
      });
      appendSeasonParams(queryParams, filters);

      const url = `${API_BASE_URL}/admin/notifications${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch admin notifications');
      }

      return result;
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
      throw error;
    }
  }

  /**
   * Get all suggestions (admin)
   */
  static async getAdminSuggestions(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      appendPaginationParams(queryParams, filters);
      const qs = queryParams.toString();
      const response = await fetch(
        `${API_BASE_URL}/admin/suggestions${qs ? `?${qs}` : ''}`,
        {
          method: 'GET',
          headers: this.getHeaders(true),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch suggestions');
      return result;
    } catch (error) {
      console.error('Error fetching admin suggestions:', error);
      throw error;
    }
  }

  static async deleteAdminSuggestion(id) {
    const response = await fetch(`${API_BASE_URL}/admin/suggestions/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete suggestion');
    return result;
  }

  static async deleteAdminFeedback(id) {
    const response = await fetch(`${API_BASE_URL}/admin/feedback/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete feedback');
    return result;
  }

  /**
   * Get all event feedback (admin)
   */
  static async getAdminFeedback(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      appendPaginationParams(queryParams, filters);
      const qs = queryParams.toString();
      const response = await fetch(
        `${API_BASE_URL}/admin/feedback${qs ? `?${qs}` : ''}`,
        {
          method: 'GET',
          headers: this.getHeaders(true),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch feedback');
      return result;
    } catch (error) {
      console.error('Error fetching admin feedback:', error);
      throw error;
    }
  }

  // ==========================================
  // Admin Blacklist Management
  // ==========================================

  /**
   * Get all blacklist entries (admin)
   */
  static async getBlacklist(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      appendPaginationParams(queryParams, filters);
      if (filters.search) queryParams.append('search', filters.search);
      const qs = queryParams.toString();
      const response = await fetch(
        `${API_BASE_URL}/admin/blacklist${qs ? `?${qs}` : ''}`,
        {
          method: 'GET',
          headers: this.getHeaders(true),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch blacklist entries');
      return result;
    } catch (error) {
      console.error('Error fetching blacklist:', error);
      throw error;
    }
  }

  /**
   * Get single blacklist entry by ID
   */
  static async getBlacklistEntry(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/blacklist/${id}`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch blacklist entry');
      return result;
    } catch (error) {
      console.error('Error fetching blacklist entry:', error);
      throw error;
    }
  }

  /**
   * Add a person to the blacklist
   */
  static async createBlacklistEntry(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/blacklist`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create blacklist entry');
      return result;
    } catch (error) {
      console.error('Error creating blacklist entry:', error);
      throw error;
    }
  }

  /**
   * Update a blacklist entry
   */
  static async updateBlacklistEntry(id, payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/blacklist/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update blacklist entry');
      return result;
    } catch (error) {
      console.error('Error updating blacklist entry:', error);
      throw error;
    }
  }

  /**
   * Remove a person from the blacklist
   */
  static async deleteBlacklistEntry(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/blacklist/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete blacklist entry');
      return result;
    } catch (error) {
      console.error('Error deleting blacklist entry:', error);
      throw error;
    }
  }
  // ==========================================
  // Admin Teams Management
  // ==========================================

  /**
   * Get all teams for a specific competition (admin)
   */
  static async getAdminCompetitionTeams(competitionId, filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      appendPaginationParams(queryParams, filters);
      const qs = queryParams.toString();
      const response = await fetch(
        `${API_BASE_URL}/admin/competitions/${competitionId}/teams${qs ? `?${qs}` : ''}`,
        {
          method: 'GET',
          headers: this.getHeaders(true),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch teams');
      return result;
    } catch (error) {
      console.error('Error fetching admin competition teams:', error);
      throw error;
    }
  }

  /**
   * Get board judge assignment candidates for a competition (admin panel access).
   */
  static async getAdminCompetitionJudges(competitionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/competitions/${competitionId}/judges`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch judge assignments');
      return result.data;
    } catch (error) {
      console.error('Error fetching admin competition judges:', error);
      throw error;
    }
  }

  /**
   * Update board judge assignments for a competition.
   */
  static async updateAdminCompetitionJudges(competitionId, assignedBoardUserIds) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/competitions/${competitionId}/judges`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify({
          assigned_board_user_ids: Array.isArray(assignedBoardUserIds) ? assignedBoardUserIds : [],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update judge assignments');
      return result.data;
    } catch (error) {
      console.error('Error updating admin competition judges:', error);
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

  /**
   * Get full team details for admin edit view
   */
  static async getAdminTeamDetails(teamId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/teams/${teamId}/details`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch team details');
      return result.data;
    } catch (error) {
      console.error('Error fetching admin team details:', error);
      throw error;
    }
  }

  /**
   * Remove a member from a team (admin)
   */
  static async removeAdminTeamMember(teamId, teamMemberId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/teams/${teamId}/members/${teamMemberId}`, {
        method: 'DELETE',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to remove team member');
      return result;
    } catch (error) {
      console.error('Error removing admin team member:', error);
      throw error;
    }
  }

  /**
   * Update a member info inside a team (admin)
   */
  static async updateAdminTeamMember(teamId, teamMemberId, memberData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/teams/${teamId}/members/${teamMemberId}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(memberData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update team member');
      return result.data;
    } catch (error) {
      console.error('Error updating admin team member:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending team invitation (admin)
   */
  static async cancelAdminTeamInvitation(teamId, invitationId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/teams/${teamId}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to cancel invitation');
      return result;
    } catch (error) {
      console.error('Error cancelling admin team invitation:', error);
      throw error;
    }
  }
  /**
   * Get all announcements for a specific competition
   */
  static async getCompetitionAnnouncements(competitionId, filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.includeInactive) queryParams.append('includeInactive', 'true');
      appendPaginationParams(queryParams, filters);
      const qs = queryParams.toString();
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/announcements${qs ? `?${qs}` : ''}`,
        {
          method: 'GET',
          headers: this.getHeaders(true),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch competition announcements');
      return result;
    } catch (error) {
      console.error('Error fetching competition announcements:', error);
      throw error;
    }
  }

  /**
   * Create an announcement for a specific competition
   */
  static async createCompetitionAnnouncement(competitionId, announcementData) {
    try {
      const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/announcements`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(announcementData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create competition announcement');
      return result.data || result;
    } catch (error) {
      console.error('Error creating competition announcement:', error);
      throw error;
    }
  }

  /**
   * Update an announcement for a specific competition
   */
  static async updateCompetitionAnnouncement(competitionId, announcementId, announcementData) {
    try {
      const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/announcements/${announcementId}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(announcementData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update competition announcement');
      return result.data || result;
    } catch (error) {
      console.error('Error updating competition announcement:', error);
      throw error;
    }
  }

  /**
   * Delete an announcement from a specific competition
   */
  static async deleteCompetitionAnnouncement(competitionId, announcementId) {
    try {
      const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/announcements/${announcementId}`, {
        method: 'DELETE',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete competition announcement');
      return result;
    } catch (error) {
      console.error('Error deleting competition announcement:', error);
      throw error;
    }
  }

  /**
   * Resend emails for a specific competition announcement
   */
  static async resendCompetitionAnnouncementEmails(competitionId, announcementId) {
    try {
      const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/announcements/${announcementId}/resend-emails`, {
        method: 'POST',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to resend competition announcement emails');
      return result;
    } catch (error) {
      console.error('Error resending competition announcement emails:', error);
      throw error;
    }
  }

  /**
   * Get competition timeslots for admin management.
   */
  static async getAdminCompetitionTimeslots(competitionId, filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      appendPaginationParams(queryParams, filters);
      const qs = queryParams.toString();
      const response = await fetch(
        `${API_BASE_URL}/admin/competitions/${competitionId}/timeslots${qs ? `?${qs}` : ''}`,
        {
          method: 'GET',
          headers: this.getHeaders(true),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch competition timeslots');
      return result;
    } catch (error) {
      console.error('Error fetching admin competition timeslots:', error);
      throw error;
    }
  }

  /**
   * Create one timeslot under a competition.
   */
  static async createAdminCompetitionTimeslot(competitionId, payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/competitions/${competitionId}/timeslots`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create timeslot');
      return result;
    } catch (error) {
      console.error('Error creating admin competition timeslot:', error);
      throw error;
    }
  }

  /**
   * Update one timeslot under a competition.
   */
  static async updateAdminCompetitionTimeslot(competitionId, timeslotId, payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/competitions/${competitionId}/timeslots/${timeslotId}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update timeslot');
      return result;
    } catch (error) {
      console.error('Error updating admin competition timeslot:', error);
      throw error;
    }
  }

  /**
   * Delete one unassigned timeslot.
   */
  static async deleteAdminCompetitionTimeslot(competitionId, timeslotId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/competitions/${competitionId}/timeslots/${timeslotId}`, {
        method: 'DELETE',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete timeslot');
      return result;
    } catch (error) {
      console.error('Error deleting admin competition timeslot:', error);
      throw error;
    }
  }

  /**
   * Publish tokenized selection links to teams by email.
   */
  static async publishAdminCompetitionTimeslotSelectionLinks(competitionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/competitions/${competitionId}/timeslots/publish-selection-links`, {
        method: 'POST',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to publish selection links');
      return result;
    } catch (error) {
      console.error('Error publishing timeslot selection links:', error);
      throw error;
    }
  }

  /**
   * Assign a timeslot to a team as admin.
   */
  static async assignAdminCompetitionTimeslot(competitionId, timeslotId, teamId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/competitions/${competitionId}/timeslots/${timeslotId}/assign`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({ team_id: teamId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to assign timeslot');
      return result;
    } catch (error) {
      console.error('Error assigning admin competition timeslot:', error);
      throw error;
    }
  }

  /**
   * Clear assignment from a timeslot as admin.
   */
  static async unassignAdminCompetitionTimeslot(competitionId, timeslotId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/competitions/${competitionId}/timeslots/${timeslotId}/unassign`, {
        method: 'POST',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to unassign timeslot');
      return result;
    } catch (error) {
      console.error('Error unassigning admin competition timeslot:', error);
      throw error;
    }
  }

  /**
   * Public token-based view of available competition timeslots.
   */
  static async getCompetitionTimeslotSelectionView(competitionId, token) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/timeslots/selection?token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers: this.getHeaders(false),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load timeslot selection view');
      return result;
    } catch (error) {
      console.error('Error fetching competition timeslot selection view:', error);
      throw error;
    }
  }

  /**
   * Public token-based selection submit.
   */
  static async submitCompetitionTimeslotSelection(competitionId, token, timeslotId) {
    try {
      const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/timeslots/selection`, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({ token, timeslot_id: timeslotId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to select timeslot');
      return result;
    } catch (error) {
      console.error('Error submitting competition timeslot selection:', error);
      throw error;
    }
  }

  /**
   * Authenticated workspace view of competition timeslots for a specific team.
   */
  static async getCompetitionWorkspaceTimeslotView(competitionId, teamId) {
    try {
      const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/team/${teamId}/timeslots`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load workspace timeslots');
      return result;
    } catch (error) {
      console.error('Error fetching workspace competition timeslots:', error);
      throw error;
    }
  }

  /**
   * Authenticated workspace selection submit.
   */
  static async submitCompetitionWorkspaceTimeslotSelection(competitionId, teamId, timeslotId) {
    try {
      const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/team/${teamId}/timeslots`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({ timeslot_id: timeslotId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to select workspace timeslot');
      return result;
    } catch (error) {
      console.error('Error submitting workspace competition timeslot selection:', error);
      throw error;
    }
  }

  // --- Seasons ---

  static async getSeasons(filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.includeInactive) queryParams.set('includeInactive', 'true');
    const qs = queryParams.toString();
    const response = await fetch(`${API_BASE_URL}/seasons${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: this.getHeaders(!!filters.includeInactive),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch seasons');
    return result;
  }

  static async getCurrentSeason() {
    const response = await fetch(`${API_BASE_URL}/seasons/current`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch current season');
    return result;
  }

  static async createSeason(payload) {
    const response = await fetch(`${API_BASE_URL}/seasons`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create season');
    return result;
  }

  static async updateSeason(id, payload) {
    const response = await fetch(`${API_BASE_URL}/seasons/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update season');
    return result;
  }

  static async setDefaultSeason(id) {
    const response = await fetch(`${API_BASE_URL}/seasons/${id}/set-default`, {
      method: 'POST',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to set default season');
    return result;
  }

  // --- Android app ---

  static async getAndroidApp() {
    const response = await fetch(`${API_BASE_URL}/android-app`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch Android app info');
    return result;
  }

  /**
   * Replace the public APK and optionally email all users.
   * @param {Object} payload
   * @param {File} payload.file
   * @param {string} payload.versionName
   * @param {number|string} [payload.versionCode]
   * @param {string} [payload.releaseNotes]
   * @param {boolean} [payload.notifyUsers=true]
   */
  static async publishAndroidAppUpdate({
    file,
    versionName,
    versionCode,
    releaseNotes = '',
    notifyUsers = true
  }) {
    const token = this.getAuthToken();
    if (!token) throw new Error('Authentication required');
    if (!file) throw new Error('APK file is required');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('versionName', versionName);
    if (versionCode !== undefined && versionCode !== null && versionCode !== '') {
      formData.append('versionCode', String(versionCode));
    }
    formData.append('releaseNotes', releaseNotes || '');
    formData.append('notifyUsers', notifyUsers ? 'true' : 'false');

    const response = await fetch(`${API_BASE_URL}/android-app/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to publish Android app update');
    return result;
  }

  static async notifyAndroidAppUpdate() {
    const response = await fetch(`${API_BASE_URL}/android-app/notify`, {
      method: 'POST',
      headers: this.getHeaders(true),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to send Android app update emails');
    return result;
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