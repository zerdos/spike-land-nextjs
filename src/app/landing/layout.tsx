export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="landing-layout-root">
      {/* Use this layout to load fonts or shared meta if needed */}
      {children}
    </div>
  );
}
