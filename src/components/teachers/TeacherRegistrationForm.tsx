'use client';

import React, { useActionState } from 'react';
import { registerTeacherAction, TeacherRegistrationState } from '@/actions/teachers';
import Link from 'next/link';

export default function TeacherRegistrationForm() {
  const initialState: TeacherRegistrationState = {};
  const [state, formAction, isPending] = useActionState(registerTeacherAction, initialState);

  if (state.success) {
    return (
      <div className="card" style={{ maxWidth: 640, margin: '40px auto', padding: '40px', textAlign: 'center' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: 'rgba(15, 118, 110, 0.1)',
          border: '1px solid rgba(15, 118, 110, 0.35)',
          color: '#0F766E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '32px'
        }}>
          ✓
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '12px' }}>Registration Submitted!</h2>
        <p style={{ color: 'var(--foreground-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
          Thank you for registering with Netspeak Portal. Your application is now in the <strong>Admin Review</strong> stage.
          Once reviewed and approved by the Operations Manager, your portal credentials will be generated and issued.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link href="/login" className="btn btn-primary">
            Back to Portal Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {state.error && (
        <div style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius)',
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          border: '1px solid rgba(220, 38, 38, 0.35)',
          color: '#DC2626',
          fontWeight: 600,
          fontSize: '0.95rem'
        }}>
          ⚠️ {state.error}
        </div>
      )}

      {/* Section 1: Personal Information */}
      <div className="card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem',
            fontWeight: 700
          }}>1</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Personal Information</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
          <div className="form-group">
            <label htmlFor="displayName">Teacher Name / Display Name *</label>
            <input
              id="displayName"
              name="displayName"
              className="input"
              placeholder="e.g. Teacher Jane"
              required
            />
            {state.fieldErrors?.displayName && (
              <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{state.fieldErrors.displayName[0]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="realFullName">Real Complete Name *</label>
            <input
              id="realFullName"
              name="realFullName"
              className="input"
              placeholder="First Name, Middle Name, Last Name"
              required
            />
            {state.fieldErrors?.realFullName && (
              <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{state.fieldErrors.realFullName[0]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="birthday">Birthday *</label>
            <input
              id="birthday"
              name="birthday"
              type="date"
              className="input"
              required
            />
            {state.fieldErrors?.birthday && (
              <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{state.fieldErrors.birthday[0]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="cellphone">Cellphone Number *</label>
            <input
              id="cellphone"
              name="cellphone"
              className="input"
              placeholder="e.g. 09171234567"
              required
            />
            {state.fieldErrors?.cellphone && (
              <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{state.fieldErrors.cellphone[0]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="emergencyContactName">Emergency Contact Person *</label>
            <input
              id="emergencyContactName"
              name="emergencyContactName"
              className="input"
              placeholder="Full name of emergency contact"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="emergencyContactPhone">Emergency Contact Number *</label>
            <input
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              className="input"
              placeholder="e.g. 09189876543"
              required
            />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '18px' }}>
          <label htmlFor="address">Complete Residential Address *</label>
          <textarea
            id="address"
            name="address"
            className="input"
            rows={2}
            placeholder="House/Unit No., Street, Barangay, City, Province, Postal Code"
            required
            style={{ resize: 'vertical' }}
          />
        </div>
      </div>

      {/* Section 2: Academic Information */}
      <div className="card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem',
            fontWeight: 700
          }}>2</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Academic Information</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
          <div className="form-group">
            <label htmlFor="schoolAttended">School / University Attended *</label>
            <input
              id="schoolAttended"
              name="schoolAttended"
              className="input"
              placeholder="e.g. University of the Philippines"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="course">Degree / Course *</label>
            <input
              id="course"
              name="course"
              className="input"
              placeholder="e.g. Bachelor of Secondary Education"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="major">Major / Specialization *</label>
            <input
              id="major"
              name="major"
              className="input"
              placeholder="e.g. English, Linguistics, Communication"
              required
            />
          </div>
        </div>
      </div>

      {/* Section 3: Operational Information */}
      <div className="card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem',
            fontWeight: 700
          }}>3</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Operational Preferences</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
          <div className="form-group">
            <label htmlFor="projectType">Project Type *</label>
            <select id="projectType" name="projectType" className="input" defaultValue="FT">
              <option value="FT">Full Time (FT)</option>
              <option value="FTEX">Full Time Extended (FTEX)</option>
              <option value="TTP">Top Teacher Program (TTP)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="department">Department *</label>
            <select id="department" name="department" className="input" defaultValue="DOMESTIC">
              <option value="DOMESTIC">Domestic</option>
              <option value="OVERSEAS">Overseas / Global</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="assignedRestDay">Assigned / Preferred Rest Day *</label>
            <select id="assignedRestDay" name="assignedRestDay" className="input" defaultValue="Sunday">
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginTop: '18px' }}>
          <div className="form-group">
            <label htmlFor="portalUsername">51Talk Portal Username (Optional)</label>
            <input
              id="portalUsername"
              name="portalUsername"
              className="input"
              placeholder="e.g. PH1234567"
            />
          </div>

          <div className="form-group">
            <label htmlFor="portalPassword">51Talk Portal Password (Optional)</label>
            <input
              id="portalPassword"
              name="portalPassword"
              type="password"
              className="input"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/login" style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>
          ← Already have an account? Sign in
        </Link>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isPending}
          style={{ minWidth: 200, padding: '12px 24px', fontSize: '1rem' }}
        >
          {isPending ? 'Validating & Submitting...' : 'Submit Registration →'}
        </button>
      </div>
    </form>
  );
}
