import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Mail,
  Phone,
  MapPin,
  Link2,
  Briefcase,
  GraduationCap,
  Wrench,
  Plus,
  Trash2,
  Printer,
  RotateCcw,
} from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

type FieldPresetId =
  | "engineering"
  | "design"
  | "marketing"
  | "finance"
  | "legal"
  | "academic"
  | "sales"
  | "general";

const FIELD_PRESETS: Record<
  FieldPresetId,
  { label: string; template: string; data: () => ResumeData }
> = {
  engineering: {
    label: "Software engineering",
    template: "editorial",
    data: () => ({
      name: "Alex Rivera",
      title: "Staff Software Engineer",
      email: "alex.rivera@email.com",
      phone: "+1 (555) 014-2233",
      location: "Seattle, WA",
      website: "",
      linkedin: "linkedin.com/in/alexrivera",
      github: "github.com/alexrivera",
      summary:
        "Staff engineer with 10 years building distributed systems and developer platforms. Led the migration of a 40-service monolith to Kubernetes, cutting deploy time 12x. Prefer boring technology, sharp abstractions, and readable diffs.",
      experience: [
        {
          company: "Dataplane Systems",
          role: "Staff Software Engineer",
          location: "Seattle, WA",
          start: "2021",
          end: "Present",
          bullets: [
            "Led 6 engineers on the platform team; owned the streaming pipeline serving 2B events/day.",
            "Cut infrastructure costs 38% by replacing per-service DBs with a shared CDC cluster.",
            "Introduced an internal dev portal, reducing onboarding time from 3 weeks to 3 days.",
          ],
        },
        {
          company: "Loomworks",
          role: "Senior Software Engineer",
          location: "Remote",
          start: "2017",
          end: "2021",
          bullets: [
            "Built the billing engine processing $40M ARR; 99.99% uptime over 4 years.",
            "Rewrote the search backend in Rust; p95 latency dropped from 800ms to 120ms.",
          ],
        },
      ],
      education: [
        {
          school: "Carnegie Mellon University",
          degree: "B.S. Computer Science",
          location: "Pittsburgh, PA",
          start: "2013",
          end: "2017",
          notes: "Teaching assistant — Data Structures.",
        },
      ],
      projects: [
        {
          name: "Klog",
          link: "github.com/alexrivera/klog",
          description:
            "A structured logging library with 3k GitHub stars; adopted by 40+ teams.",
        },
      ],
      skills: [
        "Go",
        "Rust",
        "Kubernetes",
        "PostgreSQL",
        "gRPC",
        "Terraform",
        "System design",
        "Observability",
      ],
    }),
  },
  design: {
    label: "Design",
    template: "minimal",
    data: () => ({
      name: "Mara Chen",
      title: "Product Designer",
      email: "mara.chen@email.com",
      phone: "+1 (555) 902-4410",
      location: "Brooklyn, NY",
      website: "marachen.design",
      linkedin: "linkedin.com/in/marachen",
      github: "",
      summary:
        "Product designer with 7 years shipping interfaces for fintech and developer tools. I run the loop from research sketches to shipped design systems — and I measure the outcome, not just the mockup.",
      experience: [
        {
          company: "Ledgerline",
          role: "Senior Product Designer",
          location: "New York, NY",
          start: "2021",
          end: "Present",
          bullets: [
            "Redesigned the onboarding flow; activation up 21%, support tickets down 15%.",
            "Built the company design system (58 components, documented variants).",
            "Ran 30+ usability sessions and converted findings into shipped changes.",
          ],
        },
        {
          company: "Studio North",
          role: "Product Designer",
          location: "Brooklyn, NY",
          start: "2018",
          end: "2021",
          bullets: [
            "Shipped 12 client products end-to-end, from workshop to handoff.",
            "Won 2 Awwwards Site of the Day mentions for client work.",
          ],
        },
      ],
      education: [
        {
          school: "Rhode Island School of Design",
          degree: "BFA Graphic Design",
          location: "Providence, RI",
          start: "2014",
          end: "2018",
          notes: "Honors thesis on typography in hostile interfaces.",
        },
      ],
      projects: [
        {
          name: "Typecheck",
          link: "typecheck.xyz",
          description:
            "An open web font comparison tool; featured on Product Hunt (#4 of the day).",
        },
      ],
      skills: [
        "Figma",
        "Design systems",
        "Prototyping",
        "Usability testing",
        "Interaction design",
        "HTML/CSS",
        "Motion",
        "Accessibility",
      ],
    }),
  },
  marketing: {
    label: "Marketing",
    template: "modern",
    data: () => ({
      name: "Sam Okoye",
      title: "Growth Marketing Manager",
      email: "sam.okoye@email.com",
      phone: "+1 (555) 117-8890",
      location: "Chicago, IL",
      website: "",
      linkedin: "linkedin.com/in/samokoye",
      github: "",
      summary:
        "Growth marketer who treats campaigns like experiments. 6 years scaling B2B SaaS from seed to Series C; built the content engine that drives 45% of pipeline today.",
      experience: [
        {
          company: "Fieldnote",
          role: "Growth Marketing Manager",
          location: "Chicago, IL",
          start: "2021",
          end: "Present",
          bullets: [
            "Own full-funnel growth: SEO, lifecycle, paid — CAC down 30% in two years.",
            "Built the SEO program: 0 → 120k organic visits/month.",
            "Launched a referral program worth 11% of new signups within a year.",
          ],
        },
        {
          company: "Brightpath Media",
          role: "Marketing Lead",
          location: "Remote",
          start: "2018",
          end: "2021",
          bullets: [
            "Managed a $400k annual paid budget across Google and Meta.",
            "Grew newsletter from 2k to 40k subscribers; 38% open rate.",
          ],
        },
      ],
      education: [
        {
          school: "Northwestern University",
          degree: "B.A. Communications",
          location: "Evanston, IL",
          start: "2014",
          end: "2018",
          notes: "",
        },
      ],
      projects: [],
      skills: [
        "SEO",
        "Paid social",
        "Lifecycle",
        "Analytics",
        "A/B testing",
        "Content strategy",
        "HubSpot",
        "SQL basics",
      ],
    }),
  },
  finance: {
    label: "Finance",
    template: "classic",
    data: () => ({
      name: "Priya Nair",
      title: "Financial Analyst",
      email: "priya.nair@email.com",
      phone: "+1 (555) 330-7812",
      location: "Jersey City, NJ",
      website: "",
      linkedin: "linkedin.com/in/priyanair",
      github: "",
      summary:
        "Financial analyst with 5 years in investment operations and FP&A. Built the reporting stack that shrank month-end close from 12 days to 5. CFA Level III candidate.",
      experience: [
        {
          company: "Meridian Capital Group",
          role: "Senior Financial Analyst",
          location: "Jersey City, NJ",
          start: "2021",
          end: "Present",
          bullets: [
            "Modeled $1.2B of credit facilities; forecasts within 2% of actuals.",
            "Automated 14 monthly reports with Python, saving 60 analyst-hours/month.",
            "Presented quarterly board packs covering liquidity and covenant headroom.",
          ],
        },
        {
          company: "Arcstone Advisors",
          role: "Financial Analyst",
          location: "New York, NY",
          start: "2019",
          end: "2021",
          bullets: [
            "Supported diligence on 25+ deals totaling $800M in transactions.",
            "Built the firm's first cash-flow dashboard in Power BI.",
          ],
        },
      ],
      education: [
        {
          school: "NYU Stern",
          degree: "B.S. Finance, minor in Data Science",
          location: "New York, NY",
          start: "2015",
          end: "2019",
          notes: "Dean's list; member, investment club.",
        },
      ],
      projects: [],
      skills: [
        "Financial modeling",
        "Excel / VBA",
        "Power BI",
        "Python",
        "SQL",
        "Credit analysis",
        "FP&A",
        "Forecasting",
      ],
    }),
  },
  legal: {
    label: "Legal",
    template: "classic",
    data: () => ({
      name: "Daniel Osei",
      title: "Associate, Corporate Law",
      email: "daniel.osei@email.com",
      phone: "+1 (555) 765-1190",
      location: "Boston, MA",
      website: "",
      linkedin: "linkedin.com/in/danielosei",
      github: "",
      summary:
        "Corporate associate with 4 years advising startups and investors on formation, financing and M&A. Led diligence on 30+ transactions; barred in Massachusetts and New York.",
      experience: [
        {
          company: "Whitmore & Hale LLP",
          role: "Associate",
          location: "Boston, MA",
          start: "2021",
          end: "Present",
          bullets: [
            "Manage formation and venture financing for 40+ portfolio companies.",
            "Lead document diligence on Series A–C rounds totaling $600M.",
            "Drafted employee and contractor templates adopted firm-wide.",
          ],
        },
        {
          company: "Carrigan & Moss",
          role: "Law Clerk",
          location: "New York, NY",
          start: "2019",
          end: "2021",
          bullets: [
            "Supported commercial litigators on contract disputes and discovery.",
            "Prepared motion practice materials and settlement memoranda.",
          ],
        },
      ],
      education: [
        {
          school: "Harvard Law School",
          degree: "J.D.",
          location: "Cambridge, MA",
          start: "2016",
          end: "2019",
          notes: "Harvard Law Review, executive editor.",
        },
        {
          school: "University of Michigan",
          degree: "B.A. Political Science",
          location: "Ann Arbor, MI",
          start: "2012",
          end: "2016",
          notes: "Summa cum laude.",
        },
      ],
      projects: [],
      skills: [
        "Corporate governance",
        "Venture financing",
        "M&A diligence",
        "Contract drafting",
        "Negotiation",
        "Compliance",
      ],
    }),
  },
  academic: {
    label: "Academic",
    template: "editorial",
    data: () => ({
      name: "Dr. Elena Vasquez",
      title: "Postdoctoral Researcher — Computational Biology",
      email: "e.vasquez@university.edu",
      phone: "+1 (555) 228-6630",
      location: "Stanford, CA",
      website: "",
      linkedin: "",
      github: "github.com/elenavasquez",
      summary:
        "Computational biologist studying gene-regulatory networks. 12 peer-reviewed publications (4 first-author), 2,400 citations. Develops open-source tools used by 60+ labs.",
      experience: [
        {
          company: "Stanford University",
          role: "Postdoctoral Fellow",
          location: "Stanford, CA",
          start: "2022",
          end: "Present",
          bullets: [
            "Built a graph-based model of enhancer-promoter interactions; reproduced 3 known disease loci.",
            "Maintain the lab's open-source pipeline suite (2.1k stars combined).",
          ],
        },
        {
          company: "ETH Zürich",
          role: "Research Assistant",
          location: "Zürich, CH",
          start: "2017",
          end: "2022",
          bullets: [
            "Developed the core algorithm behind my dissertation, published in Nature Methods.",
            "Taught graduate-level machine learning for two semesters.",
          ],
        },
      ],
      education: [
        {
          school: "ETH Zürich",
          degree: "Ph.D. Computational Biology",
          location: "Zürich, CH",
          start: "2017",
          end: "2022",
          notes: "Dissertation: 'Network Inference in Noisy Regimes.'",
        },
        {
          school: "National Autonomous University of Mexico",
          degree: "B.Sc. Applied Mathematics",
          location: "Mexico City, MX",
          start: "2012",
          end: "2016",
          notes: "Graduated with honors.",
        },
      ],
      projects: [
        {
          name: "RegNet",
          link: "github.com/elenavasquez/regnet",
          description: "Gene-network inference tool; 600+ citations.",
        },
      ],
      skills: [
        "Python",
        "R",
        "PyTorch",
        "Statistical inference",
        "Single-cell analysis",
        "Scientific writing",
        "Open-source maintenance",
      ],
    }),
  },
  sales: {
    label: "Sales",
    template: "brutal",
    data: () => ({
      name: "Tomas Lindqvist",
      title: "Account Executive — Enterprise SaaS",
      email: "tomas.lindqvist@email.com",
      phone: "+1 (555) 441-9087",
      location: "Austin, TX",
      website: "",
      linkedin: "linkedin.com/in/tomaslindqvist",
      github: "",
      summary:
        "Enterprise AE who closes. 8 years in B2B SaaS; consistently 120%+ of quota, top performer 3 years running. I sell value, run discovery like an interview, and never chase bad fits.",
      experience: [
        {
          company: "Anchorline",
          role: "Enterprise Account Executive",
          location: "Austin, TX",
          start: "2022",
          end: "Present",
          bullets: [
            "Closed $3.1M in new ARR in 2025 — 138% of quota, #1 on the team.",
            "Won 3 of the 5 largest deals in company history ($800k ACV avg).",
            "Built the enterprise demo framework now used by all 12 AEs.",
          ],
        },
        {
          company: "Northbeam Software",
          role: "Account Executive",
          location: "Remote",
          start: "2019",
          end: "2022",
          bullets: [
            "Promoted from SDR to AE in 11 months; $1.4M ARR closed as an AE.",
            "27% win rate on competitive deals, 2.1x team average.",
          ],
        },
      ],
      education: [
        {
          school: "University of Texas at Austin",
          degree: "B.B.A. Marketing",
          location: "Austin, TX",
          start: "2014",
          end: "2018",
          notes: "Varsity debate team captain.",
        },
      ],
      projects: [],
      skills: [
        "Enterprise sales",
        "MEDDIC",
        "Negotiation",
        "Salesforce",
        "Discovery",
        "Forecasting",
        "Cold outreach",
      ],
    }),
  },
  general: {
    label: "General",
    template: "minimal",
    data: () => ({
      name: "Jordan Reyes",
      title: "Operations Manager",
      email: "jordan.reyes@email.com",
      phone: "+1 (555) 884-2210",
      location: "Denver, CO",
      website: "",
      linkedin: "linkedin.com/in/jordanreyes",
      github: "",
      summary:
        "Operations manager with 9 years running teams and processes for mid-size companies. Cut invoice cycle time 40% and built the playbook system the whole org runs on.",
      experience: [
        {
          company: "Summit Logistics",
          role: "Operations Manager",
          location: "Denver, CO",
          start: "2020",
          end: "Present",
          bullets: [
            "Lead a team of 14 across scheduling, QA and vendor management.",
            "Cut average invoice cycle time from 21 to 12 days.",
            "Launched the internal playbook system adopted by 3 other departments.",
          ],
        },
        {
          company: "Clearpath Health",
          role: "Operations Coordinator",
          location: "Boulder, CO",
          start: "2016",
          end: "2020",
          bullets: [
            "Coordinated facility expansion into 4 new markets.",
            "Maintained 99.2% uptime across patient-facing systems.",
          ],
        },
      ],
      education: [
        {
          school: "University of Colorado",
          degree: "B.S. Business Administration",
          location: "Boulder, CO",
          start: "2012",
          end: "2016",
          notes: "",
        },
      ],
      projects: [],
      skills: [
        "Process design",
        "Team leadership",
        "Vendor management",
        "Excel",
        "Budgeting",
        "Project management",
      ],
    }),
  },
};

interface ExperienceItem {
  company: string;
  role: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
}

interface EducationItem {
  school: string;
  degree: string;
  location: string;
  start: string;
  end: string;
  notes: string;
}

interface ProjectItem {
  name: string;
  link: string;
  description: string;
}

interface ResumeData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  skills: string[];
}

type TemplateId = "editorial" | "classic" | "modern" | "brutal" | "minimal";

interface Template {
  id: TemplateId;
  name: string;
  desc: string;
  fonts: { display: string; body: string; mono?: string };
  accent: string;
}

const TEMPLATES: Template[] = [
  {
    id: "editorial",
    name: "Editorial",
    desc: "The MIT thesis look — serif display, hairline rules, quiet authority.",
    fonts: { display: "Playfair Display", body: "Newsreader", mono: "IBM Plex Mono" },
    accent: "#A31F34",
  },
  {
    id: "classic",
    name: "Classic",
    desc: "Traditional, centered header, serif body. Safe for conservative fields.",
    fonts: { display: "Libre Caslon Text", body: "Crimson Pro" },
    accent: "#111111",
  },
  {
    id: "modern",
    name: "Modern",
    desc: "Two-column with accent sidebar and tag chips. Built for ATS and humans.",
    fonts: { display: "Space Grotesk", body: "Inter", mono: "JetBrains Mono" },
    accent: "#0F6CBD",
  },
  {
    id: "brutal",
    name: "Brutalist",
    desc: "Our house style — bold type, thick rules, no apologies. For loud fields.",
    fonts: { display: "Archivo Black", body: "Space Grotesk", mono: "IBM Plex Mono" },
    accent: "#FFD84D",
  },
  {
    id: "minimal",
    name: "Minimal",
    desc: "One column, generous whitespace, dot separators. Lets content speak.",
    fonts: { display: "Fraunces", body: "Work Sans", mono: "JetBrains Mono" },
    accent: "#111111",
  },
];

function loadFonts(t: Template) {
  const families = [t.fonts.display, t.fonts.body, t.fonts.mono].filter((f): f is string => Boolean(f));
  const href = `https://fonts.googleapis.com/css2?${families
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700;800;900`)
    .join("&")}&display=swap`;
  let link = document.getElementById("resume-fonts") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = "resume-fonts";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = href;
}

const A4_W = 794;
const A4_H = 1123;

function bulletsOf(s: string): string[] {
  return s.split("\n").map((l) => l.trim()).filter(Boolean);
}

function ContactRow({ data, template }: { data: ResumeData; template: Template }) {
  const items = [
    data.email && <Mail key="e" className="h-3 w-3" aria-hidden="true" />,
    data.phone && <Phone key="p" className="h-3 w-3" aria-hidden="true" />,
    data.location && <MapPin key="l" className="h-3 w-3" aria-hidden="true" />,
    data.website && <Link2 key="w" className="h-3 w-3" aria-hidden="true" />,
    data.linkedin && <Link2 key="i" className="h-3 w-3" aria-hidden="true" />,
    data.github && <Link2 key="g" className="h-3 w-3" aria-hidden="true" />,
  ];
  const texts = [
    data.email,
    data.phone,
    data.location,
    data.website,
    data.linkedin,
    data.github,
  ].filter(Boolean) as string[];
  return (
    <p
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
      style={{ fontFamily: template.fonts.mono || template.fonts.body, fontSize: 10.5, color: "rgba(17,17,17,0.75)" }}
    >
      {texts.map((t, i) => (
        <span key={i} className="flex items-center gap-1">
          {items[i]}
          <span>{t}</span>
        </span>
      ))}
    </p>
  );
}

function SectionTitle({ children, template }: { children: string; template: Template }) {
  const s = { borderBottom: `1.5px solid ${template.accent}`, fontFamily: template.fonts.display };
  if (template.id === "brutal") {
    return (
      <h3 className="mb-3 mt-4 px-2 font-bold uppercase" style={{ ...s, background: template.accent, color: "#111", border: "none", padding: "4px 8px", fontSize: 12, letterSpacing: 1.5 }}>
        {children}
      </h3>
    );
  }
  if (template.id === "classic") {
    return (
      <h3 className="mb-3 mt-4 font-bold uppercase tracking-[0.2em]" style={{ ...s, paddingBottom: 3, fontSize: 12, color: "#111" }}>
        {children}
      </h3>
    );
  }
  if (template.id === "editorial") {
    return (
      <h3 className="mb-3 mt-4 font-semibold uppercase" style={{ ...s, paddingBottom: 4, fontSize: 12, letterSpacing: 2, color: "#111" }}>
        {children}
      </h3>
    );
  }
  return (
    <h3 className="mb-3 mt-4 font-bold uppercase" style={{ ...s, paddingBottom: 3, fontSize: 12, letterSpacing: 1.2, color: "#111" }}>
      {children}
    </h3>
  );
}

function ResumeView({ data, template }: { data: ResumeData; template: Template }) {
  const d = template.fonts.display;
  const b = template.fonts.body;
  const m = template.fonts.mono || template.fonts.body;
  const a = template.accent;
  const ink = "#111111";

  if (template.id === "editorial") {
    return (
      <div className="flex h-full flex-col px-16 py-14" style={{ fontFamily: b }}>
        <header className="text-center">
          <p className="font-semibold uppercase" style={{ fontFamily: m, fontSize: 10, letterSpacing: 3, color: a }}>
            Curriculum Vitae
          </p>
          <h1 className="mt-3 font-bold" style={{ fontFamily: d, fontSize: 44, lineHeight: 1.05, color: ink }}>
            {data.name}
          </h1>
          <p className="mt-2 text-[13px] italic" style={{ color: "rgba(17,17,17,0.75)" }}>
            {data.title}
          </p>
          <div className="mx-auto mt-4 h-px w-16" style={{ background: a }} />
          <div className="mt-4">
            <ContactRow data={data} template={template} />
          </div>
        </header>

        <section className="mt-6">
          <SectionTitle template={template}>Profile</SectionTitle>
          <p className="text-[11.5px] leading-relaxed" style={{ color: "rgba(17,17,17,0.85)" }}>{data.summary}</p>
        </section>

        <section className="mt-3 flex-1">
          <SectionTitle template={template}>Experience</SectionTitle>
          <div className="space-y-4">
            {data.experience.map((e, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between">
                  <h4 className="text-[12.5px] font-bold" style={{ color: ink }}>{e.role}</h4>
                  <p className="text-[10px]" style={{ fontFamily: m, color: "rgba(17,17,17,0.6)" }}>
                    {e.start} — {e.end}
                  </p>
                </div>
                <p className="text-[11px] font-semibold" style={{ color: a }}>{e.company} · {e.location}</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4">
                  {e.bullets.map((bl, j) => (
                    <li key={j} className="text-[11px] leading-relaxed" style={{ color: "rgba(17,17,17,0.85)" }}>
                      {bl}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-8">
          <section>
            <SectionTitle template={template}>Education</SectionTitle>
            {data.education.map((ed, i) => (
              <div key={i} className="mb-3">
                <h4 className="text-[12px] font-bold" style={{ color: ink }}>{ed.degree}</h4>
                <p className="text-[11px] font-semibold" style={{ color: a }}>{ed.school}</p>
                <p className="text-[10px]" style={{ fontFamily: m, color: "rgba(17,17,17,0.6)" }}>
                  {ed.start} — {ed.end} {ed.location && `· ${ed.location}`}
                </p>
                {ed.notes && <p className="text-[10.5px]" style={{ color: "rgba(17,17,17,0.7)" }}>{ed.notes}</p>}
              </div>
            ))}
          </section>
          <section>
            <SectionTitle template={template}>Skills</SectionTitle>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {data.skills.map((s, i) => (
                <span key={i} className="text-[11px]" style={{ color: "rgba(17,17,17,0.85)" }}>
                  {s}
                  {i < data.skills.length - 1 ? " ·" : ""}
                </span>
              ))}
            </div>
            {data.projects.length > 0 && (
              <div className="mt-4">
                <SectionTitle template={template}>Selected Work</SectionTitle>
                {data.projects.map((p, i) => (
                  <div key={i} className="mb-2">
                    <h4 className="text-[11.5px] font-bold" style={{ color: ink }}>
                      {p.name} {p.link && <span className="font-normal" style={{ fontFamily: m, fontSize: 9.5, color: a }}>{p.link}</span>}
                    </h4>
                    <p className="text-[10.5px]" style={{ color: "rgba(17,17,17,0.7)" }}>{p.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (template.id === "classic") {
    return (
      <div className="flex h-full flex-col px-14 py-12" style={{ fontFamily: b }}>
        <header className="text-center">
          <h1 className="font-bold uppercase" style={{ fontFamily: d, fontSize: 34, letterSpacing: 2, color: ink }}>
            {data.name}
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: "rgba(17,17,17,0.8)" }}>{data.title}</p>
          <div className="mt-3">
            <ContactRow data={data} template={template} />
          </div>
          <div className="mx-auto mt-4 h-[2px] w-24" style={{ background: a }} />
        </header>
        <section className="mt-5">
          <SectionTitle template={template}>Summary</SectionTitle>
          <p className="text-[11.5px] leading-relaxed" style={{ color: "rgba(17,17,17,0.85)" }}>{data.summary}</p>
        </section>
        <section className="mt-2 flex-1">
          <SectionTitle template={template}>Professional Experience</SectionTitle>
          {data.experience.map((e, i) => (
            <div key={i} className="mb-4">
              <div className="flex items-baseline justify-between">
                <h4 className="text-[12.5px] font-bold" style={{ color: ink }}>
                  {e.role}, <span className="italic">{e.company}</span>
                </h4>
                <p className="text-[10.5px] italic" style={{ color: "rgba(17,17,17,0.6)" }}>{e.start} – {e.end}</p>
              </div>
              <p className="text-[11px]" style={{ color: "rgba(17,17,17,0.6)" }}>{e.location}</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                {e.bullets.map((bl, j) => (
                  <li key={j} className="text-[11px] leading-relaxed" style={{ color: "rgba(17,17,17,0.85)" }}>{bl}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
        <section className="mt-3">
          <SectionTitle template={template}>Education</SectionTitle>
          {data.education.map((ed, i) => (
            <div key={i} className="mb-2 flex items-baseline justify-between">
              <h4 className="text-[12px] font-bold" style={{ color: ink }}>{ed.degree} — {ed.school}</h4>
              <p className="text-[10.5px] italic" style={{ color: "rgba(17,17,17,0.6)" }}>{ed.start} – {ed.end}</p>
            </div>
          ))}
        </section>
        <section className="mt-3">
          <SectionTitle template={template}>Skills</SectionTitle>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {data.skills.map((s, i) => (
              <span key={i} className="text-[11px]" style={{ color: "rgba(17,17,17,0.85)" }}>{s}</span>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (template.id === "modern") {
    return (
      <div className="flex h-full" style={{ fontFamily: b }}>
        <aside className="flex w-[240px] shrink-0 flex-col px-7 py-12 text-white" style={{ background: a }}>
          <h1 className="text-[24px] font-bold leading-tight" style={{ fontFamily: d }}>{data.name}</h1>
          <p className="mt-1 text-[11.5px] font-medium opacity-80">{data.title}</p>
          <div className="mt-5 space-y-1.5 text-[10px] opacity-90">
            {[data.email, data.phone, data.location, data.website, data.linkedin, data.github].filter(Boolean).map((c, i) => (
              <p key={i} className="break-all">{c}</p>
            ))}
          </div>
          <div className="mt-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-90">Skills</h3>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {data.skills.map((s, i) => (
                <span key={i} className="rounded-sm bg-white/15 px-2 py-1 text-[9.5px] font-medium">{s}</span>
              ))}
            </div>
          </div>
          <div className="mt-auto">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-90">Links</h3>
            <div className="mt-2 space-y-1 text-[10px] break-all opacity-90">
              {data.github && <p>GitHub — {data.github}</p>}
              {data.linkedin && <p>LinkedIn — {data.linkedin}</p>}
            </div>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col px-9 py-12">
          <section>
            <h3 className="border-b-2 pb-1 text-[11.5px] font-bold uppercase tracking-[0.18em]" style={{ borderColor: a, color: a, fontFamily: d }}>Profile</h3>
            <p className="mt-2.5 text-[11px] leading-relaxed" style={{ color: "rgba(17,17,17,0.85)" }}>{data.summary}</p>
          </section>
          <section className="mt-5">
            <h3 className="border-b-2 pb-1 text-[11.5px] font-bold uppercase tracking-[0.18em]" style={{ borderColor: a, color: a, fontFamily: d }}>Experience</h3>
            <div className="mt-3 space-y-4">
              {data.experience.map((e, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-[12px] font-bold" style={{ color: ink }}>{e.role}</h4>
                    <p className="text-[9.5px]" style={{ fontFamily: m, color: "rgba(17,17,17,0.55)" }}>{e.start} — {e.end}</p>
                  </div>
                  <p className="text-[10.5px] font-semibold" style={{ color: a }}>{e.company} · {e.location}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {e.bullets.map((bl, j) => (
                      <li key={j} className="text-[10.5px] leading-snug" style={{ color: "rgba(17,17,17,0.85)" }}>{bl}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          <section className="mt-5">
            <h3 className="border-b-2 pb-1 text-[11.5px] font-bold uppercase tracking-[0.18em]" style={{ borderColor: a, color: a, fontFamily: d }}>Education</h3>
            <div className="mt-3 space-y-3">
              {data.education.map((ed, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-[11.5px] font-bold" style={{ color: ink }}>{ed.degree}</h4>
                    <p className="text-[9.5px]" style={{ fontFamily: m, color: "rgba(17,17,17,0.55)" }}>{ed.start} — {ed.end}</p>
                  </div>
                  <p className="text-[10.5px] font-semibold" style={{ color: a }}>{ed.school} · {ed.location}</p>
                  {ed.notes && <p className="text-[10px]" style={{ color: "rgba(17,17,17,0.65)" }}>{ed.notes}</p>}
                </div>
              ))}
            </div>
          </section>
          {data.projects.length > 0 && (
            <section className="mt-5">
              <h3 className="border-b-2 pb-1 text-[11.5px] font-bold uppercase tracking-[0.18em]" style={{ borderColor: a, color: a, fontFamily: d }}>Projects</h3>
              <div className="mt-3 space-y-2">
                {data.projects.map((p, i) => (
                  <div key={i}>
                    <h4 className="text-[11.5px] font-bold" style={{ color: ink }}>{p.name}</h4>
                    <p className="text-[10.5px]" style={{ color: "rgba(17,17,17,0.85)" }}>{p.description}</p>
                    {p.link && <p className="text-[9.5px]" style={{ fontFamily: m, color: a }}>{p.link}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  if (template.id === "brutal") {
    return (
      <div className="flex h-full flex-col p-0" style={{ fontFamily: b }}>
        <header className="px-10 pt-10 pb-6" style={{ borderBottom: `6px solid ${ink}` }}>
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-[42px] font-bold leading-none uppercase tracking-tight" style={{ fontFamily: d, color: ink }}>
                {data.name}
              </h1>
              <p className="mt-2 inline-block px-2 py-0.5 text-[12px] font-bold uppercase" style={{ background: a, color: ink, fontFamily: m }}>
                {data.title}
              </p>
            </div>
            <div className="text-right text-[10px] font-semibold uppercase leading-relaxed" style={{ fontFamily: m, color: ink }}>
              {data.email && <p>{data.email}</p>}
              {data.phone && <p>{data.phone}</p>}
              {data.location && <p>{data.location}</p>}
              {data.website && <p>{data.website}</p>}
              {data.linkedin && <p>{data.linkedin}</p>}
              {data.github && <p>{data.github}</p>}
            </div>
          </div>
        </header>
        <div className="flex-1 px-10 py-6">
          <SectionTitle template={template}>Profile</SectionTitle>
          <p className="text-[11.5px] leading-relaxed font-medium" style={{ color: ink }}>{data.summary}</p>
          <SectionTitle template={template}>Experience</SectionTitle>
          {data.experience.map((e, i) => (
            <div key={i} className="mb-5">
              <div className="flex items-baseline justify-between border-2 border-ink px-2 py-1.5" style={{ background: i % 2 === 0 ? "rgba(255,216,77,0.18)" : "transparent" }}>
                <h4 className="text-[13px] font-bold uppercase" style={{ fontFamily: d, color: ink }}>{e.role}</h4>
                <p className="text-[10px] font-bold" style={{ fontFamily: m, color: ink }}>{e.start}—{e.end}</p>
              </div>
              <p className="mt-1 text-[11px] font-bold" style={{ color: ink }}>{e.company} <span className="font-semibold opacity-60">/{e.location}</span></p>
              <ul className="mt-1.5 space-y-1 pl-2">
                {e.bullets.map((bl, j) => (
                  <li key={j} className="flex gap-2 text-[11px] leading-snug font-medium" style={{ color: ink }}>
                    <span className="shrink-0 font-bold" style={{ color: a }}>▸</span>{bl}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6 border-t-[4px] px-10 py-6" style={{ borderColor: ink }}>
          <div>
            <SectionTitle template={template}>Education</SectionTitle>
            {data.education.map((ed, i) => (
              <div key={i} className="mb-3">
                <h4 className="text-[12px] font-bold uppercase" style={{ fontFamily: d, color: ink }}>{ed.degree}</h4>
                <p className="text-[11px] font-semibold" style={{ color: ink }}>{ed.school}</p>
                <p className="text-[10px] font-bold" style={{ fontFamily: m, color: ink, opacity: 0.6 }}>{ed.start}—{ed.end} {ed.location && `/ ${ed.location}`}</p>
                {ed.notes && <p className="text-[10.5px]" style={{ color: ink, opacity: 0.75 }}>{ed.notes}</p>}
              </div>
            ))}
          </div>
          <div>
            <SectionTitle template={template}>Skills</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {data.skills.map((s, i) => (
                <span key={i} className="border-2 border-ink px-2 py-0.5 text-[10px] font-bold uppercase" style={{ fontFamily: m, color: ink }}>
                  {s}
                </span>
              ))}
            </div>
            {data.projects.length > 0 && (
              <div className="mt-4">
                <SectionTitle template={template}>Projects</SectionTitle>
                {data.projects.map((p, i) => (
                  <p key={i} className="mb-1 text-[10.5px] font-semibold" style={{ color: ink }}>
                    <span className="font-bold" style={{ color: a }}>{p.name}</span> — {p.description}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col px-14 py-14" style={{ fontFamily: b }}>
      <header>
        <h1 className="text-[40px] font-bold leading-none" style={{ fontFamily: d, color: ink }}>{data.name}</h1>
        <p className="mt-2 text-[13px] font-medium" style={{ color: "rgba(17,17,17,0.7)" }}>{data.title}</p>
        <div className="mt-4">
          <ContactRow data={data} template={template} />
        </div>
      </header>
      <section className="mt-6">
        <SectionTitle template={template}>Profile</SectionTitle>
        <p className="text-[11.5px] leading-relaxed" style={{ color: "rgba(17,17,17,0.85)" }}>{data.summary}</p>
      </section>
      <section className="mt-2 flex-1">
        <SectionTitle template={template}>Experience</SectionTitle>
        <div className="space-y-5">
          {data.experience.map((e, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between">
                <h4 className="text-[12.5px] font-bold" style={{ color: ink }}>{e.role}</h4>
                <p className="text-[10px]" style={{ fontFamily: m, color: "rgba(17,17,17,0.55)" }}>{e.start} — {e.end}</p>
              </div>
              <p className="text-[11px] font-medium" style={{ color: "rgba(17,17,17,0.65)" }}>
                {e.company} · {e.location}
              </p>
              <ul className="mt-1.5 space-y-1">
                {e.bullets.map((bl, j) => (
                  <li key={j} className="flex gap-2 text-[11px] leading-relaxed" style={{ color: "rgba(17,17,17,0.85)" }}>
                    <span className="shrink-0 text-[8px]" style={{ color: a }}>●</span>
                    {bl}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <div className="mt-5 grid grid-cols-2 gap-10">
        <section>
          <SectionTitle template={template}>Education</SectionTitle>
          {data.education.map((ed, i) => (
            <div key={i} className="mb-3">
              <h4 className="text-[11.5px] font-bold" style={{ color: ink }}>{ed.degree}</h4>
              <p className="text-[10.5px]" style={{ color: "rgba(17,17,17,0.65)" }}>{ed.school}</p>
              <p className="text-[9.5px]" style={{ fontFamily: m, color: "rgba(17,17,17,0.55)" }}>{ed.start} — {ed.end}{ed.location ? ` · ${ed.location}` : ""}</p>
              {ed.notes && <p className="text-[10px]" style={{ color: "rgba(17,17,17,0.7)" }}>{ed.notes}</p>}
            </div>
          ))}
        </section>
        <section>
          <SectionTitle template={template}>Skills</SectionTitle>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {data.skills.map((s, i) => (
              <span key={i} className="text-[11px]" style={{ color: "rgba(17,17,17,0.85)" }}>
                {s}{i < data.skills.length - 1 ? "," : ""}
              </span>
            ))}
          </div>
          {data.projects.length > 0 && (
            <div className="mt-5">
              <SectionTitle template={template}>Projects</SectionTitle>
              {data.projects.map((p, i) => (
                <div key={i} className="mb-2">
                  <h4 className="text-[11px] font-bold" style={{ color: ink }}>{p.name}</h4>
                  <p className="text-[10px]" style={{ color: "rgba(17,17,17,0.65)" }}>{p.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const fieldInput =
  "w-full rounded-md border-2 border-ink bg-surface-muted px-2.5 py-1.5 font-mono text-xs font-semibold text-ink outline-none placeholder:text-ink/30 focus:border-yellow";

function Field({ label, value, onChange, textarea }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={cn(fieldInput, "mt-0.5 resize-y leading-relaxed")}
        />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={cn(fieldInput, "mt-0.5")} />
      )}
    </label>
  );
}

export function ResumeBuilder() {
  const [preset, setPreset] = useState<FieldPresetId>("engineering");
  const [data, setData] = useState<ResumeData>(() => FIELD_PRESETS.engineering.data());
  const [templateId, setTemplateId] = useState<TemplateId>("editorial");
  const [scale, setScale] = useState(0.5);
  const previewRef = useRef<HTMLDivElement>(null);

  const template = TEMPLATES.find((t) => t.id === templateId)!;

  useEffect(() => {
    loadFonts(template);
  }, [template]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const measure = () => setScale(Math.min(1, el.clientWidth / A4_W));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const set = (patch: Partial<ResumeData>) => setData((d) => ({ ...d, ...patch }));
  const setExp = (i: number, patch: Partial<ExperienceItem>) =>
    setData((d) => ({ ...d, experience: d.experience.map((e, j) => (j === i ? { ...e, ...patch } : e)) }));
  const setEdu = (i: number, patch: Partial<EducationItem>) =>
    setData((d) => ({ ...d, education: d.education.map((e, j) => (j === i ? { ...e, ...patch } : e)) }));
  const setProj = (i: number, patch: Partial<ProjectItem>) =>
    setData((d) => ({ ...d, projects: d.projects.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

  const applyPreset = (p: FieldPresetId) => {
    setPreset(p);
    const presetData = FIELD_PRESETS[p].data();
    setData(presetData);
    setTemplateId(presetData && FIELD_PRESETS[p].template === "brutal" ? "brutal" : (FIELD_PRESETS[p].template as TemplateId));
  };

  const print = () => {
    window.print();
  };

  const reset = () => {
    const d = FIELD_PRESETS[preset].data();
    setData(d);
    setTemplateId(FIELD_PRESETS[preset].template as TemplateId);
  };

  const estimatedLines = useMemo(() => {
    let lines = 4 + data.summary.split("\n").length;
    for (const e of data.experience) lines += 3 + e.bullets.length;
    lines += data.education.length * 2 + 2;
    lines += data.skills.length / 3;
    lines += data.projects.length * 2;
    return lines;
  }, [data]);

  return (
    <ToolShell
      crumb="RESUME-BUILDER"
      title="The papers."
      tagline="Build a resume that exports to a clean PDF — no signup to download your own work. Templates for every field."
    >
      <div className="mt-10 grid gap-6 xl:grid-cols-[380px_1fr]">
        {/* ---- Editor ---- */}
        <div className="order-2 max-h-[85vh] space-y-5 overflow-auto pr-1 xl:order-1">
          <section className="rounded-lg border-[3px] border-ink bg-surface p-4 shadow-brutal-md">
            <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [01] Your field
              <Briefcase className="h-4 w-4" aria-hidden="true" />
            </h2>
            <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
              Picks the sample content, sections and a matching template
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(Object.keys(FIELD_PRESETS) as FieldPresetId[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={cn(
                    "rounded-md border-2 border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-[background-color,shadow] duration-200 ease-brutal",
                    preset === p ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                  )}
                >
                  {FIELD_PRESETS[p].label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border-[3px] border-ink bg-surface p-4 shadow-brutal-md">
            <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [02] Template
              <FileText className="h-4 w-4" aria-hidden="true" />
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  className={cn(
                    "rounded-md border-2 border-ink p-2.5 text-left transition-[background-color,shadow] duration-200 ease-brutal",
                    templateId === t.id ? "bg-yellow shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                  )}
                >
                  <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink">{t.name}</p>
                  <p className="mt-0.5 font-mono text-[9px] leading-snug text-ink/60">{t.desc}</p>
                  <p className="mt-1.5 font-mono text-[9px] font-semibold text-ink/50">
                    {t.fonts.display} / {t.fonts.body}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border-[3px] border-ink bg-surface p-4 shadow-brutal-md">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[03] Contact</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Field label="Full name" value={data.name} onChange={(v) => set({ name: v })} />
              <Field label="Title" value={data.title} onChange={(v) => set({ title: v })} />
              <Field label="Email" value={data.email} onChange={(v) => set({ email: v })} />
              <Field label="Phone" value={data.phone} onChange={(v) => set({ phone: v })} />
              <Field label="Location" value={data.location} onChange={(v) => set({ location: v })} />
              <Field label="Website" value={data.website} onChange={(v) => set({ website: v })} />
              <Field label="LinkedIn" value={data.linkedin} onChange={(v) => set({ linkedin: v })} />
              <Field label="GitHub" value={data.github} onChange={(v) => set({ github: v })} />
            </div>
            <div className="mt-3">
              <Field label="Summary / profile" value={data.summary} onChange={(v) => set({ summary: v })} textarea />
            </div>
          </section>

          <section className="rounded-lg border-[3px] border-ink bg-surface p-4 shadow-brutal-md">
            <h2 className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [04] Experience
              <button type="button" onClick={() => set({ experience: [...data.experience, { company: "", role: "", location: "", start: "", end: "", bullets: [] }] })}
                className="flex items-center gap-1 rounded-md border-2 border-ink bg-yellow px-2 py-1 font-mono text-[10px] font-bold text-ink transition-transform duration-200 ease-brutal hover:translate-y-0.5">
                <Plus className="h-3 w-3" aria-hidden="true" /> Add
              </button>
            </h2>
            <div className="mt-3 space-y-4">
              {data.experience.map((e, i) => (
                <div key={i} className="rounded-md border-2 border-ink bg-surface-muted p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">#{i + 1}</p>
                    <button type="button" onClick={() => set({ experience: data.experience.filter((_, j) => j !== i) })}
                      className="rounded-md border-2 border-ink bg-surface px-1.5 py-0.5 text-ink transition-colors duration-200 ease-brutal hover:bg-red" aria-label={`Remove experience ${i + 1}`}>
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Field label="Role" value={e.role} onChange={(v) => setExp(i, { role: v })} />
                    <Field label="Company" value={e.company} onChange={(v) => setExp(i, { company: v })} />
                    <Field label="Location" value={e.location} onChange={(v) => setExp(i, { location: v })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Start" value={e.start} onChange={(v) => setExp(i, { start: v })} />
                      <Field label="End" value={e.end} onChange={(v) => setExp(i, { end: v })} />
                    </div>
                  </div>
                  <label className="mt-2 block">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50">
                      Bullets — one per line
                    </span>
                    <textarea
                      value={e.bullets.join("\n")}
                      onChange={(ev) => setExp(i, { bullets: bulletsOf(ev.target.value) })}
                      rows={3}
                      className={cn(fieldInput, "mt-0.5 resize-y leading-relaxed")}
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border-[3px] border-ink bg-surface p-4 shadow-brutal-md">
            <h2 className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [05] Education
              <button type="button" onClick={() => set({ education: [...data.education, { school: "", degree: "", location: "", start: "", end: "", notes: "" }] })}
                className="flex items-center gap-1 rounded-md border-2 border-ink bg-yellow px-2 py-1 font-mono text-[10px] font-bold text-ink transition-transform duration-200 ease-brutal hover:translate-y-0.5">
                <Plus className="h-3 w-3" aria-hidden="true" /> Add
              </button>
            </h2>
            <div className="mt-3 space-y-4">
              {data.education.map((ed, i) => (
                <div key={i} className="rounded-md border-2 border-ink bg-surface-muted p-3">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                      <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" /> #{i + 1}
                    </p>
                    <button type="button" onClick={() => set({ education: data.education.filter((_, j) => j !== i) })}
                      className="rounded-md border-2 border-ink bg-surface px-1.5 py-0.5 text-ink transition-colors duration-200 ease-brutal hover:bg-red" aria-label={`Remove education ${i + 1}`}>
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Field label="Degree" value={ed.degree} onChange={(v) => setEdu(i, { degree: v })} />
                    <Field label="School" value={ed.school} onChange={(v) => setEdu(i, { school: v })} />
                    <Field label="Location" value={ed.location} onChange={(v) => setEdu(i, { location: v })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Start" value={ed.start} onChange={(v) => setEdu(i, { start: v })} />
                      <Field label="End" value={ed.end} onChange={(v) => setEdu(i, { end: v })} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Field label="Notes (honors, GPA, clubs…)" value={ed.notes} onChange={(v) => setEdu(i, { notes: v })} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border-[3px] border-ink bg-surface p-4 shadow-brutal-md">
            <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [06] Skills
              <Wrench className="h-4 w-4" aria-hidden="true" />
            </h2>
            <label className="mt-3 block">
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50">
                Comma separated
              </span>
              <input
                value={data.skills.join(", ")}
                onChange={(e) => set({ skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                className={cn(fieldInput, "mt-0.5")}
              />
            </label>
          </section>

          <section className="rounded-lg border-[3px] border-ink bg-surface p-4 shadow-brutal-md">
            <h2 className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [07] Projects / selected work
              <button type="button" onClick={() => set({ projects: [...data.projects, { name: "", link: "", description: "" }] })}
                className="flex items-center gap-1 rounded-md border-2 border-ink bg-yellow px-2 py-1 font-mono text-[10px] font-bold text-ink transition-transform duration-200 ease-brutal hover:translate-y-0.5">
                <Plus className="h-3 w-3" aria-hidden="true" /> Add
              </button>
            </h2>
            <div className="mt-3 space-y-3">
              {data.projects.map((p, i) => (
                <div key={i} className="rounded-md border-2 border-ink bg-surface-muted p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">#{i + 1}</p>
                    <button type="button" onClick={() => set({ projects: data.projects.filter((_, j) => j !== i) })}
                      className="rounded-md border-2 border-ink bg-surface px-1.5 py-0.5 text-ink transition-colors duration-200 ease-brutal hover:bg-red" aria-label={`Remove project ${i + 1}`}>
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Field label="Name" value={p.name} onChange={(v) => setProj(i, { name: v })} />
                    <Field label="Link" value={p.link} onChange={(v) => setProj(i, { link: v })} />
                  </div>
                  <div className="mt-2">
                    <Field label="What it does / outcome" value={p.description} onChange={(v) => setProj(i, { description: v })} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex gap-2">
            <Button onClick={print} size="md" className="flex-1 uppercase">
              <Printer className="h-4 w-4" aria-hidden="true" /> Print / Save PDF
            </Button>
            <Button variant="secondary" onClick={reset} className="uppercase">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
            </Button>
          </div>
        </div>

        {/* ---- Preview ---- */}
        <div className="order-1 xl:order-2">
          <div className="flex items-center justify-between rounded-t-lg border-[3px] border-ink bg-ink px-4 py-2.5">
            <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-paper">
              [08] Live preview — {template.name} template
            </p>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-paper/50">
              ~{estimatedLines} lines · {A4_W}×{A4_H}px
            </p>
          </div>
          <div ref={previewRef} className="overflow-hidden rounded-b-lg border-[3px] border-t-0 border-ink bg-paper p-3">
            <div
              className="mx-auto origin-top overflow-hidden rounded-sm shadow-brutal-md"
              style={{
                width: A4_W * scale,
                height: A4_H * scale,
                background: "#fff",
              }}
            >
              <div className="origin-top-left" style={{ transform: `scale(${scale})`, width: A4_W, height: A4_H }}>
                <ResumeView data={data} template={template} />
              </div>
            </div>
            <p className="mt-3 text-center font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
              Preview is scaled — print output is full A4
            </p>
          </div>
        </div>
      </div>

      {/* Print target */}
      <div className="resume-print-root">
        <div className="resume-print-page">
          <ResumeView data={data} template={template} />
        </div>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Everything stays in your tab. "Save as PDF" in the print dialog — your work is yours, no download wall.
      </p>
    </ToolShell>
  );
}