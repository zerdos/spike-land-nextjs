import { SectionWrapper } from "../shared/SectionWrapper";

export function ComparisonTable() {
  const rows = [
    { feature: "Instant Deployment", us: true, them: false },
    { feature: "TypeScript Support", us: true, them: true },
    { feature: "MCP Protocol", us: true, them: false },
    { feature: "Photo Assets", us: true, them: false },
    { feature: "Local Dev Environment", us: true, them: false },
    { feature: "Zero Config", us: true, them: false },
  ];

  return (
    <SectionWrapper>
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-[var(--landing-heading-weight)] mb-4">
          Why choose spike.land?
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full max-w-4xl mx-auto border-collapse">
          <thead>
            <tr>
              <th className="text-left p-4 border-b border-[var(--landing-border)] w-1/3">
                Feature
              </th>
              <th className="p-4 border-b border-[var(--landing-border)] text-[var(--landing-primary)] font-bold text-xl w-1/3">
                spike.land
              </th>
              <th className="p-4 border-b border-[var(--landing-border)] text-[var(--landing-muted-fg)] w-1/3">
                Others
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-[var(--landing-secondary)]/50 transition-colors">
                <td className="p-4 border-b border-[var(--landing-border)] font-medium">
                  {row.feature}
                </td>
                <td className="p-4 border-b border-[var(--landing-border)] text-center">
                  {row.us
                    ? <span className="text-green-500 text-xl">✓</span>
                    : <span className="text-red-500">×</span>}
                </td>
                <td className="p-4 border-b border-[var(--landing-border)] text-center text-[var(--landing-muted-fg)]">
                  {row.them ? <span className="text-green-500">✓</span> : <span>×</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionWrapper>
  );
}
