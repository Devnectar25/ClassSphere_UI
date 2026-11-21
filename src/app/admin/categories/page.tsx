import type { Metadata } from 'next';
import PlatformAdminCategoriesPage from './categories';

export const metadata: Metadata = {
    title: 'Categories Management — ClassShare Platform Admin',
    description: 'Dynamic learning disciplines, curriculum categories, and discovery taxonomies.',
};

export default function Page() {
    return <PlatformAdminCategoriesPage />;
}
