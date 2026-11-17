'use client';
import Link from 'next/link';
import {
  Shield, CreditCard, Bell, Users, BarChart3,
  CheckCircle, ArrowRight, Star, Zap, Globe, Lock,
  Calendar, Trophy, ClipboardList, ChevronRight,
  Play, Phone
} from 'lucide-react';
import { useApi, formatMoney, type Plan } from '@/lib/api';

const features = [
  { icon: Users, title: 'Student Management', desc: 'Comprehensive student profiles, documents, guardian contacts and full academic history tracking.', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.15)' },
  { icon: CreditCard, title: 'Smart Fee Collection', desc: 'Automated UPI/Razorpay payment links, auto-receipts, and overdue WhatsApp reminders.', color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.15)' },
  { icon: Calendar, title: 'Batch Scheduling', desc: 'Multi-room timetable planning, teacher allocation, and conflict-free studio slot management.', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.15)' },
  { icon: ClipboardList, title: 'Attendance Register', desc: 'One-tap mobile roll call, biometric integration, and instant SMS alerts to parents.', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.15)' },
  { icon: Bell, title: 'Multi-Channel Communication', desc: 'Broadcast circulars, WhatsApp notifications, emergency alerts, and class updates.', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.08)', border: 'rgba(236, 72, 153, 0.15)' },
  { icon: BarChart3, title: 'Rich Analytics', desc: 'Batch profitability, revenue run-rates, attendance retention, and faculty load metrics.', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.15)' },
  { icon: Trophy, title: 'Achievements & Badges', desc: 'Digital merit certificates, graded belt/level milestones, and term performance reports.', color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.08)', border: 'rgba(244, 63, 94, 0.15)' },
  { icon: Globe, title: 'Parent & Student Portal', desc: 'Dedicated branded web & mobile app for fees, schedules, receipts, and tutor notes.', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.15)' },
];

const testimonials = [
  { name: 'Rajesh Sharma', role: 'Director, Zenith IIT-JEE Academy, Kota', quote: 'ClassSphere cut our uncollected fee rate by 85% in just 60 days. The automated WhatsApp reminders and UPI payment links are absolute game changers.', stars: 5 },
  { name: 'Ananya Sen', role: 'Artistic Director, Nritya Kala Dance, Kolkata', quote: 'Scheduling 18 batches across 4 studios was a weekly nightmare. ClassSphere resolved all room clashes and our parents love the self-service app.', stars: 5 },
  { name: 'Capt. Vikram Rathore', role: 'Chief Coach, Apex Sports Academy, Pune', quote: 'Attendance tracking and batch rosters take seconds on coach phones now. It replaced 4 separate Excel sheets and a clumsy accounting tool.', stars: 5 },
];

export default function LandingPage() {
  const { data: plans } = useApi<Plan[]>('/plans');

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', color: '#0F172A', minHeight: '100vh' }}>

      {/* ─── Navbar ─── */}
      <nav className="glass-strong" style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid #E2E8F0',
        padding: '0 40px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 34, height: 34, borderRadius: '8px',
            background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(79,70,229,0.25)'
          }}>
            <Shield size={17} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '17px', color: '#0F172A' }}>
            Class<span className="gradient-text">Sphere</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', fontSize: '14px' }}>
          {['Features', 'How It Works', 'Pricing', 'Testimonials'].map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} style={{ color: '#475569', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}>{item}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button className="btn-ghost" style={{ fontSize: '13px', fontWeight: 600, color: '#4F46E5' }}>Sign In</button>
          </Link>
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ fontSize: '13px', padding: '10px 20px' }}>Start Free Trial</button>
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section style={{ padding: '80px 40px 64px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle background mesh */}
        <div style={{ position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)', width: '900px', height: '900px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50px', left: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50px', right: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: '780px', margin: '0 auto' }}>
          {/* Pill badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.15)',
            borderRadius: '9999px', padding: '6px 16px', fontSize: '12px', fontWeight: 600,
            color: '#4338CA', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            <Zap size={12} /> Multi-tenant SaaS for class management
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 700, lineHeight: 1.12, marginBottom: '20px',
            letterSpacing: '-0.025em', color: '#0F172A'
          }}>
            The All-in-One Platform for{' '}
            <span className="gradient-text">Every Class Business</span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: '18px', color: '#475569', lineHeight: 1.65, marginBottom: '36px', maxWidth: '620px', margin: '0 auto 36px', letterSpacing: '-0.005em' }}>
            Empower your coaching academy, dance, sports, or music institute. Streamline student admissions, automate fee collection with UPI & NetBanking, track digital attendance, and delight parents with a branded self-service portal.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ fontSize: '15px', padding: '12px 28px', height: '48px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(79,70,229,0.2)' }}>
                Start 14-Day Free Trial <ArrowRight size={16} />
              </button>
            </Link>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ fontSize: '15px', padding: '12px 28px', height: '48px', borderRadius: '8px' }}>
                <Play size={15} /> View Live Demo
              </button>
            </Link>
          </div>

          {/* Trust note */}
          <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '16px', letterSpacing: '0' }}>
            No credit card required • Instant 2-minute onboarding • GST compliant invoices
          </p>
        </div>

        {/* Stats bar */}
        <div className="glass-metric" style={{
          display: 'flex', justifyContent: 'center', gap: '48px',
          margin: '56px auto 0', padding: '24px 40px',
          maxWidth: '700px', flexWrap: 'wrap', borderRadius: '12px'
        }}>
          {[
            { value: '2,800+', label: 'Class Owners' },
            { value: '1.2L+', label: 'Students Managed' },
            { value: '₹48Cr+', label: 'Fees Collected' },
            { value: '99.9%', label: 'Platform Uptime' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div className="gradient-text" style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.015em' }}>{stat.value}</div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" style={{ padding: '80px 40px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div className="section-eyebrow">EVERYTHING YOU NEED</div>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '14px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Built for class owners, loved by parents
          </h2>
          <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '540px', margin: '0 auto', lineHeight: 1.6 }}>
            ClassSphere covers every workflow in a class business — from enrollment to payment, attendance to achievement.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {features.map(f => (
            <div key={f.title} className="cs-card" style={{ padding: '24px' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '8px',
                background: f.bg, border: `1px solid ${f.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
              }}>
                <f.icon size={20} color={f.color} />
              </div>
              <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px', color: '#0F172A', letterSpacing: '-0.01em' }}>{f.title}</div>
              <div style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section id="how-it-works" style={{ padding: '80px 40px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
          <div className="section-eyebrow">QUICK SETUP</div>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '48px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Get started in minutes
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
            {[
              { step: '01', title: 'Register & Verify', desc: 'Sign up your academy in 2 minutes, select your discipline, and get your dedicated sub-domain.', color: '#4F46E5' },
              { step: '02', title: 'Set Up Your Academy', desc: 'Add batches, fee structures, rooms/studios, and import your existing student roster via Excel/CSV.', color: '#10B981' },
              { step: '03', title: 'Enroll & Go Live', desc: 'Start taking digital attendance, automate fee collections, and invite parents to their self-service portal.', color: '#F59E0B' },
            ].map(s => (
              <div key={s.step}>
                <div style={{
                  width: 52, height: 52, borderRadius: '12px', margin: '0 auto 20px',
                  background: `${s.color}0C`, border: `1px solid ${s.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 700, color: s.color, letterSpacing: '-0.01em'
                }}>{s.step}</div>
                <div style={{ fontWeight: 600, fontSize: '17px', marginBottom: '10px', color: '#0F172A' }}>{s.title}</div>
                <div style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" style={{ padding: '80px 40px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div className="section-eyebrow">PRICING</div>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '14px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Simple, transparent pricing
          </h2>
          <p style={{ fontSize: '15px', color: '#64748B' }}>No hidden charges. Cancel anytime. All plans include a 14-day free trial.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {plans?.map(p => (
            <div
              key={p.planTier}
              className="cs-card"
              style={{
                padding: '32px 28px',
                border: p.isPopular ? '2px solid rgba(79,70,229,0.4)' : '1px solid #E2E8F0',
                background: p.isPopular ? 'linear-gradient(to bottom, rgba(79,70,229,0.03), #FFFFFF)' : '#FFFFFF',
                position: 'relative'
              }}
            >
              {p.isPopular && (
                <div style={{
                  position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                  background: '#4F46E5',
                  color: 'white', fontSize: '11px', fontWeight: 700, padding: '4px 14px',
                  borderRadius: '9999px', letterSpacing: '0.02em'
                }}>MOST POPULAR</div>
              )}
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{p.planTier}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                <span style={{ fontSize: '36px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>{formatMoney(p.priceMonthly, p.currency)}</span>
                <span style={{ color: '#94A3B8', fontSize: '14px' }}>/month</span>
              </div>
              <div style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px', lineHeight: 1.5 }}>{p.description}</div>
              <hr className="cs-divider" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <CheckCircle size={15} color="#10B981" style={{ flexShrink: 0 }} />
                    <span style={{ color: '#475569' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/register" style={{ textDecoration: 'none', display: 'block' }}>
                <button className={p.isPopular ? 'btn-primary' : 'btn-secondary'} style={{ width: '100%', justifyContent: 'center', fontSize: '14px', padding: '12px', height: '44px' }}>
                  Start Free Trial <ChevronRight size={16} />
                </button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="testimonials" style={{ padding: '80px 40px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div className="section-eyebrow">TESTIMONIALS</div>
            <h2 style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F172A' }}>
              Trusted by leading academies across India
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {testimonials.map(t => (
              <div key={t.name} className="cs-card" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', gap: '2px', marginBottom: '16px' }}>
                  {Array.from({ length: t.stars }).map((_, i) => <Star key={i} size={16} fill="#F59E0B" color="#F59E0B" />)}
                </div>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, marginBottom: '20px', fontStyle: 'italic' }}>&ldquo;{t.quote}&rdquo;</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="avatar-placeholder" style={{ width: 36, height: 36, fontSize: '13px' }}>
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>{t.name}</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, #4F46E5, #3730A3)',
            borderRadius: '16px', padding: '56px 48px',
            color: 'white', position: 'relative', overflow: 'hidden',
            boxShadow: '0 24px 48px -12px rgba(79,70,229,0.3)'
          }}>
            {/* Decorative circles */}
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative' }}>
              <div style={{ width: 56, height: 56, borderRadius: '14px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Shield size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '14px', letterSpacing: '-0.02em' }}>
                Ready to modernize your academy?
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', lineHeight: 1.6, marginBottom: '32px', maxWidth: '480px', margin: '0 auto 32px' }}>
                Join 2,800+ coaching, sports, dance, and music academies scaling their business effortlessly.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <button style={{
                    background: 'white', color: '#4F46E5', border: 'none', borderRadius: '8px',
                    padding: '12px 28px', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.2s'
                  }}>
                    Start Free Trial <ArrowRight size={16} />
                  </button>
                </Link>
                <button style={{
                  background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '8px', padding: '12px 28px', fontWeight: 600, fontSize: '15px',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                }}>
                  <Phone size={15} /> Talk to a Specialist
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: '1px solid #E2E8F0', padding: '48px 40px 32px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {/* Top section */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '40px', marginBottom: '40px' }}>
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
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, maxWidth: '260px', marginBottom: '16px' }}>
                The all-in-one class management SaaS for modern academies in India.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge badge-success" style={{ fontSize: '10px' }}>
                  <Lock size={10} /> GST Compliant
                </span>
                <span className="badge badge-info" style={{ fontSize: '10px' }}>
                  <Shield size={10} /> 256-bit SSL
                </span>
              </div>
            </div>

            {/* Product */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Product</div>
              {['Features', 'Batch Manager', 'Fee Engine', 'Parent Portal'].map(l => (
                <a key={l} href="#" style={{ display: 'block', fontSize: '13px', color: '#64748B', textDecoration: 'none', marginBottom: '10px', transition: 'color 0.15s' }}>{l}</a>
              ))}
            </div>

            {/* Academy Types */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Academy Types</div>
              {['Coaching', 'Dance', 'Sports', 'Music'].map(l => (
                <a key={l} href="#" style={{ display: 'block', fontSize: '13px', color: '#64748B', textDecoration: 'none', marginBottom: '10px' }}>{l}</a>
              ))}
            </div>

            {/* Company */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Company</div>
              {['About Us', 'Careers', 'Contact', 'Press'].map(l => (
                <a key={l} href="#" style={{ display: 'block', fontSize: '13px', color: '#64748B', textDecoration: 'none', marginBottom: '10px' }}>{l}</a>
              ))}
            </div>

            {/* Legal */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Legal</div>
              {['Privacy Policy', 'Terms of Service', 'Refund Policy'].map(l => (
                <a key={l} href="#" style={{ display: 'block', fontSize: '13px', color: '#64748B', textDecoration: 'none', marginBottom: '10px' }}>{l}</a>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', color: '#94A3B8' }}>
              © 2026 ClassSphere Technologies India Pvt. Ltd. All rights reserved.
            </div>
            <div style={{ fontSize: '13px', color: '#94A3B8' }}>
              INR ₹ • Made in India 🇮🇳
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
