import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import './CreateTeam.css';
import { FiUsers, FiMail, FiPlusCircle, FiX, FiAlertCircle } from 'react-icons/fi';

const CreateTeam = () => {
  const { id: competitionId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [competition, setCompetition] = useState(null);
  const [error, setError] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [leaderData, setLeaderData] = useState({
    name: '',
    university_id: '',
    email: ''
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const fetchCompetition = async () => {
      try {
        setLoading(true);
        const data = await ApiService.getCompetitionById(competitionId);
        setCompetition(data);
        
        // For solo competitions (max_team_size = 1), auto-create team
        if (data.max_team_size === 1) {
          // Set loading to false to show the form briefly before redirect
          setLoading(false);
          return; // Let the user fill the form for solo registration
        }
        
        // Initialize team members array based on minimum team size
        // min_team_size includes the leader, so we need (min_team_size - 1) member cards
        const minMembers = Math.max((data.min_team_size || 2) - 1, 1);
        setTeamMembers(Array(minMembers).fill(null).map(() => ({
          name: '',
          university_id: '',
          email: ''
        })));
      } catch (err) {
        console.error('Error fetching competition:', err);
        setError(err.message || 'Failed to load competition');
      } finally {
        setLoading(false);
      }
    };

    fetchCompetition();
  }, [competitionId]);

  const addMemberField = () => {
    if (teamMembers.length < (competition?.max_team_size - 1 || 0)) {
      setTeamMembers([...teamMembers, { name: '', university_id: '', email: '' }]);
    }
  };

  const removeMemberField = (index) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const updateMember = (index, field, value) => {
    const newMembers = [...teamMembers];
    newMembers[index][field] = value;
    setTeamMembers(newMembers);
  };

  const validateForm = () => {
    const errors = {};

    // Skip team name validation for solo competitions
    if (competition?.max_team_size !== 1) {
      if (!teamName.trim()) {
        errors.teamName = 'Team name is required';
      } else if (teamName.length < 3) {
        errors.teamName = 'Team name must be at least 3 characters';
      }
    }

    const emailRegex = /^[^\s@]+@miuegypt\.edu\.eg$/i;
    const universityIdRegex = /^\d{4}\/\d{5}$/; // Format: 2023/98765
    
    // Validate leader data
    if (!leaderData.name.trim()) {
      errors.leaderName = 'Your name is required';
    } else if (leaderData.name.length < 3) {
      errors.leaderName = 'Name must be at least 3 characters';
    }

    if (!leaderData.university_id.trim()) {
      errors.leaderUniversityId = 'Your University ID is required';
    } else if (!universityIdRegex.test(leaderData.university_id)) {
      errors.leaderUniversityId = 'Invalid University ID format';
    }

    if (!leaderData.email.trim()) {
      errors.leaderEmail = 'Your MIU email is required';
    } else if (!emailRegex.test(leaderData.email)) {
      errors.leaderEmail = 'Must be a valid @miuegypt.edu.eg email';
    }
    
    // Skip team validation for solo competitions
    if (competition.max_team_size === 1) {
      return errors;
    }

    const validMembers = teamMembers.filter(member => 
      member.name.trim() || member.university_id.trim() || member.email.trim()
    );
    
    const totalMembers = validMembers.length + 1; // +1 for the creator

    if (totalMembers < competition.min_team_size) {
      errors.teamSize = `Team must have at least ${competition.min_team_size} member${competition.min_team_size > 1 ? 's' : ''}`;
    }

    if (totalMembers > competition.max_team_size) {
      errors.teamSize = `Team cannot exceed ${competition.max_team_size} members`;
    }

    // Validate each member
    teamMembers.forEach((member, index) => {
      const hasAnyData = member.name.trim() || member.university_id.trim() || member.email.trim();
      
      if (hasAnyData) {
        // If any field is filled, all fields are required
        if (!member.name.trim()) {
          errors[`name_${index}`] = 'Name is required';
        } else if (member.name.length < 3) {
          errors[`name_${index}`] = 'Name must be at least 3 characters';
        }

        if (!member.university_id.trim()) {
          errors[`university_id_${index}`] = 'University ID is required';
        } else if (!universityIdRegex.test(member.university_id)) {
          errors[`university_id_${index}`] = 'Invalid University ID format';
        }

        if (!member.email.trim()) {
          errors[`email_${index}`] = 'MIU email is required';
        } else if (!emailRegex.test(member.email)) {
          errors[`email_${index}`] = 'Must be a valid @miuegypt.edu.eg email';
        }
      }
    });

    // Check for duplicate emails (including leader)
    const emails = validMembers.map(m => m.email.toLowerCase()).filter(e => e);
    if (leaderData.email.trim()) {
      emails.push(leaderData.email.toLowerCase());
    }
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
      errors.duplicateEmails = 'Duplicate email addresses detected';
    }

    // Check for duplicate university IDs (including leader)
    const ids = validMembers.map(m => m.university_id).filter(id => id);
    if (leaderData.university_id.trim()) {
      ids.push(leaderData.university_id);
    }
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      errors.duplicateIds = 'Duplicate University IDs detected';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Auto-generate team name for solo competitions
      const finalTeamName = competition?.max_team_size === 1 
        ? `Solo - ${leaderData.name} - ${Date.now()}`
        : teamName;

      const validMembers = teamMembers.filter(member => 
        member.name.trim() && member.university_id.trim() && member.email.trim()
      );

      // Create team with leader data
      const teamData = await ApiService.createTeam({
        competition_id: competitionId,
        team_name: finalTeamName,
        leader_name: leaderData.name,
        leader_university_id: leaderData.university_id,
        leader_email: leaderData.email,
        members: validMembers
      });

      // Skip member invitations for solo competitions
      if (competition?.max_team_size !== 1) {
        // For authenticated leader accounts, preserve existing invite endpoint flow.
        // For guests, backend already processes members from createTeam payload.
        if (validMembers.length > 0 && ApiService.getAuthToken()) {
          await Promise.all(
            validMembers.map(member =>
              ApiService.inviteToTeam(teamData.team_id, member.email, {
                name: member.name,
                university_id: member.university_id
              })
            )
          );
        }
      }

      // Check if leader needs to activate account
      if (teamData.pending_leader_activation) {
        // Show success message and redirect to home
        const message = competition?.max_team_size === 1
          ? 'Registration successful! Check your email to activate your account and start the competition.'
          : 'Team created! Check your email to activate your account and access your team.';
        
        navigate('/', {
          state: { message }
        });
      } else {
        navigate(`/competitions/${competitionId}/team/${teamData.team_id}`);
      }
    } catch (err) {
      console.error('Error creating team:', err);
      setError(err.message || 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error && !competition) {
    return (
      <section className="CreateTeamPage">
        <BackButton to={`/competitions/${competitionId}`} label="Back to Competition" />
        <div className="CreateTeamPage__error">
          <FiAlertCircle size={60} />
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="CreateTeamPage">
      <BackButton to={`/competitions/${competitionId}`} label="Back to Competition" />
      <SEO
        title={`${competition?.max_team_size === 1 ? 'Join Competition' : 'Create Team'} - ${competition?.title}`}
        description={competition?.max_team_size === 1 ? 'Register for the competition' : 'Create a team for the competition'}
      />

      <div className="CreateTeamPage__container">
        <motion.header
          className="CreateTeamPage__header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <FiUsers size={48} className="CreateTeamPage__icon" />
          <h1 className="CreateTeamPage__title">
            {competition?.max_team_size === 1 ? 'Join Competition' : 'Create Your Team'}
          </h1>
          <p className="CreateTeamPage__subtitle">
            {competition?.title}
          </p>
          {competition?.max_team_size !== 1 && (
            <div className="CreateTeamPage__teamInfo">
              <span>Team Size: {competition?.min_team_size}-{competition?.max_team_size} members</span>
            </div>
          )}
        </motion.header>

        <motion.form
          className="CreateTeamPage__form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {error && (
            <div className="CreateTeamPage__formError">
              <FiAlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {competition?.max_team_size !== 1 && (
            <div className="CreateTeamPage__formGroup">
              <label htmlFor="teamName" className="CreateTeamPage__label">
                Team Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="teamName"
                className={`CreateTeamPage__input ${formErrors.teamName ? 'error' : ''}`}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter your team name"
                disabled={submitting}
              />
              {formErrors.teamName && (
                <span className="CreateTeamPage__fieldError">{formErrors.teamName}</span>
              )}
            </div>
          )}

          <div className="CreateTeamPage__formGroup">
            <label className="CreateTeamPage__label">
              <FiUsers size={18} />
              {competition?.max_team_size === 1 ? 'Your Information' : 'Team Leader Information'} <span className="required">*</span>
            </label>
            <p className="CreateTeamPage__hint">
              {competition?.max_team_size === 1 
                ? 'Please provide your details. You must use your MIU email (@miuegypt.edu.eg)'
                : 'As the team leader, please provide your details. You must use your MIU email (@miuegypt.edu.eg)'
              }
            </p>
            
            <div className="CreateTeamPage__leaderCard">
              <div className="CreateTeamPage__memberFields">
                <div className="CreateTeamPage__fieldWrapper">
                  <input
                    type="text"
                    className={`CreateTeamPage__input ${formErrors.leaderName ? 'error' : ''}`}
                    value={leaderData.name}
                    onChange={(e) => setLeaderData({...leaderData, name: e.target.value})}
                    placeholder="Your Full Name"
                    disabled={submitting}
                  />
                  {formErrors.leaderName && (
                    <span className="CreateTeamPage__fieldError">{formErrors.leaderName}</span>
                  )}
                </div>

                <div className="CreateTeamPage__fieldWrapper">
                  <input
                    type="text"
                    className={`CreateTeamPage__input ${formErrors.leaderUniversityId ? 'error' : ''}`}
                    value={leaderData.university_id}
                    onChange={(e) => setLeaderData({...leaderData, university_id: e.target.value})}
                    placeholder="Your University ID (e.g., 2023/98765)"
                    disabled={submitting}
                  />
                  {formErrors.leaderUniversityId && (
                    <span className="CreateTeamPage__fieldError">{formErrors.leaderUniversityId}</span>
                  )}
                </div>

                <div className="CreateTeamPage__fieldWrapper">
                  <input
                    type="email"
                    className={`CreateTeamPage__input ${formErrors.leaderEmail ? 'error' : ''}`}
                    value={leaderData.email}
                    onChange={(e) => setLeaderData({...leaderData, email: e.target.value})}
                    placeholder="name2398765@miuegypt.edu.eg"
                    disabled={submitting}
                  />
                  {formErrors.leaderEmail && (
                    <span className="CreateTeamPage__fieldError">{formErrors.leaderEmail}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {competition?.max_team_size !== 1 && (
            <div className="CreateTeamPage__formGroup">
              <label className="CreateTeamPage__label">
                <FiMail size={18} />
                Invite Team Members
              </label>
              <p className="CreateTeamPage__hint">
                You can invite {competition?.max_team_size - 1} member{competition?.max_team_size > 2 ? 's' : ''} to join your team. All members must use their MIU email (@miuegypt.edu.eg)
              </p>

              <div className="CreateTeamPage__membersList">
                {teamMembers.map((member, index) => {
                  // Only show remove button for cards that exceed minimum team size
                  const minMemberCards = Math.max((competition?.min_team_size || 2) - 1, 1);
                  const canRemove = index >= minMemberCards;
                  
                  return (
                    <div key={index} className="CreateTeamPage__memberCard">
                      <div className="CreateTeamPage__memberHeader">
                        <h4>Member {index + 1}</h4>
                        {canRemove && (
                          <button
                            type="button"
                            className="CreateTeamPage__removeBtn"
                            onClick={() => removeMemberField(index)}
                            disabled={submitting}
                          >
                            <FiX size={20} />
                          </button>
                        )}
                      </div>
                    
                      <div className="CreateTeamPage__memberFields">
                      <div className="CreateTeamPage__fieldWrapper">
                        <input
                          type="text"
                          className={`CreateTeamPage__input ${formErrors[`name_${index}`] ? 'error' : ''}`}
                          value={member.name}
                          onChange={(e) => updateMember(index, 'name', e.target.value)}
                          placeholder="Full Name"
                          disabled={submitting}
                        />
                        {formErrors[`name_${index}`] && (
                          <span className="CreateTeamPage__fieldError">{formErrors[`name_${index}`]}</span>
                        )}
                      </div>

                      <div className="CreateTeamPage__fieldWrapper">
                        <input
                          type="text"
                          className={`CreateTeamPage__input ${formErrors[`university_id_${index}`] ? 'error' : ''}`}
                          value={member.university_id}
                          onChange={(e) => updateMember(index, 'university_id', e.target.value)}
                        placeholder="University ID (e.g., 2023/98765)"
                          disabled={submitting}
                        />
                        {formErrors[`university_id_${index}`] && (
                          <span className="CreateTeamPage__fieldError">{formErrors[`university_id_${index}`]}</span>
                        )}
                      </div>

                      <div className="CreateTeamPage__fieldWrapper">
                        <input
                          type="email"
                          className={`CreateTeamPage__input ${formErrors[`email_${index}`] ? 'error' : ''}`}
                          value={member.email}
                          onChange={(e) => updateMember(index, 'email', e.target.value)}
                        placeholder="name2398765@miuegypt.edu.eg"
                          disabled={submitting}
                        />
                        {formErrors[`email_${index}`] && (
                          <span className="CreateTeamPage__fieldError">{formErrors[`email_${index}`]}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>

              {teamMembers.length < (competition?.max_team_size - 1) && (
                <button
                  type="button"
                  className="CreateTeamPage__addBtn"
                  onClick={addMemberField}
                  disabled={submitting}
                >
                  <FiPlusCircle size={20} />
                  Add Another Member
                </button>
              )}

              {formErrors.teamSize && (
                <span className="CreateTeamPage__fieldError">{formErrors.teamSize}</span>
              )}
              {formErrors.duplicateEmails && (
                <span className="CreateTeamPage__fieldError">{formErrors.duplicateEmails}</span>
              )}
              {formErrors.duplicateIds && (
                <span className="CreateTeamPage__fieldError">{formErrors.duplicateIds}</span>
              )}
            </div>
          )}

          <div className="CreateTeamPage__summary">
            <h3>Team Summary</h3>
            {leaderData.name && leaderData.email ? (
              <p>
                <strong>{leaderData.name}</strong> (Team Leader) - {leaderData.university_id}<br />
                <span className="CreateTeamPage__summaryEmail">{leaderData.email}</span>
              </p>
            ) : (
              <p>
                <strong>You</strong> (Team Leader)
              </p>
            )}
            {competition?.max_team_size !== 1 && teamMembers.filter(m => m.name.trim() && m.email.trim()).length > 0 && (
              <>
                <p className="CreateTeamPage__summaryLabel">Invited Members:</p>
                <ul>
                  {teamMembers.filter(m => m.name.trim() && m.email.trim()).map((member, index) => (
                    <li key={index}>
                      <strong>{member.name}</strong> ({member.university_id})<br />
                      <span className="CreateTeamPage__summaryEmail">{member.email}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {competition?.max_team_size !== 1 && (
              <p className="CreateTeamPage__totalCount">
                Total: {teamMembers.filter(m => m.name.trim() && m.email.trim()).length + 1} / {competition?.max_team_size} members
              </p>
            )}
          </div>

          <div className="CreateTeamPage__actions">
            <button
              type="button"
              className="CreateTeamPage__cancelBtn"
              onClick={() => navigate(`/competitions/${competitionId}`)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="CreateTeamPage__submitBtn"
              disabled={submitting}
            >
              {submitting 
                ? (competition?.max_team_size === 1 ? 'Registering...' : 'Creating Team...') 
                : (competition?.max_team_size === 1 ? 'Register' : 'Create Team')
              }
            </button>
          </div>
        </motion.form>
      </div>
    </section>
  );
};

export default CreateTeam;
