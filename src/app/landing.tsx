'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  Shield, CreditCard, Users,
  CheckCircle, ArrowRight, Globe, Lock,
  Calendar, Trophy, ClipboardList, ChevronRight,
  Building2, GraduationCap, HeartHandshake,
  BookOpen, Sparkles, LayoutGrid
} from 'lucide-react';

type Audience = 'owner' | 'student' | 'parent';
type FeatureFilter = 'all' | Audience;

const rolePortals: Array<{
  id: Audience;
  title: string;
  badge: string;
  tagline: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  highlights: string[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}> = [
  {
    id: 'owner',
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
    primaryHref: '/login?role=owner',
    secondaryLabel: 'Start Free Trial',
    secondaryHref: '/register',
  },
  {
    id: 'student',
    title: 'Student',
    badge: 'Student Portal',
    tagline: 'Stay ahead with live timetables, test report cards, practice streaks, and earned badges.',
    icon: GraduationCap,
    color: '#4F46E5',
    bg: 'rgba(79, 70, 229, 0.08)',
    border: 'rgba(79, 70, 229, 0.22)',
    highlights: [
      'Weekly class timetables with room/studio and instructor details',
      'Subject-wise test marks, grades, class ranks, and tutor feedback',
      'Practice logs, digital merit badges, and instant academy notifications',
    ],
    primaryLabel: 'Student Sign In',
    primaryHref: '/login?role=student',
    secondaryLabel: 'Register',
    secondaryHref: '/register/portal?role=student',
  },
  {
    id: 'parent',
    title: 'Parent / Guardian',
    badge: 'Parent Portal',
    tagline: 'Complete transparency into your child’s attendance, academic progress, and fee payments.',
    icon: HeartHandshake,
    color: '#4F46E5',
    bg: 'rgba(79, 70, 229, 0.08)',
    border: 'rgba(79, 70, 229, 0.22)',
    highlights: [
      'Real-time attendance tracking, session logs, and absence notes',
      'View pending dues, pay fees online, and download term receipts.',
      'Easily switch between multiple children using a single household login.',
    ],
    primaryLabel: 'Parent Sign In',
    primaryHref: '/login?role=parent',
    secondaryLabel: 'Register',
    secondaryHref: '/register/portal?role=parent',
  },
];

const categoryStrip: Array<{
  title: string;
  subtitle: string;
  image: string;
}> = [
  { title: 'Academic', subtitle: 'STEM & Arts', image: '/categories-strip/academic.jpg' },
  { title: 'Dance', subtitle: 'Performing', image: '/categories-strip/dance.jpg' },
  { title: 'Karate', subtitle: 'Self-Defence', image: '/categories-strip/karate.jpg' },
  { title: 'Music', subtitle: 'Instruments', image: '/categories-strip/music.jpg' },
  { title: 'Sports', subtitle: 'Fitness & Team', image: '/categories-strip/sports.jpg' },
  { title: 'Creative', subtitle: 'Fine Arts', image: '/categories-strip/creative.jpg' },
];

const features: Array<{
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
  roles: Audience[];
  roleLabel: string;
}> = [
  { icon: Users, title: 'Student & Batch Management', desc: 'Complete student profiles, guardian links, course rosters, and multi-branch admissions in one place.', color: '#4F46E5', bg: 'rgba(79, 70, 229, 0.08)', border: 'rgba(79, 70, 229, 0.15)', roles: ['owner'], roleLabel: 'Organisation Owner' },
  { icon: CreditCard, title: 'Smart Fee Collection & Invoices', desc: 'Flexible fee plans, multi-term installments, instant PDF invoices, and online payment tracking.', color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.15)', roles: ['owner', 'parent'], roleLabel: 'Owner & Parent' },
  { icon: Calendar, title: 'Live Timetables & Scheduling', desc: 'Conflict-free studio/room allocation for owners and clear weekly class schedules for students & parents.', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.15)', roles: ['owner', 'student', 'parent'], roleLabel: 'All Roles' },
  { icon: ClipboardList, title: 'Digital Attendance Register', desc: 'One-tap daily roll call for faculty with instant attendance history and absence visibility for parents.', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.15)', roles: ['owner', 'student', 'parent'], roleLabel: 'All Roles' },
  { icon: BookOpen, title: 'Tests, Marks & Report Cards', desc: 'Publish subject-wise exam scores, class ranks, and tutor remarks accessible anytime by students and parents.', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.15)', roles: ['owner', 'student', 'parent'], roleLabel: 'All Roles' },
  { icon: Trophy, title: 'Achievements & Practice Streaks', desc: 'Celebrate student milestones with digital merit badges, certificates, and weekly practice hour tracking.', color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.08)', border: 'rgba(244, 63, 94, 0.15)', roles: ['student', 'parent'], roleLabel: 'Student & Parent' },
];

const howItWorksByRole: Record<Audience, Array<{ step: string; title: string; desc: string; color: string }>> = {
  owner: [
    { step: '01', title: 'Register & Verify Academy', desc: 'Sign up your academy in 2 minutes with OTP verification and choose a plan that fits your size.', color: '#4F46E5' },
    { step: '02', title: 'Configure Batches & Fees', desc: 'Add courses, weekly schedules, fee plans, and onboard students, parents, and instructors.', color: '#10B981' },
    { step: '03', title: 'Automate & Scale', desc: 'Mark daily attendance, issue term invoices, publish test scores, and track live analytics.', color: '#F59E0B' },
  ],
  student: [
    { step: '01', title: 'Get Enrolled by Your Academy', desc: 'Once admitted into a batch, your academy activates your ClassSphere portal access.', color: '#0891B2' },
    { step: '02', title: 'Sign In to Student Portal', desc: 'Log in from web or mobile using your registered 10-digit mobile number or email.', color: '#4F46E5' },
    { step: '03', title: 'Track Classes & Milestones', desc: 'Check upcoming sessions, review test marks & rank, log practice hours, and collect badges.', color: '#F59E0B' },
  ],
  parent: [
    { step: '01', title: 'Receive Portal Access', desc: 'Your academy links your household account to all your enrolled children automatically.', color: '#059669' },
    { step: '02', title: 'Sign In with Mobile or Email', desc: 'Access your dedicated Parent Portal anytime with your registered 10-digit mobile number.', color: '#4F46E5' },
    { step: '03', title: 'Monitor Progress & Pay Fees', desc: 'Track attendance & test results in real time, pay fees online, and download PDF receipts.', color: '#0891B2' },
  ],
};

export default function LandingPage() {
  const [featureFilter, setFeatureFilter] = useState<FeatureFilter>('all');
  const [howRole, setHowRole] = useState<Audience>('owner');

  const visibleFeatures = featureFilter === 'all'
    ? features
    : features.filter(f => f.roles.includes(featureFilter));

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
          {[
            { label: 'Categories', href: '#categories' },
            { label: 'Portals', href: '#portals' },
            { label: 'Features', href: '#features' },
            { label: 'How It Works', href: '#how-it-works' },
          ].map(item => (
            <a key={item.label} href={item.href} style={{ color: '#475569', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}>
              {item.label}
            </a>
          ))}
          <Link href="/pricing" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}>
            Pricing
          </Link>
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', maxWidth: '560px' }}>
            {/* Headline */}
            <h1 style={{
              fontSize: 'clamp(34px, 3.8vw, 46px)',
              fontWeight: 800, lineHeight: 1.15, marginBottom: '16px',
              letterSpacing: '-0.025em', color: '#0F172A'
            }}>
              One Smart Platform for
              <br />
              <span className="gradient-text">Owners, Students &amp; Parents</span>
            </h1>

            {/* Subtitle */}
            <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.65, marginBottom: '24px', maxWidth: '520px' }}>
              Run your coaching, music, dance, or sports academy effortlessly while giving students access to live timetables, test results, and badges, and providing parents with transparent attendance records and fee receipts.
            </p>

            {/* Primary CTA */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ fontSize: '14px', padding: '10px 24px', height: '44px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(79,70,229,0.22)' }}>
                  Start 14-Day Free Trial <ArrowRight size={15} />
                </button>
              </Link>
              <a href="#portals" style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ fontSize: '14px', padding: '10px 24px', height: '44px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(79,70,229,0.22)' }}>
                  Choose Your Portal <ArrowRight size={15} />
                </button>
              </a>
            </div>

            {/* Quick Role Sign-in Pills */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {[
                { label: 'Organisation Owner Login', href: '/login?role=owner', icon: Building2, color: '#4F46E5', glow: 'rgba(79, 70, 229, 0.34)' },
                { label: 'Student Portal Login', href: '/login?role=student', icon: GraduationCap, color: '#0891B2', glow: 'rgba(8, 145, 178, 0.34)' },
                { label: 'Parent Portal Login', href: '/login?role=parent', icon: HeartHandshake, color: '#059669', glow: 'rgba(5, 150, 105, 0.34)' },
              ].map((item, idx) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="hero-role-pill"
                  style={{
                    '--pill-accent': item.color,
                    '--pill-glow': item.glow,
                    '--pill-delay': `${idx * 140}ms`,
                    '--pill-sheen-delay': `${0.8 + idx * 0.6}s`,
                  } as React.CSSProperties}
                >
                  <item.icon size={13} color={item.color} className="hero-role-icon" />
                  <span>{item.label}</span>
                  <ChevronRight size={12} className="hero-role-chevron" />
                </Link>
              ))}
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
                alt="ClassSphere connected academy ecosystem for Organisation Owners, Students, and Parents"
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
              <LayoutGrid size={13} /> EXPLORE YOUR INTERESTS
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 3.2vw, 34px)', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '8px' }}>
              Discover What You Love to Learn.
            </h2>
            <p style={{ fontSize: '14.5px', color: '#64748B', lineHeight: 1.6 }}>
              From academic excellence to dance, karate, music, sports, and fine arts — all managed seamlessly on ClassSphere.
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
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15, 23, 42, 0.72), transparent 55%)', pointerEvents: 'none', zIndex: 1 }} />
                  <div className="strip-card-label">
                    <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
                      {cat.title}
                    </span>
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#2563EB', marginTop: '2px' }}>
                      {cat.subtitle}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Dedicated Role Portals ─── */}
      <section id="portals" style={{ padding: '44px 32px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div className="section-eyebrow">DEDICATED EXPERIENCES</div>
            <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '12px', letterSpacing: '-0.02em', color: '#0F172A' }}>
              Tailored dashboards for every role
            </h2>
            <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '580px', margin: '0 auto', lineHeight: 1.6 }}>
              Whether you own an academy, attend classes as a student, or follow your child&apos;s journey as a parent, sign in directly to the workspace designed for you.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '24px' }}>
            {rolePortals.map(portal => (
              <div
                key={portal.id}
                className="cs-card"
                style={{
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: `1px solid ${portal.border}`,
                  background: '#FFFFFF',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '12px',
                      background: portal.bg, border: `1px solid ${portal.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <portal.icon size={22} color={portal.color} />
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, color: portal.color,
                      background: portal.bg, padding: '4px 10px', borderRadius: '9999px'
                    }}>
                      {portal.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                    {portal.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, marginBottom: '20px' }}>
                    {portal.tagline}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                    {portal.highlights.map(item => (
                      <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                        <CheckCircle size={15} color={portal.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: portal.secondaryHref ? '1fr 1fr' : '1fr',
                    gap: '10px',
                    paddingTop: '16px',
                    borderTop: '1px solid #F1F5F9',
                    '--portal-accent': portal.color,
                    '--portal-soft': portal.bg,
                    '--portal-border': portal.border,
                    '--portal-glow': `${portal.color}55`,
                  } as React.CSSProperties}
                >
                  <Link href={portal.primaryHref} style={{ textDecoration: 'none', display: 'block' }}>
                    <button
                      type="button"
                      className="portal-btn-primary"
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 14px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        backgroundColor: portal.color,
                        border: `1.5px solid ${portal.color}`,
                        color: '#FFFFFF',
                        boxShadow: `0 4px 12px -4px ${portal.color}66`,
                      }}
                    >
                      <span>{portal.primaryLabel}</span>
                      <ArrowRight size={14} />
                    </button>
                  </Link>
                  {portal.secondaryHref && portal.secondaryLabel && (
                    <Link href={portal.secondaryHref} style={{ textDecoration: 'none', display: 'block' }}>
                      <button
                        type="button"
                        className="portal-btn-secondary"
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 14px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          backgroundColor: portal.bg,
                          border: `1.5px solid ${portal.border}`,
                          color: portal.color,
                        }}
                      >
                        <span>{portal.secondaryLabel}</span>
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" style={{ padding: '48px 32px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="section-eyebrow">EVERYTHING YOU NEED</div>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '14px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Built for owners, students &amp; parents
          </h2>
          <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '580px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            ClassSphere connects every workflow across your academy — from admissions and billing to schedules, report cards, and achievements.
          </p>

          {/* Role Filter Pills */}
          <div style={{ display: 'inline-flex', gap: '6px', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '5px', borderRadius: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { id: 'all' as FeatureFilter, label: 'All Features' },
              { id: 'owner' as FeatureFilter, label: 'Organisation Owners' },
              { id: 'student' as FeatureFilter, label: 'Students' },
              { id: 'parent' as FeatureFilter, label: 'Parents' },
            ].map(tab => {
              const active = featureFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFeatureFilter(tab.id)}
                  style={{
                    padding: '8px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
                    background: active ? '#4F46E5' : 'transparent',
                    color: active ? '#FFFFFF' : '#64748B',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {visibleFeatures.map(f => (
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
                  {f.roleLabel}
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
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Get started in minutes
          </h2>

          {/* Role Switcher */}
          <div style={{ display: 'inline-flex', gap: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '5px', borderRadius: '10px', marginBottom: '28px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { id: 'owner' as Audience, label: 'As an Organisation Owner', icon: Building2 },
              { id: 'student' as Audience, label: 'As a Student', icon: GraduationCap },
              { id: 'parent' as Audience, label: 'As a Parent', icon: HeartHandshake },
            ].map(tab => {
              const active = howRole === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHowRole(tab.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
                    background: active ? '#4F46E5' : 'transparent',
                    color: active ? '#FFFFFF' : '#64748B',
                  }}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px' }}>
            {howItWorksByRole[howRole].map(s => (
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

      {/* ─── CTA ─── */}
      <section style={{ padding: '44px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, #4F46E5, #3730A3)',
            borderRadius: '16px', padding: '36px 32px',
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
                Ready to get started with ClassSphere?
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '16px', lineHeight: 1.6, margin: '0 auto 32px', maxWidth: '520px' }}>
                Launch your academy in minutes, or sign in directly to your Student or Parent portal to view classes, attendance, and fees.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <button style={{
                    background: 'white', color: '#4F46E5', border: 'none', borderRadius: '8px',
                    padding: '12px 24px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.2s'
                  }}>
                    <Building2 size={15} /> Register Your Academy <ArrowRight size={15} />
                  </button>
                </Link>
                <Link href="/login?role=student" style={{ textDecoration: 'none' }}>
                  <button style={{
                    background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.28)',
                    borderRadius: '8px', padding: '12px 20px', fontWeight: 600, fontSize: '14px',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                  }}>
                    <GraduationCap size={15} /> Student Login
                  </button>
                </Link>
                <Link href="/login?role=parent" style={{ textDecoration: 'none' }}>
                  <button style={{
                    background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.28)',
                    borderRadius: '8px', padding: '12px 20px', fontWeight: 600, fontSize: '14px',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                  }}>
                    <HeartHandshake size={15} /> Parent Login
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
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
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, maxWidth: '260px', marginBottom: '16px' }}>
                The all-in-one class management platform connecting academy owners, students, and parents across India.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge badge-success" style={{ fontSize: '10px' }}>
                  <Lock size={10} /> GST Compliant
                </span>
                <span className="badge badge-info" style={{ fontSize: '10px' }}>
                  <Globe size={10} /> 256-bit SSL
                </span>
              </div>
            </div>

            {/* Portals */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Portals</div>
              {[
                { label: 'Owner Dashboard', href: '/login?role=owner' },
                { label: 'Student Portal', href: '/login?role=student' },
                { label: 'Parent Portal', href: '/login?role=parent' },
                { label: 'Start Free Trial', href: '/register' },
              ].map(l => (
                <Link key={l.label} href={l.href} style={{ display: 'block', fontSize: '13px', color: '#64748B', textDecoration: 'none', marginBottom: '10px', transition: 'color 0.15s' }}>
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Academy Types */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Academy Types</div>
              {['Coaching', 'Dance', 'Sports', 'Music'].map(l => (
                <a key={l} href="#features" style={{ display: 'block', fontSize: '13px', color: '#64748B', textDecoration: 'none', marginBottom: '10px' }}>{l}</a>
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
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#94A3B8', width: '100%', textAlign: 'center' }}>
              © 2026 ClassSphere Technologies India Pvt. Ltd. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
