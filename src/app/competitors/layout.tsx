import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Competitor Tracking',
};

export default function CompetitorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
