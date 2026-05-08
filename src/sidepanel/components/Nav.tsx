import type { RouteKey } from '../App';

const NAV_ITEMS: { key: RouteKey; label: string }[] = [
  { key: 'dashboard', label: 'Meetings' },
  { key: 'record', label: 'Record' },
  { key: 'upload', label: 'Upload' },
  { key: 'settings', label: 'Settings' },
];

export function Nav({
  active,
  onNavigate,
}: {
  active: RouteKey;
  onNavigate: (r: RouteKey) => void;
}) {
  return (
    <nav className="app-nav">
      <ul>
        {NAV_ITEMS.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className={active === item.key ? 'nav-item active' : 'nav-item'}
              onClick={() => onNavigate(item.key)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
