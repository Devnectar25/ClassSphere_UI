'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Shield, ArrowRight, Building2, HeartHandshake, Users, BookOpen, CalendarDays,
  ClipboardCheck, FileText, Wallet, Receipt, Megaphone, BarChart3, Trophy, UserCog,
  Sparkles, CheckCircle2, Check,
} from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import PublicNav from '@/components/PublicNav';

const INDIGO = '#4F46E5';

/** Academy types that ClassSphere offers at sign-up, with the matching photos in /public. */
const CATEGORIES = [
  { word: 'academic', title: 'Academic', image: '/categories-strip/academic.jpg' },
  { word: 'dance', title: 'Dance', image: '/categories-strip/dance.jpg' },
  { word: 'martial arts', title: 'Karate', image: '/categories-strip/karate.jpg' },
  { word: 'music', title: 'Music', image: '/categories-strip/music.jpg' },
  { word: 'sports', title: 'Sports', image: '/categories-strip/sports.jpg' },
  { word: 'creative', title: 'Creative', image: '/categories-strip/creative.jpg' },
];

type Role = 'people' | 'classes' | 'finance';

/** Owner-dashboard modules that exist in the app, grouped by area. */
const MODULES: Record<Role, { label: string; icon: React.ElementType; intro: string; items: Array<{ icon: React.ElementType; title: string; desc: string }> }> = {
  people: {
    label: 'People',
    icon: Users,
    intro: 'Everyone in your academy, organised in one place.',
    items: [
      { icon: Users, title: 'Students', desc: 'Admissions and student records.' },
      { icon: HeartHandshake, title: 'Guardians', desc: 'Family contacts for every student.' },
      { icon: UserCog, title: 'Staff', desc: 'Your team and their roles.' },
      { icon: Building2, title: 'Branches', desc: 'Run more than one location.' },
    ],
  },
  classes: {
    label: 'Classes',
    icon: BookOpen,
    intro: 'Plan, run and track every class.',
    items: [
      { icon: BookOpen, title: 'Courses', desc: 'The courses your academy offers.' },
      { icon: CalendarDays, title: 'Batches', desc: 'Batches with weekly schedules.' },
      { icon: ClipboardCheck, title: 'Attendance', desc: 'Mark and review attendance by batch.' },
      { icon: FileText, title: 'Tests', desc: 'Create tests and record results.' },
      { icon: Trophy, title: 'Achievements', desc: 'Recognise student milestones.' },
    ],
  },
  finance: {
    label: 'Fees & Reports',
    icon: Wallet,
    intro: 'Keep fees, notices and numbers in order.',
    items: [
      { icon: Wallet, title: 'Fees', desc: 'Fee plans for your courses.' },
      { icon: Receipt, title: 'Invoices & Payments', desc: 'Invoices and payment records.' },
      { icon: Megaphone, title: 'Notices', desc: 'Announcements for your academy.' },
      { icon: BarChart3, title: 'Reports', desc: 'An overview of how the academy is doing.' },
    ],
  },
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** CTA hub: the three areas of the owner dashboard and real modules in each. Positions are % of the diagram box. */
const HUB_NODES = [
  { icon: Users, title: 'People', items: ['Students', 'Staff'], x: '22%', y: '18%' },
  { icon: BookOpen, title: 'Classes', items: ['Batches', 'Tests'], x: '78%', y: '18%' },
  { icon: Wallet, title: 'Fees', items: ['Invoices', 'Payments'], x: '50%', y: '86%' },
];

const HUB_KEYFRAMES = `
@keyframes csHubDash { to { stroke-dashoffset: -44; } }
@media (max-width: 560px) { .cs-hub { transform: scale(0.82); transform-origin: center; height: 250px !important; } }
@media (max-width: 380px) { .cs-hub { transform: scale(0.72); } }
@keyframes csHubFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes csHubPulse {
  0%   { box-shadow: 0 16px 36px -12px rgba(15,23,42,0.5), 0 0 0 0 rgba(255,255,255,0.5); }
  100% { box-shadow: 0 16px 36px -12px rgba(15,23,42,0.5), 0 0 0 22px rgba(255,255,255,0); }
}
@keyframes csHubSpinGlow { 0%, 100% { filter: hue-rotate(0deg); } 50% { filter: hue-rotate(-25deg); } }
@keyframes csHubPacket {
  0%   { left: 50%; top: 50%; opacity: 0; transform: scale(0.4); }
  15%  { opacity: 1; transform: scale(1); }
  85%  { opacity: 1; transform: scale(1); }
  100% { left: var(--tx); top: var(--ty); opacity: 0; transform: scale(0.6); }
}
`;

/** Hover effects for the "Made for every kind of academy" cards. */
const PHOTO_CARD_CSS = `
.cs-photo-img { transition: transform 0.5s ease; }
.cs-photo-label { transition: transform 0.3s ease; }
.cs-photo-card:hover { transform: translateY(-6px) !important; box-shadow: 0 22px 40px -18px rgba(79,70,229,0.5) !important; }
.cs-photo-card:hover .cs-photo-img { transform: scale(1.06); }
.cs-photo-card:hover .cs-photo-label { transform: translateY(-3px); }
@media (prefers-reduced-motion: reduce) {
  .cs-photo-img, .cs-photo-label { transition: none !important; }
  .cs-photo-card:hover, .cs-photo-card:hover .cs-photo-img, .cs-photo-card:hover .cs-photo-label { transform: none !important; }
}
`;

export default function AboutUsPage() {
  const reduced = usePrefersReducedMotion();
  const [slide, setSlide] = useState(0);
  const [role, setRole] = useState<Role>('people');
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState(0);
  const [stepHover, setStepHover] = useState<number | null>(null);
  const [hubActive, setHubActive] = useState(0);
  const photoStripRef = useRef<HTMLDivElement>(null);
  const [photosVisible, setPhotosVisible] = useState(false);
  const [photosSettled, setPhotosSettled] = useState(false);

  useEffect(() => {
    const el = photoStripRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setPhotosVisible(true);
        obs.disconnect();
        // After the staggered entrance, drop the delays so hover feels instant
        setTimeout(() => setPhotosSettled(true), 1200);
      }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // CTA hub: send a "packet" from ClassSphere to each area in turn
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setHubActive(i => (i + 1) % 3), 2000);
    return () => clearInterval(id);
  }, [reduced]);

  // Getting-started cards: walk through the three steps in a loop (paused while hovering)
  useEffect(() => {
    if (reduced || stepHover !== null) return;
    const id = setInterval(() => setStep(i => (i + 1) % 3), 2400);
    return () => clearInterval(id);
  }, [reduced, stepHover]);

  // Hero: cycle the headline word and the photo together
  useEffect(() => {
    if (reduced || paused) return;
    const id = setInterval(() => setSlide(i => (i + 1) % CATEGORIES.length), 2600);
    return () => clearInterval(id);
  }, [reduced, paused]);

  const active = MODULES[role];
  // Up to 4 cards fit in one row; more are split over two balanced rows
  const cols = active.items.length <= 4 ? active.items.length : Math.ceil(active.items.length / 2);


  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', color: '#0F172A', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ─── Navbar ─── */}
      <PublicNav links={[
          { label: 'Categories', href: '/#categories' },
          { label: 'Features', href: '/#features' },
          { label: 'Pricing', href: '/pricing' },
        ]} />

      <main style={{ flex: 1 }}>

        {/* ─── Hero: rotating word + matching photo ─── */}
        <section style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, #EEF2FF 0%, #F0F9FF 55%, #F8FAFC 100%)',
          borderBottom: '1px solid #E2E8F0', padding: '33px 24px',
        }}>
          <div className="about-orb" style={{ position: 'absolute', top: '-140px', left: '4%', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: '1140px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '44px', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '9999px', background: '#E0E7FF', color: '#4338CA', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '18px' }}>
                <Sparkles size={13} /> About ClassSphere
              </div>
              <h1 style={{ fontSize: 'clamp(32px, 4.4vw, 50px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.12, margin: '0 0 16px' }}>
                One platform for
                <br />
                <span key={slide} className="gradient-text about-word" aria-live="polite">{CATEGORIES[slide].word}</span> academies.
              </h1>
              <p style={{ fontSize: '17px', color: '#475569', lineHeight: 1.6, margin: '0 0 26px', maxWidth: '520px' }}>
                ClassSphere gives academy owners one dashboard for students, classes and fees.
              </p>
              {/* Getting started — the real setup flow (owner sign-up → courses & batches → students & staff) */}
              <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', maxWidth: '500px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                {[
                  { title: 'Register your academy', desc: 'Sign up and verify your mobile with OTP' },
                  { title: 'Set up courses & batches', desc: 'Add courses, batches and weekly schedules' },
                  { title: 'Add students & staff', desc: 'Enrol students and add your team' },
                ].map((item, i) => {
                  const current = stepHover ?? step;
                  const isActive = i === current;
                  const isDone = !reduced && i < current;
                  return (
                    <li
                      key={item.title}
                      className={`about-step${isActive ? ' is-active' : ''}`}
                      onMouseEnter={() => setStepHover(i)}
                      onMouseLeave={() => setStepHover(null)}
                      style={{
                        position: 'relative', overflow: 'hidden',
                        background: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)',
                        border: `1px solid ${isActive ? '#A5B4FC' : '#E2E8F0'}`, borderRadius: '14px', padding: '12px 14px 14px',
                        boxShadow: isActive ? '0 16px 30px -16px rgba(79,70,229,0.45)' : '0 4px 12px -3px rgba(15, 23, 42, 0.06)',
                        transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                        transition: reduced ? 'none' : 'transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease, background 0.35s ease',
                        animationDelay: `${i * 120}ms`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span className={isActive && !reduced ? 'about-step-badge is-pulsing' : 'about-step-badge'} style={{
                          position: 'relative', width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          background: isActive || isDone ? 'linear-gradient(135deg, #4F46E5, #06B6D4)' : '#E0E7FF',
                          color: isActive || isDone ? '#FFFFFF' : '#4F46E5',
                          fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: isActive ? '0 4px 10px -4px rgba(79,70,229,0.6)' : 'none',
                          transition: 'background 0.35s ease, color 0.35s ease',
                        }}>
                          {isDone ? <Check size={14} strokeWidth={3} /> : i + 1}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: isActive ? '#4F46E5' : '#94A3B8', transition: 'color 0.35s ease' }}>STEP {i + 1}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A', lineHeight: 1.3, marginBottom: '3px' }}>{item.title}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.4 }}>{item.desc}</div>

                      {/* Progress bar that fills while this step is active */}
                      <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '3px', background: '#EEF2FF' }}>
                        {isActive && (
                          <span
                            key={`${current}-${stepHover === null ? 'auto' : 'hover'}`}
                            className={stepHover === null && !reduced ? 'about-step-progress' : undefined}
                            style={{ display: 'block', height: '100%', width: stepHover === null && !reduced ? undefined : '100%', background: 'linear-gradient(90deg, #4F46E5, #06B6D4)' }}
                          />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {/* Core Value Pillars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '480px' }}>
                {[
                  'Courses and batches with weekly class schedules',
                  'Attendance, tests and results for every batch',
                  'Fee plans, invoices and payment records',
                ].map((point) => (
                  <div key={point} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                    <div style={{
                      width: 17, height: 17, borderRadius: '50%', background: '#EEF2FF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5', flexShrink: 0
                    }}>
                      <CheckCircle2 size={11} strokeWidth={2.8} />
                    </div>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Photo carousel */}
            <div
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              style={{
                position: 'relative', aspectRatio: '6 / 5', width: '100%', borderRadius: '22px', overflow: 'hidden',
                boxShadow: '0 28px 56px -24px rgba(79,70,229,0.45)',
                background: 'radial-gradient(rgba(79,70,229,0.10) 1px, transparent 1px) 0 0 / 20px 20px, linear-gradient(135deg, #E0E7FF 0%, #EEF2FF 50%, #E0F2FE 100%)',
              }}
            >
              {/* Coverflow: the current picture is shown in full (card and picture share the 3:4 shape);
                  the previous and next pictures peek out at the sides and can be clicked */}
              {CATEGORIES.map((c, i) => {
                const n = CATEGORIES.length;
                const d = (i - slide + n) % n;
                const pos = d === 0 ? 0 : d === 1 ? 1 : d === n - 1 ? -1 : null;
                const isCenter = pos === 0;
                return (
                  <button
                    key={c.title}
                    type="button"
                    tabIndex={pos === null || isCenter ? -1 : 0}
                    aria-hidden={!isCenter && pos === null}
                    aria-label={isCenter ? `${c.title} academy` : `Show ${c.title}`}
                    onClick={() => { if (pos !== null && !isCenter) setSlide(i); }}
                    style={{
                      position: 'absolute', left: '50%', top: '5%', height: '78%', aspectRatio: '3 / 4',
                      padding: 0, border: 'none', borderRadius: '18px', overflow: 'hidden', background: '#EEF0FB',
                      cursor: pos !== null && !isCenter ? 'pointer' : 'default',
                      transform: pos === null
                        ? 'translateX(-50%) scale(0.6)'
                        : `translateX(calc(-50% + ${pos * 74}%)) scale(${isCenter ? 1 : 0.78})`,
                      opacity: pos === null ? 0 : isCenter ? 1 : 0.55,
                      zIndex: isCenter ? 3 : pos === null ? 1 : 2,
                      boxShadow: isCenter ? '0 22px 40px -18px rgba(49,46,129,0.55)' : '0 10px 20px -14px rgba(49,46,129,0.4)',
                      transition: reduced ? 'none' : 'transform 0.7s cubic-bezier(.2,.8,.2,1), opacity 0.7s ease, box-shadow 0.7s ease',
                      pointerEvents: pos === null ? 'none' : 'auto',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                );
              })}
              <div style={{ position: 'absolute', left: '18px', bottom: '16px', right: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: '#1E1B4B', fontWeight: 700, fontSize: '15px', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(6px)', padding: '6px 14px', borderRadius: '9999px', boxShadow: '0 4px 12px -4px rgba(15,23,42,0.25)' }}>{CATEGORIES[slide].title}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {CATEGORIES.map((c, i) => (
                    <button
                      key={c.title}
                      aria-label={`Show ${c.title}`}
                      aria-current={i === slide}
                      onClick={() => setSlide(i)}
                      style={{ width: i === slide ? 22 : 8, height: 8, borderRadius: 8, border: 'none', padding: 0, cursor: 'pointer', background: i === slide ? INDIGO : 'rgba(79,70,229,0.3)', transition: 'all 0.3s' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── What it does: by role ─── */}
        <section id="what-we-do" style={{ scrollMarginTop: '90px', padding: '64px 24px' }}>
          <div style={{ maxWidth: '980px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '26px' }}>
              <h2 style={{ fontSize: 'clamp(24px, 2.8vw, 32px)', fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 8px' }}>What ClassSphere does</h2>
              <p style={{ fontSize: '15px', color: '#64748B', margin: 0 }}>Pick a role to see what they get.</p>
            </div>

            <div role="tablist" aria-label="Choose a role" style={{ display: 'flex', justifyContent: 'center', gap: '6px', background: '#EEF2FF', padding: '5px', borderRadius: '14px', width: 'fit-content', maxWidth: '100%', margin: '0 auto 28px', flexWrap: 'wrap' }}>
              {(Object.keys(MODULES) as Role[]).map(r => {
                const m = MODULES[r];
                const isActive = role === r;
                return (
                  <button
                    key={r}
                    role="tab"
                    id={`about-role-${r}`}
                    aria-selected={isActive}
                    aria-controls="about-role-panel"
                    onClick={() => setRole(r)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '7px', height: '40px', padding: '0 18px',
                      borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                      background: isActive ? '#FFFFFF' : 'transparent', color: isActive ? INDIGO : '#64748B',
                      boxShadow: isActive ? '0 2px 8px -2px rgba(79,70,229,0.3)' : 'none', transition: 'all 0.2s',
                    }}
                  >
                    <m.icon size={16} /> {m.label}
                  </button>
                );
              })}
            </div>

            <div key={role} id="about-role-panel" role="tabpanel" aria-labelledby={`about-role-${role}`} className="about-panel">
              <p style={{ textAlign: 'center', fontSize: '15px', fontWeight: 600, color: '#334155', margin: '0 0 18px' }}>{active.intro}</p>
              {/* Flex-wrap with a fixed number of columns per tab: 4 cards → one row, 5 → 3 + 2 (centred) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '14px' }}>
                {active.items.map((item, i) => (
                  <div
                    key={item.title}
                    className="about-card about-stagger"
                    style={{
                      flex: `0 1 calc((100% - ${(cols - 1) * 14}px) / ${cols})`, minWidth: '210px',
                      background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '18px',
                      display: 'flex', gap: '14px', alignItems: 'flex-start', animationDelay: `${i * 50}ms`,
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: '11px', background: 'linear-gradient(135deg, #4F46E5, #06B6D4)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 14px -6px rgba(79,70,229,0.5)' }}>
                      <item.icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14.5px', marginBottom: '3px' }}>{item.title}</div>
                      <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Photo strip: academy types ─── */}
        <section style={{ padding: '0 24px 64px' }}>
          <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: 'clamp(22px, 2.4vw, 28px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 22px' }}>
              Made for every kind of academy
            </h2>
            {/* Hover styles live here so they don't depend on a stale stylesheet */}
            <style>{PHOTO_CARD_CSS}</style>
            <div ref={photoStripRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
              {CATEGORIES.map((c, i) => {
                const shown = photosVisible || reduced;
                return (
                  <div
                    key={c.title}
                    className="cs-photo-card"
                    style={{
                      position: 'relative', aspectRatio: '3 / 4', borderRadius: '16px', overflow: 'hidden',
                      boxShadow: '0 10px 24px -16px rgba(15,23,42,0.4)',
                      opacity: shown ? 1 : 0,
                      transform: shown ? 'translateY(0)' : 'translateY(24px)',
                      transition: reduced ? 'none' : photosSettled
                        ? 'transform 0.3s ease, box-shadow 0.3s ease'
                        : `opacity 0.6s ease ${i * 90}ms, transform 0.6s cubic-bezier(.2,.8,.2,1) ${i * 90}ms, box-shadow 0.3s ease`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.image} alt={`${c.title} academy`} className="cs-photo-img" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.65), transparent 55%)' }} />
                    <span className="cs-photo-label" style={{ position: 'absolute', left: '16px', bottom: '14px', color: '#FFFFFF', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.01em', textShadow: '0 2px 10px rgba(15,23,42,0.45)' }}>{c.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── CTA: one connected platform ─── */}
        <section style={{ padding: '0 24px 64px' }}>
          <div style={{
            maxWidth: '1100px', margin: '0 auto', borderRadius: '24px', padding: 'clamp(26px, 4vw, 44px)',
            background: 'linear-gradient(135deg, #312E81 0%, #4F46E5 55%, #0891B2 130%)', color: '#FFFFFF',
            position: 'relative', overflow: 'hidden', boxShadow: '0 28px 56px -28px rgba(49,46,129,0.6)',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'center', gap: '32px',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px) 0 0 / 22px 22px', pointerEvents: 'none' }} />

            {/* Left: message + actions */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
                <Sparkles size={13} /> One connected platform
              </div>
              <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15, margin: '0 0 10px' }}>
                Ready to set up your academy?
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: '15.5px', lineHeight: 1.6, opacity: 0.9, maxWidth: '440px' }}>
                Run admissions, batches, attendance and fees from a single dashboard built for academy owners.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '48px', padding: '0 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: '#FFFFFF', color: '#3730A3', fontSize: '15px', fontWeight: 700, boxShadow: '0 10px 24px -10px rgba(0,0,0,0.35)' }}>
                    Start Free Trial <ArrowRight size={16} />
                  </button>
                </Link>
                <Link href="/login" style={{ textDecoration: 'none' }}>
                  <button style={{ height: '48px', padding: '0 22px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)', cursor: 'pointer', background: 'transparent', color: '#FFFFFF', fontSize: '15px', fontWeight: 600 }}>
                    Sign In
                  </button>
                </Link>
              </div>
            </div>

            {/* Right: hub diagram — the three areas of the owner dashboard */}
            <div role="img" aria-label="ClassSphere brings people, classes and fees together in one dashboard" className="cs-hub" style={{ position: 'relative', height: '280px', minWidth: 0 }}>
              {/* Keyframes live here (not only in globals.css) so the animation never depends on a stale stylesheet */}
              <style>{HUB_KEYFRAMES}</style>

              <svg aria-hidden="true" width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                {HUB_NODES.map((n, i) => (
                  <line
                    key={n.title} x1="50%" y1="50%" x2={n.x} y2={n.y}
                    stroke={i === hubActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)'}
                    strokeWidth={i === hubActive ? 2.5 : 2} strokeDasharray="4 7" strokeLinecap="round"
                    style={{ animation: reduced ? 'none' : 'csHubDash 1.4s linear infinite', transition: 'stroke 0.4s ease, stroke-width 0.4s ease' }}
                  />
                ))}
              </svg>

              {/* Data packet travelling from the hub to the active area */}
              {!reduced && (
                <span
                  key={hubActive}
                  aria-hidden="true"
                  style={{
                    position: 'absolute', width: 10, height: 10, marginLeft: -5, marginTop: -5, borderRadius: '50%',
                    background: '#FFFFFF', boxShadow: '0 0 0 4px rgba(255,255,255,0.25), 0 0 16px 4px rgba(165,243,252,0.9)',
                    zIndex: 2, left: '50%', top: '50%',
                    ['--tx' as string]: HUB_NODES[hubActive].x, ['--ty' as string]: HUB_NODES[hubActive].y,
                    animation: 'csHubPacket 1.1s cubic-bezier(.45,.05,.35,1) forwards',
                  } as React.CSSProperties}
                />
              )}

              {/* Centre: ClassSphere hub */}
              <div style={{
                position: 'absolute', left: '50%', top: '50%', marginLeft: '-36px', marginTop: '-36px',
                width: 72, height: 72, borderRadius: '20px', background: '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3,
                boxShadow: '0 16px 36px -12px rgba(15,23,42,0.5)',
                animation: reduced ? 'none' : 'csHubPulse 2s ease-out infinite',
              }}>
                <span style={{
                  width: 48, height: 48, borderRadius: '13px', background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: reduced ? 'none' : 'csHubSpinGlow 6s linear infinite',
                }}>
                  <Shield size={24} color="#FFFFFF" />
                </span>
              </div>

              {/* Area nodes (real modules in each area) */}
              {HUB_NODES.map((n, i) => {
                const isActive = i === hubActive;
                return (
                  <div key={n.title} style={{ position: 'absolute', left: n.x, top: n.y, transform: 'translate(-50%, -50%)', zIndex: 4 }}>
                    <div style={{ animation: reduced ? 'none' : `csHubFloat 3.6s ease-in-out ${i * 1.2}s infinite` }}>
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: '5px',
                        background: '#FFFFFF', color: '#0F172A', borderRadius: '12px', padding: '7px 9px', whiteSpace: 'nowrap',
                        transform: isActive && !reduced ? 'scale(1.06)' : 'scale(1)',
                        boxShadow: isActive && !reduced
                          ? '0 0 0 3px rgba(255,255,255,0.55), 0 18px 36px -14px rgba(15,23,42,0.6)'
                          : '0 14px 30px -14px rgba(15,23,42,0.55)',
                        transition: 'transform 0.45s cubic-bezier(.2,.8,.2,1), box-shadow 0.45s ease',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: 22, height: 22, borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isActive ? 'linear-gradient(135deg, #4F46E5, #06B6D4)' : '#EEF2FF',
                            color: isActive ? '#FFFFFF' : '#4F46E5', transition: 'background 0.4s ease, color 0.4s ease',
                          }}>
                            <n.icon size={12} />
                          </span>
                          <span style={{ fontSize: '12.5px', fontWeight: 700 }}>{n.title}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {n.items.map((it, k) => (
                            <span key={it} style={{
                              fontSize: '10.5px', fontWeight: 600, borderRadius: '9999px', padding: '1px 7px',
                              color: isActive ? '#FFFFFF' : '#4338CA', background: isActive ? '#4F46E5' : '#EEF2FF',
                              transition: `background 0.3s ease ${isActive ? 0.9 + k * 0.12 : 0}s, color 0.3s ease ${isActive ? 0.9 + k * 0.12 : 0}s`,
                            }}>{it}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <SiteFooter />
    </div>
  );
}
