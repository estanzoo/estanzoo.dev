// All site copy lives here. Edit this file to change what the site says.

export const site = {
  name: 'Ethan Zhu',
  handle: '~/ethan-zhu',
  email: 'hello@estanzoo.dev',
  github: 'https://github.com/estanzoo',
  linkedin: 'https://linkedin.com/in/estanzoo',
  tagline:
    'Software engineering student at the University of Waterloo. I build backends, speech models and tooling for teams of coding agents.',
  year: 2026,
};

export const about = {
  lead: { before: 'I’m currently a full stack developer at ', org: 'Thri5', after: ', shipping features from database to UI on a Kotlin and Spring Boot retail operations platform.' },
  body: 'Before that I fine-tuned speech models at Xplode with AI and wrote Go services at StepFun in Shanghai. Lately I’ve been most interested in how several coding agents can work on one codebase without stepping on each other, which is what hq is for.',
};

/** Languages, in display order. Used by the about list and the `stack` command. */
export const stack = ['C++', 'Java', 'Python', 'C', 'TypeScript', 'Elixir', 'Swift', 'Scala', 'SQL'];

export const facts: { label: string; value: string }[] = [
  { label: 'school', value: 'BSE Software Engineering, UWaterloo, 2024 — 2029' },
  { label: 'based', value: 'Toronto / Waterloo, Ontario' },
  { label: 'writes', value: stack.join(', ') },
];

export type ProjectCategory = 'ai' | 'ios' | 'backend';

export interface Project {
  id: string;
  name: string;
  date: string;
  cats: ProjectCategory[];
  tags: string;
  /** Leave empty to show the [add link] placeholder. */
  href: string;
  linkText: string;
  desc: string;
  points: string[];
}

export const projects: Project[] = [
  {
    id: 'hq',
    name: 'hq',
    date: 'Oct 2026',
    cats: ['ai', 'backend'],
    tags: 'Elixir · OTP · Claude Code · Bash',
    href: 'https://github.com/estanzoo/hq',
    linkText: 'github.com/estanzoo/hq',
    desc: 'An Elixir/OTP service that coordinates teams of Claude Code agents working in parallel, and lets them message each other mid-task.',
    points: [
      'Every agent is independently supervised.',
      'Messages queue while an agent is busy and survive restarts.',
      'A separate git worktree for every task prevents conflicts between parallel agents.',
      'The engineer can talk to any sub-agent directly.',
    ],
  },
  {
    id: 'noteworks',
    name: 'NoteWorks',
    date: 'Mar 2026',
    cats: ['ios', 'backend'],
    tags: 'Swift · TypeScript · PostgreSQL · Supabase',
    href: 'https://noteworks.studio',
    linkText: 'noteworks.studio',
    desc: 'A native iPad note editor in SwiftUI on a layered serverless Supabase backend.',
    points: [
      'Custom PKCanvasView integration with gesture coordination between zoom/pan and drawing.',
      'Per-page ink persistence, with overlay layers for text and image annotations.',
      'Edge functions handle business logic, validation and file orchestration; AI API calls go through a secure server-side pipeline.',
      'Apple, Google and email OTP sign-in, plus GitHub Actions CI for schema migrations and TypeScript type generation.',
    ],
  },
  {
    id: 'ring',
    name: 'Ring or Ping',
    date: 'Jan 2025',
    cats: ['ios', 'backend'],
    tags: 'Swift · Python · Django · Nginx · Gunicorn',
    href: 'https://github.com/estanzoo/Ring-or-Ping',
    linkText: 'github.com/estanzoo/Ring-or-Ping',
    desc: 'An iOS alarm that alerts your whole friend group if you snooze or stop it without getting out of bed.',
    points: [
      'Built at UofTHacks 12.',
      'iOS app written in Swift with personalised alarms.',
      'Django REST framework backend deployed on Amazon EC2.',
    ],
  },
  {
    id: 'gnostic',
    name: 'Gnostic',
    date: 'Aug 2023',
    cats: ['ai'],
    tags: 'Notion API · OpenAI · Flask',
    href: 'https://github.com/Trentiumz/IgnitionHacks2023',
    linkText: 'github.com/Trentiumz/IgnitionHacks2023',
    desc: 'A Chrome extension that pulls your Notion notes and turns them into flashcards.',
    points: [
      'Winner of Most Innovative Project at Ignition Hacks 2023.',
      'Fetches notes through the Notion API and generates flashcards with OpenAI.',
    ],
  },
];

export const projectFilters: { id: 'all' | ProjectCategory; label: string }[] = [
  { id: 'all', label: 'all' },
  { id: 'ai', label: 'agents + ai' },
  { id: 'ios', label: 'ios' },
  { id: 'backend', label: 'backend' },
];

export const otherRepos: { label: string; href: string }[] = [
  { label: 'Grok_Alpha_Zero (Python)', href: 'https://github.com/subtotechnoblade/Grok_Alpha_Zero' },
  { label: 'RuneVault (C++)', href: 'https://github.com/estanzoo/RuneVault' },
  { label: 'MoodLens (Python)', href: 'https://github.com/estanzoo/MoodLens' },
];

export interface Job {
  id: string;
  role: string;
  org: string;
  when: string;
  where: string;
  /** Show the Whisper WER bar chart under the bullets. */
  chart: boolean;
  points: string[];
}

export const jobs: Job[] = [
  {
    id: 'thri5',
    role: 'Full Stack Developer',
    org: 'Thri5 Inc.',
    when: 'Sep — Dec 2026',
    where: 'Toronto, Ontario',
    chart: false,
    points: [
      'Production features from database to UI on a Kotlin, Spring Boot and PostgreSQL retail operations platform.',
      'AI-assisted development workflows with Claude Code, running specialised sub-agents in parallel through graph-based execution loops.',
      'Code quality standards for the Kotlin mobile apps: automated testing, structured reviews, typed pages and ViewModels.',
    ],
  },
  {
    id: 'xplode',
    role: 'Machine Learning Engineer',
    org: 'Xplode with AI',
    when: 'Jan — Apr 2026',
    where: 'Toronto, Ontario',
    chart: true,
    points: [
      'LoRA fine-tuning of OpenAI’s Whisper V3, reducing WER by 40.7% across 8 languages.',
      'Audio language ID with a fine-tuned XLS-R and an XLM-based transformer.',
      'Backend of a FastAPI service for low-latency streaming TTS and translation over WebSockets; fine-tuned Piper TTS with custom phonemizers.',
    ],
  },
  {
    id: 'stepfun',
    role: 'Backend Developer',
    org: 'StepFun, DeepEat team',
    when: 'May — Aug 2025',
    where: 'Shanghai, China',
    chart: false,
    points: [
      'Go backend for an iOS app on a Tencent RPC service, exposing new endpoints for the frontend.',
      'Modified preorder tree traversal for storing and querying hierarchical data, with GORM and MongoDB.',
      'Semantic search using vector embeddings, integrating StepFun’s LLM with a public data source.',
    ],
  },
];

const wer = { reduction: 40.7, languages: 8 };

/** Bar chart under the Xplode role. The bar length is derived from `reduction`. */
export const werChart = {
  ...wer,
  baselineLabel: 'Whisper V3, baseline WER',
  tunedLabel: `after LoRA fine-tuning, ${wer.languages} languages`,
  /** Screen-reader description of the whole chart. */
  summary: `Relative word error rate: fine-tuned Whisper V3 is ${wer.reduction}% lower than the baseline, across ${wer.languages} languages`,
};

/** Interest cards. Replace the bracketed text when you're ready. */
export const interests = {
  intro: 'What I’m into when I’m not at a keyboard.',
  f1: { kicker: '01 · watching and driving', title: 'F1 and sim racing', body: '[Team or driver you follow, your sim and rig, favourite track]' },
  films: { kicker: '02 · watching', title: 'Films', body: '[Favourite directors, recent watches, Letterboxd link]' },
  cubing: { kicker: '03 · solving', title: 'Speed cubing', body: '[Your events and personal bests]' },
};

export const contact = {
  /** Terminal-style line above the heading (the `$` sigil is added by the component). */
  prompt: 'hq send ethan "hello"',
  heading: 'Want to get in touch?',
};
