import React, { useMemo, useState, useEffect, memo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FaInstagram } from 'react-icons/fa'
import SEO from '../components/SEO'
import BackButton from '../components/BackButton'
import PageLoader from '../components/PageLoader'
import miuLogo from '../assets/Images/miu-logo.png'
import mspLogo from '../assets/Images/msp-logo.png'
import ApiService from '../services/api'
import { departments as defaultDepartments, getDepartmentIdByName, isBoardPosition } from '../data/departments'
import useSiteContent from '../hooks/useSiteContent'
import { useModal } from '../context/ModalContext'

// Memoized constants to prevent recreation
const palette = {
  orange: '#F4581F',
  green: '#83BD00',
  cyan: '#03A9F4',
  yellow: '#FFC107',
  gray: '#757575',
  navy900: '#031C35',
  navy800: '#0D3159',
  navy700: '#1D4F82',
  navy600: '#245C9E',
  blue500: '#0077CC',
  blue400: '#5AA0E6',
  blue300: '#8EC2F0',
}

const DEFAULT_FACULTIES = [
  'Computer Science',
  'Engineering Sciences & Arts - ECE',
  'Mass Communication',
  'Dentistry',
  'Engineering Sciences & Arts - Architecture',
  'Pharmacy',
  'Business',
  'Alsun',
]

const DEFAULT_YEARS = [
  { value: 1, label: 'Freshman' },
  { value: 2, label: 'Sophomore' },
  { value: 3, label: 'Junior' },
  { value: 4, label: 'Senior' },
  { value: 5, label: 'Senior 2' }
]

const Stepper = memo(({ step }) => {
  const items = useMemo(() => [0,1,2,3,4], []);
  const percent = useMemo(() => Math.min(100, Math.max(0, (step/(items.length-1))*100)), [step, items.length]);
  
  return (
    <div className="stepper stepper-wrap">
      <div className="stepper-track" />
      <div className="stepper-fill" style={{ width: `${percent}%` }} />
      {items.map(i => (
        <div key={i} className={`stepper-item ${step===i? 'active':''} ${step>i? 'done':''}`}>
          <div className="bubble">{i+1}</div>
          {i<items.length-1 && <div className="bar-link" />}
        </div>
      ))}
    </div>
  )
});

Stepper.displayName = 'Stepper';

const BecomeMember = memo(() => {
  const totalSteps = 6 // 5 form steps + review
  const [screen, setScreen] = useState('welcome')
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const { data: content, loading: contentLoading } = useSiteContent(['lookups', 'recruitment'])
  const lookups = content.lookups || {}
  const recruitment = content.recruitment || {}

  const faculties = useMemo(() => {
    if (Array.isArray(lookups.faculties) && lookups.faculties.length) return lookups.faculties
    return DEFAULT_FACULTIES
  }, [lookups.faculties])

  const years = useMemo(() => {
    if (Array.isArray(lookups.years) && lookups.years.length) {
      return lookups.years.map((label, idx) =>
        typeof label === 'object' && label?.value != null
          ? label
          : { value: idx + 1, label: String(label) }
      )
    }
    return DEFAULT_YEARS
  }, [lookups.years])

  const departments = useMemo(() => {
    if (Array.isArray(lookups.departments) && lookups.departments.length) {
      return lookups.departments.map((d) => ({
        id: d.id ?? d.department_id,
        name: d.name
      }))
    }
    return defaultDepartments
  }, [lookups.departments])

  const DRAFT_STORAGE_KEY = 'msp_member_application_draft'
  const { confirm, alert: modalAlert } = useModal()

  const [form, setForm] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed.form === 'object') {
          return {
            name: parsed.form.name || '',
            email: parsed.form.email || '',
            studentId: parsed.form.studentId || '',
            faculty: parsed.form.faculty || '',
            year: parsed.form.year || '',
            interview: parsed.form.interview || '',
            phone: parsed.form.phone || '',
            dept1: parsed.form.dept1 || '',
            dept2: parsed.form.dept2 || '',
            skills: parsed.form.skills || '',
            motivation: parsed.form.motivation || '',
          }
        }
      }
    } catch {
      // ignore
    }
    return {
      name: '',
      email: '',
      studentId: '',
      faculty: '',
      year: '',
      interview: '',
      phone: '',
      dept1: '',
      dept2: '',
      skills: '',
      motivation: '',
    }
  })

  const [hasRestoredDraft, setHasRestoredDraft] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return Boolean(parsed?.form && Object.values(parsed.form).some((v) => v !== ''))
      }
    } catch {
      // ignore
    }
    return false
  })

  const [hasVisitedReview, setHasVisitedReview] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return Boolean(parsed?.hasVisitedReview)
      }
    } catch {
      // ignore
    }
    return false
  })

  const [errors, setErrors] = useState({})
  // null | { eligible, reason, message, warning }
  const [eligibilityStatus, setEligibilityStatus] = useState(null)
  const [checkingEligibility, setCheckingEligibility] = useState(false)

  // Memoize computed values
  const canGoBack = useMemo(() => step > 0, [step]);
  const canGoNext = useMemo(() => step < totalSteps - 1, [step, totalSteps]);

  const updateField = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    // Clear eligibility status whenever step-0 fields are edited so user re-checks
    if (key === 'name' || key === 'email' || key === 'studentId') {
      setEligibilityStatus(null)
    }
  }, []);

  // University ID auto-formatting with slash (xxxx/xxxxx)
  const handleStudentIdChange = useCallback((e) => {
    let raw = e.target.value.replace(/[^\d/]/g, '')
    if (!raw.includes('/') && raw.length > 4) {
      raw = raw.slice(0, 4) + '/' + raw.slice(4, 9)
    }
    if (raw.length > 10) raw = raw.slice(0, 10)
    updateField('studentId', raw)
  }, [updateField])

  // Egyptian Phone number auto-formatting (strip non-digits & leading 0, max 10 digits)
  const handlePhoneChange = useCallback((e) => {
    const cleaned = e.target.value.replace(/[^\d]/g, '').replace(/^0+/, '').slice(0, 10)
    updateField('phone', cleaned)
  }, [updateField])

  // Clear draft & reset form
  const handleClearDraft = useCallback(async () => {
    const isConfirmed = await confirm({
      title: 'Clear Saved Draft?',
      message: 'Are you sure you want to clear your saved draft and reset all form fields? This cannot be undone.',
      confirmText: 'Clear Draft',
      cancelText: 'Keep Editing',
      type: 'danger'
    })
    if (!isConfirmed) return

    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {
      // ignore
    }
    setForm({
      name: '',
      email: '',
      studentId: '',
      faculty: '',
      year: '',
      interview: '',
      phone: '',
      dept1: '',
      dept2: '',
      skills: '',
      motivation: '',
    })
    setStep(0)
    setHasRestoredDraft(false)
    setHasVisitedReview(false)
    setEligibilityStatus(null)
    setErrors({})
  }, [confirm])

  // Auto-save draft into sessionStorage
  useEffect(() => {
    if (screen === 'form') {
      try {
        const hasContent = Object.values(form).some((v) => v !== '')
        if (hasContent) {
          sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ form, step, hasVisitedReview }))
        }
      } catch (err) {
        console.warn('Could not save draft to sessionStorage', err)
      }
    }
  }, [form, step, screen, hasVisitedReview])

  // When step 5 (Review) is reached, mark hasVisitedReview
  useEffect(() => {
    if (step === 5) {
      setHasVisitedReview(true)
    }
  }, [step])

  // When faculty changes, if current departments are not allowed for the selected faculty, clear them
  useEffect(() => {
    // Only show Software and Technical for Computer Science and ECE
    const allowTech = form.faculty === 'Computer Science' || form.faculty === 'Engineering Sciences & Arts - ECE'
    if (!allowTech) {
      const blocked = ['Software Development', 'Technical Training']
      if (blocked.includes(form.dept1) || blocked.includes(form.dept2)) {
        setForm(prev => ({ ...prev, dept1: blocked.includes(prev.dept1) ? '' : prev.dept1, dept2: blocked.includes(prev.dept2) ? '' : prev.dept2 }))
      }
    }
  }, [form.faculty, form.dept1, form.dept2])

  function validateCurrentStep() {
    const e = {}
    if (step === 0) {
      // Name: require at least 2 words (no maximum)
      if (!/^\s*\S+(?:\s+\S+){1,}\s*$/.test(form.name)) e.name = 'Enter at least 2 words.'
      // email pattern: letters then digits (e.g. name2398765) followed by @miuegypt.edu.eg
      if (!/^[A-Za-z]+\d+@miuegypt\.edu\.eg$/.test(form.email)) e.email = 'Format: name2398765@miuegypt.edu.eg'
      // student ID pattern: 4 digits / 5 digits (e.g. 2023/37654)
      if (!/^\d{4}\/\d{5}$/.test(form.studentId)) e.studentId = 'Format: xxxx/xxxxx (e.g. 2023/37654)'
    }

    if (step === 1) {
      if (!form.faculty) e.faculty = 'Select faculty.'
      if (!form.year) e.year = 'Select year.'
    }

    if (step === 2) {
      if (!form.interview) e.interview = 'Select interview preference.'
      // Accept Egyptian mobile numbers starting with 10, 11, 12, or 15 -> 10 digits without leading 0
      if (!/^(10|11|12|15)\d{8}$/.test(form.phone)) {
        e.phone = 'Enter a valid 10-digit Egyptian mobile number (e.g. 1012345678, starting with 10, 11, 12, or 15).'
      }
    }

    if (step === 3) {
      // Only first department is required; second is optional
      if (!form.dept1) e.dept1 = 'Choose department.'
    }

    if (step === 4) {
      if (!form.skills.trim()) e.skills = 'Tell us your skills.'
      if (!form.motivation.trim()) e.motivation = 'Share your motivation.'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function onNext() {
    if (!validateCurrentStep()) return

    // After step 0 — run server-side eligibility check before advancing
    if (step === 0) {
      // If we already have a hard-block status, don't advance
      if (eligibilityStatus && !eligibilityStatus.eligible) return

      // If no status yet (or warning was dismissed and fields are unchanged), run the check
      if (!eligibilityStatus) {
        setCheckingEligibility(true)
        try {
          const result = await ApiService.checkApplicationEligibility({
            university_id: form.studentId,
            full_name: form.name,
            email: form.email,
          })
          setEligibilityStatus(result)
          // Only advance if eligible (warnings still allow advancing)
          if (!result.eligible) return
        } catch {
          // Network/server error — set a generic warning and allow advancing
          // so a transient error doesn't permanently block the user
          setEligibilityStatus({
            eligible: true,
            warning: 'check_failed',
            message: 'Could not verify eligibility right now. Please proceed, we will validate on submission.'
          })
        } finally {
          setCheckingEligibility(false)
        }
      }
    }

    setStep(s => Math.min(s + 1, totalSteps - 1))
  }

  function onBack() {
    setStep(s => Math.max(s - 1, 0))
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!validateCurrentStep()) return
    setSubmitting(true)
    
    try {
      // Prepare form data for API
      const formData = {
        university_id: form.studentId,
        full_name: form.name,
        email: form.email,
        faculty: form.faculty,
        year: parseInt(form.year),
        phone_number: `+20${form.phone}`,
        first_choice: departments.find((d) => d.name === form.dept1)?.id ?? getDepartmentIdByName(form.dept1),
        second_choice: departments.find((d) => d.name === form.dept2)?.id ?? getDepartmentIdByName(form.dept2),
        skills: form.skills,
        motivation: form.motivation,
        interview: form.interview
      };

      // Submit application to backend
      console.log('Submitting payload to API:', formData);
      const result = await ApiService.submitApplication(formData);

      console.log('Application submitted successfully:', result);
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY)
      } catch {
        // ignore
      }
      setHasRestoredDraft(false)
      setScreen('success')
    } catch (error) {
      console.error('Failed to submit application:', error);
      
      // Handle specific error types
      let errorMessage = 'Failed to submit application. Please try again.';
      
      if (error.message) {
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          errorMessage = 'An application with this email or student ID already exists.';
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          errorMessage = 'Please check your information and try again.';
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      // Show error message
      await modalAlert({
        title: 'Submission Failed',
        message: errorMessage,
        type: 'danger'
      });
    } finally {
      setSubmitting(false)
    }
  }


  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Become a Member - MSP Tech Club",
    "description": "Join MSP Tech Club at MIU! Fill out our membership application form to become part of our student-led innovation community. Choose your department and start your journey with Microsoft Student Partners.",
    "url": "https://msp-miu.tech/become-member"
  };

  return (
    <div className="page" style={{ background: `linear-gradient(135deg, ${palette.navy900}, ${palette.navy700})` }}>
      <BackButton to="/" label="Back to Home" />
      <SEO
        title="Become a Member"
        description="Join MSP Tech Club at MIU! Fill out our membership application form to become part of our student-led innovation community. Choose your department and start your journey with Microsoft Student Partners."
        keywords="join MSP, become MSP member, MIU tech club application, Microsoft Student Partners application, join tech club"
        url="https://msp-miu.tech/become-member"
        structuredData={structuredData}
      />
      {contentLoading ? (
        <main className="container welcome" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <PageLoader message="Checking recruitment status…" />
        </main>
      ) : recruitment?.enabled === false ? (
        <main className="container welcome" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 20 }}>
          <div style={{
            textAlign: 'center',
            maxWidth: 620,
            background: 'rgba(9, 26, 44, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 24,
            padding: '40px 32px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
            margin: '20px 0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, alignItems: 'center', marginBottom: 20 }}>
              <img src={mspLogo} alt="MSP Club" style={{ width: 100, height: 'auto' }} />
              <img src={miuLogo} alt="MIU" style={{ width: 90, height: 'auto' }} />
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(231, 76, 60, 0.15)',
              border: '1px solid rgba(231, 76, 60, 0.35)',
              color: '#f87171',
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 16
            }}>
              <span>🔒 Registrations Closed</span>
            </div>

            <h1 className="welcome-title" style={{ fontSize: '28px', marginBottom: 12, color: '#ffffff' }}>
              {recruitment?.title || 'Membership Recruitment is Currently Closed'}
            </h1>

            <p className="welcome-sub" style={{ fontSize: '15px', color: 'rgba(234, 242, 255, 0.8)', marginBottom: 24 }}>
              {recruitment?.subtitle || 'Thank you for your interest in joining MSP Tech Club at MIU.'}
            </p>

            <div style={{
              background: 'rgba(3, 169, 244, 0.08)',
              border: '1px solid rgba(3, 169, 244, 0.25)',
              borderRadius: 16,
              padding: '18px 20px',
              marginBottom: 28,
              textAlign: 'left'
            }}>
              <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.6, color: '#eaf2ff' }}>
                📢 {recruitment?.closedMessage || 'Registrations are currently closed. Please wait until recruitment is available! Follow our Instagram page to know when recruitment opens.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
              <a
                href={recruitment?.instagramUrl || 'https://www.instagram.com/mspmiu'}
                target="_blank"
                rel="noreferrer"
                className="btn primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  width: '100%',
                  maxWidth: 320,
                  padding: '14px 24px',
                  borderRadius: 14,
                  fontSize: '15px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                  boxShadow: '0 6px 20px rgba(220, 39, 67, 0.35)',
                  border: 'none',
                  color: '#ffffff'
                }}
              >
                <FaInstagram style={{ fontSize: '20px' }} />
                <span>Follow @mspmiu on Instagram</span>
              </a>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                <Link
                  to="/courses"
                  className="btn ghost"
                  style={{ fontSize: '13.5px', padding: '10px 18px', borderRadius: 10, textDecoration: 'none', color: '#eaf2ff' }}
                >
                  Browse Free Courses
                </Link>
                <Link
                  to="/events"
                  className="btn ghost"
                  style={{ fontSize: '13.5px', padding: '10px 18px', borderRadius: 10, textDecoration: 'none', color: '#eaf2ff' }}
                >
                  Explore Events
                </Link>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <>
          {screen === 'welcome' && (
            <main className="container welcome" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <img src={mspLogo} alt="MSP Club" className="welcome-logo" style={{ width: 160, height: 'auto', marginBottom: 20 }} />
                <h1 className="welcome-title">Welcome to MSP Club</h1>
                <p className="welcome-sub">Join us and start your journey</p>
                <div style={{ marginTop: 18 }}>
                  <button className="btn primary welcome-btn" onClick={() => setScreen('form')}>Apply</button>
                </div>
              </div>
            </main>
          )}

      {screen === 'form' && (
      <main className="container">
        <Stepper step={Math.min(step,4)} />

        {hasRestoredDraft && (
          <div className="draft-banner">
            <span>📝 Restored your previous draft</span>
            <button type="button" className="draft-banner-btn" onClick={handleClearDraft}>
              Clear Draft & Reset
            </button>
          </div>
        )}

        <form className="neo-card" onSubmit={onSubmit}>
          <div className="card-logos"><img src={mspLogo} alt="MSP"/><img src={miuLogo} alt="MIU"/></div>

          {step === 0 && (
            <section className="step animate-in">
              <h2 className="card-title">Personal Info</h2>
              <p className="card-sub">Tell us who you are</p>
              <div className="grid">
                <label>
                  <span>Name</span>
                  <input className="pill" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Enter your full name" />
                  {errors.name && <small className="error">{errors.name}</small>}
                </label>
                <label>
                  <span>Email</span>
                  <input className="pill" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="name2398765@miuegypt.edu.eg" />
                  {errors.email && <small className="error">{errors.email}</small>}
                </label>
                <label>
                  <span>University ID</span>
                  <input className="pill" value={form.studentId} onChange={handleStudentIdChange} placeholder="2023/37654" maxLength={10} />
                  {errors.studentId && <small className="error">{errors.studentId}</small>}
                </label>
              </div>

              {/* Eligibility feedback card */}
              {eligibilityStatus && !eligibilityStatus.eligible && (
                <div style={{
                  marginTop: 20,
                  padding: '14px 18px',
                  borderRadius: 12,
                  background: 'rgba(220, 38, 38, 0.12)',
                  border: '1px solid rgba(220, 38, 38, 0.45)',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start'
                }}>
                  <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>🚫</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#f87171', fontSize: 14 }}>
                      {eligibilityStatus.reason === 'blacklisted' && 'Access Restricted'}
                      {eligibilityStatus.reason === 'already_member' && 'Already a Member'}
                      {eligibilityStatus.reason === 'pending_application' && 'Application Already Submitted'}
                      {eligibilityStatus.reason === 'approved_application' && 'Application Approved'}
                      {eligibilityStatus.reason === 'rejected_application' && 'Application Not Accepted'}
                      {eligibilityStatus.reason === 'no_season' && 'Applications Closed'}
                      {eligibilityStatus.reason === 'recruitment_closed' && 'Recruitment Closed'}
                      {eligibilityStatus.reason === 'existing_application' && 'Application on File'}
                    </p>
                    <p style={{ margin: '4px 0 0', color: '#fca5a5', fontSize: 13 }}>{eligibilityStatus.message}</p>
                  </div>
                </div>
              )}

              {eligibilityStatus && eligibilityStatus.eligible && eligibilityStatus.warning && (
                <div style={{
                  marginTop: 20,
                  padding: '14px 18px',
                  borderRadius: 12,
                  background: 'rgba(251, 191, 36, 0.10)',
                  border: '1px solid rgba(251, 191, 36, 0.40)',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start'
                }}>
                  <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>
                    {eligibilityStatus.warning === 'check_failed' ? '⚠️' : '👋'}
                  </span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#fbbf24', fontSize: 14 }}>
                      {eligibilityStatus.warning === 'returning_member' && 'Welcome Back!'}
                      {eligibilityStatus.warning === 'check_failed' && 'Verification Unavailable'}
                    </p>
                    <p style={{ margin: '4px 0 0', color: '#fde68a', fontSize: 13 }}>{eligibilityStatus.message}</p>
                  </div>
                </div>
              )}
            </section>
          )}

          {step === 1 && (
            <section className="step animate-in">
              <h2 className="card-title">University Info</h2>
              <p className="card-sub">Your faculty and academic year</p>
              <div className="grid">
                <label>
                  <span>Faculty</span>
                  <select className="pill" value={form.faculty} onChange={e => updateField('faculty', e.target.value)}>
                    <option value="">Select faculty</option>
                    {faculties.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  {errors.faculty && <small className="error">{errors.faculty}</small>}
                </label>
                <label>
                  <span>Year</span>
                  <select className="pill" value={form.year} onChange={e => updateField('year', e.target.value)}>
                    <option value="">Select year</option>
                    {years.map(y => (
                      <option key={y.value} value={y.value}>{y.label}</option>
                    ))}
                  </select>
                  {errors.year && <small className="error">{errors.year}</small>}
                </label>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="step animate-in">
              <h2 className="card-title">Interview & Contact</h2>
              <p className="card-sub">Interview preference and WhatsApp contact number</p>
              <div className="grid">
                <label>
                  <span>Interview Preference</span>
                  <select className="pill" value={form.interview} onChange={e => updateField('interview', e.target.value)}>
                    <option value="">Select interview preference</option>
                    <option value="on-campus">On-campus (MIU University)</option>
                    <option value="online">Online (Microsoft Teams)</option>
                  </select>
                  {errors.interview && <small className="error">{errors.interview}</small>}
                </label>
                <label>
                  <span>Phone / WhatsApp</span>
                  <div className="prefix-wrap">
                    <span className="prefix" aria-hidden="true">+20</span>
                    <input
                      className="pill phone-input"
                      inputMode="numeric"
                      value={form.phone}
                      onChange={handlePhoneChange}
                      placeholder="1012345678"
                      maxLength={10}
                    />
                  </div>
                  {errors.phone && <small className="error">{errors.phone}</small>}
                </label>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="step animate-in">
              <h2 className="card-title">Club Preferences</h2>
              <p className="card-sub">Choose your desired MSP departments</p>
              <div className="grid">
                <label>
                  <span>Department 1 (Primary Choice)</span>
                  <select className="pill" value={form.dept1} onChange={e => updateField('dept1', e.target.value)}>
                    <option value="">Select department</option>
                    {departments
                      .filter(d => {
                        if (isBoardPosition(d)) return false
                        if (d.name === 'Software Development' || d.name === 'Technical Training') {
                          return form.faculty === 'Computer Science' || form.faculty === 'Engineering Sciences & Arts - ECE'
                        }
                        return true
                      })
                      .map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                  </select>
                  {errors.dept1 && <small className="error">{errors.dept1}</small>}
                </label>
                <label>
                  <span>Department 2 <small style={{ fontWeight: 400, color: 'rgba(234, 242, 255, 0.6)' }}>(Optional)</small></span>
                  <select className="pill" value={form.dept2} onChange={e => updateField('dept2', e.target.value)}>
                    <option value="">Select department (optional)</option>
                    {departments
                      .filter(d => {
                        if (isBoardPosition(d)) return false
                        if (d.name === 'Software Development' || d.name === 'Technical Training') {
                          return form.faculty === 'Computer Science' || form.faculty === 'Engineering Sciences & Arts - ECE'
                        }
                        return true
                      })
                      .map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                  </select>
                </label>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="step animate-in">
              <h2 className="card-title">Extra Info</h2>
              <p className="card-sub">Tell us more about your background and passion</p>

              <div className="ai-disclaimer-box">
                <span className="icon" aria-hidden="true">💡</span>
                <p>
                  <strong>A quick note:</strong> Please avoid using AI to generate your answers. We want to read your genuine thoughts, motivation, and real personality, as there are no right or wrong responses!
                </p>
              </div>

              <div className="grid">
                <label className="col-span-2">
                  <span>What are your main skills & experience?</span>
                  <textarea
                    className="pill"
                    rows="4"
                    value={form.skills}
                    onChange={e => updateField('skills', e.target.value)}
                    placeholder="List technical skills, software tools, soft skills, or previous activities..."
                  />
                  <span className={`char-counter ${form.skills.trim().length >= 20 ? 'good' : ''}`}>
                    {form.skills.length} characters (min 20 recommended)
                  </span>
                  {errors.skills && <small className="error">{errors.skills}</small>}
                </label>
                <label className="col-span-2">
                  <span>Why do you want to join MSP Club?</span>
                  <textarea
                    className="pill"
                    rows="5"
                    value={form.motivation}
                    onChange={e => updateField('motivation', e.target.value)}
                    placeholder="What excites you about MSP? What do you hope to learn or contribute?"
                  />
                  <span className={`char-counter ${form.motivation.trim().length >= 30 ? 'good' : ''}`}>
                    {form.motivation.length} characters (min 30 recommended)
                  </span>
                  {errors.motivation && <small className="error">{errors.motivation}</small>}
                </label>
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="step animate-in">
              <h2 className="card-title">Review Details</h2>
              <p className="card-sub">Check your details below. You can click "Edit" on any section to make changes before submitting.</p>
              <div className="review-card">
                <div className="review-summary-item">
                  <div className="review-item-content">
                    <ul className="summary" style={{ margin: 0 }}>
                      <li><b>Name:</b> <span>{form.name}</span></li>
                      <li><b>Email:</b> <span>{form.email}</span></li>
                      <li><b>University ID:</b> <span>{form.studentId}</span></li>
                    </ul>
                  </div>
                  <button type="button" className="review-edit-btn" onClick={() => setStep(0)}>Edit Info</button>
                </div>

                <div className="review-summary-item">
                  <div className="review-item-content">
                    <ul className="summary" style={{ margin: 0 }}>
                      <li><b>Faculty & Year:</b> <span>{form.faculty} - {years.find(y => y.value == form.year)?.label || form.year}</span></li>
                    </ul>
                  </div>
                  <button type="button" className="review-edit-btn" onClick={() => setStep(1)}>Edit Faculty</button>
                </div>

                <div className="review-summary-item">
                  <div className="review-item-content">
                    <ul className="summary" style={{ margin: 0 }}>
                      <li><b>Interview:</b> <span>{form.interview || '-'}</span></li>
                      <li><b>Phone:</b> <span>{form.phone ? `+20${form.phone}` : '-'}</span></li>
                    </ul>
                  </div>
                  <button type="button" className="review-edit-btn" onClick={() => setStep(2)}>Edit Contact</button>
                </div>

                <div className="review-summary-item">
                  <div className="review-item-content">
                    <ul className="summary" style={{ margin: 0 }}>
                      <li><b>Departments:</b> <span>{form.dept1}{form.dept2 ? `, ${form.dept2}` : ''}</span></li>
                    </ul>
                  </div>
                  <button type="button" className="review-edit-btn" onClick={() => setStep(3)}>Edit Choices</button>
                </div>

                <div className="review-summary-item">
                  <div className="review-item-content">
                    <ul className="summary" style={{ margin: 0 }}>
                      <li><b>Skills:</b> <span>{form.skills ? form.skills : '-'}</span></li>
                      <li><b>Motivation:</b> <span>{form.motivation ? form.motivation : '-'}</span></li>
                    </ul>
                  </div>
                  <button type="button" className="review-edit-btn" onClick={() => setStep(4)}>Edit Extra</button>
                </div>
              </div>
            </section>
          )}

          <div className="actions">
            <button type="button" className="btn ghost" onClick={onBack} disabled={!canGoBack}>Previous</button>

            {hasVisitedReview && step < 5 && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  if (validateCurrentStep()) setStep(5)
                }}
                style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
              >
                ↩ Return to Review
              </button>
            )}

            {canGoNext && step < 4 && (
              <button
                type="button"
                className="btn"
                onClick={onNext}
                disabled={checkingEligibility || (step === 0 && eligibilityStatus && !eligibilityStatus.eligible)}
              >
                {checkingEligibility ? (
                  <>
                    <span style={{ display: 'inline-block', marginRight: '8px' }}>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        display: 'inline-block'
                      }} />
                    </span>
                    Checking…
                  </>
                ) : 'Next →'}
              </button>
            )}
            {step === 4 && (
              <button type="button" className="btn" onClick={() => { if (validateCurrentStep()) setStep(5) }}>Review</button>
            )}
            {step === 5 && (
              <button type="submit" disabled={submitting} className="btn primary">
                {submitting ? (
                  <>
                    <span style={{ display: 'inline-block', marginRight: '8px' }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        display: 'inline-block'
                      }} />
                    </span>
                    Submitting…
                  </>
                ) : 'Submit Application'}
              </button>
            )}
          </div>
        </form>
      </main>
      )}

      {screen === 'success' && (
        <main className="container welcome" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
          <div style={{ textAlign: 'center' }}>
            <img src={mspLogo} alt="MSP Club" className="welcome-logo" style={{ width: 160, height: 'auto', marginBottom: 20 }} />
            <h1 className="welcome-title">Submitted successfully</h1>
            <p className="welcome-sub">We received your application. We will contact you soon.</p>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <p style={{ marginBottom: 8 }}>Follow us</p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
                <a
                  href="https://www.tiktok.com/@mspmiu"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="MSP Club on TikTok"
                  style={{ color: '#000', textDecoration: 'none', display: 'inline-flex', gap: 8, alignItems: 'center' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M16.5 3.5c-.1 0-.2 0-.3.1-1.4.9-2.8 1.2-4.1 1.2v6.2c0 1.8-.7 3.4-2 4.6-1.1 1-2.6 1.6-4.2 1.6-3.3 0-6-2.7-6-6s2.7-6 6-6c.3 0 .6 0 .9.1v2.1c-.3-.1-.6-.1-.9-.1-2.2 0-4 1.8-4 4s1.8 4 4 4c1.1 0 2.1-.4 2.9-1.1 1-1 1.6-2.5 1.6-4.1V4.7c1.6 0 3.1-.4 4.6-1.3.1 0 .2-.1.2-.2.1-.1 0-.2-.1-.2z" />
                  </svg>
                  <span style={{ fontSize: 14 }}>TikTok</span>
                </a>

                <a
                  href="https://www.instagram.com/mspmiu"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="MSP Club on Instagram"
                  style={{ color: '#E1306C', textDecoration: 'none', display: 'inline-flex', gap: 8, alignItems: 'center' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm10 2c1.66 0 3 1.34 3 3v10c0 1.66-1.34 3-3 3H7c-1.66 0-3-1.34-3-3V7c0-1.66 1.34-3 3-3h10zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zM17.5 6.5a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0z" />
                  </svg>
                  <span style={{ fontSize: 14 }}>Instagram</span>
                </a>
              </div>
            </div>
          </div>
        </main>
      )}
    </>
  )}
</div>
  )
});

BecomeMember.displayName = 'BecomeMember';

export default BecomeMember;