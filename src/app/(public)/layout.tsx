export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="theme-public min-h-screen bg-brand-deep">{children}</div>;
}
