import type { Metadata } from 'next';
import PlatformAdminCoursesPage from './courses';

export const metadata: Metadata = {
    title: 'Courses Management — ClassShare Platform Admin',
    description: 'Inspect academy courses, moderate visibility, and promote featured courses.',
};

export default function Page() {
    return <PlatformAdminCoursesPage />;
}
