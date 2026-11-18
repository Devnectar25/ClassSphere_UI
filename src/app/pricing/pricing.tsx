'use client';
import Link from 'next/link';
import { Shield, CheckCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import { useApi, formatMoney, type Plan } from '@/lib/api';

export default function PricingPage() {
  const { data: plans } = useApi<Plan[]>('/plans');

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', color: '#0F172A', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ─── Navbar ─── */}
      <nav className="glass-strong" style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid #E2E8F0',
        padding: '0 40px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: '100%',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
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
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', fontSize: '14px' }}>
          {[
            { label: 'Categories', href: '/#categories' },
            { label: 'Portals', href: '/#portals' },
            { label: 'Features', href: '/#features' },
            { label: 'How It Works', href: '/#how-it-works' },
          ].map(item => (
            <Link key={item.label} href={item.href} style={{ color: '#475569', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}>
              {item.label}
            </Link>
          ))}
          <Link href="/pricing" style={{ color: '#4F46E5', textDecoration: 'none', fontWeight: 600 }}>
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

      {/* ─── Pricing Section ─── */}
      <main style={{ flex: 1, padding: '48px 32px 64px', maxWidth: '1120px', width: '100%', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#4F46E5', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <div className="section-eyebrow">PRICING FOR ACADEMIES</div>
          <h1 style={{ fontSize: 'clamp(28px, 3.6vw, 40px)', fontWeight: 700, marginBottom: '12px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Simple, transparent pricing
          </h1>
          <p style={{ fontSize: '15px', color: '#64748B', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
            Students and parents get free access with every plan. Academies receive a 14-day free trial with no hidden charges.
          </p>
        </div>

        {!plans ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '20px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="cs-card" style={{ padding: '32px 28px', height: '420px', background: '#FFFFFF' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '24px' }}>
            {plans.map(p => (
              <div
                key={p.planTier}
                className="cs-card"
                style={{
                  padding: '32px 28px',
                  border: p.isPopular ? '2px solid rgba(79,70,229,0.45)' : '1px solid #E2E8F0',
                  background: p.isPopular ? 'linear-gradient(to bottom, rgba(79,70,229,0.03), #FFFFFF)' : '#FFFFFF',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  {p.isPopular && (
                    <div style={{
                      position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                      background: '#4F46E5',
                      color: 'white', fontSize: '11px', fontWeight: 700, padding: '4px 14px',
                      borderRadius: '9999px', letterSpacing: '0.02em', whiteSpace: 'nowrap',
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
                </div>
                <Link href="/register" style={{ textDecoration: 'none', display: 'block' }}>
                  <button className={p.isPopular ? 'btn-primary' : 'btn-secondary'} style={{ width: '100%', justifyContent: 'center', fontSize: '14px', padding: '12px', height: '44px' }}>
                    Start Free Trial <ChevronRight size={16} />
                  </button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

