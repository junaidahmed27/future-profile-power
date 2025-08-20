import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CV Analysis Types and Logic (copied from src/lib/cv-analyzer.ts)
type SectionCoverage = {
  education: boolean;
  experience: boolean;
  extracurriculars: boolean;
  leadership: boolean;
  volunteering: boolean;
  awards: boolean;
  skills: boolean;
  projects: boolean;
  contact: boolean;
};

type Analysis = {
  scores: {
    coverage: number;
    specificity: number;
    impact: number;
  };
  sections: SectionCoverage;
  metrics: {
    words: number;
    bullets: number;
    numbers: number;
    actionVerbs: number;
    leadershipMentions: number;
    awardsMentions: number;
  };
  issues: { title: string; detail: string; severity: "low" | "medium" | "high" }[];
  recommendations: string[];
  summary: string;
};

const ACTION_VERBS = [
  "led","launched","built","created","organized","founded","improved","increased","reduced","optimized","designed","developed","coordinated","taught","mentored","researched","presented","implemented","collaborated","spearheaded","initiated","achieved","awarded"
];

const SECTION_PATTERNS: Record<keyof SectionCoverage, RegExp> = {
  education: /(education|school|gpa|coursework)/i,
  experience: /(experience|internship|work|employment)/i,
  extracurriculars: /(extracurricular|club|team|organization|society)/i,
  leadership: /(leader|president|captain|founder|chair|lead)/i,
  volunteering: /(volunteer|community service|non-profit|ngo)/i,
  awards: /(award|honor|scholarship|recognition)/i,
  skills: /(skills|languages|tools|technologies|software)/i,
  projects: /(project|capstone|portfolio|build)/i,
  contact: /(email|phone|linkedin|github|portfolio|website)/i,
};

const hasGPA = (text: string) => /gpa\s*[:\s]?\s*(\d\.\d{1,2}|\d{1,2}%)/i.test(text);
const hasScores = (text: string) => /(sat|act)\s*[:\s]?\s*\d{2,4}/i.test(text);
const leadershipScore = (text: string) => (text.match(/president|captain|lead|leader|founder/gi) || []).length;
const awardsScore = (text: string) => (text.match(/award|honor|scholarship|finalist|winner/gi) || []).length;

function analyzeCV(raw: string): Analysis {
  const text = (raw || "").replace(/\s+/g, " ").trim();
  const words = text ? text.split(/\s+/).length : 0;
  const lines = raw.split(/\n|\r/);
  const bullets = lines.filter(l => /^(\s*[-•*]|\s*\d+\.)\s+/.test(l)).length;
  const numbers = (text.match(/\d+/g) || []).length;

  const actionVerbRegex = new RegExp(`\\b(${ACTION_VERBS.join("|")})\\b`, "gi");
  const actionVerbs = (text.match(actionVerbRegex) || []).length;

  const sections = Object.fromEntries(
    Object.entries(SECTION_PATTERNS).map(([k, r]) => [k, r.test(text)])
  ) as SectionCoverage;

  const coverageCount = Object.values(sections).filter(Boolean).length;
  const coverage = Math.round((coverageCount / Object.keys(sections).length) * 100);

  const specificityBase = Math.min(100, Math.round((numbers / Math.max(1, words)) * 1400));
  const verbsBoost = Math.min(25, Math.round((actionVerbs / Math.max(1, bullets || 1)) * 12));
  const specificity = Math.min(100, specificityBase + verbsBoost);

  const leadershipMentions = leadershipScore(text);
  const awardsMentions = awardsScore(text);
  const impact = Math.max(
    5,
    Math.min(
      100,
      Math.round(
        40 * Math.tanh((leadershipMentions + awardsMentions) / 3) +
          0.25 * specificity +
          (sections.leadership ? 10 : 0) +
          (sections.awards ? 10 : 0)
      )
    )
  );

  const issues: Analysis["issues"] = [];
  const recs: string[] = [];

  // Section gaps
  for (const [key, present] of Object.entries(sections)) {
    if (!present) {
      issues.push({
        title: `Missing section: ${key}`,
        detail: `Add a clear ${key} section with 3–5 concise bullets using action verbs and measurable results.`,
        severity: key === "education" || key === "contact" ? "high" : "medium",
      });
    }
  }

  if (words < 200) {
    issues.push({
      title: "Too short",
      detail: "Your resume seems very brief. Aim for 0.5–1 page with focused bullets and strong outcomes.",
      severity: "high",
    });
  } else if (words > 800) {
    issues.push({
      title: "Too long",
      detail: "Trim to 1 page. Remove less impactful roles, merge similar bullets, and keep only your strongest evidence.",
      severity: "medium",
    });
  }

  if (!hasGPA(text)) {
    issues.push({
      title: "GPA missing",
      detail: "Include GPA (weighted and/or unweighted) if it strengthens your application. Add class rank if notable.",
      severity: "medium",
    });
  }

  if (!hasScores(text)) {
    recs.push("If available, include SAT/ACT or AP/IB highlights to show academic rigor.");
  }

  if (bullets === 0) {
    issues.push({
      title: "No bullet points",
      detail: "Use concise bullet points starting with strong action verbs. Keep them one to two lines each.",
      severity: "high",
    });
  }

  if (numbers < Math.max(2, Math.round(words / 120))) {
    issues.push({
      title: "Not enough measurable results",
      detail: "Quantify impact (e.g., "raised $2,300", "grew membership 35%", "taught 20 peers").",
      severity: "medium",
    });
  }

  if (actionVerbs < Math.max(3, bullets)) {
    recs.push("Start each bullet with a powerful verb (Led, Built, Organized, Improved, Designed, Taught).");
  }

  if (!/linkedin\.com|github\.com|portfolio|behance|personal site/i.test(text)) {
    recs.push("Add a professional link: LinkedIn, GitHub, or portfolio website.");
  }

  if (!sections.projects) {
    recs.push("Ship a small, real project. Publish it online and link to it. Admissions value initiative.");
  }

  if (!sections.volunteering) {
    recs.push("Include community service with consistent commitment (6–12+ months yields stronger signals).");
  }

  if (!sections.leadership) {
    recs.push("Seek leadership: start a club, captain a team, or lead an event—then quantify outcomes.");
  }

  const summary = `Coverage ${coverage}%, Specificity ${specificity}%, Impact ${impact}%. Focus on measurable results, strong verbs, and clear sections.`;

  return {
    scores: { coverage, specificity, impact },
    sections,
    metrics: { words, bullets, numbers, actionVerbs, leadershipMentions, awardsMentions },
    issues,
    recommendations: recs,
    summary,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { resume } = await req.json();

    if (!resume || typeof resume !== 'string') {
      return new Response(JSON.stringify({ error: 'Resume text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Analyzing CV with length:', resume.length);

    const analysis = analyzeCV(resume);

    console.log('Analysis completed:', {
      coverage: analysis.scores.coverage,
      specificity: analysis.scores.specificity,
      impact: analysis.scores.impact,
      issuesCount: analysis.issues.length,
      recommendationsCount: analysis.recommendations.length
    });

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-cv function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});