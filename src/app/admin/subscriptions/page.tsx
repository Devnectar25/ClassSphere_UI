'use client';

import { Check } from 'lucide-react';
import { useApi, formatMoney, type Plan } from '@/lib/api';

export default function PlatformAdminSubscriptionsPage() {
    const { data: plans, error } = useApi<Plan[]>('/plans');

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="pb-4 border-b border-slate-800">
                <h1 className="text-2xl font-bold font-serif text-white">SaaS Subscription Plans &amp; Tiers</h1>
                <p className="text-xs text-slate-400 mt-1">
                    Platform tier quotas, pricing structures, and feature entitlements.
                </p>
            </div>

            {!plans && <p className="text-xs text-slate-400">{error ? `Unable to load plans: ${error}` : 'Loading plans…'}</p>}

            {/* Pricing Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans?.map((tier) => (
                    <div
                        key={tier.planTier}
                        className={`p-6 rounded-2xl flex flex-col justify-between border transition-all ${
                            tier.isPopular
                                ? 'bg-indigo-950/40 border-indigo-500 shadow-xl shadow-indigo-500/10'
                                : 'bg-slate-800/60 border-slate-700/80'
                        }`}
                    >
                        <div>
                            {tier.isPopular && (
                                <span className="inline-block px-3 py-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider mb-3">
                                    Most Popular
                                </span>
                            )}
                            <h3 className="text-lg font-bold text-white font-serif">{tier.planTier}</h3>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{tier.description}</p>

                            <div className="my-5 flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-white font-mono">{formatMoney(tier.priceMonthly, tier.currency)}</span>
                                <span className="text-xs text-slate-400">/per month</span>
                            </div>

                            <ul className="space-y-2.5 text-xs text-slate-300 border-t border-slate-700/60 pt-4">
                                {tier.features.map((feat) => (
                                    <li key={feat} className="flex items-center gap-2">
                                        <Check size={14} className="text-emerald-400 shrink-0" />
                                        <span>{feat}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="pt-6 mt-6 border-t border-slate-700/60 flex justify-between text-xs text-slate-400">
                            <span>Seat quota: <strong className="text-white">{tier.maxSeats}</strong></span>
                            <span>Branch quota: <strong className="text-white">{tier.maxBranches}</strong></span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
