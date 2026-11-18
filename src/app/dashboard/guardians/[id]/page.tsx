import GuardianDetailPage from './guardian-detail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <GuardianDetailPage guardianId={id} />;
}

