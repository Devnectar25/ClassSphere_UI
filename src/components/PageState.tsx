/** Loading / error placeholder for data-driven pages. */
export default function PageState({ error }: { error: string | null }) {
    return (
        <div className="cs-card" style={{ padding: '48px', textAlign: 'center', color: error ? 'var(--cs-danger)' : 'var(--cs-text-muted)', fontSize: '14px' }}>
            {error ? `Unable to load data: ${error}` : 'Loading…'}
        </div>
    );
}
