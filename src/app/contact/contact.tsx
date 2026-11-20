'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Mail, Send, User, Phone, Building2, MessageSquare, CheckCircle2, ArrowRight, LogIn, Sparkles, AlertCircle, ChevronDown, Tag, Pencil } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import PublicNav from '@/components/PublicNav';

const CONTACT_EMAIL = 'contact@classsphere.com';
const INDIGO = '#4F46E5';

/** Lines shown in the image's chat bubble — one per real contact topic. */
const BUBBLE_LINES = [
  'Have a general question?',
  'Need a product demo?',
  'Questions about pricing & plans?',
  'Need technical support?',
  'Want to share feedback?',
];

const TOPICS = ['General question', 'Product demo', 'Pricing & plans', 'Technical support', 'Feedback', 'Other'];

const LIMITS = { topicOther: 60, name: 60, email: 254, phone: 10, academy: 100, messageMin: 20, messageMax: 1000 };

// Person names: letters with single spaces, apostrophes, hyphens or dots between parts (e.g. "Mary-Jane", "D'Souza", "R. K.")
const NAME_REGEX = /^[a-zA-Z]+(?:[ '.-][a-zA-Z]*)*$/;
// Email: local part of letters/digits/._%+-, a domain of dot-separated labels and a 2+ letter TLD
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
// Academy names: letters, digits, spaces and common punctuation
const ACADEMY_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9 &'.,()\-/]*$/;

type Field = 'name' | 'email' | 'phone' | 'academy' | 'topic' | 'topicOther' | 'message';
type Form = Record<Field, string>;

const EMPTY: Form = { name: '', email: '', phone: '', academy: '', topic: '', topicOther: '', message: '' };
const FIELD_ORDER: Field[] = ['name', 'email', 'phone', 'academy', 'topic', 'topicOther', 'message'];

function validate(field: Field, raw: string, form?: Form): string {
  const v = raw.trim();
  switch (field) {
    case 'name':
      if (!v) return 'Please enter your name.';
      if (v.length < 2) return 'Name must be at least 2 characters.';
      if (v.length > LIMITS.name) return `Name must be ${LIMITS.name} characters or fewer.`;
      if (/\d/.test(v)) return 'Name cannot contain numbers.';
      if (!NAME_REGEX.test(v)) return 'Use letters only (spaces, apostrophes, hyphens and dots are allowed).';
      return '';
    case 'email':
      if (!v) return 'Please enter your email address.';
      if (/\s/.test(v)) return 'Email address cannot contain spaces.';
      if (v.length > LIMITS.email || v.split('@')[0].length > 64 || /\.\./.test(v) || !EMAIL_REGEX.test(v)) {
        return 'Please enter a valid email address (e.g. you@academy.com).';
      }
      return '';
    case 'phone':
      if (!v) return ''; // optional
      if (!/^\d+$/.test(v)) return 'Only digits are allowed.';
      if (v.length !== 10) return 'Enter a 10-digit mobile number.';
      if (!/^[6-9]/.test(v)) return 'Indian mobile numbers start with 6, 7, 8 or 9.';
      if (/^(\d)\1{9}$/.test(v)) return 'Please enter a real mobile number.';
      return '';
    case 'academy':
      if (!v) return 'Please enter your academy name.';
      if (v.length < 2) return 'Academy name must be at least 2 characters.';
      if (v.length > LIMITS.academy) return `Academy name must be ${LIMITS.academy} characters or fewer.`;
      if (!ACADEMY_REGEX.test(v)) return 'Use letters, numbers, spaces and & \' . , ( ) - / only.';
      return '';
    case 'topic':
      return TOPICS.includes(v) ? '' : 'Please choose what your message is about.';
    case 'topicOther':
      if (form?.topic !== 'Other') return ''; // only required when "Other" is chosen
      if (!v) return 'Please tell us what your message is about.';
      if (v.length < 3) return 'Please use at least 3 characters.';
      if (v.length > LIMITS.topicOther) return `Please keep it to ${LIMITS.topicOther} characters or fewer.`;
      if (!/[a-zA-Z]/.test(v)) return 'Please describe the topic in words.';
      if (!/^[a-zA-Z0-9 &'.,()\-/?]+$/.test(v)) return "Use letters, numbers, spaces and & ' . , ( ) - / ? only.";
      return '';
    case 'message':
      if (!v) return 'Please write your message.';
      if (v.length < LIMITS.messageMin) return `Please write at least ${LIMITS.messageMin} characters so we can help.`;
      if (v.length > LIMITS.messageMax) return `Message must be ${LIMITS.messageMax} characters or fewer.`;
      return '';
  }
}

export default function ContactPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [bubbleIndex, setBubbleIndex] = useState(0);

  // Cycle the chat bubble on the image (skipped for reduced motion)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      setBubbleIndex(i => (i + 1) % BUBBLE_LINES.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);
  const refs = useRef<Partial<Record<Field, HTMLElement | null>>>({});

  const setField = (field: Field, value: string) => {
    let v = value;
    if (field === 'phone') v = v.replace(/\D/g, '').slice(0, LIMITS.phone);
    if (field === 'name') v = v.replace(/\d/g, '');
    const nextForm = { ...form, [field]: v };
    if (field === 'topic' && v !== 'Other') nextForm.topicOther = '';
    setForm(nextForm);
    if (field === 'topic') {
      setTouched(t => ({ ...t, topic: true, topicOther: false }));
      setErrors(e => ({ ...e, topic: validate('topic', v), topicOther: '' }));
      if (v === 'Other') setTimeout(() => refs.current.topicOther?.focus(), 0);
      return;
    }
    if (touched[field]) setErrors(e => ({ ...e, [field]: validate(field, v, nextForm) }));
  };

  const onBlur = (field: Field) => {
    const tidy = field === 'email' ? form.email.trim().toLowerCase() : field === 'message' ? form.message : form[field].trim().replace(/\s+/g, ' ');
    if (tidy !== form[field]) setForm(f => ({ ...f, [field]: tidy }));
    setTouched(t => ({ ...t, [field]: true }));
    setErrors(e => ({ ...e, [field]: validate(field, tidy, { ...form, [field]: tidy }) }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // bots fill hidden fields

    const next: Partial<Record<Field, string>> = {};
    for (const f of FIELD_ORDER) next[f] = validate(f, form[f], form);
    setErrors(next);
    setTouched(Object.fromEntries(FIELD_ORDER.map(f => [f, true])));

    const firstInvalid = FIELD_ORDER.find(f => next[f]);
    if (firstInvalid) {
      refs.current[firstInvalid]?.focus();
      return;
    }

    setSubmitting(true);
    const topic = form.topic === 'Other' ? form.topicOther.trim() : form.topic;
    const body = [
      `Topic: ${topic}`,
      `Name: ${form.name.trim()}`,
      `Email: ${form.email.trim().toLowerCase()}`,
      form.phone ? `Mobile: ${form.phone}` : null,
      `Academy: ${form.academy.trim()}`,
      '',
      form.message.trim(),
    ].filter(line => line !== null).join('\n');
    const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[ClassSphere] ${topic}`)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    setTimeout(() => { setSubmitting(false); setSent(true); }, 400);
  };

  const reset = () => { setForm(EMPTY); setErrors({}); setTouched({}); setSent(false); };

  const errorCount = FIELD_ORDER.filter(f => touched[f] && errors[f]).length;

  const fieldBox = (field: Field): React.CSSProperties => {
    const bad = touched[field] && errors[field];
    const ok = touched[field] && !errors[field] && form[field].trim() !== '';
    return {
      width: '100%', height: '44px', borderRadius: '12px', padding: '0 14px 0 42px', fontSize: '14px', fontFamily: 'inherit',
      border: `1px solid ${bad ? '#EF4444' : ok ? '#A7F3D0' : '#E2E8F0'}`,
      background: bad ? '#FEF2F2' : '#F8FAFC', color: '#0F172A', outline: 'none',
      transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
    };
  };
  const iconLeft: React.CSSProperties = { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' };
  const label = (text: string, field: Field, required: boolean) => (
    <label id={`contact-${field}-label`} htmlFor={`contact-${field}`} style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
      {text} {required ? <span style={{ color: '#EF4444' }}>*</span> : <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span>}
    </label>
  );
  const errorText = (field: Field) => touched[field] && errors[field] ? (
    <p id={`contact-${field}-error`} role="alert" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '12px', fontWeight: 500, margin: '5px 0 0' }}>
      <AlertCircle size={13} /> {errors[field]}
    </p>
  ) : null;
  const aria = (field: Field) => ({
    'aria-invalid': Boolean(touched[field] && errors[field]),
    'aria-describedby': touched[field] && errors[field] ? `contact-${field}-error` : undefined,
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', color: '#0F172A', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{CONTACT_CSS}</style>

      {/* ─── Navbar ─── */}
      <PublicNav links={[
          { label: 'About', href: '/about' },
          { label: 'Features', href: '/#features' },
          { label: 'Pricing', href: '/pricing' },
        ]} />

      <main style={{ flex: 1 }}>
        {/* ─── Header ─── */}
        <section style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F0F9FF 55%, #F8FAFC 100%)', borderBottom: '1px solid #E2E8F0', padding: '48px 24px 96px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '9999px', background: '#E0E7FF', color: '#4338CA', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
            <Sparkles size={13} /> Contact Us
          </div>
          <h1 style={{ fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 12px' }}>
            Let&apos;s talk about <span className="gradient-text">your academy</span>
          </h1>
          <p style={{ fontSize: '16px', color: '#475569', lineHeight: 1.6, margin: '0 auto', maxWidth: '560px' }}>
            Questions, a demo, or help with your account — send us a message and we&apos;ll get back to you.
          </p>
        </section>

        {/* ─── Content ─── */}
        <section style={{ padding: '0 24px 72px', marginTop: '-64px' }}>
          <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', alignItems: 'stretch' }}>

            {/* Left: ways to reach us */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="cs-contact-card" style={{
                flex: 1, minHeight: '270px', borderRadius: '20px', overflow: 'hidden', position: 'relative',
                border: '1px solid #E0E7FF',
                background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #ECFEFF 100%)',
                boxShadow: '0 12px 32px -16px rgba(79, 70, 229, 0.25)',
              }}>
                {/* 3D Isometric Customer Support Hub */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/contact-support-hub.jpg"
                  alt="ClassSphere Customer Support Hub"
                  className="cs-support-hub-img"
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover', objectPosition: 'center center',
                  }}
                />

                {/* Live Support Indicator Badge */}
                <div style={{
                  position: 'absolute', top: '14px', left: '14px',
                  background: 'rgba(255, 255, 255, 0.94)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#4338CA',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  zIndex: 2,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
                  Help Desk · Online
                </div>

                {/* Subtle bottom vignette to ensure chat bubble contrast */}
                <div aria-hidden="true" style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'linear-gradient(to top, rgba(15,23,42,0.7) 0%, rgba(15,23,42,0.05) 50%, transparent 80%)',
                }} />

                {/* Chat bubble cycling through the real contact topics */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '14px', bottom: '14px', right: '14px', display: 'flex' }}>
                  <div key={bubbleIndex} className="cs-ill-chat" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px', maxWidth: '100%',
                    background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)',
                    borderRadius: '14px', padding: '8px 12px', boxShadow: '0 10px 24px -10px rgba(0,0,0,0.3)',
                  }}>
                    <span style={{ width: 24, height: 24, borderRadius: '8px', background: 'linear-gradient(135deg, #4F46E5, #06B6D4)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MessageSquare size={13} />
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E1B4B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {BUBBLE_LINES[bubbleIndex]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="cs-contact-card" style={{ background: 'linear-gradient(135deg, #312E81 0%, #4F46E5 60%, #0891B2 140%)', color: '#FFFFFF', borderRadius: '20px', padding: '24px', boxShadow: '0 24px 48px -24px rgba(49,46,129,0.6)' }}>
                <span style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  <Mail size={20} />
                </span>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', opacity: 0.8, marginBottom: '4px' }}>EMAIL US</div>
                <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: 700, textDecoration: 'none', wordBreak: 'break-all' }}>{CONTACT_EMAIL}</a>
                <p style={{ margin: '10px 0 0', fontSize: '13.5px', lineHeight: 1.55, opacity: 0.9 }}>
                  Prefer your own email app? Write to us directly any time.
                </p>
              </div>

              <Link href="/login" className="cs-contact-card cs-contact-link" style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px 18px', textDecoration: 'none', color: '#0F172A' }}>
                <span style={{ width: 40, height: 40, borderRadius: '11px', background: '#EEF2FF', color: INDIGO, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><LogIn size={18} /></span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: '14.5px' }}>Already using ClassSphere?</span>
                  <span style={{ display: 'block', fontSize: '13px', color: '#64748B' }}>Sign in to your dashboard</span>
                </span>
                <ArrowRight size={16} color={INDIGO} className="cs-contact-arrow" />
              </Link>

              <Link href="/register" className="cs-contact-card cs-contact-link" style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px 18px', textDecoration: 'none', color: '#0F172A' }}>
                <span style={{ width: 40, height: 40, borderRadius: '11px', background: '#EEF2FF', color: INDIGO, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Building2 size={18} /></span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: '14.5px' }}>New academy?</span>
                  <span style={{ display: 'block', fontSize: '13px', color: '#64748B' }}>Create your academy account</span>
                </span>
                <ArrowRight size={16} color={INDIGO} className="cs-contact-arrow" />
              </Link>
            </aside>

            {/* Right: form */}
            <div className="cs-contact-card" style={{ gridColumn: 'span 1', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '20px', padding: 'clamp(20px, 3vw, 30px)', boxShadow: '0 20px 40px -24px rgba(15,23,42,0.18)' }}>
              {sent ? (
                <div style={{ textAlign: 'center', padding: '28px 8px' }}>
                  <div className="cs-contact-pop" style={{ width: 60, height: 60, borderRadius: '50%', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle2 size={30} color="#10B981" />
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Your message is ready to send</h2>
                  <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, margin: '0 auto 22px', maxWidth: '380px' }}>
                    We opened your email app with your message to <strong style={{ color: '#0F172A' }}>{CONTACT_EMAIL}</strong>. Press send there to reach us.
                    If nothing opened, email us directly at that address.
                  </p>
                  <button type="button" onClick={reset} className="btn-secondary" style={{ height: '44px', borderRadius: '12px', padding: '0 20px', fontWeight: 600 }}>
                    Write another message
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} noValidate>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Send us a message</h2>
                  <p style={{ fontSize: '13.5px', color: '#64748B', margin: '0 0 20px' }}>Fields marked <span style={{ color: '#EF4444' }}>*</span> are required.</p>

                  {errorCount > 0 && (
                    <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', fontWeight: 500, marginBottom: '16px' }}>
                      <AlertCircle size={16} /> Please fix {errorCount} {errorCount === 1 ? 'field' : 'fields'} below.
                    </div>
                  )}

                  {/* Honeypot: hidden from people, often filled by bots */}
                  <input type="text" name="company_website" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px 14px' }}>
                    <div>
                      {label('Full name', 'name', true)}
                      <div style={{ position: 'relative' }}>
                        <User size={16} style={iconLeft} />
                        <input id="contact-name" ref={el => { refs.current.name = el; }} className="cs-contact-input" type="text" autoComplete="name" maxLength={LIMITS.name} placeholder="Your full name"
                          value={form.name} onChange={e => setField('name', e.target.value)} onBlur={() => onBlur('name')} style={fieldBox('name')} {...aria('name')} />
                      </div>
                      {errorText('name')}
                    </div>

                    <div>
                      {label('Email address', 'email', true)}
                      <div style={{ position: 'relative' }}>
                        <Mail size={16} style={iconLeft} />
                        <input id="contact-email" ref={el => { refs.current.email = el; }} className="cs-contact-input" type="email" autoComplete="email" inputMode="email" maxLength={LIMITS.email} placeholder="you@academy.com"
                          value={form.email} onChange={e => setField('email', e.target.value)} onBlur={() => onBlur('email')} style={fieldBox('email')} {...aria('email')} />
                      </div>
                      {errorText('email')}
                    </div>

                    <div>
                      {label('Mobile number', 'phone', false)}
                      <div style={{ position: 'relative' }}>
                        <Phone size={16} style={iconLeft} />
                        <input id="contact-phone" ref={el => { refs.current.phone = el; }} className="cs-contact-input" type="tel" autoComplete="tel-national" inputMode="numeric" maxLength={LIMITS.phone} placeholder="9840012345"
                          value={form.phone} onChange={e => setField('phone', e.target.value)} onBlur={() => onBlur('phone')} style={fieldBox('phone')} {...aria('phone')} />
                      </div>
                      {errorText('phone')}
                    </div>

                    <div>
                      {label('Academy name', 'academy', true)}
                      <div style={{ position: 'relative' }}>
                        <Building2 size={16} style={iconLeft} />
                        <input id="contact-academy" ref={el => { refs.current.academy = el; }} className="cs-contact-input" type="text" autoComplete="organization" maxLength={LIMITS.academy} placeholder="e.g. Ravi's Math Academy"
                          value={form.academy} onChange={e => setField('academy', e.target.value)} onBlur={() => onBlur('academy')} style={fieldBox('academy')} {...aria('academy')} />
                      </div>
                      {errorText('academy')}
                    </div>
                  </div>

                  <div style={{ marginTop: '14px' }}>
                    {label('What is this about?', 'topic', true)}
                    <div style={{ position: 'relative' }}>
                      <Tag size={16} style={iconLeft} />
                      <select
                        id="contact-topic"
                        ref={el => { refs.current.topic = el; }}
                        className="cs-contact-input cs-contact-select"
                        value={form.topic}
                        onChange={e => setField('topic', e.target.value)}
                        onBlur={() => onBlur('topic')}
                        style={{ ...fieldBox('topic'), paddingRight: '40px', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', color: form.topic ? '#0F172A' : '#94A3B8' }}
                        {...aria('topic')}
                      >
                        <option value="" disabled>Select a topic</option>
                        {TOPICS.map(t => <option key={t} value={t} style={{ color: '#0F172A' }}>{t}</option>)}
                      </select>
                      <ChevronDown size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
                    </div>
                    {errorText('topic')}

                    {form.topic === 'Other' && (
                      <div className="cs-contact-reveal" style={{ marginTop: '12px' }}>
                        <label id="contact-topicOther-label" htmlFor="contact-topicOther" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                          Please specify <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Pencil size={16} style={iconLeft} />
                          <input
                            id="contact-topicOther"
                            ref={el => { refs.current.topicOther = el; }}
                            className="cs-contact-input"
                            type="text"
                            maxLength={LIMITS.topicOther}
                            placeholder="e.g. Partnership enquiry"
                            value={form.topicOther}
                            onChange={e => setField('topicOther', e.target.value)}
                            onBlur={() => onBlur('topicOther')}
                            style={fieldBox('topicOther')}
                            {...aria('topicOther')}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>{errorText('topicOther')}</div>
                          <span style={{ fontSize: '12px', marginTop: '5px', color: '#94A3B8', whiteSpace: 'nowrap' }}>{form.topicOther.length}/{LIMITS.topicOther}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '14px' }}>
                    {label('Message', 'message', true)}
                    <div style={{ position: 'relative' }}>
                      <MessageSquare size={16} style={{ ...iconLeft, top: '14px', transform: 'none' }} />
                      <textarea id="contact-message" ref={el => { refs.current.message = el; }} className="cs-contact-input" rows={5} maxLength={LIMITS.messageMax} placeholder="Tell us how we can help…"
                        value={form.message} onChange={e => setField('message', e.target.value)} onBlur={() => onBlur('message')}
                        style={{ ...fieldBox('message'), height: 'auto', minHeight: '128px', padding: '12px 14px 12px 42px', resize: 'vertical', lineHeight: 1.55 }} {...aria('message')} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>{errorText('message')}</div>
                      <span style={{ fontSize: '12px', marginTop: '5px', whiteSpace: 'nowrap', color: form.message.trim().length >= LIMITS.messageMin ? '#64748B' : '#94A3B8' }}>
                        {form.message.trim().length}/{LIMITS.messageMax}
                      </span>
                    </div>
                  </div>

                  <button type="submit" disabled={submitting} className="btn-primary" style={{ width: '100%', marginTop: '20px', height: '48px', borderRadius: '12px', justifyContent: 'center', fontSize: '15px', fontWeight: 700, boxShadow: '0 10px 22px -10px rgba(79,70,229,0.55)' }}>
                    {submitting ? 'Opening your email app…' : <>Send Message <Send size={16} /></>}
                  </button>
                  <p style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', margin: '10px 0 0' }}>
                    Sending opens your email app with this message addressed to {CONTACT_EMAIL}.
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/** Focus, hover and entrance styles (kept with the page so they never depend on a stale stylesheet). */
const CONTACT_CSS = `
@keyframes csContactIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes csContactPop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
.cs-contact-card { animation: csContactIn 0.5s ease backwards; }
aside .cs-contact-card:nth-child(2) { animation-delay: 80ms; }
aside .cs-contact-card:nth-child(3) { animation-delay: 160ms; }
aside .cs-contact-card:nth-child(4) { animation-delay: 240ms; }
.cs-contact-input:focus { border-color: #4F46E5 !important; background: #FFFFFF !important; box-shadow: 0 0 0 3px rgba(79,70,229,0.15); }
.cs-contact-input[aria-invalid="true"]:focus { border-color: #EF4444 !important; box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
@keyframes csContactReveal { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
.cs-contact-reveal { animation: csContactReveal 0.25s ease; }
.cs-contact-link:focus-visible { outline: 2px solid #4F46E5; outline-offset: 2px; }
.cs-contact-link { transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; }
.cs-contact-link:hover { transform: translateY(-2px); border-color: #C7D2FE !important; box-shadow: 0 14px 28px -16px rgba(79,70,229,0.4); }
.cs-contact-arrow { transition: transform 0.2s ease; }
.cs-contact-link:hover .cs-contact-arrow { transform: translateX(3px); }
.cs-contact-pop { animation: csContactPop 0.5s ease; }
@keyframes csIllChat { 0% { opacity: 0; transform: translateY(10px) scale(0.96); } 12%, 88% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-6px) scale(0.98); } }
.cs-ill-chat { animation: csIllChat 2.8s ease-in-out both; }
@keyframes csPhPhoto { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
.cs-ph-photo { animation: csPhPhoto 12s ease-in-out infinite; transform-origin: 62% 35%; }
@media (prefers-reduced-motion: reduce) {
  .cs-ph-photo { animation: none !important; }
  .cs-ill-chat { animation: none !important; }
  .cs-contact-card, .cs-contact-pop, .cs-contact-reveal { animation: none !important; }
  .cs-contact-link, .cs-contact-arrow { transition: none !important; }
  .cs-contact-link:hover { transform: none; }
}
`;
