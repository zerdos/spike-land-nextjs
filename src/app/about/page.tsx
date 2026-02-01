import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Building2, Globe, Rocket } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto pt-24 pb-12 px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-foreground/80">
            About Spike Land
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Empowering creators and businesses with the next generation of AI-driven social media tools.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-12">
          <Card className="bg-card/50 backdrop-blur-sm border-muted">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Rocket className="w-6 h-6 text-primary" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="text-lg leading-relaxed text-muted-foreground">
              <p>
                At Spike Land, we believe that powerful social media management shouldn't be reserved for large enterprises with massive budgets. Our mission is to democratize professional-grade marketing tools through Artificial Intelligence. By automating the complex, data-heavy aspects of social strategy—from scheduling to A/B testing—we free our users to focus on what truly matters: creating authentic connections and compelling content.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Founder Story */}
        <section className="mb-12">
          <Card className="bg-card/50 backdrop-blur-sm border-muted">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Globe className="w-6 h-6 text-primary" />
                The Founder's Story
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Spike Land is the culmination of years of engineering excellence and a passion for scalable technology. The journey began with a simple observation: while social platforms were evolving rapidly, the tools to manage them were lagging behind, often trapping creative minds in repetitive administrative tasks.
              </p>
              <p>
                Drawing on deep technical expertise gained from working with some of the UK&apos;s most recognizable brands, our founder set out to build a solution that combines the reliability of enterprise systems with the agility required for the modern creator economy. Spike Land isn't just a tool; it's a force multiplier for your digital presence.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Values Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Core Values</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Innovation First",
                description: "We constantly push the boundaries of what AI can do for marketing, never settling for the status quo."
              },
              {
                title: "User-Centricity",
                description: "Every feature we build is designed to solve real problems for real creators, simplifying complexity."
              },
              {
                title: "Transparency",
                description: "We believe in clear data, honest metrics, and building trust through open communication."
              }
            ].map((value, index) => (
              <Card key={index} className="bg-card/30 border-muted hover:bg-card/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-xl">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Timeline Section */}
        <section>
          <h2 className="text-3xl font-bold mb-10 text-center">Journey & Experience</h2>
          <div className="relative border-l-2 border-primary/20 ml-4 md:ml-12 space-y-12">

            {/* Item 1: Spike Land */}
            <div className="relative pl-8 md:pl-12 group">
              <div className="absolute -left-[7px] top-0 w-4 h-4 rounded-full bg-primary ring-4 ring-background group-hover:ring-primary/20 transition-all"></div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                <h3 className="text-2xl font-bold text-foreground">Spike Land</h3>
                <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full w-fit mt-2 sm:mt-0">Present</span>
              </div>
              <p className="text-lg font-medium text-muted-foreground mb-2">Founder</p>
              <p className="text-muted-foreground/80">
                Building the ultimate AI-powered social media command center. enhancing content workflows, and enabling data-driven growth for creators worldwide.
              </p>
            </div>

            {/* Item 2: Virgin */}
            <div className="relative pl-8 md:pl-12 group">
              <div className="absolute -left-[7px] top-0 w-4 h-4 rounded-full bg-muted-foreground/40 ring-4 ring-background group-hover:bg-primary/60 transition-all"></div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                <h3 className="text-xl font-bold text-foreground">Virgin</h3>
                <Briefcase className="w-5 h-5 text-muted-foreground hidden sm:block" />
              </div>
              <p className="text-lg font-medium text-muted-foreground mb-2">Engineering Leadership</p>
              <p className="text-muted-foreground/80">
                Contributed to high-scale consumer technology solutions, focusing on performance, customer experience, and robust system architecture for one of the world&apos;s most iconic brands.
              </p>
            </div>

            {/* Item 3: Investec */}
            <div className="relative pl-8 md:pl-12 group">
              <div className="absolute -left-[7px] top-0 w-4 h-4 rounded-full bg-muted-foreground/40 ring-4 ring-background group-hover:bg-primary/60 transition-all"></div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                <h3 className="text-xl font-bold text-foreground">Investec</h3>
                <Building2 className="w-5 h-5 text-muted-foreground hidden sm:block" />
              </div>
              <p className="text-lg font-medium text-muted-foreground mb-2">Fintech Innovation</p>
              <p className="text-muted-foreground/80">
                Worked within the demanding financial sector to deliver secure, reliable, and innovative digital banking and investment platforms.
              </p>
            </div>

            {/* Item 4: TalkTalk */}
            <div className="relative pl-8 md:pl-12 group">
              <div className="absolute -left-[7px] top-0 w-4 h-4 rounded-full bg-muted-foreground/40 ring-4 ring-background group-hover:bg-primary/60 transition-all"></div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                <h3 className="text-xl font-bold text-foreground">TalkTalk</h3>
                <Globe className="w-5 h-5 text-muted-foreground hidden sm:block" />
              </div>
              <p className="text-lg font-medium text-muted-foreground mb-2">Telecommunications</p>
              <p className="text-muted-foreground/80">
                Developed critical infrastructure and service platforms for a major UK telecommunications provider, handling massive user scale and data throughput.
              </p>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}
