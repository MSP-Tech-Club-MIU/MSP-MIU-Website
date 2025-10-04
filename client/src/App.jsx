import React, { useMemo, useState, useEffect } from 'react'
import miuLogo from './assets/Images/miu-logo.png'
import mspLogo from './assets/Images/msp-logo.png'
import ApiService from './services/api'
import { departments, getDepartmentIdByName } from './data/departments'

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

function Stepper({ step }) {
  const items = [0,1,2,3,4]
  const percent = Math.min(100, Math.max(0, (step/(items.length-1))*100))
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
}

function App() {
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
    schedule: null,
    phone: '',
    dept1: '',
    dept2: '',
    skills: '',
    motivation: '',
  })

  const [errors, setErrors] = useState({})

  const canGoBack = step > 0
  const canGoNext = step < totalSteps - 1

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

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
      // Name: accept 2 or 3 words
      if (!/^\s*\S+(?:\s+\S+){1,2}\s*$/.test(form.name)) e.name = 'Enter 2 or 3 names.'
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
      // schedule is optional
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
      // Prepare form data for API - just send the filename
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
        schedule: form.schedule ? form.schedule.name : 'no-schedule.pdf'
      };

      // Submit application to backend
      console.log('Submitting payload to API:', formData);
      const result = await ApiService.submitApplication(formData);

      console.log('Application submitted successfully:', result);
      setScreen('success')
    } catch (error) {
      console.error('Failed to submit application:', error);
      // Show server-provided message where available
      const msg = error.message || (error && error.error) || 'Failed to submit application. Please try again.';
      alert(msg);
    } finally {
      setSubmitting(false)
    }
  }

  const scheduleName = useMemo(() => (form.schedule ? form.schedule.name : 'No file chosen'), [form.schedule])

  return (
    <div className="page" style={{ background: `linear-gradient(135deg, ${palette.navy900}, ${palette.navy700})` }}>
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
                  <input className="pill" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Enter your full name" />
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
              <h2 className="card-title">Documents & Contact</h2>
              <p className="card-sub">Upload schedule and phone</p>
              <div className="grid">
                <label>
                  <span>Schedule (PDF)</span>
                  <input
                    className="pill"
                    type="file"
                    accept="application/pdf"
                    onChange={e => {
                      const file = e.target.files[0] || null;
                      if (file && file.type !== 'application/pdf') {
                        updateField('schedule', null);
                        e.target.value = '';
                        setErrors(prev => ({ ...prev, schedule: 'Only PDF files are allowed.' }));
                      } else {
                        updateField('schedule', file);
                        setErrors(prev => ({ ...prev, schedule: undefined }));
                      }
                    }}
                  />
                  <small className="file-name">{scheduleName}</small>
                  {errors.schedule && <small className="error">{errors.schedule}</small>}
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
                  <li><b>Schedule:</b> <span>{scheduleName}</span></li>
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
              <button type="submit" disabled={submitting} className="btn primary">{submitting ? 'Submitting…' : 'Submit'}</button>
            )}
          </div>
        </form>
      </main>
      )}

      {screen === 'success' && (
        <main className="container welcome">
          <h1 className="welcome-title">Submitted successfully</h1>
          <img src={mspLogo} alt="MSP Club" className="welcome-logo" />
          <p className="welcome-sub">We received your application. We will contact you soon.</p>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <p style={{ marginBottom: 8 }}>Follow us</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
              <a
                href="https://www.facebook.com/MSPClubMIU"
                target="_blank"
                rel="noreferrer"
                aria-label="MSP Club on Facebook"
                style={{ color: '#1877F2', textDecoration: 'none', display: 'inline-flex', gap: 8, alignItems: 'center' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M22 12.07C22 6.49 17.52 2 11.94 2S2 6.49 2 12.07c0 4.99 3.66 9.13 8.44 9.93v-7.03H8.08v-2.9h2.36V9.41c0-2.33 1.38-3.62 3.5-3.62.  1.02 0 2.09.18 2.09.18v2.3h-1.17c-1.15 0-1.51.72-1.51 1.46v1.75h2.57l-.41 2.9h-2.16v7.03C18.34 21.2 22 17.06 22 12.07z" />
                </svg>
                <span style={{ fontSize: 14 }}>Facebook</span>
              </a>

              <a
                href="https://www.instagram.com/mspmiu/"
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
        </main>
      )}
    </div>
  )
}

export default App