'use client';
import { RefreshCw, CreditCard, FileText, CheckCircle2, AlertCircle, Clock, Building, Mail, HelpCircle } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import PublicNav from '@/components/PublicNav';

export default function RefundPolicyPage() {
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
            Simple & Fair
          </div>

          <h1 style={{ fontSize: 'clamp(24px, 3.4vw, 32px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '12px' }}>
            Refund & Cancellation Policy
          </h1>

          <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '720px', margin: '0 auto 12px', lineHeight: 1.5 }}>
            A plain-English guide to our 14-day free trial, subscription cancellations, and refund guidelines across India.
          </p>

          <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 500 }}>
            Effective Date: November 19, 2026 · Compliant with the Consumer Protection Act, 2019
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
          <section id="overview" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#4F46E5' }} /> 1. Overview
            </h2>
            <p style={{ marginBottom: '8px', fontSize: '13.5px' }}>
              We want you to feel confident using ClassSphere. We believe in clear, fair billing without hidden traps or surprise deductions.
            </p>
            <p style={{ fontSize: '13.5px', margin: 0 }}>
              Because ClassSphere is cloud software, every new academy gets a <strong>14-day free trial</strong> to test all features before spending a single rupee.
            </p>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 2. Free Evaluation Period */}
          <section id="trial" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={18} style={{ color: '#4F46E5' }} /> 2. 14-Day Free Evaluation (Try Before You Pay)
            </h2>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '12px 14px' }}>
              <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '5px', color: '#475569' }}>
                <li><strong>No Card Required:</strong> Sign up and start managing batches, attendance, and fee receipts without entering any card or bank details.</li>
                <li><strong>All Features Included:</strong> Test student admissions, teacher allocations, GST invoices, and parent receipts.</li>
                <li><strong>Zero Auto-Deductions:</strong> If you decide ClassSphere isn&apos;t the right fit, you don&apos;t have to do anything. Your trial simply pauses with zero charges.</li>
              </ul>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 3. Subscription Cancellations */}
          <section id="cancellations" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={18} style={{ color: '#4F46E5' }} /> 3. Cancelling Your Subscription
            </h2>
            <p style={{ marginBottom: '8px', fontSize: '13.5px' }}>
              You are never locked in. You can cancel your subscription whenever you want:
            </p>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li><strong>1-Click Cancellation:</strong> Cancel directly from your dashboard under <em>Organisation Settings → Billing</em>, or email us at <a href="mailto:contact@classsphere.com" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>contact@classsphere.com</a>.</li>
              <li><strong>Use Until Your Term Ends:</strong> You keep full access until your current paid month or year ends.</li>
              <li><strong>No Future Charges:</strong> Once cancelled, you will never be charged again.</li>
              <li><strong>30 Days to Download Your Data:</strong> You have 30 days after cancellation to download your student lists, attendance records, and fee ledgers as Excel or CSV files.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 4. SaaS Subscription Refund Terms */}
          <section id="refund-eligibility" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} style={{ color: '#4F46E5' }} /> 4. Refund Rules for Subscriptions
            </h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>A. 7-Day Money-Back Guarantee (First-Time Buyers)</div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  If you purchase a paid plan for the first time and experience a technical glitch that our engineering team cannot fix within 72 hours, we will issue a <strong>100% full refund</strong> if requested within 7 days of payment.
                </p>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>B. Monthly Subscriptions</div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  Monthly plans are billed every 30 days and are non-refundable once the month begins, as cloud resources are provisioned right away. You can cancel anytime to avoid future billings.
                </p>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>C. Annual Subscriptions</div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  If you choose an annual plan and decide to cancel within 30 days of purchase, you will receive a prorated refund for the remaining unused months.
                </p>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>D. Non-Refundable Items</div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  SMS/WhatsApp notification packs that have already been sent out cannot be refunded.
                </p>
              </div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 5. Student Tuition Fees */}
          <section id="student-fees" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} style={{ color: '#4F46E5' }} /> 5. Important: Student & Parent Tuition Fees
            </h2>
            <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '9px', padding: '10px 14px', marginBottom: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#3730A3', fontWeight: 600 }}>
                Simple Notice: ClassSphere is software for academies; we are not a tuition center.
              </p>
            </div>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li><strong>Direct to the Academy:</strong> When parents pay tuition fees through online payment links, the money is deposited directly into your academy&apos;s bank account.</li>
              <li><strong>Student Refund Requests:</strong> If a student leaves a class or requests a tuition refund, that refund is handled directly by your academy according to your own rules. ClassSphere does not hold student tuition funds.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 6. Processing Method & Timelines */}
          <section id="processing-timelines" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: '#4F46E5' }} /> 6. How and When Refunds Are Paid
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>Back to Original Method</div>
                <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.45 }}>Refunds go directly back to the original UPI ID, card, or bank account you used during payment.</div>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>48-Hour Approval</div>
                <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.45 }}>Once approved, our team initiates your refund through banking rails within 2 working days.</div>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>5–7 Business Days</div>
                <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.45 }}>Depending on your bank, the funds will reflect in your account within 5 to 7 business days.</div>
              </div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 7. Duplicate Transactions */}
          <section id="duplicate-charges" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ color: '#4F46E5' }} /> 7. Duplicate or Accidental Payments
            </h2>
            <p style={{ fontSize: '13.5px', marginBottom: '8px' }}>
              If a banking network timeout or glitch results in a double charge for an invoice:
            </p>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li>The extra amount is identified by our payment system and refunded automatically within 48 to 72 hours.</li>
              <li>You can also email us right away at <a href="mailto:contact@classsphere.com" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>contact@classsphere.com</a> with your transaction ID for instant assistance.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '18px 0' }} />

          {/* 8. How to Request a Refund */}
          <section id="contact-refund" style={{ scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={18} style={{ color: '#4F46E5' }} /> 8. How to Ask for a Refund
            </h2>
            <p style={{ fontSize: '13.5px', marginBottom: '10px' }}>
              To request a refund or ask a question about your bill, simply drop us a quick note:
            </p>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', marginBottom: '4px' }}>Accounts & Support Desk</div>
              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.55 }}>
                <div><strong>Email:</strong> <a href="mailto:contact@classsphere.com" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>contact@classsphere.com</a></div>
                <div><strong>Subject:</strong> Refund Request - [Your Academy Name]</div>
                <div><strong>What to Include:</strong> Your registered phone number and payment receipt or date</div>
                <div><strong>Response Time:</strong> Within 1 to 2 business days</div>
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
