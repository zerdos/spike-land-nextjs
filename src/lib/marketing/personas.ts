/**
 * Marketing Personas Data
 *
 * Customer personas for Pixel AI Photo Enhancement marketing campaigns.
 * Based on docs/MARKETING_PERSONAS.md
 */

export interface Persona {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  demographics: {
    age: string;
    gender: string;
    income: string;
    location: string;
    platform: string;
  };
  psychographics: string[];
  painPoints: string[];
  triggers: string[];
  primaryHook: string;
  adCopyVariations: string[];
  contentIdeas: string[];
  priority: "primary" | "secondary";
  emoji: string;
  note?: string;
}

export const PERSONAS: Persona[] = [
  {
    id: "1",
    slug: "tech-savvy-grandson",
    name: "The Tech-Savvy Grandson",
    tagline: "Make grandma cry (happy tears)",
    demographics: {
      age: "25-35",
      gender: "Mixed",
      income: "£30-60k",
      location: "Urban/Suburban UK",
      platform: "Instagram, TikTok",
    },
    psychographics: [
      "Values family connections but lives away from home",
      "Tech-forward, early adopter of new apps",
      "Active on social media, shares content regularly",
      "Enjoys impressing older family members with technology",
    ],
    painPoints: [
      "Grandparents have boxes of faded photos they treasure",
      "Family photos are scattered across old devices",
      "Wants meaningful gifts but hates shopping",
      "Feels disconnected from family history",
    ],
    triggers: [
      "Family birthdays and anniversaries",
      "Christmas/holiday gatherings",
      "Grandparent health scares",
      "Visiting family home",
    ],
    primaryHook: "Make grandma cry (happy tears)",
    adCopyVariations: [
      "Restored my grandmother's wedding photo. She didn't stop hugging me for 10 minutes.",
      "My grandad thought I was a wizard. All I did was upload his 1960s photos.",
      "The best gift I ever gave cost me 60 seconds and zero shipping.",
    ],
    contentIdeas: [
      "Before/after reaction videos (grandparent seeing restored photo)",
      "POV: You're about to make grandma cry",
      "Tutorial: How I restored 50 years of family photos",
    ],
    priority: "primary",
    emoji: "👨‍💻",
  },
  {
    id: "2",
    slug: "social-media-historian",
    name: "The Social Media Historian",
    tagline: "Throwback Thursday just got an upgrade",
    demographics: {
      age: "18-30",
      gender: "60% Female",
      income: "£20-40k",
      location: "UK (all areas)",
      platform: "TikTok, Instagram Reels",
    },
    psychographics: [
      "Lives online, content creator mindset",
      "Loves nostalgic trends (#TBT, #ThrowbackThursday)",
      "Seeks engagement and shares on social",
      "Appreciates aesthetic transformations",
    ],
    painPoints: [
      "Old photos look terrible on modern screens",
      "Embarrassed by low-quality childhood photos",
      "Wants viral content but needs unique angles",
      "Runs out of interesting content ideas",
    ],
    triggers: [
      "Throwback Thursday posts",
      "Birthday posts of self/friends",
      "Trending nostalgia content",
      "Milestone birthdays (21, 25, 30)",
    ],
    primaryHook: "Throwback Thursday just got an upgrade",
    adCopyVariations: [
      "My 2008 flip phone photos are now HD. The internet wasn't ready.",
      "Turned my embarrassing baby photos into actual content.",
      "Before: blurry mess. After: main character energy.",
    ],
    contentIdeas: [
      "Transformation reels with trending audio",
      "Glow up but make it your photos",
      "Challenge: Restore your oldest photo",
      "Duet/stitch format with reactions",
    ],
    priority: "primary",
    emoji: "📱",
  },
  {
    id: "3",
    slug: "iphone-upgrader",
    name: "The iPhone Upgrader",
    tagline: "Your iPhone 4 photos deserve iPhone 16 quality",
    demographics: {
      age: "25-45",
      gender: "Mixed",
      income: "£35-70k",
      location: "UK (tech hubs)",
      platform: "Instagram, TikTok",
    },
    psychographics: [
      "Upgrades phone every 2-3 years",
      "Cares about photo quality",
      "Frustrated by old photos looking dated",
      "Practical, results-oriented",
    ],
    painPoints: [
      "10 years of photos look worse than today's screenshots",
      "Camera roll is a mix of HD and potato quality",
      "Printing old photos reveals how bad they are",
      "Lost photos when switching phones",
    ],
    triggers: [
      "New iPhone releases",
      "iCloud memories showing old photos",
      "Wanting to print photos for home",
      "Backing up/organizing photo library",
    ],
    primaryHook: "Your iPhone 4 photos deserve iPhone 16 quality",
    adCopyVariations: [
      "My 2012 photos finally match my 2025 photos.",
      "Apple won't upgrade your old photos. We will.",
      "Stop scrolling past your old photos in shame.",
    ],
    contentIdeas: [
      "Side-by-side: same location, old vs. enhanced photo",
      "I enhanced every photo from my first iPhone",
      "Camera roll cleanup transformation",
    ],
    priority: "primary",
    emoji: "📲",
  },
  {
    id: "4",
    slug: "memory-keeper",
    name: "The Memory Keeper",
    tagline: "Your photos are fading. Time isn't.",
    demographics: {
      age: "55-70",
      gender: "65% Female",
      income: "£40-80k",
      location: "Suburban/Rural UK",
      platform: "Facebook",
    },
    psychographics: [
      "Values family history and legacy",
      "Organized, maintains photo albums",
      "Worries about photos deteriorating",
      "Not highly technical but willing to try",
    ],
    painPoints: [
      "Physical photos are fading and yellowing",
      "Doesn't know how to digitize properly",
      "Worried about losing memories forever",
      "Wants to pass down quality photos to children",
    ],
    triggers: [
      "Finding old photo albums",
      "Family reunions",
      "Organizing home/downsizing",
      "Anniversary milestones",
    ],
    primaryHook: "Your photos are fading. Time isn't.",
    adCopyVariations: [
      "50 years of memories. Restored in 60 seconds.",
      "Don't let time steal your family's faces.",
      "Your children deserve to see these clearly.",
    ],
    contentIdeas: [
      "Before/after of vintage family photos",
      "How to preserve your photo collection",
      "Generational photo restoration stories",
    ],
    priority: "secondary",
    emoji: "📸",
  },
  {
    id: "5",
    slug: "genealogist",
    name: "The Genealogist",
    tagline: "Your ancestors deserve HD",
    demographics: {
      age: "40-65",
      gender: "55% Female",
      income: "£50-90k",
      location: "UK (all areas)",
      platform: "Facebook",
    },
    psychographics: [
      "Researches family history actively",
      "Uses Ancestry.com, FindMyPast",
      "Values documentation and preservation",
      "Detail-oriented, patient",
    ],
    painPoints: [
      "Old ancestor photos are barely recognizable",
      "Can't see facial features for family tree",
      "Historical photos have damage and wear",
      "Wants to create family history books",
    ],
    triggers: [
      "New discovery on Ancestry.com",
      "Creating family tree books",
      "DNA test results",
      "Family history projects",
    ],
    primaryHook: "Your ancestors deserve HD",
    adCopyVariations: [
      "Finally see Great-Great-Grandma's face clearly.",
      "100-year-old photos. Crystal clear today.",
      "Document your lineage in the quality they deserved.",
    ],
    contentIdeas: [
      "Restoring 100+ year old photos",
      "Building a family history book",
      "Before/after ancestor photos",
    ],
    priority: "secondary",
    emoji: "🌳",
  },
  {
    id: "6",
    slug: "grieving-pet-owner",
    name: "The Grieving Pet Owner",
    tagline: "Your best friend, restored",
    demographics: {
      age: "25-55",
      gender: "70% Female",
      income: "£25-60k",
      location: "UK (all areas)",
      platform: "Instagram, Facebook",
    },
    psychographics: [
      "Deep emotional bond with pets",
      "Treasures memories of passed pets",
      "Active in pet communities online",
      "Willing to spend on pet-related items",
    ],
    painPoints: [
      "Best photos of passed pet are blurry",
      "Regrets not taking better photos",
      "Wants to create memorial or portrait",
      "Old phone photos don't print well",
    ],
    triggers: [
      "Pet passing anniversary",
      "Rainbow Bridge posts on social media",
      "Moving and finding old pet photos",
      "Seeing similar pets",
    ],
    primaryHook: "Your best friend, restored",
    adCopyVariations: [
      "The only photo I have of him. Now I can actually see his face.",
      "She's been gone 3 years. Now I have a photo worth framing.",
      "No more blurry memories of your best friend.",
    ],
    contentIdeas: [
      "Pet memorial photo restorations",
      "Creating lasting tributes",
      "Before/after pet photos",
    ],
    priority: "secondary",
    emoji: "🐾",
    note: "Handle with sensitivity. Focus on preservation, not loss.",
  },
  {
    id: "7",
    slug: "nostalgic-parent",
    name: "The Nostalgic Parent",
    tagline: "Those 2005 phone photos? Now printable.",
    demographics: {
      age: "35-50",
      gender: "60% Female",
      income: "£40-80k",
      location: "UK (suburban)",
      platform: "Facebook, Instagram",
    },
    psychographics: [
      "Kids are now teenagers/adults",
      "Sentimental about childhood photos",
      "Active on Facebook/Instagram",
      "Shares family memories regularly",
    ],
    painPoints: [
      "Early 2000s digital photos are low quality",
      "Flip phone era photos are unusable",
      "Wants to create albums for kids",
      "18th/21st birthday approaching",
    ],
    triggers: [
      "Kids' milestone birthdays",
      "Graduation events",
      "Moving kids to university",
      "Creating photo books",
    ],
    primaryHook: "Those 2005 phone photos? Now printable.",
    adCopyVariations: [
      "Your kids' childhood photos deserve better than 480p.",
      "From potato quality to portrait quality.",
      "The baby photos you can finally frame.",
    ],
    contentIdeas: [
      "Childhood photo transformations",
      "Creating milestone birthday albums",
      "From 480p to print-ready",
    ],
    priority: "secondary",
    emoji: "👨‍👩‍👧‍👦",
  },
  {
    id: "8",
    slug: "wedding-planner",
    name: "The Wedding Planner",
    tagline: "Their wedding day, your anniversary gift",
    demographics: {
      age: "25-40",
      gender: "75% Female",
      income: "£30-70k",
      location: "UK (all areas)",
      platform: "Pinterest, Instagram",
    },
    psychographics: [
      "Planning wedding or anniversary",
      "Values tradition and family",
      "Active on Pinterest for ideas",
      "Willing to invest in meaningful touches",
    ],
    painPoints: [
      "Parents'/grandparents' wedding photos are faded",
      "Wants to display at own wedding",
      "Making anniversary gift for parents",
      "Creating family tribute slideshow",
    ],
    triggers: [
      "Wedding planning",
      "Parents' anniversary",
      "Engagement celebrations",
      "Family wedding traditions",
    ],
    primaryHook: "Their wedding day, your anniversary gift",
    adCopyVariations: [
      "Restored my parents' 1985 wedding photo. 40th anniversary gift: sorted.",
      "Display their wedding next to yours.",
      "The gift that made my mum frame it immediately.",
    ],
    contentIdeas: [
      "Vintage wedding photo restorations",
      "Multi-generational wedding displays",
      "Anniversary gift ideas",
    ],
    priority: "secondary",
    emoji: "💒",
  },
  {
    id: "9",
    slug: "real-estate-flipper",
    name: "The Real Estate Flipper",
    tagline: "Sell the memory, not the blur",
    demographics: {
      age: "30-55",
      gender: "60% Male",
      income: "£60-150k+",
      location: "UK (property hotspots)",
      platform: "LinkedIn, Facebook",
    },
    psychographics: [
      "Business-minded, ROI focused",
      "Manages multiple properties",
      "Needs quick solutions",
      "Values efficiency over perfection",
    ],
    painPoints: [
      "Old property photos in archives",
      "Historical listing photos look dated",
      "Before/after comparisons needed",
      "Quick turnaround required",
    ],
    triggers: [
      "Property portfolio reviews",
      "Historical property features",
      "Marketing material updates",
      "Renovation comparisons",
    ],
    primaryHook: "Sell the memory, not the blur",
    adCopyVariations: [
      "Old listing photos -> professional quality. 60 seconds.",
      "Your properties deserve better photos than 2010 gave them.",
      "Restore property archives without re-shooting.",
    ],
    contentIdeas: [
      "Property photo transformations",
      "Before/after renovation photos",
      "Historical property archives",
    ],
    priority: "secondary",
    emoji: "🏠",
  },
  {
    id: "10",
    slug: "memorial-creator",
    name: "The Memorial Creator",
    tagline: "Honor them in crystal clarity",
    demographics: {
      age: "40-70",
      gender: "65% Female",
      income: "£35-80k",
      location: "UK (all areas)",
      platform: "Facebook",
    },
    psychographics: [
      "Creating displays for funerals/memorials",
      "Organizing celebration of life events",
      "Values dignity and quality",
      "Time-sensitive needs",
    ],
    painPoints: [
      "Only photos available are low quality",
      "Need print-ready images quickly",
      "Creating memorial slideshow",
      "Want to honor loved one properly",
    ],
    triggers: [
      "Planning memorial service",
      "Anniversary of passing",
      "Creating tribute materials",
      "Organizing celebration of life",
    ],
    primaryHook: "Honor them in crystal clarity",
    adCopyVariations: [
      "They deserve to be remembered clearly.",
      "Create a memorial they would be proud of.",
      "When quality matters most.",
    ],
    contentIdeas: [
      "Memorial photo restorations",
      "Creating lasting tributes",
      "Celebration of life displays",
    ],
    priority: "secondary",
    emoji: "🕯️",
    note: "Handle with extreme sensitivity. Focus on honor and dignity.",
  },
];

export function getPersonaBySlug(slug: string): Persona | undefined {
  return PERSONAS.find((p) => p.slug === slug);
}

export function getPrimaryPersonas(): Persona[] {
  return PERSONAS.filter((p) => p.priority === "primary");
}

export function getSecondaryPersonas(): Persona[] {
  return PERSONAS.filter((p) => p.priority === "secondary");
}
