import React, { useMemo, useState } from 'react'
import miuLogo from './assets/Images/miu-logo.png'
import mspLogo from './assets/Images/msp-logo.png'

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

const years = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Senior 2']

const departments = [
  'Media & Content Creation',
  'Public Relations (PR)',
  'Human Resources (HR)',
  'Software Development',
  'Technical Training Department',
  'Event Planning',
]

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

  function validateCurrentStep() {
    const e = {}
    if (step === 0) {
      if (!/^\s*\S+\s+\S+\s+\S+\s*$/.test(form.name)) e.name = 'Enter exactly three words.'
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
      if (!form.schedule) e.schedule = 'Upload schedule PDF.'
      if (!/^\d{11}$/.test(form.phone)) e.phone = 'Enter exactly 11 digits (e.g. 01012345678).'
    }
    if (step === 3) {
      if (!form.dept1) e.dept1 = 'Choose department.'
      if (!form.dept2) e.dept2 = 'Choose department.'
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
    await new Promise(r => setTimeout(r, 1000))
    setSubmitting(false)
    setScreen('success')
  }

  const scheduleName = useMemo(() => (form.schedule ? form.schedule.name : 'No file chosen'), [form.schedule])

  return (
    <div className="page" style={{ background: `linear-gradient(135deg, ${palette.navy900}, ${palette.navy700})` }}>
      {screen === 'welcome' && (
        <main className="container welcome">
          <h1 className="welcome-title">Welcome to MSP Club</h1>
          <img src={mspLogo} alt="MSP Club" className="welcome-logo" />
          <p className="welcome-sub">Join us and start your journey</p>
          <button className="btn primary welcome-btn" onClick={() => setScreen('form')}>Apply</button>
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
                      <option key={y} value={y}>{y}</option>
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
                    <input className="pill phone-input" inputMode="numeric" value={form.phone} onChange={e => updateField('phone', e.target.value.replace(/[^\d]/g, ''))} placeholder="01012345678" />
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
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {errors.dept1 && <small className="error">{errors.dept1}</small>}
                </label>
                <label>
                  <span>Department 2</span>
                  <select className="pill" value={form.dept2} onChange={e => updateField('dept2', e.target.value)}>
                    <option value="">Select department</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {errors.dept2 && <small className="error">{errors.dept2}</small>}
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
                  <li><b>Faculty/Year:</b> <span>{form.faculty} — {form.year}</span></li>
                  <li><b>Phone:</b> <span>{form.phone}</span></li>
                  <li><b>Schedule:</b> <span>{scheduleName}</span></li>
                  <li><b>Departments:</b> <span>{form.dept1} , {form.dept2}</span></li>
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
        </main>
      )}
    </div>
  )
}

export default App


