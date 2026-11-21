import type { Metadata } from 'next';
import PlatformAdminRegistrationsPage from './registrations';

export const metadata: Metadata = {
    title: 'Registrations — ClassShare Platform Admin',
    description: 'Review course registrations across academies and apply audited status overrides.',
};

export default function Page() {
    return <PlatformAdminRegistrationsPage />;
}
