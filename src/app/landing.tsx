'use client';
import Link from 'next/link';
import { CreditCard, Users, CheckCircle, ArrowRight, Calendar, Trophy, ClipboardList, Building2, BookOpen, Sparkles, LayoutGrid, Layers } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import PublicNav from '@/components/PublicNav';

const ownerPortalCard = {
  title: 'Organisation Owner',
  badge: 'Academy & Staff Dashboard',
  tagline: 'Manage admissions, batches, fees, staff, and multi-branch operations from one command centre.',
  icon: Building2,
  color: '#4F46E5',
  bg: 'rgba(79, 70, 229, 0.08)',
  border: 'rgba(79, 70, 229, 0.22)',
  highlights: [
    'Student admissions, courses & conflict-free batch scheduling',
    'Automated fee plans, multi-term invoices & GST PDF receipts',
    'One-tap attendance register, test grading & revenue analytics',
  ],
  primaryLabel: 'Owner Sign In',
  primaryHref: '/login',
  secondaryLabel: 'Start Free Trial',
  secondaryHref: '/register',
};

const categoryStrip: Array<{
  title: string;
  subtitle: string;
  image: string;
}> = [
  { title: 'Academic', subtitle: 'STEM & Arts', image: '/categories-strip/academic.jpg?v=3' },
  { title: 'Dance', subtitle: 'Performing', image: '/categories-strip/dance.jpg?v=3' },
  { title: 'Karate', subtitle: 'Self-Defence', image: '/categories-strip/karate.jpg?v=3' },
  { title: 'Music', subtitle: 'Instruments', image: '/categories-strip/music.jpg?v=3' },
  { title: 'Sports', subtitle: 'Fitness & Team', image: '/categories-strip/sports.jpg?v=3' },
  { title: 'Creative', subtitle: 'Fine Arts', image: '/categories-strip/creative.jpg?v=3' },
];

const features = [
  { icon: Users, title: 'Student & Batch Management', desc: 'Complete student profiles, guardian links, batch rosters, and multi-branch admissions in one central place.', color: '#4F46E5', bg: 'rgba(79, 70, 229, 0.08)', border: 'rgba(79, 70, 229, 0.15)', category: 'Admissions' },
  { icon: CreditCard, title: 'Smart Fee Collection & GST Invoicing', desc: 'Custom fee plans, multi-term installments, instant PDF tax invoices, and automated collection tracking.', color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.15)', category: 'Finance' },
  { icon: Calendar, title: 'Timetable & Facility Scheduling', desc: 'Conflict-free classroom and studio scheduling with weekly faculty master calendars and room allocations.', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.15)', category: 'Scheduling' },
  { icon: ClipboardList, title: 'Digital Attendance & Leave Records', desc: 'One-tap daily roll call for instructors, automated absence tracking, and monthly batch attendance percentages.', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.15)', category: 'Operations' },
  { icon: BookOpen, title: 'Tests, Marks & Performance Reports', desc: 'Publish subject-wise exam scores, batch rank lists, report cards, and faculty remarks effortlessly.', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.15)', category: 'Academics' },
  { icon: Building2, title: 'Multi-Branch & Role Permissions', desc: 'Granular access control for directors, campus managers, tutors, and accountants across all your branches.', color: '#059669', bg: 'rgba(5, 150, 105, 0.08)', border: 'rgba(5, 150, 105, 0.15)', category: 'Administration' },
];

const howItWorksSteps = [
  { step: '01', title: 'Register Your Organisation', desc: 'Sign up your academy in 2 minutes with mobile OTP verification, name your institution, and activate your 14-day free trial.', color: '#4F46E5' },
  { step: '02', title: 'Configure Batches & Fees', desc: 'Set up your courses, weekly schedules, classroom allocations, instructor assignments, and installment fee plans.', color: '#10B981' },
  { step: '03', title: 'Enroll Students & Automate', desc: 'Add student profiles, mark digital attendance, generate compliant GST invoices, and track revenue on live dashboards.', color: '#F59E0B' },
];

export default function LandingPage() {

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', color: '#0F172A', minHeight: '100vh' }}>

      {/* ─── Navbar ─── */}
      <PublicNav links={[
          { label: 'Categories', href: '#categories' },
          { label: 'Modules', href: '#modules' },
          { label: 'Features', href: '#features' },
          { label: 'How It Works', href: '#how-it-works' },
          { label: 'Pricing', href: '/pricing' },
        ]} />

      {/* ─── Hero ─── */}
      <section style={{
        padding: '9px 32px',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F0F9FF 52%, #ECFDF5 100%)',
        borderBottom: '1px solid #E2E8F0',
      }}>
        <div style={{ position: 'absolute', top: '-180px', left: '12%', width: '620px', height: '620px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 62%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-120px', right: '6%', width: '480px', height: '480px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 68%)', pointerEvents: 'none' }} />

        <div className="hero-split-grid">
          {/* Left: Hero Content */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', maxWidth: '560px', transform: 'translateY(-14px)' }}>
            {/* Headline */}
            <h1 style={{
              fontSize: 'clamp(29px, 3.4vw, 41px)',
              fontWeight: 800, lineHeight: 1.15, marginBottom: '16px',
              letterSpacing: '-0.025em', color: '#0F172A',
              textWrap: 'balance',
            }}>
              Manage Your Academy
              <br />
              <span className="gradient-text">All in One Place</span>
            </h1>

            {/* Subtitle */}
            <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.65, marginBottom: '24px', maxWidth: '520px' }}>
              Run your coaching, music, dance, or sports academy effortlessly. Manage student admissions, conflict-free batch schedules, faculty attendance, fee collection, and multi-branch operations from a single unified command centre.
            </p>

            {/* Primary CTA */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: 0 }}>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ fontSize: '14px', padding: '10px 24px', height: '44px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(79,70,229,0.22)' }}>
                  Book a Demo <ArrowRight size={15} />
                </button>
              </Link>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ fontSize: '14px', padding: '10px 24px', height: '44px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(79,70,229,0.22)' }}>
                  Register your firm <ArrowRight size={15} />
                </button>
              </Link>
            </div>

            {/* Core Capabilities Preview Card */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginTop: '24px',
              padding: '24px 16px',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.82)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(226, 232, 240, 0.85)',
              borderRadius: '14px',
              boxShadow: '0 4px 16px -4px rgba(79, 70, 229, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
              width: '100%',
              maxWidth: '540px',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '6px', background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={14} color="#4F46E5" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Batches</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.4 }}>Weekly timetables &amp; conflict-free scheduling</div>
              </div>

              <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={14} color="#10B981" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Fees &amp; GST</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.4 }}>Automated invoices &amp; installment tracking</div>
              </div>

              <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '6px', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ClipboardList size={14} color="#06B6D4" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Attendance</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.4 }}>One-tap roll call &amp; digital absence logs</div>
              </div>
            </div>
          </div>

          {/* Right: Hero Visual */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <div className="hero-visual-frame" style={{
              borderRadius: '24px',
              overflow: 'hidden',
              background: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 24px 48px -16px rgba(79, 70, 229, 0.18), 0 8px 20px -8px rgba(15, 23, 42, 0.08)',
            }}>
              <img
                src="/hero-academy.jpg?v=2"
                alt="ClassSphere academy management system for Organisation Owners"
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', objectPosition: 'center' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 2: Animated 6-Card Learning Categories Strip ─── */}
      <section id="categories" style={{ padding: '44px 32px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 28px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '5px 14px', borderRadius: '9999px',
              background: '#EFF6FF', color: '#4F46E5', border: '1px solid #DBEAFE',
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: '10px'
            }}>
              <LayoutGrid size={13} /> TAILORED FOR YOUR DISCIPLINE
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 3.2vw, 34px)', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '8px' }}>
              Built for Every Kind of Academy &amp; Institute
            </h2>
            <p style={{ fontSize: '14.5px', color: '#64748B', lineHeight: 1.6 }}>
              Whether you run coaching centres, dance studios, karate dojos, music schools, sports academies, or fine arts workshops — manage every branch seamlessly on ClassSphere.
            </p>
          </div>

          {/* Floating Glass Container with Sheen Sweep & 6 Animated Portrait Cards */}
          <div className="strip-panel">
            <div className="strip-sheen-layer" />
            <div style={{ position: 'absolute', top: '-96px', right: '-96px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(219, 234, 254, 0.5)', filter: 'blur(48px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-96px', left: '-96px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(239, 246, 255, 0.6)', filter: 'blur(48px)', pointerEvents: 'none' }} />

            <div className="category-strip-grid">
              {categoryStrip.map((cat, idx) => (
                <Link
                  key={cat.title}
                  href="/register"
                  className={`strip-card stagger-float-${idx + 1}`}
                  style={{ height: '240px' }}
                >
                  <img src={cat.image} alt={`${cat.title} — ${cat.subtitle}`} className="strip-card-img" />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(238, 242, 255, 0.45) 0%, transparent 35%)', pointerEvents: 'none', zIndex: 1 }} />
                  <div className="strip-card-label">
                    <span style={{ display: 'block', fontSize: '17px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                      {cat.title}
                    </span>
                    <span style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#2563EB', marginTop: '3px' }}>
                      {cat.subtitle}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Organisation Owner Portal Access ─── */}
      <section id="modules" style={{ padding: '44px 32px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div className="section-eyebrow">PORTAL ACCESS</div>
            <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '10px', letterSpacing: '-0.02em', color: '#0F172A' }}>
              Access Your Organisation Dashboard
            </h2>
            <p style={{ fontSize: '15px', color: '#64748B', maxWidth: '640px', margin: '0 auto', lineHeight: 1.55 }}>
              Sign in to manage admissions, batches, fees, staff, and multi-branch operations from one command centre.
            </p>
          </div>

          {/* Centered Single Organisation Owner Card */}
          <div style={{ maxWidth: '740px', margin: '0 auto' }}>
            <div
              className="cs-card"
              style={{
                padding: '22px 30px',
                border: '1px solid rgba(79, 70, 229, 0.22)',
                background: '#FFFFFF',
                borderRadius: '16px',
                boxShadow: '0 12px 32px -8px rgba(79, 70, 229, 0.12), 0 2px 8px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '10px',
                  background: ownerPortalCard.bg, border: `1px solid ${ownerPortalCard.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Building2 size={20} color={ownerPortalCard.color} />
                </div>
                <span style={{
                  fontSize: '11.5px', fontWeight: 600, color: ownerPortalCard.color,
                  background: ownerPortalCard.bg, padding: '4px 12px', borderRadius: '9999px',
                  border: '1px solid rgba(79, 70, 229, 0.18)'
                }}>
                  {ownerPortalCard.badge}
                </span>
              </div>

              <h3 style={{ fontSize: '21px', fontWeight: 700, color: '#0F172A', marginBottom: '6px', letterSpacing: '-0.015em' }}>
                {ownerPortalCard.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, marginBottom: '14px' }}>
                {ownerPortalCard.tagline}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {ownerPortalCard.highlights.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#334155', lineHeight: 1.4 }}>
                    <CheckCircle size={15} color={ownerPortalCard.color} style={{ flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid #F1F5F9',
                }}
              >
                <Link href={ownerPortalCard.primaryHref} style={{ textDecoration: 'none', display: 'block' }}>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 16px',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      backgroundColor: ownerPortalCard.color,
                      border: `1.5px solid ${ownerPortalCard.color}`,
                      color: '#FFFFFF',
                      boxShadow: '0 4px 12px -2px rgba(79, 70, 229, 0.35)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{ownerPortalCard.primaryLabel}</span>
                    <ArrowRight size={14} />
                  </button>
                </Link>
                <Link href={ownerPortalCard.secondaryHref} style={{ textDecoration: 'none', display: 'block' }}>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 16px',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(79, 70, 229, 0.05)',
                      border: '1.5px solid rgba(79, 70, 229, 0.22)',
                      color: ownerPortalCard.color,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{ownerPortalCard.secondaryLabel}</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" style={{ padding: '48px 32px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div className="section-eyebrow">BUILT FOR SCALE</div>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '14px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Built Exclusively for Organisation Owners
          </h2>
          <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '580px', margin: '0 auto', lineHeight: 1.6 }}>
            ClassSphere streamlines every administrative, academic, and financial workflow across your branches in one unified platform.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {features.map(f => (
            <div key={f.title} className="cs-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '8px',
                  background: f.bg, border: `1px solid ${f.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <f.icon size={20} color={f.color} />
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 600, color: f.color,
                  background: f.bg, padding: '3px 9px', borderRadius: '9999px'
                }}>
                  {f.category}
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px', color: '#0F172A', letterSpacing: '-0.01em' }}>{f.title}</div>
              <div style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section id="how-it-works" style={{ padding: '48px 32px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
          <div className="section-eyebrow">QUICK SETUP</div>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '12px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Get started in 3 simple steps
          </h2>
          <p style={{ fontSize: '15px', color: '#64748B', maxWidth: '540px', margin: '0 auto 36px', lineHeight: 1.6 }}>
            Set up your organisation, configure courses and fees, and start managing your academy in under 10 minutes.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '32px' }}>
            {howItWorksSteps.map(s => (
              <div key={s.step} className="cs-card" style={{ padding: '28px 24px', background: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '12px', margin: '0 auto 18px',
                  background: `${s.color}12`, border: `1px solid ${s.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 700, color: s.color, letterSpacing: '-0.01em'
                }}>{s.step}</div>
                <div style={{ fontWeight: 700, fontSize: '17px', marginBottom: '10px', color: '#0F172A' }}>{s.title}</div>
                <div style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, #4F46E5, #3730A3)',
            borderRadius: '16px', padding: '40px 32px',
            color: 'white', position: 'relative', overflow: 'hidden',
            boxShadow: '0 24px 48px -12px rgba(79,70,229,0.3)'
          }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative' }}>
              <div style={{ width: 56, height: 56, borderRadius: '14px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Sparkles size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '14px', letterSpacing: '-0.02em' }}>
                Ready to modernise your academy?
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '16px', lineHeight: 1.6, margin: '0 auto 32px', maxWidth: '520px' }}>
                Join academy and organisation owners across India automating their admissions, timetables, and fee collections.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <button style={{
                    background: 'white', color: '#4F46E5', border: 'none', borderRadius: '8px',
                    padding: '12px 26px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.2s'
                  }}>
                    <Building2 size={15} /> Register Your Organisation <ArrowRight size={15} />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <SiteFooter />
    </div>
  );
}
