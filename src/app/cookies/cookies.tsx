'use client';
import { Cookie, Lock, Settings, CheckCircle2, EyeOff, Sliders, Mail, FileText, AlertCircle } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import PublicNav from '@/components/PublicNav';

export default function CookiePolicyPage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', color: '#0F172A', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ─── Navbar ─── */}
      <PublicNav />

      {/* ─── Hero Header ─── */}
      <header style={{
        background: 'linear-gradient(180deg, #EEF2FF 0%, #F8FAFC 100%)',
        borderBottom: '1px solid #E2E8F0',
        padding: '44px 20px 36px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '9999px', background: '#E0E7FF', color: '#4338CA', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Simple & Transparent
          </div>

          <h1 style={{ fontSize: 'clamp(24px, 3.4vw, 32px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '12px' }}>
            Cookie Policy
          </h1>

          <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '720px', margin: '0 auto 12px', lineHeight: 1.5 }}>
            A plain-English explanation of how ClassSphere uses cookies to keep your academy account secure and easy to use.
          </p>

          <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 500 }}>
            Effective Date: November 19, 2026 · Compliant with India&apos;s DPDPA 2023
          </div>
        </div>
      </header>

      {/* ─── Main Content Layout ─── */}
      <main style={{ flex: 1, maxWidth: '1140px', width: '100%', margin: '0 auto', padding: '16px 20px 28px' }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          padding: '24px 28px',
          boxShadow: '0 4px 16px -4px rgba(15, 23, 42, 0.05)',
          lineHeight: 1.65,
          color: '#334155',
        }}>

          {/* 1. What Are Cookies */}
          <section id="introduction" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cookie size={18} style={{ color: '#4F46E5' }} /> 1. What Are Cookies?
            </h2>
            <p style={{ marginBottom: '8px', fontSize: '13.5px' }}>
              Cookies are small, safe text files saved in your web browser when you visit websites.
            </p>
            <p style={{ fontSize: '13.5px', margin: 0 }}>
              They remember who you are so you stay signed in as you navigate between batches, students, and fee reports—without having to type your password on every single page.
            </p>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 2. Privacy Promise */}
          <section id="privacy-promise" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EyeOff size={18} style={{ color: '#4F46E5' }} /> 2. Our Simple Promise: Zero Advertising Trackers
            </h2>
            <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '9px', padding: '10px 14px', marginBottom: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#3730A3', fontWeight: 600 }}>
                Clean Software: We never track your academy across the internet or show you ads.
              </p>
            </div>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li><strong>No Ad Trackers:</strong> We do not use third-party advertising cookies, retargeting pixels, or ad networks.</li>
              <li><strong>No Data Selling:</strong> We never sell or share your browsing habits or academy records with data brokers.</li>
              <li><strong>Only What&apos;s Necessary:</strong> Every cookie we use has a single purpose: to keep your portal fast, secure, and working properly.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 3. The Cookies We Use */}
          <section id="cookie-types" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} style={{ color: '#4F46E5' }} /> 3. The Cookies We Use & Why
            </h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>A. Essential Sign-In Cookies (Required)</div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  These securely remember that you are logged in, verify your encrypted identity token, and prevent unauthorized access. The platform cannot work without these.
                </p>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>B. Preference Cookies (Helpful)</div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  These remember your display choices—such as keeping your navigation sidebar collapsed or showing 50 students per table page instead of 10.
                </p>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>C. System Speed & Stability</div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  These measure anonymous server response speeds and error logs so our engineering team can keep ClassSphere fast, responsive, and crash-free.
                </p>
              </div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 4. Table of Key Cookies */}
          <section id="cookie-table" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#4F46E5' }} /> 4. Summary of Key Cookies
            </h2>
            <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '9px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>Cookie</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>Type</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>What It Does</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>Duration</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#475569' }}>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#4F46E5', fontWeight: 600 }}>cs_token</td>
                    <td style={{ padding: '8px 12px' }}>Essential</td>
                    <td style={{ padding: '8px 12px' }}>Keeps your session signed in securely</td>
                    <td style={{ padding: '8px 12px' }}>7 Days</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#4F46E5', fontWeight: 600 }}>cs_tenant_id</td>
                    <td style={{ padding: '8px 12px' }}>Essential</td>
                    <td style={{ padding: '8px 12px' }}>Ensures only your academy&apos;s records load</td>
                    <td style={{ padding: '8px 12px' }}>Session</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#4F46E5', fontWeight: 600 }}>cs_csrf</td>
                    <td style={{ padding: '8px 12px' }}>Essential</td>
                    <td style={{ padding: '8px 12px' }}>Protects forms from malicious tampering</td>
                    <td style={{ padding: '8px 12px' }}>Session</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#4F46E5', fontWeight: 600 }}>cs_ui_prefs</td>
                    <td style={{ padding: '8px 12px' }}>Functional</td>
                    <td style={{ padding: '8px 12px' }}>Remembers your sidebar and table view preferences</td>
                    <td style={{ padding: '8px 12px' }}>1 Year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 5. Payment Gateways */}
          <section id="third-parties" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} style={{ color: '#4F46E5' }} /> 5. Payment Gateway Cookies
            </h2>
            <p style={{ fontSize: '13.5px', marginBottom: '8px' }}>
              When you pay for a subscription or when parents pay student fees through online links, certified payment gateways (like Razorpay) use safe security cookies to prevent payment fraud and satisfy RBI digital security rules.
            </p>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 6. Managing Cookie Preferences */}
          <section id="manage-cookies" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} style={{ color: '#4F46E5' }} /> 6. How You Can Control Cookies
            </h2>
            <p style={{ fontSize: '13.5px', marginBottom: '8px' }}>
              You can view, clear, or block cookies anytime inside your web browser settings:
            </p>
            <ul style={{ paddingLeft: '20px', margin: '0 0 10px', fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
            </ul>
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '9px', padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertCircle size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.5 }}>
                <strong>Note:</strong> Essential cookies are required to verify your sign-in. If you block all cookies, you will not be able to log in to your academy portal.
              </div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 7. Questions */}
          <section id="policy-updates" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} style={{ color: '#4F46E5' }} /> 7. Questions & Contact
            </h2>
            <p style={{ fontSize: '13.5px', marginBottom: '10px' }}>
              Have questions about how cookies are used on ClassSphere? Feel free to reach out anytime:
            </p>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', marginBottom: '4px' }}>ClassSphere Support Desk</div>
              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.55 }}>
                <div><strong>Email:</strong> <a href="mailto:contact@classsphere.com" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>contact@classsphere.com</a></div>
                <div><strong>Subject:</strong> Question about Cookies & Privacy</div>
                <div><strong>Location:</strong> Bengaluru, Karnataka, India</div>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* ─── Footer ─── */}
      <SiteFooter />
    </div>
  );
}
