export default function Breadcrumbs({
    breadcrumbs,
  }: {
    breadcrumbs: { label: string; href: string; active?: boolean }[];
  }) {
    return (
      <nav className="mb-4">
        <ol className="flex space-x-2 text-sm text-gray-500">
          {breadcrumbs.map((crumb, i) => (
            <li key={i}>
              <a
                href={crumb.href}
                className={crumb.active ? 'text-gray-900 font-semibold' : ''}
              >
                {crumb.label}
              </a>
              {i < breadcrumbs.length - 1 && <span className="mx-2">/</span>}
            </li>
          ))}
        </ol>
      </nav>
    );
  }
  