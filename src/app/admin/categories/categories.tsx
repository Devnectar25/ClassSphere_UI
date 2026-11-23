'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Layers, Plus, Pencil, Trash2, RefreshCw, Sparkles, CheckCircle2, XCircle,
    ArrowUp, ArrowDown, GripVertical, GraduationCap, Music, Activity, Palette,
    Code, BookOpen, Languages, Cpu, Globe, Brain, Trophy, Briefcase, Camera,
    HeartPulse, Compass, List, LayoutGrid, AlertTriangle
} from 'lucide-react';
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

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    GraduationCap,
    Music,
    Sparkles,
    Activity,
    Palette,
    Code,
    BookOpen,
    Languages,
    Cpu,
    Globe,
    Brain,
    Trophy,
    Briefcase,
    Camera,
    HeartPulse,
    Compass,
    Layers,
};

const AVAILABLE_ICONS = [
    { name: 'GraduationCap', label: 'Academics' },
    { name: 'Music', label: 'Music' },
    { name: 'Sparkles', label: 'Dance & Stage' },
    { name: 'Activity', label: 'Sports & Martial' },
    { name: 'Palette', label: 'Arts & Design' },
    { name: 'Code', label: 'Coding & Tech' },
    { name: 'Cpu', label: 'Robotics & AI' },
    { name: 'Languages', label: 'Languages' },
    { name: 'Brain', label: 'Science & Logic' },
    { name: 'Trophy', label: 'Competitions' },
    { name: 'BookOpen', label: 'General / Tuition' },
    { name: 'Globe', label: 'Global Studies' },
    { name: 'Briefcase', label: 'Business & Career' },
    { name: 'Camera', label: 'Media & Photo' },
    { name: 'HeartPulse', label: 'Health & Yoga' },
    { name: 'Compass', label: 'Life Skills' },
];

function CategoryIcon({ name, size = 18, className = '' }: { name?: string; size?: number; className?: string }) {
    const IconComp = (name && ICON_MAP[name]) || Layers;
    return <IconComp size={size} className={className} />;
}

export default function PlatformAdminCategoriesPage() {
    const [categories, setCategories] = useState<CategoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [reordering, setReordering] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Edit/Create Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formIcon, setFormIcon] = useState('BookOpen');
    const [formActive, setFormActive] = useState(true);
    const [saving, setSaving] = useState(false);

    const form = useFormValidation(
        { name: formName, description: formDesc, icon: formIcon },
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
            icon: [rules.required('Icon')],
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
        setFormActive(true);
        form.reset();
        setModalOpen(true);
    };

    const handleOpenEdit = (cat: CategoryRecord) => {
        setEditingCategory(cat);
        setFormName(cat.name);
        setFormDesc(cat.description || '');
        setFormIcon(cat.icon || 'BookOpen');
        setFormActive(cat.isActive);
        form.reset();
        setModalOpen(true);
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.validate()) return;

        try {
            setSaving(true);
            const isNew = !editingCategory;
            const displayOrder = isNew ? categories.length + 1 : editingCategory.displayOrder;

            await api('/platform/categories', {
                method: 'POST',
                body: JSON.stringify({
                    categoryId: editingCategory?.categoryId || null,
                    name: formName.trim(),
                    description: formDesc.trim() || null,
                    icon: formIcon.trim() || 'BookOpen',
                    displayOrder,
                    isActive: formActive,
                }),
            });

            showToast(`Category "${formName.trim()}" ${isNew ? 'created' : 'updated'} successfully!`);
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

    // Reorder Handlers: Move Up / Down
    const handleMove = async (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= categories.length) return;

        const updated = [...categories];
        const [moved] = updated.splice(index, 1);
        updated.splice(targetIndex, 0, moved);

        const reordered = updated.map((c, i) => ({ ...c, displayOrder: i + 1 }));
        setCategories(reordered);

        try {
            setReordering(true);
            const orderedIds = reordered.map((c) => c.categoryId);
            await api('/platform/categories', {
                method: 'PATCH',
                body: JSON.stringify({ orderedIds }),
            });
            showToast(`Moved "${moved.name}" ${direction}. Order updated!`);
        } catch (err) {
            showToast((err as Error).message || 'Failed to save category order.');
            fetchCategories();
        } finally {
            setReordering(false);
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex) {
            setDraggedIndex(null);
            return;
        }

        const updated = [...categories];
        const [moved] = updated.splice(draggedIndex, 1);
        updated.splice(targetIndex, 0, moved);

        const reordered = updated.map((c, i) => ({ ...c, displayOrder: i + 1 }));
        setCategories(reordered);
        setDraggedIndex(null);

        try {
            setReordering(true);
            const orderedIds = reordered.map((c) => c.categoryId);
            await api('/platform/categories', {
                method: 'PATCH',
                body: JSON.stringify({ orderedIds }),
            });
            showToast(`Reordered "${moved.name}" to position #${targetIndex + 1}!`);
        } catch (err) {
            showToast((err as Error).message || 'Failed to persist category order.');
            fetchCategories();
        } finally {
            setReordering(false);
        }
    };

    const activeCount = categories.filter((c) => c.isActive).length;
    const totalCourses = categories.reduce((sum, c) => sum + (c.courseCount || 0), 0);

    return (
        <div className="space-y-4 animate-fade-in font-sans">
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[10000] bg-slate-900 border border-slate-700 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-slide-up">
                    <Sparkles size={16} className="text-amber-400 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Categories Management</h1>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Dynamic subject disciplines, curriculum taxonomies, and marketplace course discovery.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                viewMode === 'table' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Table / List View"
                        >
                            <List size={13} />
                            <span className="hidden sm:inline text-[11px]">List</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Grid View"
                        >
                            <LayoutGrid size={13} />
                            <span className="hidden sm:inline text-[11px]">Grid</span>
                        </button>
                    </div>

                    <button
                        onClick={() => fetchCategories(true)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                        title="Reload categories"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                        <Plus size={14} />
                        <span>Add Category</span>
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <Layers size={16} />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Disciplines</span>
                            <span className="text-lg font-black text-slate-900">{categories.length}</span>
                        </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Custom taxonomy</span>
                </div>

                <div className="p-3 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <CheckCircle2 size={16} />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Status</span>
                            <span className="text-lg font-black text-slate-900">{activeCount} of {categories.length}</span>
                        </div>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-semibold">Live in Discovery</span>
                </div>

                <div className="p-3 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <BookOpen size={16} />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Courses</span>
                            <span className="text-lg font-black text-slate-900">{totalCourses}</span>
                        </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Enrolled curricula</span>
                </div>
            </div>

            {/* Reorder Hint */}
            <div className="flex items-center justify-between text-xs px-1 text-slate-500">
                <span className="text-[11px] flex items-center gap-1.5">
                    <GripVertical size={13} className="text-slate-400" />
                    Tip: Reorder using the <strong className="text-slate-700">↑ / ↓ arrows</strong> or drag and drop rows to set the display priority.
                </span>
                {reordering && (
                    <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                        <RefreshCw size={11} className="animate-spin" /> Saving order…
                    </span>
                )}
            </div>

            {/* Categories Content: Table / List View */}
            {viewMode === 'table' ? (
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full table-fixed text-left text-xs">
                        <colgroup>
                            <col className="w-[7%]" />
                            <col className="w-[22%]" />
                            <col className="w-[36%]" />
                            <col className="w-[11%]" />
                            <col className="w-[10%]" />
                            <col className="w-[14%]" />
                        </colgroup>
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 whitespace-nowrap">
                                <th className="py-3 pl-5 pr-2 text-left">Order</th>
                                <th className="py-3 px-3 text-left">Category</th>
                                <th className="py-3 px-3 text-left">Description</th>
                                <th className="py-3 px-3 text-center">Courses</th>
                                <th className="py-3 px-3 text-center">Status</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        <RefreshCw size={20} className="animate-spin mx-auto text-indigo-600 mb-2" />
                                        <span>Loading categories...</span>
                                    </td>
                                </tr>
                            ) : categories.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        No categories defined. Click &ldquo;Add Category&rdquo; to create the first one.
                                    </td>
                                </tr>
                            ) : (
                                categories.map((cat, idx) => (
                                    <tr
                                        key={cat.categoryId}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, idx)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, idx)}
                                        className={`hover:bg-slate-50/70 transition-colors ${
                                            draggedIndex === idx ? 'opacity-40 bg-indigo-50/50' : ''
                                        }`}
                                    >
                                        {/* Order with Drag Handle */}
                                        <td className="py-3 pl-5 pr-2 font-mono text-xs align-middle">
                                            <div className="flex items-center gap-2">
                                                <GripVertical size={13} className="text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0" />
                                                <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10.5px]">
                                                    #{idx + 1}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Category Icon & Name */}
                                        <td className="py-3 px-3 min-w-0 align-middle">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100/60 flex items-center justify-center font-bold shrink-0">
                                                    <CategoryIcon name={cat.icon} size={15} />
                                                </div>
                                                <div className="min-w-0 font-semibold text-slate-900 leading-tight truncate" title={cat.name}>
                                                    {cat.name}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Description */}
                                        <td className="py-3 px-3 text-slate-600 min-w-0 align-middle">
                                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed" title={cat.description || undefined}>
                                                {cat.description || <span className="text-slate-400 italic">No description provided</span>}
                                            </p>
                                        </td>

                                        {/* Courses Enrolled */}
                                        <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-700 text-xs font-semibold">
                                                <span className="font-bold text-slate-900">{cat.courseCount || 0}</span>
                                                <span className="text-[11px] text-slate-500 font-normal">{cat.courseCount === 1 ? 'course' : 'courses'}</span>
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                                            {cat.isActive ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10.5px] font-bold">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions: Reorder arrows, Edit, Delete */}
                                        <td className="py-3 px-4 text-center align-middle whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {/* Reorder Group (Move Up / Down) */}
                                                <div className="flex items-center bg-slate-100/80 border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMove(idx, 'up')}
                                                        disabled={idx === 0 || reordering}
                                                        className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-25 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                                                        title={idx === 0 ? 'Top of list' : 'Move up'}
                                                    >
                                                        <ArrowUp size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMove(idx, 'down')}
                                                        disabled={idx === categories.length - 1 || reordering}
                                                        className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-25 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                                                        title={idx === categories.length - 1 ? 'Bottom of list' : 'Move down'}
                                                    >
                                                        <ArrowDown size={12} />
                                                    </button>
                                                </div>

                                                {/* Edit */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(cat)}
                                                    className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                                                    title="Edit category"
                                                >
                                                    <Pencil size={12} />
                                                </button>

                                                {/* Delete */}
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteCat(cat)}
                                                    className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                                                    title="Delete category"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categories.map((cat, idx) => (
                        <div
                            key={cat.categoryId}
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, idx)}
                            className={`p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
                                draggedIndex === idx ? 'opacity-40 bg-indigo-50/50' : ''
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <GripVertical size={14} className="text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing" />
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
                                            <CategoryIcon name={cat.icon} size={16} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                            #{idx + 1}
                                        </span>
                                        {cat.isActive ? (
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-sm font-bold text-slate-900 leading-tight">{cat.name}</h3>
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                    {cat.description || 'No description provided.'}
                                </p>
                            </div>

                            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-600 text-[11px]">
                                    <strong className="text-slate-900 font-bold">{cat.courseCount || 0}</strong> {cat.courseCount === 1 ? 'course' : 'courses'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <div className="flex items-center bg-slate-100/80 border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                                        <button
                                            type="button"
                                            onClick={() => handleMove(idx, 'up')}
                                            disabled={idx === 0 || reordering}
                                            className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-25 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                                            title={idx === 0 ? 'Top of list' : 'Move up'}
                                        >
                                            <ArrowUp size={11} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMove(idx, 'down')}
                                            disabled={idx === categories.length - 1 || reordering}
                                            className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-25 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                                            title={idx === categories.length - 1 ? 'Bottom of list' : 'Move down'}
                                        >
                                            <ArrowDown size={11} />
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenEdit(cat)}
                                        className="w-6 h-6 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                                        title="Edit category"
                                    >
                                        <Pencil size={11} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeleteCat(cat)}
                                        className="w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                                        title="Delete category"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Category Modal */}
            {modalOpen && (
                <Modal
                    title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
                    onClose={() => setModalOpen(false)}
                    maxWidth="520px"
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
                                placeholder="e.g. Robotics & AI, Performing Arts..."
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
                                placeholder="Brief overview of curriculum and learning goals under this category..."
                                value={formDesc}
                                onChange={(e) => setFormDesc(e.target.value)}
                                onBlur={form.touch('description')}
                                aria-invalid={!!form.error('description')}
                                style={invalidStyle(form.error('description'))}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
                            />
                            <FieldError message={form.error('description')} />
                        </div>

                        {/* Visual Icon Picker */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Choose Icon <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto">
                                {AVAILABLE_ICONS.map((item) => {
                                    const isSelected = formIcon === item.name;
                                    return (
                                        <button
                                            key={item.name}
                                            type="button"
                                            onClick={() => setFormIcon(item.name)}
                                            className={`p-2 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/30 shadow-xs scale-105'
                                                    : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                                            }`}
                                            title={item.label}
                                        >
                                            <CategoryIcon name={item.name} size={16} />
                                            <span className="text-[9px] mt-1 truncate max-w-full font-medium">
                                                {item.label.split(' ')[0]}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[11px] text-slate-500">Selected icon:</span>
                                <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1.5">
                                    <CategoryIcon name={formIcon} size={13} />
                                    {formIcon}
                                </span>
                            </div>
                        </div>

                        {/* Active Toggle */}
                        <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <input
                                type="checkbox"
                                id="catActive"
                                checked={formActive}
                                onChange={(e) => setFormActive(e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor="catActive" className="font-semibold text-slate-800 cursor-pointer text-xs">
                                Active Status (visible in course creation &amp; discovery marketplace)
                            </label>
                        </div>

                        <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                {saving ? <>Saving… <RefreshCw size={13} className="animate-spin" /></> : editingCategory ? 'Update Category' : 'Create Category'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {deleteCat && (
                <Modal title="Delete Category" onClose={() => setDeleteCat(null)} maxWidth="420px">
                    <div className="space-y-4 text-xs font-sans">
                        <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                            <AlertTriangle size={18} className="shrink-0 text-rose-600 mt-0.5" />
                            <p className="leading-relaxed">
                                Are you sure you want to delete category <strong>&ldquo;{deleteCat.name}&rdquo;</strong>?
                                If this category has active courses assigned to it, deletion will be blocked by database integrity rules.
                            </p>
                        </div>

                        <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setDeleteCat(null)}
                                disabled={deleting}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
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
