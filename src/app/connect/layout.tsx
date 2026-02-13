export default function ConnectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      <main className="flex-1">{children}</main>
    </div>
  );
}
