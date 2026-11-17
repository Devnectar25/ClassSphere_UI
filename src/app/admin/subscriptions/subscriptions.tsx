'use client';

import { Check } from 'lucide-react';
import { useApi, formatMoney, type Plan } from '@/lib/api';

export default function PlatformAdminSubscriptionsPage() {
    const { data: plans, error } = useApi<Plan[]>('/plans');

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="pb-5 border-b border-slate-200">
                <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">SaaS Subscription Plans &amp; Tiers</h1>
                <p className="text-xs text-slate-500 mt-1">
                    Platform tier quotas, pricing structures, and feature entitlements.
                </p>
            </div>

            {!plans && <p className="text-xs text-slate-500">{error ? `Unable to load plans: ${error}` : 'Loading plans…'}</p>}

            {/* Pricing Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans?.map((tier) => (
                    <div
                        key={tier.planTier}
                        className={`p-6 rounded-2xl flex flex-col justify-between border transition-all ${
                            tier.isPopular
                                ? 'bg-white border-2 border-indigo-600 shadow-md shadow-indigo-500/10'
                                : 'bg-white border border-slate-200/90 shadow-xs hover:shadow-md'
                        }`}
                    >
                        <div>
                            {tier.isPopular && (
                                <span className="inline-block px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider mb-3 shadow-2xs">
                                    Most Popular
                                </span>
                            )}
                            <h3 className="text-lg font-bold text-slate-900 font-serif">{tier.planTier}</h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{tier.description}</p>

                            <div className="my-5 flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">{formatMoney(tier.priceMonthly, tier.currency)}</span>
                                <span className="text-xs text-slate-400">/per month</span>
                            </div>

                            <ul className="space-y-2.5 text-xs text-slate-700 border-t border-slate-100 pt-4">
                                {tier.features.map((feat) => (
                                    <li key={feat} className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                            <Check size={11} className="stroke-[3]" />
                                        </div>
                                        <span>{feat}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="pt-5 mt-6 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                            <span>Seat quota: <strong className="text-slate-900">{tier.maxSeats}</strong></span>
                            <span>Branch quota: <strong className="text-slate-900">{tier.maxBranches}</strong></span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
