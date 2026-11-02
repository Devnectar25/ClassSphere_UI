/** Renders a comma-separated list (e.g. batch names) as stacked badges; "—" when empty. */
export default function BadgeList({ value, className = 'badge-primary' }: { value: string | null; className?: string }) {
    if (!value) return <>—</>;
    return (
        <div className="badge-list">
            {value.split(', ').map(item => <span key={item} className={`badge ${className}`} title={item}>{item}</span>)}
        </div>
    );
}
