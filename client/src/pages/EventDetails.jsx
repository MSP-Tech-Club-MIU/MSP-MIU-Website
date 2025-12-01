import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './EventDetails.css';
import { FiCalendar, FiClock, FiMapPin, FiArrowLeft, FiUpload, FiDownload, FiTrash2, FiFile, FiFileText, FiImage, FiVideo, FiMusic, FiUserPlus, FiAlertTriangle, FiEdit2, FiSave, FiX, FiEdit3 } from 'react-icons/fi';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';

// Import images
import mspLogo from '../assets/Images/msp-logo.png';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [files, setFiles] = useState([]); // Start with empty files to show empty state
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState('document');
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRegistrationToggleConfirm, setShowRegistrationToggleConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingRegistration, setIsTogglingRegistration] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Fetch event from API
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await ApiService.getEventById(parseInt(id));
        
        // Map database fields to component fields
        const mappedEvent = {
          event_id: data.event_id,
          name: data.name,
          description: data.description,
          event_date: data.event_date,
          place: data.location,
          // Map category: Workshop -> event, Session -> session, Entertainment -> entertainment
          event_type: data.category === 'Workshop' ? 'event' : 
                     data.category === 'Session' ? 'session' : 
                     data.category === 'Entertainment' ? 'entertainment' : 'event',
          // Use main_image from database if available, otherwise fallback to MSP logo
          image_url: (data.main_image && data.main_image.trim()) ? data.main_image : mspLogo,
          category: data.category,
          registration_enabled: data.registration_enabled !== undefined ? data.registration_enabled : true,
          upload_file: data.upload_file || null
        };
        
        setEvent(mappedEvent);
        
        // If event has an upload_file, add it to files array
        if (data.upload_file && data.upload_file.trim()) {
          // Decode URL-encoded characters (e.g., %20 -> space)
          const decodedPath = decodeURIComponent(data.upload_file);
          const filePath = decodedPath;
          const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
          const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
          
          // Determine file type based on extension
          let fileType = 'document';
          if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(fileExtension)) {
            fileType = 'image';
          } else if (['mp4', 'webm', 'ogg'].includes(fileExtension)) {
            fileType = 'video';
          } else if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
            fileType = 'audio';
          } else if (['pptx', 'ppt'].includes(fileExtension)) {
            fileType = 'document';
          } else if (['pdf'].includes(fileExtension)) {
            fileType = 'document';
          }
          
          setFiles([{
            file_id: 1,
            file_name: filePath, // Store full path so getFileSrc can resolve it correctly
            file_display_name: fileName, // Display name (just filename, decoded)
            file_type: fileType,
            file_size: 'N/A', // Size not available from database
            uploaded_at: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            uploaded_by: 'System'
          }]);
        } else {
          setFiles([]);
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError(err.message || 'Failed to load event');
        setEvent(null);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id]);

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      if (ApiService.isAuthenticated()) {
        try {
          const user = await ApiService.getProfile();
          setUserRole(user.role);
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    };
    checkUserRole();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const getImageSrc = (imageUrl) => {
    // Handle both imported images and URLs
    if (!imageUrl) return null;
    // If it's an HTTP/HTTPS URL, return as-is
    if (typeof imageUrl === 'string' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      return imageUrl;
    }
    // If it's a string path (not an imported module), ensure it starts with / for public assets
    if (typeof imageUrl === 'string') {
      // Remove leading slash if present, then add it back to ensure consistent format
      const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
      return `/${cleanPath}`;
    }
    // If it's already an imported module (object with default or string from import), return it directly
    return imageUrl;
  };

  const getFileSrc = (fileName) => {
    // Handle file paths from static folder
    if (!fileName) return null;
    // If it's an HTTP/HTTPS URL, return as-is
    if (typeof fileName === 'string' && (fileName.startsWith('http://') || fileName.startsWith('https://'))) {
      return fileName;
    }
    // If it's a string path, ensure it starts with / for static assets
    // Files in static/assets/ are served at /assets/ in the browser
    if (typeof fileName === 'string') {
      const cleanPath = fileName.startsWith('/') ? fileName.slice(1) : fileName;
      // If path doesn't start with 'assets/', assume it's in assets folder
      const filePath = cleanPath.startsWith('assets/') ? cleanPath : `assets/${cleanPath}`;
      // Encode the path for URL (spaces become %20, etc.)
      // Split by /, encode each segment, then join back
      const encodedPath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
      return `/${encodedPath}`;
    }
    return fileName;
  };

  const getEventTypeColor = (type) => {
    switch (type) {
      case 'event':
        return '#03A9F4';
      case 'session':
        return '#84bd00';
      case 'entertainment':
        return '#ffbf00';
      default:
        return '#03A9F4';
    }
  };

  const isBoardOrAdmin = userRole === 'board' || userRole === 'admin';

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'document':
        return <FiFileText />;
      case 'image':
        return <FiImage />;
      case 'video':
        return <FiVideo />;
      case 'audio':
        return <FiMusic />;
      default:
        return <FiFile />;
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // If in edit mode, upload the file immediately
      if (isEditMode) {
        handleEditModeFileUpload(file);
      }
    }
  };

  const handleEditModeFileUpload = async (file) => {
    setIsUploading(true);
    try {
      // Determine upload type based on file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      let uploadType = 'assets'; // default
      
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
        uploadType = 'images';
      } else if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) {
        uploadType = 'assets';
      } else if (['zip', 'rar', '7z'].includes(ext)) {
        uploadType = 'codes';
      }

      // Upload file to R2
      const uploadResult = await ApiService.uploadFile(file, uploadType);
      
      // Update edit form with the new URL
      handleEditFormChange('upload_file', uploadResult.url);
      
      // Update files array for preview
      const displayFileType = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext) ? 'image' :
                             ['mp4', 'webm', 'ogg'].includes(ext) ? 'video' :
                             ['mp3', 'wav', 'ogg'].includes(ext) ? 'audio' : 'document';
      
      setFiles([{
        file_id: Date.now(),
        file_name: uploadResult.url,
        file_display_name: file.name,
        file_type: displayFileType,
        file_size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        uploaded_at: new Date().toISOString().split('T')[0],
        uploaded_by: userRole === 'admin' ? 'Admin' : 'Board Member'
      }]);
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload file: ' + (error.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Determine upload type based on file extension
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      let uploadType = 'assets'; // default
      
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
        uploadType = 'images';
      } else if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) {
        uploadType = 'assets';
      } else if (['zip', 'rar', '7z'].includes(ext)) {
        uploadType = 'codes';
      }

      // Upload file to R2
      const uploadResult = await ApiService.uploadFile(selectedFile, uploadType);
      
      // If in edit mode, update edit form instead of directly updating event
      if (isEditMode) {
        handleEditFormChange('upload_file', uploadResult.url);
      } else {
        // Update event with new file URL
        await ApiService.updateEvent(event.event_id, {
          upload_file: uploadResult.url
        });

        // Also update event state
        setEvent(prev => ({
          ...prev,
          upload_file: uploadResult.url
        }));
      }

      // Determine file type based on extension for display
      let displayFileType = 'document';
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
        displayFileType = 'image';
      } else if (['mp4', 'webm', 'ogg'].includes(ext)) {
        displayFileType = 'video';
      } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
        displayFileType = 'audio';
      }

      // Update local state with new file
      const newFile = {
        file_id: Date.now(), // Use timestamp as ID
        file_name: uploadResult.url, // Store full URL
        file_display_name: selectedFile.name,
        file_type: displayFileType,
        file_size: (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        uploaded_at: new Date().toISOString().split('T')[0],
        uploaded_by: userRole === 'admin' ? 'Admin' : 'Board Member'
      };

      // Replace existing file or add new one
      if (files.length > 0) {
        // Replace existing file
        setFiles([newFile]);
      } else {
        // Add new file
        setFiles([newFile]);
      }

      // Reset form
      setSelectedFile(null);
      setFileType('document');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowUpload(false);
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload file: ' + (error.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!isBoardOrAdmin) return;
    
    try {
      // Update event to remove upload_file
      await ApiService.updateEvent(event.event_id, {
        upload_file: null
      });

      // Update local state
      setFiles(files.filter(f => f.file_id !== fileId));
      
      // Also update event state
      setEvent(prev => ({
        ...prev,
        upload_file: null
      }));
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDownloadFile = (file) => {
    // Get the file path from static folder
    const filePath = getFileSrc(file.file_name);
    if (!filePath) {
      console.error('File path not found:', file.file_name);
      return;
    }
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = filePath;
    link.download = file.file_name;
    link.target = '_blank'; // Open in new tab for PDF/PPTX files
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteEvent = async () => {
    try {
      setIsDeleting(true);
      await ApiService.deleteEvent(event.event_id);
      // Redirect to events page after successful deletion
      navigate('/events');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event: ' + (error.message || 'Unknown error'));
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleToggleRegistration = async () => {
    try {
      setIsTogglingRegistration(true);
      const newStatus = !event.registration_enabled;
      await ApiService.updateEvent(event.event_id, {
        registration_enabled: newStatus
      });
      
      // Update local event state
      setEvent(prev => ({
        ...prev,
        registration_enabled: newStatus
      }));
      
      // Show success message (using a simple approach for now, can be enhanced with toast notifications later)
      const message = `Registration ${newStatus ? 'enabled' : 'disabled'} for this event`;
      console.log(message);
      // TODO: Replace with proper toast notification system
      alert(message);
      setIsTogglingRegistration(false);
      setShowRegistrationToggleConfirm(false);
    } catch (error) {
      console.error('Error toggling registration:', error);
      const errorMessage = 'Failed to toggle registration: ' + (error.message || 'Unknown error');
      // TODO: Replace with proper error notification system
      alert(errorMessage);
      setIsTogglingRegistration(false);
      setShowRegistrationToggleConfirm(false);
    }
  };

  const handleEnterEditMode = () => {
    // Initialize edit form with current event data
    setEditForm({
      name: event.name,
      description: event.description || '',
      event_date: event.event_date,
      location: event.place || '',
      category: event.category || 'Workshop',
      main_image: event.image_url && event.image_url !== mspLogo ? event.image_url : '',
      upload_file: event.upload_file || '',
      registration_enabled: event.registration_enabled !== false
    });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditForm({});
  };

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      // Helper function to normalize string values (trim and convert empty to null)
      const normalizeString = (value) => {
        if (value === null || value === undefined) return null;
        const trimmed = String(value).trim();
        return trimmed === '' ? null : trimmed;
      };

      // Build update data object
      const updateData = {};
      
      // Only include fields that have been modified or are being explicitly set
      if (editForm.name !== undefined) {
        updateData.name = normalizeString(editForm.name) || event.name;
      }
      
      if (editForm.description !== undefined) {
        updateData.description = normalizeString(editForm.description);
      }
      
      if (editForm.event_date !== undefined) {
        updateData.event_date = editForm.event_date || event.event_date;
      }
      
      if (editForm.location !== undefined) {
        updateData.location = normalizeString(editForm.location) || event.place || '';
      }
      
      if (editForm.category !== undefined) {
        updateData.category = editForm.category || event.category;
      }
      
      if (editForm.main_image !== undefined) {
        updateData.main_image = normalizeString(editForm.main_image);
      }
      
      if (editForm.upload_file !== undefined) {
        updateData.upload_file = normalizeString(editForm.upload_file);
      }
      
      if (editForm.registration_enabled !== undefined) {
        updateData.registration_enabled = editForm.registration_enabled;
      }

      await ApiService.updateEvent(event.event_id, updateData);
      
      // Fetch updated event from server to ensure we have the latest data
      const updatedEventData = await ApiService.getEventById(parseInt(id));
      
      // Map database fields to component fields
      const mappedEvent = {
        event_id: updatedEventData.event_id,
        name: updatedEventData.name,
        description: updatedEventData.description,
        event_date: updatedEventData.event_date,
        place: updatedEventData.location,
        event_type: updatedEventData.category === 'Workshop' ? 'event' : 
                   updatedEventData.category === 'Session' ? 'session' : 
                   updatedEventData.category === 'Entertainment' ? 'entertainment' : 'event',
        image_url: (updatedEventData.main_image && updatedEventData.main_image.trim()) ? updatedEventData.main_image : mspLogo,
        category: updatedEventData.category,
        registration_enabled: updatedEventData.registration_enabled !== undefined ? updatedEventData.registration_enabled : true,
        upload_file: updatedEventData.upload_file || null
      };
      
      setEvent(mappedEvent);

      // Update files array based on upload_file
      if (updatedEventData.upload_file && updatedEventData.upload_file.trim()) {
        const decodedPath = decodeURIComponent(updatedEventData.upload_file);
        const filePath = decodedPath;
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        
        let fileType = 'document';
        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(fileExtension)) {
          fileType = 'image';
        } else if (['mp4', 'webm', 'ogg'].includes(fileExtension)) {
          fileType = 'video';
        } else if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
          fileType = 'audio';
        } else if (['pptx', 'ppt'].includes(fileExtension)) {
          fileType = 'document';
        } else if (['pdf'].includes(fileExtension)) {
          fileType = 'document';
        }
        
        setFiles([{
          file_id: Date.now(),
          file_name: filePath,
          file_display_name: fileName,
          file_type: fileType,
          file_size: 'N/A',
          uploaded_at: updatedEventData.created_at ? new Date(updatedEventData.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          uploaded_by: 'System'
        }]);
      } else {
        setFiles([]);
      }

      alert('Event updated successfully!');
      setIsEditMode(false);
      setEditForm({});
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    setUploadingImage(true);
    try {
      const result = await ApiService.uploadFile(file, 'events');
      handleEditFormChange('main_image', result.url);
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image: ' + (error.message || 'Unknown error'));
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <section className="EventDetailsPage">
        <div className="EventDetailsPage__container">
          <button 
            onClick={() => navigate('/events')} 
            className="EventDetailsPage__backBtn"
          >
            <FiArrowLeft />
            Back to Events
          </button>
          <PageLoader message="Loading event details..." />
        </div>
      </section>
    );
  }

  // Error state or event not found
  if (error || !event) {
    return (
      <section className="EventDetailsPage">
        <div className="EventDetailsPage__container">
          <button 
            onClick={() => navigate('/events')} 
            className="EventDetailsPage__backBtn"
          >
            <FiArrowLeft />
            Back to Events
          </button>
          <div className="EventDetailsPage__error">
            <FiCalendar />
            <p>{error || 'Event not found'}</p>
            <span>The event you're looking for doesn't exist or has been removed</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="EventDetailsPage">
      <div className="EventDetailsPage__container">
        <button 
          onClick={() => navigate('/events')} 
          className="EventDetailsPage__backBtn"
        >
          <FiArrowLeft />
          Back to Events
        </button>

        <motion.article 
          className="EventDetails"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {event.image_url && (() => {
            const imageSrc = getImageSrc(isEditMode ? (editForm.main_image || mspLogo) : event.image_url);
            const currentImageUrl = isEditMode ? editForm.main_image : event.image_url;
            const showImage = currentImageUrl && currentImageUrl !== mspLogo && typeof currentImageUrl === 'string' && (currentImageUrl.startsWith('http://') || currentImageUrl.startsWith('https://'));
            return (
              <div className="EventDetails__hero" style={{ position: 'relative' }}>
                <div 
                  className="EventDetails__image"
                  style={{ 
                    backgroundImage: imageSrc ? `url("${imageSrc}")` : 'none',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }} 
                />
                <div 
                  className="EventDetails__imagePlaceholder"
                  style={{ display: imageSrc ? 'none' : 'flex' }}
                >
                  <FiCalendar />
                </div>
                <div 
                  className="EventDetails__badge"
                  style={{ backgroundColor: getEventTypeColor(event.event_type) }}
                >
                  {event.event_type}
                </div>
                {isEditMode && isBoardOrAdmin && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    display: 'flex',
                    gap: '0.5rem',
                    zIndex: 10
                  }}>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                    <motion.button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImage}
                      whileHover={{ scale: uploadingImage ? 1 : 1.05 }}
                      whileTap={{ scale: uploadingImage ? 1 : 0.95 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(142, 194, 240, 0.9)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: uploadingImage ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        opacity: uploadingImage ? 0.6 : 1
                      }}
                      title="Replace Image"
                    >
                      <FiEdit3 />
                      {uploadingImage ? 'Uploading...' : 'Replace'}
                    </motion.button>
                    <motion.button
                      onClick={() => handleEditFormChange('main_image', '')}
                      disabled={uploadingImage || !showImage}
                      whileHover={{ scale: (uploadingImage || !showImage) ? 1 : 1.05 }}
                      whileTap={{ scale: (uploadingImage || !showImage) ? 1 : 0.95 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(231, 76, 60, 0.9)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: (uploadingImage || !showImage) ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        opacity: (uploadingImage || !showImage) ? 0.6 : 1
                      }}
                      title="Remove Image"
                    >
                      <FiX />
                      Remove
                    </motion.button>
                  </div>
                )}
                {isEditMode && (
                  <div style={{
                    position: 'absolute',
                    bottom: '1rem',
                    left: '1rem',
                    right: '1rem',
                    zIndex: 10
                  }}>
                    <input
                      type="url"
                      value={editForm.main_image || ''}
                      onChange={(e) => handleEditFormChange('main_image', e.target.value)}
                      placeholder="Or paste image URL here"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: 'rgba(20, 25, 40, 0.95)',
                        border: '1px solid rgba(142, 194, 240, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })()}

          <div className="EventDetails__content">
            <header className="EventDetails__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <h1 className="EventDetails__title" style={{ flex: 1 }}>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => handleEditFormChange('name', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(142, 194, 240, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: 'inherit',
                      fontFamily: 'inherit',
                      fontWeight: 'inherit'
                    }}
                    placeholder="Event Name"
                  />
                ) : (
                  event.name
                )}
              </h1>
              {isBoardOrAdmin && !isEditMode && (
                <motion.button
                  onClick={handleEnterEditMode}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(142, 194, 240, 0.2)',
                    color: '#8EC2F0',
                    border: '1px solid rgba(142, 194, 240, 0.3)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  <FiEdit2 />
                  Edit
                </motion.button>
              )}
              {isEditMode && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <motion.button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    whileHover={{ scale: isSaving ? 1 : 1.05 }}
                    whileTap={{ scale: isSaving ? 1 : 0.95 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      background: 'rgba(76, 175, 80, 0.2)',
                      color: '#4caf50',
                      border: '1px solid rgba(76, 175, 80, 0.3)',
                      borderRadius: '8px',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      opacity: isSaving ? 0.6 : 1
                    }}
                  >
                    <FiSave />
                    {isSaving ? 'Saving...' : 'Save'}
                  </motion.button>
                  <motion.button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    whileHover={{ scale: isSaving ? 1 : 1.05 }}
                    whileTap={{ scale: isSaving ? 1 : 0.95 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      opacity: isSaving ? 0.6 : 1
                    }}
                  >
                    <FiX />
                    Cancel
                  </motion.button>
                </div>
              )}
            </header>

            <div className="EventDetails__info">
              <div className="EventDetails__infoItem">
                <FiCalendar />
                <div style={{ flex: 1 }}>
                  <span className="EventDetails__infoLabel">Date</span>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={editForm.event_date || ''}
                      onChange={(e) => handleEditFormChange('event_date', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        marginTop: '0.25rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(142, 194, 240, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.95rem'
                      }}
                    />
                  ) : (
                    <span className="EventDetails__infoValue">{formatDate(event.event_date)}</span>
                  )}
                </div>
              </div>

              {event.event_time && !isEditMode && (
                <div className="EventDetails__infoItem">
                  <FiClock />
                  <div>
                    <span className="EventDetails__infoLabel">Time</span>
                    <span className="EventDetails__infoValue">{event.event_time}</span>
                  </div>
                </div>
              )}

              <div className="EventDetails__infoItem">
                <FiMapPin />
                <div style={{ flex: 1 }}>
                  <span className="EventDetails__infoLabel">Location</span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editForm.location || ''}
                      onChange={(e) => handleEditFormChange('location', e.target.value)}
                      placeholder="e.g., Main Building, Room OOA"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        marginTop: '0.25rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(142, 194, 240, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.95rem'
                      }}
                    />
                  ) : (
                    <span className="EventDetails__infoValue">{event.place || 'Not specified'}</span>
                  )}
                </div>
              </div>

              {isEditMode && (
                <div className="EventDetails__infoItem">
                  <FiCalendar />
                  <div style={{ flex: 1 }}>
                    <span className="EventDetails__infoLabel">Category</span>
                    <select
                      value={editForm.category || 'Workshop'}
                      onChange={(e) => handleEditFormChange('category', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        marginTop: '0.25rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(142, 194, 240, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.95rem'
                      }}
                    >
                      <option value="Workshop">Workshop</option>
                      <option value="Session">Session</option>
                      <option value="Entertainment">Entertainment</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="EventDetails__description">
              <h2>About This Event</h2>
              {isEditMode ? (
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => handleEditFormChange('description', e.target.value)}
                  placeholder="Describe the event, what attendees can expect, agenda, etc."
                  rows="6"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(142, 194, 240, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: '120px'
                  }}
                />
              ) : (
                <p>{event.description || 'No description provided.'}</p>
              )}
            </div>

            {/* Register Button - Only show if registration is enabled */}
            {!isEditMode && (event.registration_enabled !== false ? (
              <div className="EventDetails__register">
                <motion.button
                  className="EventDetails__registerBtn"
                  onClick={() => navigate(`/attendance-request?event_id=${event.event_id}`)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiUserPlus />
                  Register for Attendance Request
                </motion.button>
              </div>
            ) : (
              <div className="EventDetails__register" style={{ 
                padding: '1rem', 
                background: 'rgba(255, 193, 7, 0.1)', 
                borderRadius: '12px',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, color: '#ffc107', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <FiAlertTriangle />
                  Registration for this event is currently closed
                </p>
              </div>
            ))}

            {/* Registration Toggle - Editable in edit mode */}
            {isEditMode && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: 'rgba(255, 255, 255, 0.05)', 
                borderRadius: '12px'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editForm.registration_enabled !== false}
                    onChange={(e) => handleEditFormChange('registration_enabled', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ color: '#8EC2F0', fontSize: '0.95rem' }}>
                    Allow registration for this event
                  </span>
                </label>
                <small style={{ color: '#8EC2F0', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block', marginLeft: '2rem' }}>
                  If unchecked, users will not be able to submit attendance requests for this event
                </small>
              </div>
            )}

            {/* Admin/Board Actions */}
            {isBoardOrAdmin && !isEditMode && (
              <div className="EventDetails__adminActions" style={{ 
                marginTop: '2rem', 
                padding: '1.5rem', 
                background: 'rgba(255, 255, 255, 0.05)', 
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1.1rem', 
                  color: '#8EC2F0',
                  fontWeight: '600'
                }}>
                  Admin Actions
                </h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <motion.button
                    onClick={() => setShowRegistrationToggleConfirm(true)}
                    disabled={isTogglingRegistration}
                    whileHover={{ scale: isTogglingRegistration ? 1 : 1.02 }}
                    whileTap={{ scale: isTogglingRegistration ? 1 : 0.98 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.5rem',
                      background: event.registration_enabled 
                        ? 'rgba(255, 193, 7, 0.2)' 
                        : 'rgba(76, 175, 80, 0.2)',
                      color: event.registration_enabled ? '#ffc107' : '#4caf50',
                      border: `1px solid ${event.registration_enabled ? 'rgba(255, 193, 7, 0.3)' : 'rgba(76, 175, 80, 0.3)'}`,
                      borderRadius: '8px',
                      cursor: isTogglingRegistration ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      opacity: isTogglingRegistration ? 0.6 : 1
                    }}
                  >
                    {event.registration_enabled ? (
                      <>
                        <FiAlertTriangle />
                        {isTogglingRegistration ? 'Updating...' : 'Close Registration'}
                      </>
                    ) : (
                      <>
                        <FiUserPlus />
                        {isTogglingRegistration ? 'Updating...' : 'Open Registration'}
                      </>
                    )}
                  </motion.button>
                  
                  <motion.button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    whileHover={{ scale: isDeleting ? 1 : 1.02 }}
                    whileTap={{ scale: isDeleting ? 1 : 0.98 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.5rem',
                      background: 'rgba(231, 76, 60, 0.2)',
                      color: '#e74c3c',
                      border: '1px solid rgba(231, 76, 60, 0.3)',
                      borderRadius: '8px',
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      opacity: isDeleting ? 0.6 : 1
                    }}
                  >
                    <FiTrash2 />
                    {isDeleting ? 'Deleting...' : 'Delete Event'}
                  </motion.button>
                </div>
              </div>
            )}

            {/* Event Files Section */}
            <div className="EventDetails__files">
              <div className="EventDetails__filesHeader">
                <h2>Event Files</h2>
                {isBoardOrAdmin && !isEditMode && (
                  <button
                    className="EventDetails__uploadBtn"
                    onClick={() => setShowUpload(!showUpload)}
                  >
                    <FiUpload />
                    {showUpload ? 'Cancel' : 'Upload File'}
                  </button>
                )}
              </div>

              {isEditMode && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  borderRadius: '12px',
                  border: '1px solid rgba(142, 194, 240, 0.2)'
                }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#8EC2F0', 
                    fontSize: '0.9rem', 
                    fontWeight: '500',
                    marginBottom: '0.5rem'
                  }}>
                    File URL
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="url"
                      value={editForm.upload_file || ''}
                      onChange={(e) => handleEditFormChange('upload_file', e.target.value)}
                      placeholder="https://example.com/file.pdf or upload a file"
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(142, 194, 240, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    <motion.button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      whileHover={{ scale: isUploading ? 1 : 1.02 }}
                      whileTap={{ scale: isUploading ? 1 : 0.98 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1rem',
                        background: 'rgba(142, 194, 240, 0.2)',
                        color: '#8EC2F0',
                        border: '1px solid rgba(142, 194, 240, 0.3)',
                        borderRadius: '8px',
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <FiUpload />
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </motion.button>
                    {editForm.upload_file && (
                      <motion.button
                        type="button"
                        onClick={() => handleEditFormChange('upload_file', '')}
                        disabled={isUploading}
                        whileHover={{ scale: isUploading ? 1 : 1.02 }}
                        whileTap={{ scale: isUploading ? 1 : 0.98 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem 1rem',
                          background: 'rgba(231, 76, 60, 0.2)',
                          color: '#e74c3c',
                          border: '1px solid rgba(231, 76, 60, 0.3)',
                          borderRadius: '8px',
                          cursor: isUploading ? 'not-allowed' : 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '500'
                        }}
                      >
                        <FiX />
                        Remove
                      </motion.button>
                    )}
                  </div>
                  <small style={{ color: '#8EC2F0', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                    Paste a file URL or upload a file directly
                  </small>
                </div>
              )}

              {isBoardOrAdmin && showUpload && (
                <div className="EventDetails__uploadSection">
                  <form onSubmit={handleUpload} className="EventDetails__uploadForm">
                    <div className="EventDetails__uploadControls">
                      <label htmlFor="file-input" className="EventDetails__fileInputLabel">
                        <FiUpload />
                        {selectedFile ? selectedFile.name : 'Choose File'}
                      </label>
                      <input
                        id="file-input"
                        ref={fileInputRef}
                        type="file"
                        className="EventDetails__fileInput"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                      <select
                        className="EventDetails__fileTypeSelect"
                        value={fileType}
                        onChange={(e) => setFileType(e.target.value)}
                      >
                        <option value="document">Document</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="audio">Audio</option>
                        <option value="other">Other</option>
                      </select>
                      <button
                        type="submit"
                        className="EventDetails__uploadSubmitBtn"
                        disabled={!selectedFile || isUploading}
                      >
                        {isUploading ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {files.length === 0 ? (
                <div className="EventDetails__filesEmpty">
                  <FiFile />
                  <p>No files available yet</p>
                  <span>Files will appear here once uploaded</span>
                </div>
              ) : (
                <div className="EventDetails__filesList">
                  {files.map((file) => (
                    <div key={file.file_id} className="EventDetails__fileItem">
                      <div className="EventDetails__fileInfo">
                        <span className="EventDetails__fileIcon">
                          {getFileIcon(file.file_type)}
                        </span>
                        <div className="EventDetails__fileDetails">
                          <span className="EventDetails__fileName">{file.file_display_name || file.file_name}</span>
                          <span className="EventDetails__fileMeta">
                            {file.file_size} • {file.file_type} • Uploaded on {file.uploaded_at}
                          </span>
                        </div>
                      </div>
                      <div className="EventDetails__fileActions">
                        <button
                          className="EventDetails__fileDownloadBtn"
                          onClick={() => handleDownloadFile(file)}
                          title="Download"
                        >
                          <FiDownload />
                        </button>
                        {isBoardOrAdmin && (
                          <button
                            className="EventDetails__fileDeleteBtn"
                            onClick={() => handleDeleteFile(file.file_id)}
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.article>
      </div>

      {/* Delete Event Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
            style={{ zIndex: 1000 }}
          >
            <motion.div
              className="success-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                maxWidth: '500px',
                background: 'rgba(20, 25, 40, 0.98)',
                border: '1px solid rgba(231, 76, 60, 0.3)'
              }}
            >
              <div style={{ 
                fontSize: '3rem', 
                color: '#e74c3c', 
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <FiAlertTriangle />
              </div>
              <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Delete Event?</h2>
              <p style={{ color: '#8EC2F0', marginBottom: '2rem', lineHeight: '1.6' }}>
                Are you sure you want to delete "{event.name}"? This action cannot be undone and will also remove all associated attendance requests.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={isDeleting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#e74c3c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    opacity: isDeleting ? 0.6 : 1
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Event'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Submissions Confirmation Modal */}
      <AnimatePresence>
        {showRegistrationToggleConfirm && (
          <motion.div
            className="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isTogglingRegistration && setShowRegistrationToggleConfirm(false)}
            style={{ zIndex: 1000 }}
          >
            <motion.div
              className="success-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                maxWidth: '500px',
                background: 'rgba(20, 25, 40, 0.98)',
                border: '1px solid rgba(255, 193, 7, 0.3)'
              }}
            >
              <div style={{ 
                fontSize: '3rem', 
                color: '#ffc107', 
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <FiAlertTriangle />
              </div>
              <h2 style={{ color: '#fff', marginBottom: '1rem' }}>
                {event.registration_enabled ? 'Close Registration?' : 'Open Registration?'}
              </h2>
              <p style={{ color: '#8EC2F0', marginBottom: '2rem', lineHeight: '1.6' }}>
                {event.registration_enabled 
                  ? `Are you sure you want to close registration for "${event.name}"? Users will no longer be able to submit attendance requests for this event.`
                  : `Are you sure you want to open registration for "${event.name}"? Users will be able to submit attendance requests for this event.`}
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowRegistrationToggleConfirm(false)}
                  disabled={isTogglingRegistration}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    cursor: isTogglingRegistration ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleToggleRegistration}
                  disabled={isTogglingRegistration}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: event.registration_enabled ? '#ffc107' : '#4caf50',
                    color: event.registration_enabled ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isTogglingRegistration ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    opacity: isTogglingRegistration ? 0.6 : 1
                  }}
                >
                  {isTogglingRegistration 
                    ? 'Updating...' 
                    : event.registration_enabled 
                      ? 'Close Registration' 
                      : 'Open Registration'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default EventDetails;
