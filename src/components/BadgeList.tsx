/** Renders a comma-separated list (e.g. batch names) as stacked badges; "—" when empty. */
export default function BadgeList({ value, className = 'badge-primary' }: { value: string | null; className?: string }) {
    if (!value) return <>—</>;
    const items = Array.from(new Set(value.split(/,\s*/).map(item => item.trim()).filter(Boolean)));
    if (items.length === 0) return <>—</>;
    return (
        <div className="badge-list">
            {items.map((item, idx) => (
                <span key={`${item}-${idx}`} className={`badge ${className}`} title={item}>
                    {item}
                </span>
            ))}
        </div>
    );
}
