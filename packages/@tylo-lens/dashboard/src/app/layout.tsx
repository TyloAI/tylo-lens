import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Tylo-Lens Dashboard',
  description: 'LLM transparency dashboard: traces, tokens, latency, and compliance.',
};

function NavLink(props: { href: string; label: string }) {
  return (
    <a
      className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-900/40 hover:text-slate-50"
      href={props.href}
    >
      {props.label}
    </a>
  );
}

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="text-xl font-semibold text-slate-50">Tylo-Lens</div>
              <div className="text-sm text-slate-400">
                Transparency for LLM & MCP applications — traces, tokens, latency, and compliance.
              </div>
            </div>
            <nav className="flex gap-2">
              <NavLink href="/" label="Dashboard" />
              <NavLink href="/demo" label="Demo" />
              <NavLink href="/analytics" label="Analytics" />
              <NavLink href="/settings" label="Settings" />
            </nav>
          </header>
          <main className="mt-8">{props.children}</main>
          <footer className="mt-10 border-t border-slate-900/60 pt-6 text-xs text-slate-500">
            Tylo-Lens · MIT · Built for MCP-era agent observability
          </footer>
        </div>
      </body>
    </html>
  );
}
