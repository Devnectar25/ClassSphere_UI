import type { Metadata } from 'next';
import PlatformAdminUsersPage from './users';

export const metadata: Metadata = {
    title: 'Users Management — ClassShare Platform Admin',
    description: 'Manage registered users, inspect registration history, and handle account statuses.',
};

export default function Page() {
    return <PlatformAdminUsersPage />;
}
