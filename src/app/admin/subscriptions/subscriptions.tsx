'use client';

import { useState, useEffect } from 'react';
import { Check, Pencil, Plus, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import { api, formatMoney, type Plan } from '@/lib/api';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';

export default function PlatformAdminSubscriptionsPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshCount, setRefreshCount] = useState(0);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Edit Modal State
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [formData, setFormData] = useState<{
        priceMonthly: string;
        description: string;
        maxSeats: string;
        maxBranches: string;
        features: string[];
        isPopular: boolean;
        razorpayPlanId: string;
    }>({
        priceMonthly: '0',
        description: '',
        maxSeats: '100',
        maxBranches: '1',
        features: [],
        isPopular: false,
        razorpayPlanId: '',
    });
    const [saving, setSaving] = useState(false);

    const featureErrors = formData.features.map((f, i) => {
        const value = f.trim();
        if (!value) return 'Feature cannot be empty. Remove it or add a description.';
        if (value.length > 120) return 'Feature must be 120 characters or fewer.';
        const firstIndex = formData.features.findIndex((other) => other.trim().toLowerCase() === value.toLowerCase());
        if (firstIndex !== i) return 'Duplicate feature.';
        return undefined;
    });

    const planForm = useFormValidation(
        {
            priceMonthly: formData.priceMonthly,
            razorpayPlanId: formData.razorpayPlanId,
            description: formData.description,
            maxSeats: formData.maxSeats,
            maxBranches: formData.maxBranches,
            features: featureErrors.some(Boolean) ? 'invalid' : formData.features.length ? 'ok' : '',
        },
        {
            priceMonthly: [rules.required('Monthly price'), rules.number('Monthly price', { min: 0, max: 1000000 })],
            razorpayPlanId: [rules.pattern(/^plan_[A-Za-z0-9]+$/, 'Razorpay plan IDs look like plan_XXXXXXXXXXXX.')],
            description: [rules.required('Description'), rules.minLength('Description', 10), rules.maxLength('Description', 300)],
            maxSeats: [rules.required('Seat quota'), rules.number('Seat quota', { min: 1, max: 1000000, integer: true })],
            maxBranches: [rules.required('Branch quota'), rules.number('Branch quota', { min: 1, max: 1000, integer: true })],
            features: [
                (value) =>
                    value === '' ? 'Add at least one feature.' : value === 'invalid' ? 'Fix the highlighted features.' : undefined,
            ],
        },
    );

    const closePlanModal = () => {
        setEditingPlan(null);
        planForm.reset();
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    useEffect(() => {
        let isMounted = true;
        api<Plan[]>('/plans')
            .then((data) => {
                if (isMounted) {
                    setPlans(data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) {
                    showToast('Unable to load subscription plans.');
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [refreshCount]);

    const handleOpenEdit = (plan: Plan) => {
        setEditingPlan(plan);
        setFormData({
            priceMonthly: String(Number(plan.priceMonthly) || 0),
            description: plan.description || '',
            maxSeats: String(Number(plan.maxSeats) || 1),
            maxBranches: String(Number(plan.maxBranches) || 1),
            features: Array.isArray(plan.features) ? [...plan.features] : [],
            isPopular: Boolean(plan.isPopular),
            razorpayPlanId: plan.razorpayPlanId || '',
        });
        planForm.reset();
    };

    const handleFeatureChange = (index: number, value: string) => {
        const next = [...formData.features];
        next[index] = value;
        setFormData({ ...formData, features: next });
    };

    const handleAddFeature = () => {
        setFormData({ ...formData, features: [...formData.features, ''] });
    };

    const handleRemoveFeature = (index: number) => {
        setFormData({ ...formData, features: formData.features.filter((_, i) => i !== index) });
    };

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlan) return;
        if (!planForm.validate()) return;

        try {
            setSaving(true);
            const cleanedFeatures = formData.features.map((f) => f.trim()).filter(Boolean);

            const updated = await api<Plan>('/plans', {
                method: 'PUT',
                body: JSON.stringify({
                    planTier: editingPlan.planTier,
                    description: formData.description.trim(),
                    priceMonthly: Number(formData.priceMonthly),
                    currency: editingPlan.currency || 'INR',
                    maxSeats: Number(formData.maxSeats),
                    maxBranches: Number(formData.maxBranches),
                    features: cleanedFeatures,
                    isPopular: formData.isPopular,
                    razorpayPlanId: formData.razorpayPlanId.trim() || null,
                }),
            });

            // Update local state immediately
            setPlans((prev) =>
                prev.map((p) => {
                    if (p.planTier === updated.planTier) {
                        return { ...p, ...updated, features: cleanedFeatures };
                    }
                    if (updated.isPopular) {
                        return { ...p, isPopular: false };
                    }
                    return p;
                })
            );

            showToast(`${editingPlan.planTier} plan updated successfully!`);
            closePlanModal();
        } catch (err) {
            showToast((err as Error).message || 'Failed to update plan.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[10000] bg-white border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold">
                    <Sparkles size={16} className="text-amber-500" />
                    <span>{toastMessage}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SaaS Subscription Plans &amp; Tiers</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Platform tier quotas, pricing structures, and feature entitlements. Editable by Platform Operator.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setLoading(true);
                            setRefreshCount((c) => c + 1);
                        }}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs hover:border-slate-300 cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {loading && plans.length === 0 && (
                <p className="text-xs text-slate-500">Loading plans…</p>
            )}

            {/* Pricing Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((tier) => (
                    <div
                        key={tier.planTier}
                        className={`p-6 rounded-2xl flex flex-col justify-between border transition-all ${
                            tier.isPopular
                                ? 'bg-white border-2 border-indigo-600 shadow-md shadow-indigo-500/10'
                                : 'bg-white border border-slate-200/90 shadow-xs hover:shadow-md'
                        }`}
                    >
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-3 min-h-[28px]">
                                {tier.isPopular ? (
                                    <span className="inline-block px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                                        Most Popular
                                    </span>
                                ) : (
                                    <span />
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleOpenEdit(tier)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                                >
                                    <Pencil size={12} />
                                    <span>Edit Plan</span>
                                </button>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900">{tier.planTier}</h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{tier.description}</p>

                            <div className="my-5 flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                                    {formatMoney(tier.priceMonthly, tier.currency)}
                                </span>
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

            {/* Edit Plan Modal */}
            {editingPlan && (
                <Modal
                    title={`Edit ${editingPlan.planTier} Plan`}
                    onClose={closePlanModal}
                    maxWidth="580px"
                >
                    <form onSubmit={handleSavePlan} noValidate className="space-y-4 text-xs font-sans text-slate-800">
                        {/* Price & Razorpay Plan ID */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Monthly Price (₹) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="1000000"
                                    step="1"
                                    required
                                    value={formData.priceMonthly}
                                    onChange={(e) => setFormData({ ...formData, priceMonthly: e.target.value })}
                                    onBlur={planForm.touch('priceMonthly')}
                                    aria-invalid={!!planForm.error('priceMonthly')}
                                    style={invalidStyle(planForm.error('priceMonthly'))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <FieldError message={planForm.error('priceMonthly')} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Razorpay Plan ID
                                </label>
                                <input
                                    type="text"
                                    maxLength={40}
                                    placeholder="plan_..."
                                    value={formData.razorpayPlanId}
                                    onChange={(e) => setFormData({ ...formData, razorpayPlanId: e.target.value })}
                                    onBlur={planForm.touch('razorpayPlanId')}
                                    aria-invalid={!!planForm.error('razorpayPlanId')}
                                    style={invalidStyle(planForm.error('razorpayPlanId'))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <FieldError message={planForm.error('razorpayPlanId')} />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-slate-700">
                                    Description <span className="text-rose-500">*</span>
                                </label>
                                <span className={`text-[10px] ${formData.description.trim().length > 300 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                    {formData.description.trim().length}/300
                                </span>
                            </div>
                            <textarea
                                rows={2}
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                onBlur={planForm.touch('description')}
                                aria-invalid={!!planForm.error('description')}
                                style={invalidStyle(planForm.error('description'))}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none leading-relaxed"
                            />
                            <FieldError message={planForm.error('description')} />
                        </div>

                        {/* Quotas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Student / Seat Quota <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    required
                                    value={formData.maxSeats}
                                    onChange={(e) => setFormData({ ...formData, maxSeats: e.target.value })}
                                    onBlur={planForm.touch('maxSeats')}
                                    aria-invalid={!!planForm.error('maxSeats')}
                                    style={invalidStyle(planForm.error('maxSeats'))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <FieldError message={planForm.error('maxSeats')} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Campus Branches Quota <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    required
                                    value={formData.maxBranches}
                                    onChange={(e) => setFormData({ ...formData, maxBranches: e.target.value })}
                                    onBlur={planForm.touch('maxBranches')}
                                    aria-invalid={!!planForm.error('maxBranches')}
                                    style={invalidStyle(planForm.error('maxBranches'))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <FieldError message={planForm.error('maxBranches')} />
                            </div>
                        </div>

                        {/* Most Popular Toggle */}
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <input
                                type="checkbox"
                                id="isPopularToggle"
                                checked={formData.isPopular}
                                onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor="isPopularToggle" className="text-xs font-semibold text-slate-800 cursor-pointer select-none">
                                Highlight as &ldquo;Most Popular&rdquo; plan (displayed with purple border &amp; badge)
                            </label>
                        </div>

                        {/* Features Editor */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Feature Entitlements ({formData.features.length})
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAddFeature}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus size={13} />
                                    <span>Add Feature</span>
                                </button>
                            </div>
                            <FieldError message={planForm.error('features')} />
                            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1 mt-1">
                                {formData.features.map((feat, index) => {
                                    const featureError = planForm.error('features') ? featureErrors[index] : undefined;
                                    return (
                                        <div key={index}>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    maxLength={120}
                                                    value={feat}
                                                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                                                    onBlur={planForm.touch('features')}
                                                    aria-invalid={!!featureError}
                                                    style={invalidStyle(featureError)}
                                                    placeholder="Feature description..."
                                                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFeature(index)}
                                                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                                                    title="Remove feature"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                            <FieldError message={featureError} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={closePlanModal}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                {saving ? (
                                    <>Saving Changes… <RefreshCw size={13} className="animate-spin" /></>
                                ) : (
                                    <span>Save Changes</span>
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
