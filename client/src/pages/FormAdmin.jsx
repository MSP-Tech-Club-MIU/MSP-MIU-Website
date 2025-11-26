import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../services/api";
import { getDepartmentNameById } from "../data/departments";
import PageLoader from "../components/PageLoader";

// Import components
import CommentModal from "../components/CommentModal";
import PasswordModal from "../components/PasswordModal";
import TextModal from "../components/TextModal";
import ChartsSection from "../components/ChartsSection";
import FiltersSection from "../components/FiltersSection";
import ApplicationsTable from "../components/ApplicationsTable";

const FormAdmin = memo(() => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedText, setExpandedText] = useState({ field: null, appId: null });
  const [commentModal, setCommentModal] = useState({ isOpen: false, application: null, comment: '' });
  const [passwordModal, setPasswordModal] = useState({ isOpen: false, application: null, newStatus: '', password: '', error: '' });
  const textareaRef = useRef(null);
  const passwordRef = useRef(null);
  
  // Authentication states
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    first_choice: '',
    second_choice: '',
    status: '',
    faculty: '',
    year: ''
  });

  // Chart colors - more distinguished and vibrant
  const chartColors = [
    '#395a7f', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c',
    '#34495e', '#e67e22', '#3498db', '#2ecc71', '#8e44ad', '#f1c40f',
    '#e91e63', '#00bcd4', '#4caf50', '#ff9800', '#795548', '#607d8b'
  ];

  // Process data for charts
  const getChartData = (applications, field, fieldName = 'Unknown') => {
    const counts = {};
    applications.forEach(app => {
      let value = app[field];
      if (field === 'first_choice' || field === 'second_choice') {
        if (value) {
          value = getDepartmentNameById(value);
        }
      }
      if (!value || value === null || value === undefined) value = 'N/A';
      counts[value] = (counts[value] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([label, count], index) => ({
        label,
        count,
        percentage: Math.round((count / applications.length) * 100),
        color: chartColors[index % chartColors.length]
      }))
      .sort((a, b) => b.count - a.count); // Sort by count (highest to lowest)
  };

  const firstChoiceData = getChartData(applications, 'first_choice');
  const secondChoiceData = getChartData(applications, 'second_choice');
  const facultyData = getChartData(applications, 'faculty');

  // Function to handle text expansion
  const handleTextClick = (field, appId, text) => {
    if (text && text.length > 100) {
      setExpandedText({ field, appId, text });
    }
  };

  // Function to close expanded text
  const closeExpandedText = () => {
    setExpandedText({ field: null, appId: null });
  };

  // Function to open comment modal
  const openCommentModal = (application) => {
    setCommentModal({
      isOpen: true,
      application: application,
      comment: application.comment || ''
    });
  };

  // Function to close comment modal
  const closeCommentModal = () => {
    setCommentModal({ isOpen: false, application: null, comment: '' });
  };

  // Function to open password modal
  const openPasswordModal = (application, newStatus) => {
    setPasswordModal({
      isOpen: true,
      application: application,
      newStatus: newStatus,
      password: '',
      error: ''
    });
  };

  // Function to close password modal
  const closePasswordModal = () => {
    setPasswordModal({ isOpen: false, application: null, newStatus: '', password: '', error: '' });
  };

  // Function to confirm status change with password
  const confirmStatusChange = async () => {
    if (!passwordModal.password) {
      setPasswordModal(prev => ({ ...prev, error: 'Please enter the password' }));
      return;
    }

    try {
      await ApiService.updateApplicationStatus(
        passwordModal.application.application_id, 
        passwordModal.newStatus, 
        passwordModal.password
      );
      
      // Update local state
      setApplications(prev =>
        prev.map(app => 
          app.application_id === passwordModal.application.application_id 
            ? { ...app, status: passwordModal.newStatus }
            : app
        )
      );
      
      // Also update filtered applications
      setFilteredApplications(prev =>
        prev.map(app => 
          app.application_id === passwordModal.application.application_id 
            ? { ...app, status: passwordModal.newStatus }
            : app
        )
      );
      
      closePasswordModal();
    } catch (error) {
      console.error('Error updating application status:', error);
      setPasswordModal(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to update application status. Please check the password and try again.' 
      }));
    }
  };

  // Focus textarea when modal opens
  useEffect(() => {
    if (commentModal.isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [commentModal.isOpen]);

  // Focus password input when modal opens
  useEffect(() => {
    if (passwordModal.isOpen && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [passwordModal.isOpen]);

  // Function to get status color
  const getStatusColor = (status) => {
    if (status?.startsWith('approved')) {
      return '#27ae60'; // Green color from the palette
    } else if (status?.startsWith('rejected')) {
      return '#e74c3c'; // Red color from the palette
    } else {
      return '#395a7f'; // Default blue color from the palette
    }
  };

  // Function to save comment
  const saveComment = async () => {
    try {
      await ApiService.updateApplicationComment(commentModal.application.application_id, commentModal.comment);
      
      // Update local state
      setApplications(prev =>
        prev.map(app => 
          app.application_id === commentModal.application.application_id 
            ? { ...app, comment: commentModal.comment }
            : app
        )
      );
      
      // Also update filtered applications to reflect the change immediately
      setFilteredApplications(prev =>
        prev.map(app => 
          app.application_id === commentModal.application.application_id 
            ? { ...app, comment: commentModal.comment }
            : app
        )
      );
      
      closeCommentModal();
    } catch (error) {
      console.error('Error saving comment:', error);
      alert('Failed to save comment. Please try again.');
    }
  };

  // Debounced search hook
  const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms delay

  const fetchApplications = useCallback(async (currentFilters = {}, isManualFilter = false) => {
    try {
      if (isManualFilter) {
        setIsFiltering(true);
      } else {
        setLoading(true);
      }
      
      const result = await ApiService.getAllApplications(currentFilters);
      console.log("Fetched applications:", result.data);
      
      if (isManualFilter) {
        setFilteredApplications(result.data);
        setIsFiltering(false);
        setHasSearched(true);
      } else {
        setApplications(result.data);
        setFilteredApplications(result.data);
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching applications:", err);
      if (isManualFilter) {
        setIsFiltering(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  // Check authentication and role on mount
  useEffect(() => {
    const checkAuthAndRole = async () => {
      setIsCheckingAuth(true);
      
      // Check if user is authenticated
      if (!ApiService.isAuthenticated()) {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        // Redirect to login page
        navigate('/login', { replace: true });
        return;
      }
      
      // Fetch user profile to check role
      try {
        const user = await ApiService.getProfile();
        setIsAuthenticated(true);
        setUserRole(user.role);
        
        // Check if user has board role
        if (user.role !== 'board') {
          setIsCheckingAuth(false);
          // Don't redirect, show unauthorized message
          return;
        }
        
        // User is authenticated and has board role, proceed to load applications
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        // Redirect to login if token is invalid
        ApiService.removeAuthToken();
        navigate('/login', { replace: true });
      }
    };
    
    checkAuthAndRole();
  }, [navigate]);

  // Initial load - only fetch applications if authenticated and has board role
  useEffect(() => {
    if (!isCheckingAuth && isAuthenticated && userRole === 'board') {
      fetchApplications();
    }
  }, [isCheckingAuth, isAuthenticated, userRole, fetchApplications]);

  // Handle filter changes (no immediate API call)
  const handleFilterChange = useCallback((filterKey, value) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }));
  }, []);

  // Handle search term changes (no immediate API call)
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  // Manual filter application
  const applyFilters = useCallback(() => {
    const filtersToSend = {
      ...filters,
      search: searchTerm || undefined
    };
    fetchApplications(filtersToSend, true);
  }, [filters, searchTerm, fetchApplications]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const emptyFilters = {
      first_choice: '',
      second_choice: '',
      status: '',
      faculty: '',
      year: ''
    };
    setFilters(emptyFilters);
    setSearchTerm('');
    setHasSearched(false);
    // Reset to show all applications
    setFilteredApplications(applications);
  }, [applications]);

  // Auto-search effect for search term only (debounced)
  useEffect(() => {
    // Skip the initial load (when debouncedSearchTerm is undefined)
    if (debouncedSearchTerm === undefined) return;
    
    // Only auto-search if there's a search term and no other filters are applied
    const hasFilters = Object.values(filters).some(value => value !== '');
    if (debouncedSearchTerm && !hasFilters) {
      const filtersToSend = {
        search: debouncedSearchTerm
      };
      fetchApplications(filtersToSend, true);
    }
  }, [debouncedSearchTerm, filters, fetchApplications]);

  const handleStatusChange = async (application_id, newStatus) => {
    // For all status changes, show password modal
    const application = applications.find(app => app.application_id === application_id);
    openPasswordModal(application, newStatus);
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div style={{ 
        textAlign: "center", 
        padding: "50px",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        margin: "20px"
      }}>
        <div style={{ 
          display: "inline-block",
          width: "40px",
          height: "40px",
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #395a7f",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: "16px"
        }}></div>
        <h3 style={{ color: "#495057", margin: "0 0 8px 0" }}>
          Verifying Access...
        </h3>
        <p style={{ color: "#6c757d", margin: "0", fontSize: "14px" }}>
          Please wait while we verify your permissions...
        </p>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // Show unauthorized message if user is authenticated but doesn't have board role
  if (isAuthenticated && userRole !== 'board') {
    return (
      <div style={{ 
        textAlign: "center", 
        padding: "50px",
        backgroundColor: "#fff3cd",
        borderRadius: "8px",
        margin: "20px",
        border: "2px solid #ffc107"
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>
          ⚠️
        </div>
        <h2 style={{ color: "#856404", margin: "0 0 8px 0" }}>
          Access Denied
        </h2>
        <p style={{ color: "#856404", margin: "0 0 24px 0", fontSize: "16px" }}>
          You don't have permission to access this page. Only board members can view the applications dashboard.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: "10px 20px",
            backgroundColor: "#395a7f",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "14px",
            cursor: "pointer"
          }}
        >
          Go to Home
        </button>
      </div>
    );
  }

  // Show loading while fetching applications
  if (loading) {
    return <PageLoader message="Loading applications..." />;
  }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <TextModal 
        expandedText={expandedText}
        closeExpandedText={closeExpandedText}
      />
      <CommentModal 
        commentModal={commentModal}
        setCommentModal={setCommentModal}
        closeCommentModal={closeCommentModal}
        saveComment={saveComment}
        textareaRef={textareaRef}
      />
      <PasswordModal 
        passwordModal={passwordModal}
        setPasswordModal={setPasswordModal}
        closePasswordModal={closePasswordModal}
        confirmApproval={confirmStatusChange}
        passwordRef={passwordRef}
      />
      <h2>Applications Dashboard</h2>
      
      <ChartsSection 
        firstChoiceData={firstChoiceData}
        secondChoiceData={secondChoiceData}
        facultyData={facultyData}
      />
      
      <FiltersSection 
        filters={filters}
        searchTerm={searchTerm}
        filteredApplications={filteredApplications}
        handleFilterChange={handleFilterChange}
        handleSearchChange={handleSearchChange}
        clearFilters={clearFilters}
        applyFilters={applyFilters}
        isFiltering={isFiltering}
      />

      {/* No Results Message */}
      {hasSearched && filteredApplications.length === 0 && !loading && !isFiltering && (
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          margin: "20px 0",
          border: "2px dashed #dee2e6"
        }}>
          <div style={{ fontSize: "48px", color: "#6c757d", marginBottom: "16px" }}>
            🔍
          </div>
          <h3 style={{ color: "#495057", margin: "0 0 8px 0", fontSize: "18px" }}>
            No Applications Found
          </h3>
          <p style={{ color: "#6c757d", margin: "0", fontSize: "14px" }}>
            The entered filters don't match any applicants. Try adjusting your search criteria.
          </p>
          <button
            onClick={clearFilters}
            style={{
              marginTop: "16px",
              padding: "8px 16px",
              backgroundColor: "#395a7f",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            Clear All Filters
          </button>
        </div>
      )}

      <ApplicationsTable 
        filteredApplications={filteredApplications}
        handleTextClick={handleTextClick}
        openCommentModal={openCommentModal}
        handleStatusChange={handleStatusChange}
        getStatusColor={getStatusColor}
      />
      
      <p style={{ marginTop: "20px", color: "#666" }}>
        Total Applications: {applications.length} | Filtered: {filteredApplications.length}
      </p>
    </div>
  );
});
FormAdmin.displayName = 'FormAdmin';

export default FormAdmin;
