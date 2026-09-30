'use client';

import React from 'react';
import type { CertificateOfServiceData } from '@/actions/certificates';
import Image from 'next/image';
import Link from 'next/link';

export default function CertificateOfServiceViewer({
  cert,
  backHref = '/dashboard/teachers',
}: {
  cert: CertificateOfServiceData;
  backHref?: string;
}) {
  const handlePrint = () => {
    window.print();
  };

  const formattedIssueDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(cert.generatedDate));

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Control Bar (hidden during print) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          background: 'var(--bg-card)',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Link
          href={backHref}
          style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 500,
          }}
        >
          ← Back
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handlePrint}
            style={{
              background: 'linear-gradient(135deg, #0052CC 0%, #082E7C 100%)',
              color: '#fff',
              border: 'none',
              padding: '0.55rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 2px 8px rgba(0, 82, 204, 0.3)',
            }}
          >
            <span>🖨️</span> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Certificate Frame */}
      <div
        className="certificate-sheet"
        style={{
          background: '#FFFFFF',
          color: '#1E293B',
          padding: '3.5rem 3.5rem 3.25rem',
          borderRadius: '8px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
          border: '12px solid #0F2D6B',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: "'Times New Roman', Times, Georgia, serif",
        }}
      >
        {/* Decorative inner gold border */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            bottom: '8px',
            left: '8px',
            right: '8px',
            border: '2px solid #D4AF37',
            pointerEvents: 'none',
          }}
        />

        {/* Certificate Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '0.85rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: '#0F2D6B',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Image src="/logo.png" alt="Netspeak Logo" width={48} height={48} style={{ objectFit: 'contain' }} priority />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: '1.35rem',
                fontWeight: 900,
                color: '#0F2D6B',
                letterSpacing: '1.5px',
                fontFamily: 'var(--font-heading), sans-serif',
                textTransform: 'uppercase',
              }}>
                {cert.companyName}
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: '#64748B',
                fontFamily: 'var(--font-heading), sans-serif',
                fontWeight: 500,
              }}>
                {cert.companyTagline} • {cert.branch} Center
              </div>
            </div>
          </div>

          <div style={{
            display: 'inline-block',
            padding: '0.4rem 1.5rem',
            background: 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.2) 50%, transparent 100%)',
            marginTop: '0.5rem',
          }}>
            <h1
              style={{
                margin: 0,
                fontSize: '2.25rem',
                fontWeight: 800,
                color: '#0F2D6B',
                letterSpacing: '3px',
                textTransform: 'uppercase',
              }}
            >
              Certificate of Service
            </h1>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.4rem', fontFamily: 'monospace' }}>
            REF NO: {cert.certificateNo}
          </div>
        </div>

        {/* Certificate Body */}
        <div
          style={{
            fontSize: '1.1rem',
            lineHeight: 1.85,
            textAlign: 'justify',
            marginBottom: '3rem',
            color: '#334155',
          }}
        >
          <p style={{ margin: '0 0 1.5rem', textIndent: '2rem' }}>
            This is to certify that{' '}
            <strong style={{ fontSize: '1.25rem', color: '#0F2D6B', textDecoration: 'underline' }}>
              {cert.realFullName.toUpperCase()}
            </strong>{' '}
            (known professionally as <em>&ldquo;{cert.displayName}&rdquo;</em>) has rendered dedicated professional service
            as an <strong>{cert.position}</strong> under the <strong>{cert.department}</strong> of{' '}
            <strong>{cert.companyName}</strong>, deployed at our <strong>{cert.branch} Branch</strong>.
          </p>

          <p style={{ margin: '0 0 1.5rem', textIndent: '2rem' }}>
            The records of the Company show that the employee was engaged from{' '}
            <strong>{cert.startDate}</strong> to{' '}
            <strong>{cert.endDate}</strong>, completing an active tenure of approximately{' '}
            <strong>{cert.tenureString}</strong>. During this duration, the employee performed their duties in accordance
            with company guidelines and standards.
          </p>

          <p style={{ margin: '0 0 1.5rem', textIndent: '2rem' }}>
            This certification is issued upon the request of the interested party for employment reference, academic,
            licensing, or whatever lawful purpose it may serve best.
          </p>

          <p style={{ margin: '0', textAlign: 'right', fontStyle: 'italic', fontSize: '1rem', color: '#64748B' }}>
            Given this {formattedIssueDate} in {cert.branch}, Philippines.
          </p>
        </div>

        {/* Signatures & Seal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: '4rem',
            paddingTop: '1.5rem',
          }}
        >
          {/* Official Seal Mock */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: '3px double #D4AF37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: '#B45309',
                margin: '0 auto 0.5rem',
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 100%)',
              }}
            >
              <span>★ OFFICIAL ★</span>
              <span style={{ fontSize: '0.8rem', color: '#0F2D6B' }}>SEAL</span>
              <span>NETSPEAK</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontFamily: 'monospace' }}>Verified Operational Record</div>
          </div>

          {/* Authorized Signatory */}
          <div style={{ textAlign: 'center', minWidth: '260px' }}>
            {/* Signature flourish / line */}
            <div
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.25rem',
              }}
            >
              <span style={{ fontFamily: "'Brush Script MT', cursive", fontSize: '2rem', color: '#0F2D6B' }}>
                Netspeak Operations
              </span>
            </div>
            <div
              style={{
                borderTop: '2px solid #1E293B',
                paddingTop: '0.5rem',
                fontWeight: 700,
                fontSize: '1.05rem',
                color: '#0F2D6B',
                fontFamily: 'var(--font-heading), sans-serif',
              }}
            >
              {cert.authorizedSignatory}
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                color: '#64748B',
                fontFamily: 'var(--font-heading), sans-serif',
              }}
            >
              {cert.signatoryTitle}
            </div>
            <div
              style={{
                fontSize: '0.78rem',
                color: '#94A3B8',
                fontFamily: 'var(--font-heading), sans-serif',
              }}
            >
              {cert.companyName}
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print, header, aside, nav {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .certificate-sheet {
            box-shadow: none !important;
            border: 8px solid #0F2D6B !important;
            margin: 0 auto !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
