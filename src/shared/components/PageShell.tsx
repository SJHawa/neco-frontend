import { PropsWithChildren } from "react";

type PageShellProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <main className="page-shell">
      <div className="page-shell__body">
        <p className="page-shell__eyebrow">Route shell</p>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </div>
    </main>
  );
}
