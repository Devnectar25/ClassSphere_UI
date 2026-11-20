'use client';
import { Shield, Mail, Lock, FileText, CheckCircle2, Building, Eye, Clock, UserCheck } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import PublicNav from '@/components/PublicNav';

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>

          <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '720px', margin: '0 auto 12px', lineHeight: 1.5 }}>
            A plain-English guide to how ClassSphere protects your personal data, keeps student records safe, and respects your privacy.
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

          {/* 1. Introduction */}
          <section id="introduction" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#4F46E5' }} /> 1. Who We Are & What This Covers
            </h2>
            <p style={{ marginBottom: '8px', fontSize: '13.5px' }}>
              ClassSphere Technologies India Pvt. Ltd. (“<strong>ClassSphere</strong>”, “<strong>we</strong>”, or “<strong>us</strong>”) provides cloud software designed specifically for coaching centers, tuition classes, dance academies, music schools, and sports institutes.
            </p>
            <p style={{ fontSize: '13.5px', margin: 0 }}>
              This Privacy Policy explains what information we collect when you use ClassSphere, how we use it, and how we protect it. We follow India&apos;s <strong>Digital Personal Data Protection Act, 2023 (DPDPA)</strong> and the <strong>Information Technology Act, 2000</strong>.
            </p>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 2. Information We Collect */}
          <section id="collection" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={18} style={{ color: '#4F46E5' }} /> 2. Information We Collect
            </h2>
            <p style={{ marginBottom: '10px', fontSize: '13.5px' }}>
              We only collect information necessary to run your academy smoothly:
            </p>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>A. Your Academy Owner Account</div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  Your name, academy name, category (e.g., Tuition, Music, Dance, Sports), mobile number, email address, password, and optional GSTIN for tax invoices.
                </p>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>B. Student & Parent Information (Added by You)</div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  Student names, parent contact numbers, enrolled batches, attendance records, and exam scores that you choose to enter into ClassSphere.
                </p>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>C. Payment Information</div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  Records of your subscription and fee receipts. All online payments are handled securely by RBI-licensed payment gateways. <strong>ClassSphere never sees or stores your debit/credit card numbers or bank PINs.</strong>
                </p>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>D. Basic Technical Information</div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  IP addresses, browser type, and sign-in timestamps. We use this solely to prevent fraudulent logins and keep your account secure.
                </p>
              </div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 3. How We Use Your Data */}
          <section id="usage" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} style={{ color: '#4F46E5' }} /> 3. How We Use Your Data
            </h2>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li><strong>Day-to-day Operations:</strong> Managing student admissions, batch timetables, and teacher attendance.</li>
              <li><strong>Fee Receipts & Invoicing:</strong> Generating GST invoices, fee reminder SMS, and payment receipts.</li>
              <li><strong>Security & Sign-In:</strong> Sending login OTPs, password reset links, and security alerts.</li>
              <li><strong>Customer Support:</strong> Answering questions and helping you resolve any technical issues.</li>
              <li><strong>Reliability:</strong> Keeping the system fast, stable, and running 24/7 without crashes.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 4. You Own Your Data */}
          <section id="ownership" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} style={{ color: '#4F46E5' }} /> 4. You Own Your Academy Data
            </h2>
            <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '9px', padding: '10px 14px', marginBottom: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#3730A3', fontWeight: 600 }}>
                Simple Promise: You own 100% of your student, parent, and fee records.
              </p>
            </div>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li><strong>You Are in Full Control:</strong> You are the owner of the data you enter into ClassSphere.</li>
              <li><strong>We Are the Technology Provider:</strong> We only store and process data according to your instructions.</li>
              <li><strong>Zero Commercial Misuse:</strong> We will never sell, rent, or use your student lists to advertise or promote anything to your students or parents.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 5. When Do We Share Data? */}
          <section id="sharing" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} style={{ color: '#4F46E5' }} /> 5. When Do We Share Information?
            </h2>
            <p style={{ fontSize: '13.5px', marginBottom: '8px' }}>
              <strong>We never sell or monetize your data.</strong> We only share information with trusted services essential to deliver the software:
            </p>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li><strong>Cloud Hosting:</strong> Highly secure servers in India with strict 24/7 physical and digital safeguards.</li>
              <li><strong>SMS & WhatsApp Gateways:</strong> Telecom-approved providers used solely to deliver your OTPs and fee reminders.</li>
              <li><strong>Payment Processors:</strong> RBI-licensed payment gateways (like Razorpay) to process fee transactions.</li>
              <li><strong>Legal Authorities:</strong> Only when strictly required by Indian law or valid court order.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 6. Security */}
          <section id="security" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} style={{ color: '#4F46E5' }} /> 6. How We Keep Your Data Safe
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>SSL / TLS Encryption</div>
                <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.45 }}>All data travelling between your browser and our servers is fully encrypted.</div>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>Encrypted Passwords</div>
                <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.45 }}>Your passwords are encrypted using salted bcrypt hashes. Nobody—even our staff—can read them.</div>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>Isolated Academy Workspaces</div>
                <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.45 }}>Your data is kept strictly separate so no other academy can ever view or access your records.</div>
              </div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 7. Retention */}
          <section id="retention" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: '#4F46E5' }} /> 7. Data Retention & Easy Downloads
            </h2>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li><strong>Active Accounts:</strong> We store your records as long as your academy account is active.</li>
              <li><strong>Easy Export:</strong> You can download your student lists, attendance records, and fee ledgers as Excel/CSV files anytime.</li>
              <li><strong>Account Closure:</strong> If you close your account, your data is permanently deleted within 90 days, keeping only records required by Indian tax laws.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 8. Your Rights */}
          <section id="rights" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} style={{ color: '#4F46E5' }} /> 8. Your Rights
            </h2>
            <p style={{ fontSize: '13.5px', marginBottom: '8px' }}>
              Under Indian data protection laws, you always have the right to:
            </p>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li><strong>Review & Update:</strong> Change your name, contact details, or staff permissions directly from your dashboard.</li>
              <li><strong>Download Your Data:</strong> Export your student and fee data whenever you need it.</li>
              <li><strong>Delete Your Account:</strong> Stop using the platform and ask for your records to be removed.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 9. Contact */}
          <section id="grievance" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={18} style={{ color: '#4F46E5' }} /> 9. Questions & Contact
            </h2>
            <p style={{ fontSize: '13.5px', marginBottom: '10px' }}>
              Have questions about privacy or your data? We are happy to help:
            </p>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', marginBottom: '4px' }}>Privacy & Support Team</div>
              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.55 }}>
                <div><strong>Company:</strong> ClassSphere Technologies India Pvt. Ltd.</div>
                <div><strong>Email:</strong> <a href="mailto:contact@classsphere.com" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>contact@classsphere.com</a></div>
                <div><strong>City:</strong> Bengaluru, Karnataka, India</div>
                <div><strong>Response Time:</strong> We reply within 24–48 hours on business days</div>
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
