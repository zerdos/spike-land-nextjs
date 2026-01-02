import { SectionWrapper } from "../shared/SectionWrapper";

export function HeroBrutalistRaw() {
  return (
    <div className="relative bg-[var(--landing-background)] border-b-8 border-black">
      <SectionWrapper className="pt-24 pb-24">
        <div className="border-4 border-black p-8 md:p-12 shadow-[12px_12px_0px_0px_#000000] bg-[var(--landing-secondary)]">
          <h1 className="text-6xl md:text-9xl font-[var(--landing-heading-weight)] uppercase break-words leading-[0.8]">
            CODE.<br />
            NO BS.<br />
            JUST{" "}
            <span className="text-[var(--landing-primary)] underline decoration-8 underline-offset-8">
              VIBE.
            </span>
          </h1>

          <div className="mt-12 border-t-4 border-black pt-8">
            <p className="text-2xl md:text-3xl font-bold font-mono uppercase mb-8">
              Forget configuration. Forget boilerplate. Just write the code.
            </p>

            <div className="flex flex-col md:flex-row gap-0">
              <button className="border-4 border-black bg-[var(--landing-primary)] text-white text-2xl font-bold px-8 py-6 hover:bg-black hover:text-white transition-colors uppercase">
                Download Now
              </button>
              <button className="border-4 border-black border-l-0 md:border-l-0 border-t-0 md:border-t-4 bg-white text-black text-2xl font-bold px-8 py-6 hover:bg-[var(--landing-secondary)] transition-colors uppercase">
                Read Docs
              </button>
            </div>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
