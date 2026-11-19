import Link from 'next/link';
import { Shield } from 'lucide-react';

const headingStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 600, color: '#0F172A',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px',
};

const linkStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', color: '#64748B',
  textDecoration: 'none', marginBottom: '10px', transition: 'color 0.15s',
};

export default function SiteFooter() {
  return (
    <footer style={{ borderTop: '1px solid #E2E8F0', padding: '36px 32px 24px', background: '#FFFFFF' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '32px', marginBottom: '28px' }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'linear-gradient(135deg, #4F46E5, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={14} color="white" />
              </div>
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>
                Class<span className="gradient-text">Sphere</span>
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, maxWidth: '260px', marginBottom: 0 }}>
              The all-in-one class management platform connecting academy owners, students, and parents across India.
            </p>
          </div>

          {/* Portals */}
          <div>
            <div style={headingStyle}>Portals</div>
            {[
              { label: 'Owner Dashboard', href: '/login?role=owner' },
              { label: 'Student Portal', href: '/login?role=student' },
              { label: 'Parent Portal', href: '/login?role=parent' },
              { label: 'Start Free Trial', href: '/register' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={linkStyle}>{l.label}</Link>
            ))}
          </div>

          {/* Academy Types */}
          <div>
            <div style={headingStyle}>Academy Types</div>
            {['Coaching', 'Dance', 'Sports', 'Music'].map(l => (
              <Link key={l} href="/#features" style={linkStyle}>{l}</Link>
            ))}
          </div>

          {/* Company */}
          <div>
            <div style={headingStyle}>Company</div>
            {['About Us', 'Careers', 'Contact', 'Press'].map(l => (
              <a key={l} href="#" style={linkStyle}>{l}</a>
            ))}
          </div>

          {/* Legal */}
          <div>
            <div style={headingStyle}>Legal</div>
            {['Privacy Policy', 'Terms of Service', 'Refund Policy'].map(l => (
              <a key={l} href="#" style={linkStyle}>{l}</a>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#94A3B8' }}>
            © 2026 ClassSphere Technologies India Pvt. Ltd. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
