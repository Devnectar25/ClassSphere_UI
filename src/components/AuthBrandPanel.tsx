import Link from 'next/link';
import { Shield, Check, Users } from 'lucide-react';

const BRAND_POINTS = [
    'Batches, attendance and fees in one place',
    'Free Student & Parent portals included',
    'GST invoices and PDF receipts in a tap',
];

/** Left brand panel shared by the sign-in and registration pages (styles: .reg-aside* in globals.css). */
export default function AuthBrandPanel() {
    return (
        <aside className="reg-aside">
            <Link href="/" aria-label="ClassSphere home" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', alignSelf: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #4F46E5, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(79,70,229,0.32)' }}>
                    <Shield size={24} color="white" />
                </div>
                <span style={{ fontWeight: 800, fontSize: '28px', color: '#0F172A', letterSpacing: '-0.01em' }}>
                    Class<span className="gradient-text">Sphere</span>
                </span>
            </Link>

            <div style={{ marginTop: 'clamp(32px, 7vh, 64px)', marginBottom: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.16em', color: '#4338CA', marginBottom: 'clamp(14px, 2.6vh, 22px)' }}>
                    <span style={{ width: 28, height: 2, background: '#4F46E5', borderRadius: 2 }} />
                    THE ACADEMY OPERATING SYSTEM
                </div>
                <h2 className="reg-aside-title" style={{ fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.03em', color: '#0F172A' }}>
                    Run your academy
                    <br />
                    <span className="gradient-text">without the paperwork.</span>
                </h2>
                <p className="reg-aside-intro" style={{ color: '#64748B', lineHeight: 1.6 }}>
                    A calm, connected workspace for coaching, music, dance and sports academies, and the families they serve.
                </p>
                <div style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.95)', borderRadius: '18px', padding: '6px 24px', boxShadow: '0 10px 28px -14px rgba(79,70,229,0.28)', maxWidth: '420px' }}>
                    {BRAND_POINTS.map((pt, i) => (
                        <div key={pt} className="reg-aside-point" style={{ display: 'flex', alignItems: 'center', gap: '14px', borderTop: i ? '1px solid #EEF2FF' : 'none', fontSize: '15px', fontWeight: 500, color: '#0F172A' }}>
                            <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#E0E7FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Check size={13} strokeWidth={3} />
                            </span>
                            {pt}
                        </div>
                    ))}
                </div>            </div>

            <div className="reg-aside-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid rgba(79,70,229,0.12)', paddingTop: '18px', marginTop: '24px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                    <Users size={16} color="#4F46E5" /> One login for everyone
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {['Owners', 'Students', 'Parents'].map(c => (
                        <span key={c} style={{ fontSize: '12px', fontWeight: 700, color: '#4338CA', background: '#FFFFFF', border: '1px solid #E0E7FF', borderRadius: '9999px', padding: '5px 12px' }}>{c}</span>
                    ))}
                </div>
            </div>
        </aside>
    );
}
