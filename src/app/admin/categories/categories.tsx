'use client';

import { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Pencil, Trash2, RefreshCw, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';

interface CategoryRecord {
    categoryId: string;
    name: string;
    description: string;
    icon: string;
    displayOrder: number;
    isActive: boolean;
    courseCount: number;
    createdAt: string;
}

export default function PlatformAdminCategoriesPage() {
    const [categories, setCategories] = useState<CategoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Edit/Create Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formIcon, setFormIcon] = useState('BookOpen');
    const [formOrder, setFormOrder] = useState('0');
    const [formActive, setFormActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const form = useFormValidation(
        { name: formName, description: formDesc, icon: formIcon, displayOrder: formOrder },
        {
            name: [
                rules.required('Category name'),
                rules.minLength('Category name', 2),
                rules.maxLength('Category name', 60),
                (value) => {
                    const name = String(value).trim().toLowerCase();
                    const clash = categories.some(
                        (c) => c.name.trim().toLowerCase() === name && c.categoryId !== editingCategory?.categoryId,
                    );
                    return name && clash ? 'A category with this name already exists.' : undefined;
                },
            ],
            description: [rules.maxLength('Description', 300)],
            icon: [
                rules.maxLength('Icon identifier', 40),
                rules.pattern(/^[A-Za-z][A-Za-z0-9]*$/, 'Use a Lucide icon name in PascalCase, e.g. BookOpen.'),
            ],
            displayOrder: [rules.required('Display order'), rules.number('Display order', { min: 0, max: 9999, integer: true })],
        },
    );

    // Delete Confirmation
    const [deleteCat, setDeleteCat] = useState<CategoryRecord | null>(null);
    const [deleting, setDeleting] = useState(false);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const fetchCategories = useCallback(async (isManual = false) => {
        try {
            setLoading(true);
            const data = await api<CategoryRecord[]>(`/platform/categories?_t=${Date.now()}`);
            setCategories(data || []);
            if (isManual) showToast('Categories refreshed.');
        } catch {
            showToast('Unable to fetch categories.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleOpenCreate = () => {
        setEditingCategory(null);
        setFormName('');
        setFormDesc('');
        setFormIcon('BookOpen');
        setFormOrder(String(categories.length + 1));
        setFormActive(true);
        form.reset();
        setModalOpen(true);
    };

    const handleOpenEdit = (cat: CategoryRecord) => {
        setEditingCategory(cat);
        setFormName(cat.name);
        setFormDesc(cat.description || '');
        setFormIcon(cat.icon || 'BookOpen');
        setFormOrder(String(cat.displayOrder ?? 0));
        setFormActive(cat.isActive);
        form.reset();
        setModalOpen(true);
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.validate()) return;

        try {
            setSaving(true);
            await api('/platform/categories', {
                method: 'POST',
                body: JSON.stringify({
                    categoryId: editingCategory?.categoryId || null,
                    name: formName.trim(),
                    description: formDesc.trim() || null,
                    icon: formIcon.trim() || 'BookOpen',
                    displayOrder: Number(formOrder),
                    isActive: formActive,
                }),
            });

            showToast(`Category "${formName.trim()}" saved successfully!`);
            setModalOpen(false);
            fetchCategories();
        } catch (err) {
            showToast((err as Error).message || 'Failed to save category.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCategory = async () => {
        if (!deleteCat) return;

        try {
            setDeleting(true);
            await api(`/platform/categories?id=${deleteCat.categoryId}`, {
                method: 'DELETE',
            });

            showToast(`Category "${deleteCat.name}" deleted.`);
            setDeleteCat(null);
            fetchCategories();
        } catch (err) {
            showToast((err as Error).message || 'Delete blocked by course dependencies.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[10000] bg-white border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold">
                    <Sparkles size={16} className="text-amber-500" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Categories Management</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Dynamic subject disciplines and learning categories across academies and course discovery.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchCategories(true)}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs hover:border-slate-300 cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
                    >
                        <Plus size={15} />
                        <span>Add Category</span>
                    </button>
                </div>
            </div>

            {/* Grid of Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => (
                    <div
                        key={cat.categoryId}
                        className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
                                    <Layers size={18} />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {cat.isActive ? (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                                            Inactive
                                        </span>
                                    )}
                                    <span className="text-[10px] text-slate-400 font-mono">Order #{cat.displayOrder}</span>
                                </div>
                            </div>

                            <h3 className="text-base font-bold text-slate-900">{cat.name}</h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                {cat.description || 'No description provided.'}
                            </p>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-600">
                                <strong className="text-slate-900">{cat.courseCount}</strong> courses enrolled
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handleOpenEdit(cat)}
                                    className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors cursor-pointer"
                                    title="Edit category"
                                >
                                    <Pencil size={13} />
                                </button>
                                <button
                                    onClick={() => setDeleteCat(cat)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                                    title="Delete category"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create / Edit Category Modal */}
            {modalOpen && (
                <Modal
                    title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
                    onClose={() => setModalOpen(false)}
                    maxWidth="480px"
                >
                    <form onSubmit={handleSaveCategory} noValidate className="space-y-4 text-xs font-sans">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Category Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                maxLength={60}
                                placeholder="e.g. Robotics & AI"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                onBlur={form.touch('name')}
                                aria-invalid={!!form.error('name')}
                                style={invalidStyle(form.error('name'))}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                            <FieldError message={form.error('name')} />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-slate-700">Description</label>
                                <span className={`text-[10px] ${formDesc.trim().length > 300 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                    {formDesc.trim().length}/300
                                </span>
                            </div>
                            <textarea
                                rows={2}
                                placeholder="Brief overview of curriculum and courses under this category..."
                                value={formDesc}
                                onChange={(e) => setFormDesc(e.target.value)}
                                onBlur={form.touch('description')}
                                aria-invalid={!!form.error('description')}
                                style={invalidStyle(form.error('description'))}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
                            />
                            <FieldError message={form.error('description')} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Display Order <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="9999"
                                    step="1"
                                    value={formOrder}
                                    onChange={(e) => setFormOrder(e.target.value)}
                                    onBlur={form.touch('displayOrder')}
                                    aria-invalid={!!form.error('displayOrder')}
                                    style={invalidStyle(form.error('displayOrder'))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <FieldError message={form.error('displayOrder')} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Icon Identifier</label>
                                <input
                                    type="text"
                                    maxLength={40}
                                    value={formIcon}
                                    onChange={(e) => setFormIcon(e.target.value)}
                                    onBlur={form.touch('icon')}
                                    aria-invalid={!!form.error('icon')}
                                    style={invalidStyle(form.error('icon'))}
                                    placeholder="BookOpen, Sparkles, etc."
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <FieldError message={form.error('icon')} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <input
                                type="checkbox"
                                id="catActive"
                                checked={formActive}
                                onChange={(e) => setFormActive(e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor="catActive" className="font-semibold text-slate-800 cursor-pointer">
                                Active (visible in academy course creation and marketplace)
                            </label>
                        </div>

                        <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                {saving ? <>Saving… <RefreshCw size={13} className="animate-spin" /></> : 'Save Category'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {deleteCat && (
                <Modal title="Delete Category" onClose={() => setDeleteCat(null)} maxWidth="420px">
                    <div className="space-y-4 text-xs font-sans">
                        <p className="text-slate-600 leading-relaxed">
                            Are you sure you want to delete category <strong>{deleteCat.name}</strong>?
                            If this category has active courses assigned to it, the database will block deletion.
                        </p>

                        <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setDeleteCat(null)}
                                disabled={deleting}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteCategory}
                                disabled={deleting}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                {deleting ? <>Deleting… <RefreshCw size={13} className="animate-spin" /></> : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
