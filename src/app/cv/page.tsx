import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Zoltan Erdos - Full Stack Developer & AI Pioneer | CV",
  description:
    "Full Stack Developer with 12+ years experience. Founder of Spike Land. Expert in TypeScript, React, Next.js, and AI-driven development.",
};

const skills = {
  frontend: ["TypeScript", "React", "Next.js 15", "Angular", "Tailwind CSS"],
  backend: ["Node.js", "Deno", ".NET Core", "PostgreSQL", "MSSQL", "Prisma"],
  devops: ["Docker", "Kubernetes", "AWS", "GCP", "Azure", "Cloudflare Workers"],
  testing: ["Vitest", "Playwright", "Cucumber", "TDD", "100% Coverage"],
  ai: ["Claude Opus 4.5", "MCP Servers", "Context Engineering", "Coding Agents"],
};

const experience = [
  {
    period: "2023 - 2024",
    role: "Frontend Developer",
    company: "Virgin Media O2 Limited",
    type: "Contractor",
    achievements: [
      "Led a small team to deliver 4 critical user journeys on the My O2 mobile platform",
      "Reduced CSS build size by 80% via PostCSS plugins",
      "Built automated Figma-to-PR pipeline for the Component Library",
      "Key role in cloud migration of virginmediao2.co.uk",
      "Mastered Angular 16 for modern frontend development",
    ],
  },
  {
    period: "2018 - 2023",
    role: "Full Stack Developer",
    company: "Investec Bank",
    type: "Long-term Contractor",
    achievements: [
      "Established test automation and cloud deployment for Investec IX",
      "Developed Azure functions for data migration",
      "Full-stack development in Agile team environment",
      "Kept tech stack current and introduced new testing tools",
    ],
  },
  {
    period: "2014 - 2018",
    role: "Lead Frontend Developer",
    company: "TalkTalk",
    type: "Employee",
    achievements: [
      "Delivered new sales site and MyTalkTalk app",
      "Introduced TDD and Continuous Integration practices to teams",
      "Maintained technical vision and introduced new technologies",
      "Recruited and coached new talents, organized Lunch and Learn sessions",
    ],
  },
  {
    period: "2013 - 2014",
    role: "Senior Frontend Developer",
    company: "Keytree",
    type: "Employee",
    achievements: [
      "Consulted for BP, Jaguar Land Rover, and National Grid",
      "Created Angular frontends for legacy SAP applications",
    ],
  },
  {
    period: "2012 - 2013",
    role: "Frontend Developer",
    company: "Emarsys Ltd",
    type: "Employee",
    achievements: [
      "Learned agile philosophy, clean code, and TDD",
      "Part of fast-moving agile development team",
    ],
  },
];

const blogPosts = [
  { title: "My PRs Were Pure AI Slop: A Developer's Confession", file: "01" },
  { title: "I'm More Productive Than Ever and It's Ruining My Career", file: "02" },
  { title: "The Last Two Days of Every Sprint: A Horror Story", file: "03" },
  { title: "2025: The Year Coding Agents Outperformed Developers", file: "04" },
  { title: "The Trust Gap: Why Teams Reject AI-Generated Code", file: "05" },
  { title: "Quality, Speed, Price: The Triangle AI Just Broke", file: "06" },
  { title: "Context Engineering: The Skill That Replaced Coding", file: "07" },
  { title: "How to Not Produce AI Slop: A Framework", file: "08" },
  { title: "The New Developer Onboarding: AI Edition", file: "09" },
  { title: "What Do Developers Become?", file: "10" },
  { title: "The Requirement Is the Product", file: "11" },
  { title: "Earning Less Than Five Years Ago: The Developer's Economic Reality", file: "12" },
  { title: "Brighton, Dogs, and ADHD: Building a Startup While Everything Burns", file: "13" },
  { title: "Why I Still Code When AI Does It Better", file: "14" },
  { title: "A Letter to the Junior Developer of 2026", file: "15" },
];

export default function CVPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto pt-24 pb-12 px-4 max-w-5xl">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">Zoltan Erdos</h1>
              <p className="text-xl text-muted-foreground mb-4">
                Full Stack Developer & AI-Driven Product Builder
              </p>
              <p className="text-lg text-primary font-medium">
                Founder of Spike Land
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <a
                href="mailto:zoltan.erdos@me.com"
                className="hover:text-primary transition-colors"
              >
                zoltan.erdos@me.com
              </a>
              <a
                href="tel:+447514727998"
                className="hover:text-primary transition-colors"
              >
                +44 7514 727998
              </a>
              <a
                href="https://github.com/zerdos"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                github.com/zerdos
              </a>
              <span className="text-muted-foreground">Brighton, UK</span>
            </div>
          </div>
        </section>

        <Separator className="mb-12" />

        {/* About Section */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Passionate Full Stack Developer with 12+ years of experience and a strong focus on
                frontend development backed by substantial backend expertise. I believe in
                Test-Driven Development, clean code, and staying current with the latest tech.
              </p>
              <p>
                In 2025, I discovered something that changed everything: with AI tools like Claude
                Code and Opus 4.5, developers can be 50x more productive. But only if they
                understand context engineering - the skill of giving AI the right information to
                succeed.
              </p>
              <p className="text-primary font-medium">
                "With AI, the impossible triangle is broken. High quality, fast delivery, AND low
                cost are now achievable together."
              </p>
              <p>
                I'm building Spike Land to prove that one person with the right tools and processes
                can build enterprise-grade software. No excuses. No compromises.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Key Metrics */}
        <section className="mb-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="text-center p-4">
              <div className="text-3xl font-bold text-primary">12+</div>
              <div className="text-sm text-muted-foreground">Years Experience</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-3xl font-bold text-primary">5</div>
              <div className="text-sm text-muted-foreground">Packages in Monorepo</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-3xl font-bold text-primary">54</div>
              <div className="text-sm text-muted-foreground">Database Models</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-3xl font-bold text-primary">100+</div>
              <div className="text-sm text-muted-foreground">API Endpoints</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Test Coverage</div>
            </Card>
          </div>
        </section>

        {/* Technical Skills */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Technical Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-muted-foreground">Frontend</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.frontend.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-muted-foreground">Backend</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.backend.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-muted-foreground">DevOps & Cloud</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.devops.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-muted-foreground">Testing</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.testing.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-muted-foreground">AI & Automation</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.ai.map((skill) => (
                    <Badge key={skill} variant="default">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Featured Project */}
        <section className="mb-12">
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-2xl">Featured Project: Spike Land</CardTitle>
              <CardDescription>
                AI-powered platform for creating, modifying, and deploying applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Spike Land started as my playground to push the boundaries of browser-based
                development. Now it's a full production platform proving that one developer with AI
                can build enterprise-grade software.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">What I Built:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Pixel - AI image enhancement app</li>
                    <li>Live code editor with real-time preview</li>
                    <li>MCP Server for Claude integration</li>
                    <li>Mobile apps (iOS, Android, Web)</li>
                    <li>E-commerce with Prodigi integration</li>
                    <li>Complete token economy system</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Tech Stack:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Next.js 15 + TypeScript</li>
                    <li>Cloudflare Workers + Durable Objects</li>
                    <li>PostgreSQL + Prisma</li>
                    <li>Expo 52 for mobile</li>
                    <li>100% test coverage (Vitest + Playwright)</li>
                  </ul>
                </div>
              </div>
              <div className="pt-4">
                <Button asChild>
                  <Link href="/">Visit spike.land</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Work Experience */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Work Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-l-2 border-primary/30 pl-6 ml-2 space-y-8">
                {experience.map((job, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-primary" />
                    <div className="mb-2">
                      <span className="text-sm text-muted-foreground">{job.period}</span>
                      <span className="text-sm text-muted-foreground mx-2">|</span>
                      <Badge variant="outline">{job.type}</Badge>
                    </div>
                    <h3 className="text-lg font-semibold">{job.role}</h3>
                    <p className="text-primary mb-2">{job.company}</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {job.achievements.map((achievement, i) => <li key={i}>{achievement}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Education */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Education</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                <div>
                  <h3 className="font-semibold">Computer Scientist and Mathematician</h3>
                  <p className="text-primary">Eotvos Lorand University, Budapest</p>
                  <p className="text-sm text-muted-foreground">
                    Focus: Parallel programming and distributed systems
                  </p>
                </div>
                <div className="text-sm text-muted-foreground mt-2 md:mt-0">
                  2003 - 2010
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Insights / Blog */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Insights & Writing</CardTitle>
              <CardDescription>
                My thoughts on AI, development, and the changing industry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {blogPosts.map((post) => (
                  <div
                    key={post.file}
                    className="text-sm p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-muted-foreground mr-2">{post.file}.</span>
                    {post.title}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Personal */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                I live in Brighton, UK with my two dogs. I have ADHD, which makes my communication
                style a bit different - but I've learned to turn it into a strength through practice
                and self-improvement.
              </p>
              <p>
                My daily routine is sacred: gym at 6:30am, dog walks throughout the day, structured
                work sessions. Consistency keeps me productive and happy.
              </p>
              <p>
                I'm a geek who loves JavaScript, TypeScript, Docker, distributed systems, and
                mathematics. I still code because I love it - even when AI does it better.
              </p>
              <p className="text-primary font-medium">
                My dream: Build Spike Land into something big. Have an office in Brighton. Work with
                nice people who share the vision.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Philosophy */}
        <section className="mb-12">
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-2xl">Philosophy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">On Quality</h4>
                  <p className="text-sm text-muted-foreground">
                    100% test coverage is not optional. TDD, CI/CD, zero technical debt. If the
                    tests don't pass, it doesn't ship.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">On AI</h4>
                  <p className="text-sm text-muted-foreground">
                    AI output equals function of context plus instructions. Get the context right,
                    and AI becomes your 10x multiplier.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">On Work</h4>
                  <p className="text-sm text-muted-foreground">
                    Money won't make you happy. You need to feel useful, need something interesting,
                    something challenging.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center">
          <p className="text-lg mb-4">
            Available for interesting projects and collaborations.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild>
              <a href="mailto:zoltan.erdos@me.com">Get in Touch</a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://github.com/zerdos"
                target="_blank"
                rel="noopener noreferrer"
              >
                View GitHub
              </a>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
