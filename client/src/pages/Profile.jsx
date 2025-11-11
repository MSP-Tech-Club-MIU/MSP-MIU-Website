import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEdit, FaSave, FaTimes, FaUpload, FaSignOutAlt, FaUser, FaEnvelope, FaIdCard, FaBuilding, FaGraduationCap, FaCalendar, FaFileUpload, FaFilePdf, FaCheckCircle } from 'react-icons/fa';
import './PageBase.css';
import './Profile.css';
import ApiService from '../services/api';
import ProfileCard from '../components/ProfileCard';
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
  const fileInputRef = useRef(null);
  const scheduleInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await ApiService.getProfile();
      setUser(userData);
      setEditedData({
        full_name: userData.full_name || '',
        email: userData.email || '',
        university_id: userData.university_id || '',
        department_id: userData.department_id || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile. Please try again.');
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
      email: user.email || '',
      university_id: user.university_id || '',
      department_id: user.department_id || '',
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({
      full_name: user.full_name || '',
      email: user.email || '',
      university_id: user.university_id || '',
      department_id: user.department_id || '',
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
      
      // Update local state with edited data
      const updatedUser = { ...user, ...editedData };
      
      // If image was uploaded, update the preview URL
      if (profileImagePreview) {
        updatedUser.profile_picture_url = profileImagePreview;
      }
      
      // If schedule was uploaded, store the file name
      if (scheduleFile && scheduleFileName) {
        updatedUser.schedule = scheduleFileName;
      }
      
      setUser(updatedUser);
      setIsEditing(false);
      
      alert('Profile updated successfully');
      
      // Reset file input elements
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (scheduleInputRef.current) scheduleInputRef.current.value = '';
      
      // Clear temporary file states (files are now stored in user object)
      setProfileImagePreview(null);
      setProfileImageFile(null);
      setScheduleFile(null);
      setScheduleFileName(null);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
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

  const getFacultyFromId = (universityId) => {
    if (!universityId) return 'N/A';
    // Extract the last 5 digits and determine faculty based on pattern
    const idNumber = universityId.split('/')[1];
    if (!idNumber) return 'N/A';
    
    // This is a placeholder logic - adjust based on your university's ID system
    const firstDigit = idNumber[0];
    const facultyMap = {
      '0': 'Engineering',
      '1': 'Computer Science',
      '2': 'Business Administration',
      '3': 'Arts & Humanities',
      '4': 'Science',
      '5': 'Medicine',
      '6': 'Law',
      '7': 'Education',
      '8': 'Architecture',
      '9': 'Pharmacy',
    };
    return facultyMap[firstDigit] || 'General Studies';
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
          <div className="profile-loading">
            <div className="loading-spinner"></div>
            <p>Loading profile...</p>
          </div>
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

  const displayedData = isEditing ? editedData : user;
  const profileImageUrl = profileImagePreview || user.profile_picture_url || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.university_id || 'User')}&background=0077CC&color=fff&size=400`;

  return (
    <section className="PageBase">
      <div className="profile-page-container">
        {/* Header with actions */}
        <div className="profile-header">
          <h1>My Profile</h1>
          <div className="profile-actions">
            {!isEditing ? (
              <>
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
          {/* Left Section - Profile Card */}
          <div className="profile-card-section">
            <div className="profile-card-wrapper-custom">
              <ProfileCard
                avatarUrl={profileImageUrl}
                name={displayedData.full_name || 'No Name'}
                title={user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member'}
                showUserInfo={true}
                miniAvatarUrl={profileImageUrl}
              />
              
              {isEditing && (
                <motion.div 
                  className="upload-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <button
                    className="upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FaUpload /> Upload New Photo
                  </button>
                  {profileImageFile && (
                    <div className="file-selected-indicator">
                      <FaCheckCircle /> Selected: {profileImageFile.name}
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            <div className="role-badge-container">
              <span 
                className="role-badge-large" 
                style={{ backgroundColor: getRoleBadgeColor(user.role) }}
              >
                {user.role?.toUpperCase() || 'MEMBER'}
              </span>
              <span className={`status-badge-large ${user.is_active ? 'active' : 'inactive'}`}>
                {user.is_active ? '✓ Active Account' : '✗ Inactive Account'}
              </span>
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
                        value={displayedData.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <p className="detail-value">{displayedData.full_name || 'Not set'}</p>
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
                    {isEditing ? (
                      <input
                        type="email"
                        className="detail-input"
                        value={displayedData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter your email"
                      />
                    ) : (
                      <p className="detail-value">{displayedData.email || 'Not set'}</p>
                    )}
                  </div>
                </div>

                {/* University ID */}
                <div className="detail-card">
                  <div className="detail-icon">
                    <FaIdCard />
                  </div>
                  <div className="detail-content">
                    <label className="detail-label">University ID</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="detail-input"
                        value={displayedData.university_id}
                        onChange={(e) => handleInputChange('university_id', e.target.value)}
                        placeholder="20XX/XXXXX"
                      />
                    ) : (
                      <p className="detail-value">{displayedData.university_id || 'Not set'}</p>
                    )}
                  </div>
                </div>

                {/* Year */}
                <div className="detail-card">
                  <div className="detail-icon">
                    <FaCalendar />
                  </div>
                  <div className="detail-content">
                    <label className="detail-label">Year</label>
                    <p className="detail-value">{extractYearFromId(displayedData.university_id)}</p>
                  </div>
                </div>

                {/* Faculty */}
                <div className="detail-card">
                  <div className="detail-icon">
                    <FaGraduationCap />
                  </div>
                  <div className="detail-content">
                    <label className="detail-label">Faculty</label>
                    <p className="detail-value">{getFacultyFromId(displayedData.university_id)}</p>
                  </div>
                </div>

                {/* Department */}
                <div className="detail-card">
                  <div className="detail-icon">
                    <FaBuilding />
                  </div>
                  <div className="detail-content">
                    <label className="detail-label">Department</label>
                    {isEditing ? (
                      <select
                        className="detail-input"
                        value={displayedData.department_id || ''}
                        onChange={(e) => handleInputChange('department_id', parseInt(e.target.value))}
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="detail-value">
                        {displayedData.department_id 
                          ? getDepartmentNameById(displayedData.department_id) 
                          : 'Not assigned'}
                      </p>
                    )}
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
                            <p className="file-name">{scheduleFileName}</p>
                          </div>
                        )}
                        {!scheduleFile && user.schedule && (
                          <div className="schedule-display" style={{ marginTop: '1rem' }}>
                            <div className="file-selected-info">
                              <FaFilePdf className="file-check-icon" />
                              <p className="file-name">{user.schedule}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="schedule-display">
                        {user.schedule ? (
                          <div className="file-selected-info">
                            <FaFilePdf className="file-check-icon" />
                            <p className="file-name">{user.schedule}</p>
                          </div>
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