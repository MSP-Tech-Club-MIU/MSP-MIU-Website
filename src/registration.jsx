"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, ChevronLeft, ChevronRight, Check, User, BookOpen, Briefcase, Mic } from "lucide-react";

import mspLogo from "./assets/msp-logo.png";
import miuLogo from "./assets/miu-logo.JPG";
import "./registration.css";
import "./form-google.css";

export default function MSPMIUClubApplication() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    id: "",
    faculty: "",
    schedule: "",
    scheduleFile: null,
    phone: "",
    department1: "",
    department2: "",
    year: "",
    skills: "",
    motivation: "",
  });
  const [errors, setErrors] = useState({});

  const departmentOptions = useMemo(() => [
    "Media & Content Creation",
    "Public Relations (PR)",
    "Human Resources (HR)",
    "Software Development",
    "Technical Training Department",
    "Event Planning",
    "Ushering",
  ], []);

  const yearOptions = [
    "Freshman",
    "Sophomore",
    "Junior",
    "Senior",
    "Senior 2",
  ];

  const facultyOptions = [
    "Computer Science",
    "Engineering Sciences & Arts - ECE",
    "Mass Communication",
    "Dentistry",
    "Engineering Sciences & Arts - Architecture",
    "Pharmacy",
    "Business",
    "Alsun",
  ];

  const scheduleOptions = [
    "Weekdays (Sun-Thu)",
    "Weekends (Fri-Sat)",
    "Evenings",
    "Flexible",
  ];

  const steps = [
    { title: "Personal Info", icon: User },
    { title: "Academic Info", icon: BookOpen },
    { title: "Departments", icon: Briefcase },
    { title: "Skills & Motivation", icon: Mic },
    { title: "Review", icon: Check },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleScheduleFile = (file) => {
  // Only accept PDF
  const pdf = file && file.type === "application/pdf" ? file : null;
  setFormData(prev => ({ ...prev, scheduleFile: pdf, schedule: pdf ? file.name : "" }));
  setErrors(prev => ({ ...prev, schedule: pdf ? "" : (file ? "Only PDF files are allowed" : "Schedule is required") }));
  };

  // Email must be: name+number@miuegypt.edu.eg
  const isValidEmail = (val) => {
    const miuRegex = /^[a-zA-Z]+[0-9]+@miuegypt\.edu\.eg$/;
    return miuRegex.test(val);
  };
  const isValidPhone = (val) => /^(\+?\d{7,15})$/.test(val.replace(/\s|-/g, ""));

  const validateStep = (step = currentStep) => {
    const newErrors = {};
    if(step === 0){
      // Full name: must be 3 words
      if(!formData.name.trim()) newErrors.name = "Name is required";
      else if(formData.name.trim().split(/\s+/).length < 3) newErrors.name = "Full name must be three words";

      // Email: must match MIU format
      if(!formData.email.trim()) newErrors.email = "Email is required";
      else if(!isValidEmail(formData.email)) newErrors.email = "Email must be like name202309538@miuegypt.edu.eg";

  // ID: must be in format 2023/xxxxxx (4 digits, slash, any number of digits)
  if(!formData.id.trim()) newErrors.id = "Student ID is required";
  else if(!/^\d{4}\/\d+$/.test(formData.id.trim())) newErrors.id = "Student ID must be like 2023/73647";
    }
    if(step === 1){
      if(!formData.faculty.trim()) newErrors.faculty = "Faculty is required";
      if(!formData.year.trim()) newErrors.year = "Year is required";
      // Schedule: must be PDF only
      if(!formData.scheduleFile) newErrors.schedule = "Schedule is required (PDF)";
      else if(formData.scheduleFile.type !== "application/pdf") newErrors.schedule = "Only PDF files are allowed";
      if(!formData.phone.trim()) newErrors.phone = "Phone/WhatsApp is required";
      else if(!isValidPhone(formData.phone)) newErrors.phone = "Enter a valid phone number";
    }
    if(step === 2){
      if(!formData.department1.trim()) newErrors.department1 = "First department is required";
      if(formData.department2 && formData.department2 === formData.department1) newErrors.department2 = "Choose a different second department";
    }
    if(step === 3){
      if(!formData.motivation.trim()) newErrors.motivation = "Tell us your motivation";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const nextStep = () => { if(validateStep()) setCurrentStep(prev => prev+1); };
  const prevStep = () => setCurrentStep(prev => Math.max(prev-1,0));
  const handleSubmit = () => {
    if(validateStep()) {
      setShowSuccess(true);
    }
  };

  const renderStep = () => {
    switch(currentStep){
      case 0:
        return (
          <div className="step-content">
            <div>
              <Label htmlFor="name" style={{color:'#fff'}}>Full Name</Label>
              <Input id="name" value={formData.name} onChange={e=>handleInputChange("name",e.target.value)} className={errors.name?"input-error":""} placeholder="Enter your full name"/>
              {errors.name && <p className="error">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="email" style={{color:'#fff'}}>Email</Label>
              <Input id="email" value={formData.email} onChange={e=>handleInputChange("email",e.target.value)} className={errors.email?"input-error":""} placeholder="your.email@university.edu"/>
              {errors.email && <p className="error">{errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="id" style={{color:'#fff'}}>Student ID</Label>
              <Input id="id" value={formData.id} onChange={e=>handleInputChange("id",e.target.value)} className={errors.id?"input-error":""} placeholder="Enter your student ID"/>
              {errors.id && <p className="error">{errors.id}</p>}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="step-content">
            <div>
              <Label htmlFor="faculty" style={{color:'#fff'}}>Faculty</Label>
              <div className="select-wrapper">
                <select id="faculty" value={formData.faculty} onChange={e=>handleInputChange("faculty", e.target.value)} className={errors.faculty?"input-error":""}>
                  <option value="">Select your faculty</option>
                  {facultyOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              {errors.faculty && <p className="error">{errors.faculty}</p>}
            </div>
            <div>
              <Label htmlFor="year" style={{color:'#fff'}}>Year</Label>
              <div className="select-wrapper">
                <select id="year" value={formData.year} onChange={e=>handleInputChange("year", e.target.value)} className={errors.year?"input-error":""}>
                  <option value="">Select your year</option>
                  {yearOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              {errors.year && <p className="error">{errors.year}</p>}
            </div>
            <div>
              <Label htmlFor="schedule-file" style={{color:'#fff'}}>Schedule (PDF)</Label>
              <input id="schedule-file" type="file" accept="application/pdf" onChange={e=>handleScheduleFile(e.target.files && e.target.files[0])} className={errors.schedule?"input-error":""} />
              {formData.scheduleFile && <p style={{fontSize:'0.85rem', color:'#9ca3af', marginTop:'4px'}}>Selected: {formData.scheduleFile.name}</p>}
              {errors.schedule && <p className="error">{errors.schedule}</p>}
            </div>
            <div>
              <Label htmlFor="phone" style={{color:'#fff'}}>Phone number / WhatsApp</Label>
              <Input id="phone" value={formData.phone} onChange={e=>handleInputChange("phone", e.target.value)} className={errors.phone?"input-error":""} placeholder="e.g., +201234567890" />
              {errors.phone && <p className="error">{errors.phone}</p>}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="step-content">
            <div>
              <Label style={{color:'#fff'}}>Department 1</Label>
              <div className="select-wrapper">
                <select value={formData.department1} onChange={e=>handleInputChange("department1", e.target.value)} className={errors.department1?"input-error":""}>
                  <option value="">Select your first department</option>
                  {departmentOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              {errors.department1 && <p className="error">{errors.department1}</p>}
            </div>
            <div>
              <Label style={{color:'#fff'}}>Department 2</Label>
              <div className="select-wrapper">
                <select value={formData.department2} onChange={e=>handleInputChange("department2", e.target.value)} className={errors.department2?"input-error":""}>
                  <option value="">(Optional) Select your second department</option>
                  {departmentOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              {errors.department2 && <p className="error">{errors.department2}</p>}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="step-content">
            <div>
              <Label htmlFor="skills" style={{color:'#fff'}}>Skills</Label>
              <textarea id="skills" value={formData.skills} onChange={e=>handleInputChange("skills", e.target.value)} placeholder="List your skills (e.g., JS, video editing, public speaking)" />
            </div>
            <div>
              <Label htmlFor="motivation" style={{color:'#fff'}}>Motivation</Label>
              <textarea id="motivation" value={formData.motivation} onChange={e=>handleInputChange("motivation", e.target.value)} className={errors.motivation?"input-error":""} placeholder="Which department are you interested in and why do you want to join MSP MIU?" />
              {errors.motivation && <p className="error">{errors.motivation}</p>}
            </div>
          </div>
        );
      case 4:
        return (
            <div className="review-grid">
            <div className="review-item"><span>Name</span><strong>{formData.name || "—"}</strong></div>
            <div className="review-item"><span>Email</span><strong>{formData.email || "—"}</strong></div>
            <div className="review-item"><span>ID</span><strong>{formData.id || "—"}</strong></div>
            <div className="review-item"><span>Faculty</span><strong>{formData.faculty || "—"}</strong></div>
              <div className="review-item"><span>Schedule</span><strong>{formData.scheduleFile ? formData.scheduleFile.name : "—"}</strong></div>
            <div className="review-item"><span>Phone</span><strong>{formData.phone || "—"}</strong></div>
            <div className="review-item"><span>Department 1</span><strong>{formData.department1 || "—"}</strong></div>
            <div className="review-item"><span>Department 2</span><strong>{formData.department2 || "—"}</strong></div>
            <div className="review-item"><span>Year</span><strong>{formData.year || "—"}</strong></div>
            <div className="review-item review-wide"><span>Skills</span><strong>{formData.skills || "—"}</strong></div>
            <div className="review-item review-wide"><span>Motivation</span><strong>{formData.motivation || "—"}</strong></div>
          </div>
        );
      default: return null;
    }
  }

  return (
    <div className="registration-wrapper bg-anim">
      <div className="form-container">
        {showSuccess ? (
          <Card className="card welcome-card">
            <CardHeader className="card-header card-header--center">
              <div style={{display:'flex', justifyContent:'center', marginBottom:'8px'}}>
                <div style={{width:64,height:64,display:'grid',placeItems:'center',background:'#10b981',color:'#fff',borderRadius:'50%',boxShadow:'0 10px 24px rgba(16,185,129,0.35)'}}>
                  <Check className="h-6 w-6" />
                </div>
              </div>
              <CardTitle style={{color:'#fff', fontWeight:'bold'}}>Submitted successfully</CardTitle>
              <CardDescription style={{color:'#bbd0c9ff', fontWeight:'bold'}}>Thank you! Your application has been received. We’ll contact you soon.</CardDescription>
            </CardHeader>
            <CardContent></CardContent>
          </Card>
        ) : showWelcome ? (
          <Card className="card welcome-card">
            <CardHeader className="card-header card-header--center">
              <CardTitle style={{color:'#fff', fontWeight:'bold'}}>Welcome to MSP</CardTitle>
              <CardDescription style={{color:'#bbd0c9ff', fontWeight:'bold'}}>Join our community and apply to your preferred departments.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="welcome-hero">
                <img src={mspLogo} alt="MSP Club Logo" className="welcome-logo" />
              </div>
              <div style={{display:'flex', justifyContent:'center', marginTop:'1rem'}}>
                <Button className="btn-submit" onClick={()=> setShowWelcome(false)}>Apply</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Progress Stepper */}
            <div
              className="stepper"
              style={{ "--progress": `${Math.max(0, Math.min(1, (steps.length>1 ? currentStep/(steps.length-1) : 0)))*100}%` }}
            >
              <div className="stepper-bar">
                <div className="stepper-bar-fill" />
              </div>
              {steps.map((step,index)=>(
                <div key={index} className="step-item">
                  <div className={`step-circle ${index < currentStep?"done": index===currentStep?"active":""}`}>
                    {index < currentStep ? <Check className="h-4 w-4"/> : index+1}
                  </div>
                  <span className={`step-label ${index <= currentStep?"active":""}`} style={{color:'#e5e7eb'}}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Form Card */}
            <Card className="card has-logos">
              {/* Logos inside form card - opposite corners */}
              <div className="logo-card-left"><img src={mspLogo} alt="MSP Club Logo" /></div>
              <div className="logo-card-right"><img src={miuLogo} alt="MIU University Logo" /></div>

              <CardHeader className="card-header card-header--center">
                <CardTitle style={{color:'#fff', fontWeight:'bold'}}>{steps[currentStep].title}</CardTitle>
                <CardDescription style={{color:'#bbd0c9ff'}}>
                  {currentStep === 0 && "Tell us who you are"}
                  {currentStep === 1 && "Your academic and availability details"}
                  {currentStep === 2 && "Choose the departments you're interested in"}
                  {currentStep === 3 && "Share your skills and motivation"}
                  {currentStep === 4 && "Review your application before submitting"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderStep()}

                {/* Navigation */}
                <div className="nav-buttons">
                  <Button className="btn-ghost" onClick={prevStep} disabled={currentStep===0}>
                    <ChevronLeft className="h-4 w-4"/> Previous
                  </Button>
                  {currentStep<steps.length-1 ? (
                    <Button onClick={nextStep} className="btn-secondary">Next <ChevronRight className="h-4 w-4"/></Button>
                  ):(
                    <Button onClick={handleSubmit} className="btn-primary">Submit <Send className="h-4 w-4"/></Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}