/**
 * Application header component.
 */

interface HeaderProps {
  title?: string;
}

export function Header({ title = 'Keyword Analytics' }: HeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          </div>
          <nav className="flex items-center gap-4">
            <a
              href="#"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Brand Protection
            </a>
            <a
              href="#"
              className="text-sm font-medium text-gray-400 hover:text-gray-600"
            >
              Categories (Soon)
            </a>
            <a
              href="#"
              className="text-sm font-medium text-gray-400 hover:text-gray-600"
            >
              Competitors (Soon)
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
