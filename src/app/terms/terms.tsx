'use client';
import Link from 'next/link';
import { Shield, Mail, FileText, CheckCircle2, Building, AlertCircle, CreditCard, RefreshCw, Scale, Laptop } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import PublicNav from '@/components/PublicNav';

export default function TermsAndConditionsPage() {
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
            Terms & Conditions
          </h1>

          <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '720px', margin: '0 auto 12px', lineHeight: 1.5 }}>
            Clear, fair, and straightforward rules for running your academy, tuition, or coaching classes with ClassSphere.
          </p>

          <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 500 }}>
            Effective Date: November 19, 2026 · Governed by the Laws of India
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

          {/* 1. What These Terms Mean */}
          <section id="acceptance" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#4F46E5' }} /> 1. What These Terms Mean
            </h2>
            <p style={{ marginBottom: '8px', fontSize: '13.5px' }}>
              These Terms and Conditions are a simple agreement between <strong>ClassSphere Technologies India Pvt. Ltd.</strong> (“<strong>ClassSphere</strong>”, “<strong>we</strong>”, or “<strong>us</strong>”) and the academy owner or organisation using our software (“<strong>you</strong>”).
            </p>
            <p style={{ fontSize: '13.5px', margin: 0 }}>
              By creating an account or logging in, you agree to these terms and our <Link href="/privacy" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</Link>. We have written them in plain language so they are easy to understand.
            </p>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 2. Who Can Use ClassSphere */}
          <section id="eligibility" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} style={{ color: '#4F46E5' }} /> 2. Who Can Use ClassSphere
            </h2>
            <p style={{ marginBottom: '10px', fontSize: '13.5px' }}>
              To set up an academy on ClassSphere:
            </p>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>A. Legal Age & Authority</div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  You must be at least 18 years old and authorized to represent your coaching center, academy, or school.
                </p>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>B. Accurate Details</div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  Please provide accurate institute name, owner name, and mobile number.
                </p>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>C. Account Safety</div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  Keep your password and login OTPs private. You are responsible for any teachers or staff you invite to your portal.
                </p>
              </div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 3. Subscriptions & Billing */}
          <section id="subscriptions" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} style={{ color: '#4F46E5' }} /> 3. 14-Day Trial & Simple Subscriptions
            </h2>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li><strong>14-Day Free Evaluation:</strong> Every new academy gets 14 days free. You do not need to enter a credit card or pay anything upfront.</li>
              <li><strong>Monthly or Annual Plans:</strong> Choose what works best for your academy. Pricing is transparent with no hidden activation fees.</li>
              <li><strong>GST Invoices:</strong> All fees are in Indian Rupees (INR) plus 18% GST. Enter your GST number to receive automated tax invoices for input tax credit.</li>
              <li><strong>Cancel Anytime:</strong> You can cancel your subscription whenever you want directly from your organisation settings.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 4. You Own Your Data */}
          <section id="data-management" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Laptop size={18} style={{ color: '#4F46E5' }} /> 4. You Own Your Academy Data
            </h2>
            <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '9px', padding: '10px 14px', marginBottom: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#3730A3', fontWeight: 600 }}>
                Data Sovereignty: You own 100% of your student, parent, and fee records.
              </p>
            </div>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li><strong>Full Ownership:</strong> Every student profile, attendance record, and fee receipt you create belongs solely to your academy.</li>
              <li><strong>Zero Ads or Selling:</strong> We will never contact your students, sell your student lists, or show third-party ads.</li>
              <li><strong>Easy Export:</strong> You can download all your student lists and fee histories as Excel or CSV files anytime.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 5. Student Fee Collections */}
          <section id="fee-collection" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} style={{ color: '#4F46E5' }} /> 5. Collecting Student Fees
            </h2>
            <p style={{ fontSize: '13.5px', marginBottom: '8px' }}>
              ClassSphere provides tools so you can collect course fees and send online payment links to parents:
            </p>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li><strong>Direct to Your Bank:</strong> Student fees are processed by RBI-licensed payment gateways and deposited directly into your academy&apos;s bank account.</li>
              <li><strong>Your Tuition Rules:</strong> Any course refund, student batch change, or fee discount is strictly between you and your student/parent. ClassSphere does not hold or manage student tuition funds.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 6. Fair Use Rules */}
          <section id="acceptable-use" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ color: '#4F46E5' }} /> 6. Simple Rules of Fair Use
            </h2>
            <p style={{ fontSize: '13.5px', marginBottom: '8px' }}>
              To keep the platform safe for everyone, you agree not to:
            </p>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li>Send spam or unauthorized advertising messages through SMS or WhatsApp.</li>
              <li>Attempt to hack, reverse-engineer, or disrupt the software.</li>
              <li>Upload unlawful or harmful content.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 7. Uptime & Backups */}
          <section id="sla" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={18} style={{ color: '#4F46E5' }} /> 7. Service Reliability & Backups
            </h2>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li><strong>99.9% Uptime:</strong> We work hard to ensure the system is available 24/7 so your classes never stop.</li>
              <li><strong>Automated Backups:</strong> All academy data is backed up continuously to cloud servers in India to prevent data loss.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 8. Cancelling Your Account */}
          <section id="termination" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} style={{ color: '#4F46E5' }} /> 8. Cancellation & Keeping Your Data
            </h2>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li><strong>Easy Cancellation:</strong> You can cancel anytime. You keep full access until your prepaid period ends.</li>
              <li><strong>30-Day Export Window:</strong> After cancelling, you have 30 days to download your records before your instance is safely erased.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 9. Liability in Simple Terms */}
          <section id="liability" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Scale size={18} style={{ color: '#4F46E5' }} /> 9. Liability in Plain Words
            </h2>
            <p style={{ fontSize: '13.5px', marginBottom: '8px' }}>
              We provide ClassSphere with care and high engineering standards:
            </p>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li>We cannot be held responsible for unexpected Internet outages, telecom SMS delays, or third-party bank server downtimes.</li>
              <li>Our maximum legal liability is limited to the subscription amount you paid us during the preceding 6 months.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 10. Governing Law & Contact */}
          <section id="governing-law" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={18} style={{ color: '#4F46E5' }} /> 10. Governing Law & Support
            </h2>
            <p style={{ fontSize: '13.5px', marginBottom: '10px' }}>
              These terms are governed by the laws of India. If you have questions or need assistance, we are always here:
            </p>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', marginBottom: '4px' }}>ClassSphere Support Team</div>
              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.55 }}>
                <div><strong>Company:</strong> ClassSphere Technologies India Pvt. Ltd.</div>
                <div><strong>Email:</strong> <a href="mailto:contact@classsphere.com" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>contact@classsphere.com</a></div>
                <div><strong>City:</strong> Bengaluru, Karnataka, India</div>
                <div><strong>Help Desk:</strong> Monday – Saturday, 9:00 AM – 7:00 PM IST</div>
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
