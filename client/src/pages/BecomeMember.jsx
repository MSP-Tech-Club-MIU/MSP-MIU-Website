import React, { useMemo, useState, useEffect, memo, useCallback } from 'react'
import SEO from '../components/SEO'
import miuLogo from '../assets/Images/miu-logo.png'
import mspLogo from '../assets/Images/msp-logo.png'
import ApiService from '../services/api'
import { departments, getDepartmentIdByName } from '../data/departments'

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

const faculties = [
  'Computer Science',
  'Engineering Sciences & Arts - ECE',
  'Mass Communication',
  'Dentistry',
  'Engineering Sciences & Arts - Architecture',
  'Pharmacy',
  'Business',
  'Alsun',
]

// Year mapping to integers (matches database schema)
const years = [
  { value: 1, label: 'Freshman' },
  { value: 2, label: 'Sophomore' },
  { value: 3, label: 'Junior' },
  { value: 4, label: 'Senior' },
  { value: 5, label: 'Senior 2' }
]

// Departments are now imported from data/departments.js

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

  const [form, setForm] = useState({
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

  const [errors, setErrors] = useState({})

  // Memoize computed values
  const canGoBack = useMemo(() => step > 0, [step]);
  const canGoNext = useMemo(() => step < totalSteps - 1, [step, totalSteps]);

  const updateField = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, []);

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
  }, [form.faculty])

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
      // Accept phone without the leading 0 (user types starting with 1) -> 10 digits
      if (!/^1\d{9}$/.test(form.phone)) e.phone = 'Enter 10 digits starting with 1 (e.g. 1012345678).'
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

  function onNext() {
    if (!validateCurrentStep()) return
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
        first_choice: getDepartmentIdByName(form.dept1),
        second_choice: getDepartmentIdByName(form.dept2),
        skills: form.skills,
        motivation: form.motivation,
        interview: form.interview
      };

      // Submit application to backend
      console.log('Submitting payload to API:', formData);
      console.log('Interview value:', form.interview);
      console.log('Form state:', form);
      const result = await ApiService.submitApplication(formData);

      console.log('Application submitted successfully:', result);
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
      alert(errorMessage);
      
      // Don't reset the form on error, let user fix the issues
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
      <SEO
        title="Become a Member"
        description="Join MSP Tech Club at MIU! Fill out our membership application form to become part of our student-led innovation community. Choose your department and start your journey with Microsoft Student Partners."
        keywords="join MSP, become MSP member, MIU tech club application, Microsoft Student Partners application, join tech club"
        url="https://msp-miu.tech/become-member"
        structuredData={structuredData}
      />
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
        <form className="neo-card" onSubmit={onSubmit}>
          <div className="card-logos"><img src={mspLogo} alt="MSP"/><img src={miuLogo} alt="MIU"/></div>
          {step === 0 && (
            <section className="step animate-in">
              <h2 className="card-title">Personal Info</h2>
              <p className="card-sub">Tell us who you are</p>
              <div className="grid">
                <label>
                  <span>Name</span>
                  <input className="pill" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Enter your name" />
                  {errors.name && <small className="error">{errors.name}</small>}
                </label>
                <label>
                  <span>Email</span>
                  <input className="pill" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="name2398765@miuegypt.edu.eg" />
                  {errors.email && <small className="error">{errors.email}</small>}
                </label>
                <label>
                  <span>ID</span>
                  <input className="pill" value={form.studentId} onChange={e => updateField('studentId', e.target.value)} placeholder="2023/37654" />
                  {errors.studentId && <small className="error">{errors.studentId}</small>}
                </label>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="step animate-in">
              <h2 className="card-title">University Info</h2>
              <p className="card-sub">Your faculty and year</p>
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
              <p className="card-sub">Interview preference and phone</p>
              <div className="grid">
                <label>
                  <span>Interview Preference</span>
                  <select className="pill" value={form.interview} onChange={e => updateField('interview', e.target.value)}>
                    <option value="">Select interview preference</option>
                    <option value="on-campus">On-campus</option>
                    <option value="online">Online</option>
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
                      onChange={e => {
                        // keep only digits, and remove any leading zeros so user can type starting with 1
                        const cleaned = e.target.value.replace(/[^\d]/g, '').replace(/^0+/, '')
                        updateField('phone', cleaned)
                      }}
                      placeholder="1012345678"
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
              <p className="card-sub">Choose two departments</p>
              <div className="grid">
                <label>
                  <span>Department 1</span>
                  <select className="pill" value={form.dept1} onChange={e => updateField('dept1', e.target.value)}>
                    <option value="">Select department</option>
                    {departments
                      .filter(d => {
                        // exclude board positions
                        if (d.name === 'Vice President' || d.name === 'President' || d.name === 'Founder') {
                          return false
                        }
                        // hide software & technical unless faculty is CS or ECE
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
                  <span>Department 2 <small style={{ fontWeight: 400, color: '#666' }}>(optional)</small></span>
                  <select className="pill" value={form.dept2} onChange={e => updateField('dept2', e.target.value)}>
                    <option value="">Select department (optional)</option>
                    {departments
                      .filter(d => {
                        // exclude board positions
                        if (d.name === 'Vice President' || d.name === 'President' || d.name === 'Founder') {
                          return false
                        }
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
              <p className="card-sub">Tell us more</p>
              <div className="grid">
                <label className="col-span-2">
                  <span>What are your main skills?</span>
                  <textarea className="pill" rows="4" value={form.skills} onChange={e => updateField('skills', e.target.value)} />
                  {errors.skills && <small className="error">{errors.skills}</small>}
                </label>
                <label className="col-span-2">
                  <span>Why do you want to join MSP Club?</span>
                  <textarea className="pill" rows="5" value={form.motivation} onChange={e => updateField('motivation', e.target.value)} />
                  {errors.motivation && <small className="error">{errors.motivation}</small>}
                </label>
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="step animate-in">
              <h2 className="card-title">Review</h2>
              <p className="card-sub">Check your details below. You can go back and edit any field before submitting.</p>
              <div className="review-card">
                <ul className="summary">
                  <li><b>Name:</b> <span>{form.name}</span></li>
                  <li><b>Email:</b> <span>{form.email}</span></li>
                  <li><b>ID:</b> <span>{form.studentId}</span></li>
                  <li><b>Faculty/Year:</b> <span>{form.faculty} — {years.find(y => y.value == form.year)?.label || form.year}</span></li>
                  <li><b>Phone:</b> <span>{form.phone ? `+20${form.phone}` : '-'}</span></li>
                  <li><b>Interview:</b> <span>{form.interview || '-'}</span></li>
                  <li><b>Departments:</b> <span>{form.dept1}{form.dept2 ? `, ${form.dept2}` : ''}</span></li>
                  <li><b>Skills:</b> <span>{form.skills ? form.skills : '-'}</span></li>
                  <li><b>Motivation:</b> <span>{form.motivation ? form.motivation : '-'}</span></li>
                </ul>
              </div>
            </section>
          )}

          <div className="actions">
            <button type="button" className="btn ghost" onClick={onBack} disabled={!canGoBack}>Previous</button>
            {canGoNext && step < 4 && (
              <button type="button" className="btn" onClick={onNext}>Next →</button>
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
                ) : 'Submit'}
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
    </div>
  )
});

BecomeMember.displayName = 'BecomeMember';

export default BecomeMember;