'use client';

import { useState, useEffect } from 'react';
import {
    ShieldCheck, UserPlus, Search, RefreshCw, CheckCircle2,
    Lock, Key, Shield, AlertCircle, Edit2, ShieldAlert
} from 'lucide-react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';

interface AdminUser {
    adminId: string;
    userId: string;
    email: string;
    fullName: string;
    role: string;
    isActive: boolean;
    twoFactorEnabled: boolean;
    permissions: string[];
    createdAt: string;
}

const AVAILABLE_PERMISSIONS = [
    { key: 'all:manage', label: 'Full Platform SuperAdmin Access' },
    { key: 'tenants:manage', label: 'Academy Approvals & Verification' },
    { key: 'courses:moderate', label: 'Course Content Moderation' },
    { key: 'finance:manage', label: 'Financial Ledger & Payout Authorizations' },
    { key: 'finance:read', label: 'Financial Reporting Read-Only' },
    { key: 'refunds:manage', label: 'Refund Investigation & Approvals' },
    { key: 'support:tickets', label: 'Learner & Academy Customer Support' },
    { key: 'settings:manage', label: 'Global Platform Configurations' },
];

export default function PlatformAdminRolesPage() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
    const [formName, setFormName] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formRole, setFormRole] = useState<'SuperAdmin' | 'FinanceAdmin' | 'SupportAdmin'>('SupportAdmin');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const adminForm = useFormValidation(
        { name: formName, email: formEmail, role: formRole, permissions: selectedPermissions.join(',') },
        {
            name: [
                rules.required('Full name'),
                rules.minLength('Full name', 2),
                rules.maxLength('Full name', 100),
                rules.pattern(/^[\p{L}][\p{L} .'-]*$/u, 'Name can only contain letters, spaces, dots, apostrophes and hyphens.'),
            ],
            email: [
                rules.required('Work email'),
                rules.email(),
                rules.maxLength('Work email', 254),
                (value) => {
                    if (editingAdmin) return undefined;
                    const email = String(value).trim().toLowerCase();
                    return email && admins.some((a) => a.email.toLowerCase() === email)
                        ? 'This email already has platform admin access.'
                        : undefined;
                },
            ],
            role: [rules.required('Role')],
            permissions: [(value) => (String(value) === '' ? 'Select at least one capability.' : undefined)],
        },
    );

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const res = await api<AdminUser[]>('/platform/roles');
            setAdmins(res || []);
        } catch (err: any) {
            showToast(err?.message || 'Failed to load platform admins', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, [refreshKey]);

    const handleOpenCreate = () => {
        setEditingAdmin(null);
        setFormName('');
        setFormEmail('');
        setFormRole('SupportAdmin');
        setSelectedPermissions(['support:tickets', 'courses:moderate']);
        adminForm.reset();
        setModalOpen(true);
    };

    const handleOpenEdit = (admin: AdminUser) => {
        setEditingAdmin(admin);
        setFormName(admin.fullName);
        setFormEmail(admin.email);
        setFormRole(admin.role as any);
        setSelectedPermissions(admin.permissions || []);
        adminForm.reset();
        setModalOpen(true);
    };

    const togglePermission = (perm: string) => {
        if (selectedPermissions.includes(perm)) {
            setSelectedPermissions(selectedPermissions.filter(p => p !== perm));
        } else {
            setSelectedPermissions([...selectedPermissions, perm]);
        }
    };

    const handleSaveAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminForm.validate()) return;

        try {
            setSaving(true);
            await api('/platform/roles', {
                method: 'POST',
                body: JSON.stringify({
                    adminId: editingAdmin?.adminId,
                    userId: editingAdmin?.userId,
                    email: formEmail.trim().toLowerCase(),
                    fullName: formName.trim(),
                    role: formRole,
                    permissions: selectedPermissions,
                }),
            });

            showToast(editingAdmin ? 'Admin role permissions updated.' : 'Platform operator invited successfully.');
            setModalOpen(false);
            setRefreshKey(k => k + 1);
        } catch (err: any) {
            showToast(err?.message || 'Failed to save admin user', 'error');
        } finally {
            setSaving(false);
        }
    };

    const filteredAdmins = admins.filter(a => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            a.fullName.toLowerCase().includes(q) ||
            a.email.toLowerCase().includes(q) ||
            a.role.toLowerCase().includes(q)
        );
    });

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'SuperAdmin':
                return (
                    <span className="inline-block px-2 py-0.5 text-[11px] font-bold rounded-full whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-200">
                        SuperAdmin
                    </span>
                );
            case 'FinanceAdmin':
                return (
                    <span className="inline-block px-2 py-0.5 text-[11px] font-bold rounded-full whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200">
                        FinanceAdmin
                    </span>
                );
            default:
                return (
                    <span className="inline-block px-2 py-0.5 text-[11px] font-bold rounded-full whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200">
                        SupportAdmin
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[10000] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
                    toast.type === 'success' ? 'bg-white border-emerald-200 text-emerald-800' : 'bg-white border-rose-200 text-rose-800'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Roles & Permissions</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Delegate platform governance access with fine-grained role scopes, 2FA enforcement, and security auditing.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        Grant Admin Access
                    </button>
                    <button
                        onClick={() => setRefreshKey(k => k + 1)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search administrator name, email or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    />
                </div>
                <span className="text-xs text-slate-500 font-medium hidden md:inline">
                    {filteredAdmins.length} Platform Operator(s)
                </span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div>
                    <table className="w-full table-fixed text-left text-sm text-slate-600">
                        <colgroup>
                            <col className="w-[22%]" />
                            <col className="w-[15%]" />
                            <col className="w-[11%]" />
                            <col className="w-[32%]" />
                            <col className="w-[10%]" />
                            <col className="w-[10%]" />
                        </colgroup>
                        <thead className="bg-slate-50 text-slate-700 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-3">Operator</th>
                                <th className="py-3 px-3">Role</th>
                                <th className="py-3 px-3">2FA</th>
                                <th className="py-3 px-3">Permissions</th>
                                <th className="py-3 px-3 text-center">Status</th>
                                <th className="py-3 px-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-normal">
                            {loading && admins.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                                        Loading platform administration directory...
                                    </td>
                                </tr>
                            ) : filteredAdmins.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        No platform administrator accounts found.
                                    </td>
                                </tr>
                            ) : (
                                filteredAdmins.map((admin) => (
                                    <tr key={admin.adminId} className="hover:bg-slate-50/80 transition-colors [&>td]:align-middle">
                                        <td className="py-3.5 px-3">
                                            <div className="font-semibold text-slate-900 break-words line-clamp-2" title={admin.fullName}>{admin.fullName}</div>
                                            <div className="text-xs text-slate-500 font-mono truncate" title={admin.email}>{admin.email}</div>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            {getRoleBadge(admin.role)}
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                                                <Lock className="w-3 h-3 text-emerald-600" />
                                                Enforced
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <div className="flex flex-wrap gap-1">
                                                {admin.permissions?.map((p) => (
                                                    <span key={p} className="max-w-full break-all text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                                                        {p}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-3 text-center">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                Active
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3 text-right">
                                            <button
                                                onClick={() => handleOpenEdit(admin)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Grant / Edit Modal */}
            {modalOpen && (
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={editingAdmin ? `Edit Permissions: ${editingAdmin.fullName}` : 'Grant Platform Administrator Access'}
                >
                    <form onSubmit={handleSaveAdmin} noValidate className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Operator Full Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                maxLength={100}
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                onBlur={adminForm.touch('name')}
                                aria-invalid={!!adminForm.error('name')}
                                style={invalidStyle(adminForm.error('name'))}
                                placeholder="e.g. Anand Mahindra"
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                required
                            />
                            <FieldError message={adminForm.error('name')} />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Operator Work Email <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="email"
                                maxLength={254}
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                onBlur={adminForm.touch('email')}
                                aria-invalid={!!adminForm.error('email')}
                                style={invalidStyle(adminForm.error('email'))}
                                placeholder="operator@classsphere.com"
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                required
                                disabled={!!editingAdmin}
                            />
                            <FieldError message={adminForm.error('email')} />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Primary Administrative Role <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={formRole}
                                onChange={(e: any) => setFormRole(e.target.value)}
                                onBlur={adminForm.touch('role')}
                                aria-invalid={!!adminForm.error('role')}
                                style={invalidStyle(adminForm.error('role'))}
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                            >
                                <option value="SuperAdmin">SuperAdmin (Full Unrestricted Access)</option>
                                <option value="FinanceAdmin">FinanceAdmin (Payouts, Ledger, Invoicing)</option>
                                <option value="SupportAdmin">SupportAdmin (Tenant Review & Moderation)</option>
                            </select>
                            <FieldError message={adminForm.error('role')} />
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                                Granular Capability Entitlements <span className="text-rose-500">*</span>
                            </label>
                            <FieldError message={adminForm.error('permissions')} />
                            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                                {AVAILABLE_PERMISSIONS.map(p => {
                                    const checked = selectedPermissions.includes(p.key);
                                    return (
                                        <label
                                            key={p.key}
                                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all text-xs"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => togglePermission(p.key)}
                                                className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                                            />
                                            <div className="flex-1">
                                                <span className="font-semibold text-slate-800">{p.label}</span>
                                                <code className="text-[10px] text-slate-400 block font-mono">{p.key}</code>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-2"
                            >
                                {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                                {editingAdmin ? 'Save Entitlements' : 'Grant Access'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
