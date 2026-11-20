'use client';
import Link from 'next/link';
import { Shield, Mail } from 'lucide-react';

const headingStyle: React.CSSProperties = {
  fontSize: '11.5px', fontWeight: 700, color: '#0F172A',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px',
};

const linkStyle: React.CSSProperties = {
  display: 'block', fontSize: '12.5px', color: '#64748B',
  textDecoration: 'none', marginBottom: '6px', transition: 'color 0.15s ease',
};

export default function SiteFooter() {
  return (
    <footer style={{ borderTop: '1px solid #E2E8F0', padding: '32px 24px 24px', background: '#FFFFFF' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '24px', marginBottom: '16px', alignItems: 'start' }}>
          {/* Brand */}
          <div>
            <Link
              href="/"
              onClick={(e) => {
                if (typeof window !== 'undefined' && window.location.pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              aria-label="ClassSphere Home"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '8px',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '9px',
                background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 10px -2px rgba(79, 70, 229, 0.28)',
                flexShrink: 0,
                transition: 'transform 0.15s ease',
              }}>
                <Shield size={18} color="white" strokeWidth={2.3} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', letterSpacing: '-0.02em' }}>
                Class<span className="gradient-text">Sphere</span>
              </span>
            </Link>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, maxWidth: '280px', margin: 0 }}>
              The complete academy and class management platform built exclusively for organisation owners across India.
            </p>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Mail size={14} style={{ color: '#4F46E5', flexShrink: 0 }} />
              <a
                href="mailto:contact@classsphere.com"
                style={{
                  fontSize: '13px',
                  color: '#475569',
                  textDecoration: 'none',
                  fontWeight: 500,
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#4F46E5')}
                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
              >
                contact@classsphere.com
              </a>
            </div>
          </div>

          {/* Academy Types */}
          <div>
            <div style={headingStyle}>Academy Types</div>
            {[
              { label: 'Coaching', href: '/register?category=Tuition' },
              { label: 'Dance', href: '/register?category=Dance' },
              { label: 'Sports', href: '/register?category=Sports' },
              { label: 'Music', href: '/register?category=Music' },
            ].map(item => (
              <Link key={item.label} href={item.href} style={linkStyle}>{item.label}</Link>
            ))}
          </div>

          {/* Company */}
          <div>
            <div style={headingStyle}>Company</div>
            {[
              { label: 'About Us', href: '/about' },
              { label: 'Contact Us', href: '/contact' },
              { label: 'Sitemap', href: '/sitemap' },
            ].map(item => (
              <Link key={item.label} href={item.href} style={linkStyle}>{item.label}</Link>
            ))}
          </div>

          {/* Policies */}
          <div>
            <div style={headingStyle}>Policies</div>
            {[
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Terms & Conditions', href: '/terms' },
              { label: 'Refund Policy', href: '/refund' },
              { label: 'Cookie Policy', href: '/cookies' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={linkStyle}>{l.label}</Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px', textAlign: 'center' }}>
          <p style={{
            fontSize: '11.5px',
            color: '#94A3B8',
            letterSpacing: '0.04em',
            margin: 0,
            textTransform: 'uppercase',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '6px',
            lineHeight: 1.5,
          }}>
            <span>© 2026 CLASSSPHERE. ALL RIGHTS RESERVED.</span>
            <span style={{ color: '#CBD5E1', margin: '0 4px' }}>|</span>
            <span>
              DESIGN AND DEVELOPED BY{' '}
              <a
                href="https://devnectar.in"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontWeight: 700,
                  color: '#4F46E5',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  textTransform: 'none',
                  letterSpacing: 'normal',
                }}
              >
                devNectar
              </a>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
