import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { FaEdit, FaSave, FaTimes, FaUpload, FaSignOutAlt, FaUser, FaEnvelope, FaIdCard, FaBuilding, FaCalendar, FaFilePdf, FaCheckCircle, FaCog } from 'react-icons/fa';
import './PageBase.css';
import './Profile.css';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import SeasonBadge from '../components/SeasonBadge';
import { getDepartmentNameById, departments } from '../data/departments';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [saving, setSaving] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [scheduleFile, setScheduleFile] = useState(null);
  const [scheduleFileName, setScheduleFileName] = useState(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const fileInputRef = useRef(null);
  const scheduleInputRef = useRef(null);

  useEffect(() => {
    // Check if user is authenticated before fetching profile
    if (!ApiService.isAuthenticated()) {
      // Token expired or doesn't exist, redirect to home
      window.location.href = '/';
      return;
    }
    fetchProfile();
  }, []);

  const resolveAdminAccess = async (userData) => {
    try {
      const adminAccess = await ApiService.checkAdminAccess();
      if (adminAccess.success) {
        setHasAdminAccess(true);
        return;
      }
    } catch {
      // Fall through to role/department check
    }

    const deptRaw = userData?.department_id;
    const deptId = typeof deptRaw === 'number' ? deptRaw : parseInt(deptRaw, 10);
    const hasRegistrationsAccess =
      userData?.role === 'board' ||
      userData?.role === 'admin' ||
      (!Number.isNaN(deptId) && deptId === 5);

    setHasAdminAccess(Boolean(hasRegistrationsAccess));
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await ApiService.getProfile();
      setUser(userData);
      setEditedData({
        full_name: userData.full_name || '',
      });
      await resolveAdminAccess(userData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      // Check if error is due to token expiration
      if (error.message && error.message.includes('Token expired')) {
        setError('Your session has expired. Please login again.');
        // Redirect to home page after a short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        setError('Failed to load profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await ApiService.logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
      window.location.href = '/';
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedData({
      full_name: user.full_name || '',
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({
      full_name: user.full_name || '',
    });
    setProfileImagePreview(null);
    setProfileImageFile(null);
    setScheduleFile(null);
    setScheduleFileName(null);
    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (scheduleInputRef.current) scheduleInputRef.current.value = '';
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Prepare profile data
      const profileData = {
        full_name: editedData.full_name || user.full_name
      };
      
      // Call API to update profile with files
      const updatedUser = await ApiService.updateProfile(
        profileData,
        profileImageFile, // Profile picture file
        scheduleFile      // Schedule file
      );
      
      // Update local state with response from server
      setUser(updatedUser);
      setIsEditing(false);
      
      alert('Profile updated successfully');
      
      // Reset file input elements
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (scheduleInputRef.current) scheduleInputRef.current.value = '';
      
      // Clear temporary file states
      setProfileImagePreview(null);
      setProfileImageFile(null);
      setScheduleFile(null);
      setScheduleFileName(null);
      
      // Refresh profile to get updated data
      await fetchProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        e.target.value = '';
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large');
        e.target.value = '';
        return;
      }

      setProfileImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScheduleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (PDF only)
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        e.target.value = '';
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File too large');
        e.target.value = '';
        return;
      }

      setScheduleFile(file);
      setScheduleFileName(file.name);
    }
  };

  const extractYearFromId = (universityId) => {
    if (!universityId) return 'N/A';
    const year = universityId.substring(0, 4);
    return `${year}`;
  };

  const getScheduleDisplayName = (schedule) => {
    if (!schedule) return 'No schedule available';
    // If it's a URL, extract the filename
    if (schedule.includes('/')) {
      const parts = schedule.split('/');
      return parts[parts.length - 1];
    }
    return schedule;
  };


  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return '#ff4757';
      case 'board':
        return '#5352ed';
      case 'member':
        return '#2ed573';
      default:
        return '#57606f';
    }
  };

  if (loading) {
    return (
      <section className="PageBase">
        <div className="profile-page-container">
          <PageLoader message="Loading profile..." />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="PageBase">
        <div className="profile-page-container">
          <div className="profile-error">
            <p>{error}</p>
            <button onClick={fetchProfile}>Retry</button>
          </div>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="PageBase">
        <div className="profile-page-container">
          <p>No user data available.</p>
        </div>
      </section>
    );
  }

  const displayedName = isEditing ? editedData.full_name : user.full_name;
  const profileImageUrl = profileImagePreview || user.profile_picture_url || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.university_id || 'User')}&background=0077CC&color=fff&size=400`;

  return (
    <section className="PageBase">
      <SEO
        title="My Profile"
        description="View and manage your MSP Tech Club profile at MIU. Update your information, department, and schedule."
        url="https://msp-miu.tech/profile"
        noindex={true}
      />
      <div className="profile-page-container">
        <BackButton to="/" label="Back to Home" />
        {/* Header with actions */}
        <div className="profile-header">
          <h1>My Profile</h1>
          <div className="profile-actions">
            {!isEditing ? (
              <>
                {hasAdminAccess && (
                  <motion.button
                    className="action-btn admin-btn"
                    onClick={() => { window.location.href = '/admin'; }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FaCog /> Go to Admin Panel
                  </motion.button>
                )}
                <motion.button 
                  className="action-btn edit-btn"
                  onClick={handleEdit}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaEdit /> Edit Profile
                </motion.button>
                <motion.button 
                  className="action-btn logout-btn"
                  onClick={handleLogout}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaSignOutAlt /> Logout
                </motion.button>
              </>
            ) : (
              <>
                <motion.button 
                  className="action-btn save-btn"
                  onClick={handleSave}
                  disabled={saving}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
                </motion.button>
                <motion.button 
                  className="action-btn cancel-btn"
                  onClick={handleCancel}
                  disabled={saving}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaTimes /> Cancel
                </motion.button>
              </>
            )}
          </div>
        </div>

        <div className="profile-content-layout">
          {/* Left Section - Profile Picture Circle */}
          <div className="profile-card-section">
            <div className="profile-picture-wrapper">
              <div 
                className={`profile-picture-circle ${isEditing ? 'editable' : ''}`}
                onClick={isEditing ? () => fileInputRef.current?.click() : undefined}
                style={{ cursor: isEditing ? 'pointer' : 'default' }}
              >
                <img
                  src={profileImageUrl}
                  alt={displayedName || 'Profile'}
                  className="profile-picture-image"
                />
                {isEditing && (
                  <motion.div 
                    className="profile-picture-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <FaUpload className="upload-icon" />
                    <span className="upload-text">Change Photo</span>
                  </motion.div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>
              {profileImageFile && isEditing && (
                <motion.div 
                  className="file-selected-indicator-profile"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <FaCheckCircle /> {profileImageFile.name}
                </motion.div>
              )}
              <h2 className="profile-name">{displayedName || 'No Name'}</h2>
            </div>

            <div className="role-badge-container">
              <span 
                className="role-badge-large" 
                style={{ backgroundColor: getRoleBadgeColor(user.role) }}
              >
                {user.role?.toUpperCase() || 'MEMBER'}
              </span>
              {user.season?.label && (
                <SeasonBadge season={user.season} muted={!user.is_active_season} />
              )}
            </div>
          </div>

          {/* Right Section - Profile Details */}
          <div className="profile-details-section">
            <AnimatePresence mode="wait">
              <motion.div
                key={isEditing ? 'editing' : 'viewing'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="details-grid"
              >
                {/* Full Name */}
                <div className="detail-card">
                  <div className="detail-icon">
                    <FaUser />
                  </div>
                  <div className="detail-content">
                    <label className="detail-label">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="detail-input"
                        value={editedData.full_name || ''}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <p className="detail-value">{user.full_name || 'Not set'}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="detail-card">
                  <div className="detail-icon">
                    <FaEnvelope />
                  </div>
                  <div className="detail-content">
                    <label className="detail-label">Email</label>
                    <p className="detail-value">{user.email || 'Not set'}</p>
                  </div>
                </div>

                {/* University ID */}
                <div className="detail-card">
                  <div className="detail-icon">
                    <FaIdCard />
                  </div>
                  <div className="detail-content">
                    <label className="detail-label">University ID</label>
                    <p className="detail-value">{user.university_id || 'Not set'}</p>
                  </div>
                </div>

                {/* Year */}
                <div className="detail-card">
                  <div className="detail-icon">
                    <FaCalendar />
                  </div>
                  <div className="detail-content">
                    <label className="detail-label">Year</label>
                    <p className="detail-value">{extractYearFromId(user.university_id)}</p>
                  </div>
                </div>

                {/* Department */}
                <div className="detail-card">
                  <div className="detail-icon">
                    <FaBuilding />
                  </div>
                  <div className="detail-content">
                    <label className="detail-label">Department</label>
                    <p className="detail-value">
                      {user.department_id 
                        ? getDepartmentNameById(user.department_id) 
                        : 'Not assigned'}
                    </p>
                  </div>
                </div>

                {/* Role (Read-only) */}
                <div className="detail-card">
                  <div className="detail-icon">
                    <FaUser />
                  </div>
                  <div className="detail-content">
                    <label className="detail-label">Role</label>
                    <p className="detail-value" style={{ color: getRoleBadgeColor(user.role), fontWeight: 600 }}>
                      {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member'}
                    </p>
                  </div>
                </div>

                {/* Schedule Upload/Display */}
                <div className="detail-card detail-card-full">
                  <div className="detail-icon">
                    <FaFilePdf />
                  </div>
                  <div className="detail-content">
                    <label className="detail-label">Schedule</label>
                    {isEditing ? (
                      <div className="schedule-upload-section">
                        <input
                          type="file"
                          ref={scheduleInputRef}
                          onChange={handleScheduleUpload}
                          accept=".pdf,application/pdf"
                          style={{ display: 'none' }}
                        />
                        <button
                          className="upload-schedule-btn"
                          onClick={() => scheduleInputRef.current?.click()}
                        >
                          <FaUpload /> {scheduleFile ? 'Change Schedule' : 'Upload Schedule (PDF)'}
                        </button>
                        {scheduleFile && (
                          <div className="file-selected-info">
                            <FaCheckCircle className="file-check-icon" />
                            <p className="file-name" title={scheduleFileName}>
                              {scheduleFileName}
                            </p>
                          </div>
                        )}
                        {!scheduleFile && user.schedule && (
                          <div className="schedule-display" style={{ marginTop: '1rem' }}>
                            <div className="file-selected-info">
                              <FaFilePdf className="file-check-icon" />
                              <p className="file-name" title={getScheduleDisplayName(user.schedule)}>
                                {getScheduleDisplayName(user.schedule)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="schedule-display">
                        {user.schedule ? (
                          <a 
                            href={user.schedule} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="file-selected-info"
                            style={{ textDecoration: 'none', color: 'inherit' }}
                            title={getScheduleDisplayName(user.schedule)}
                          >
                            <FaFilePdf className="file-check-icon" />
                            <p className="file-name">{getScheduleDisplayName(user.schedule)}</p>
                          </a>
                        ) : (
                          <p className="detail-value">No schedule available</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Profile;