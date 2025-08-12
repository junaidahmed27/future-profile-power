import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Analysis } from "@/lib/cv-analyzer";

type Props = {
  analysis: Analysis | null;
  source: string;
};

const pct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const FeedbackPanel: React.FC<Props> = ({ analysis, source }) => {
  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Feedback</CardTitle>
          <CardDescription>Upload or paste your CV to get instant insights.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nothing to show yet.</p>
        </CardContent>
      </Card>
    );
  }

  const copyFeedback = async () => {
    const a = analysis;
    const lines: string[] = [];
    lines.push("High School CV Coach — Feedback\n");
    lines.push(`Summary: ${a.summary}`);
    lines.push("");
    lines.push(`Scores: Coverage ${pct(a.scores.coverage)}%, Specificity ${pct(a.scores.specificity)}%, Impact ${pct(a.scores.impact)}%`);
    lines.push("");
    lines.push("Top Issues:");
    a.issues.slice(0, 8).forEach((i, idx) => lines.push(`${idx + 1}. ${i.title} — ${i.detail}`));
    lines.push("");
    lines.push("Recommendations:");
    a.recommendations.slice(0, 8).forEach((r, idx) => lines.push(`- ${r}`));
    const text = lines.join("\n");
    await navigator.clipboard.writeText(text);
    toast({ title: "Feedback copied", description: "Paste it into your notes or share it." });
  };

  const sectionBadges = Object.entries(analysis.sections).map(([k, v]) => (
    <Badge key={k} variant={v ? "default" : "secondary"} className="justify-start">
      {v ? "✓ " : "○ "}{k}
    </Badge>
  ));

  return (
    <Card className="bg-card/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Personalized Feedback</CardTitle>
        <CardDescription>{analysis.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>Coverage</span>
              <span>{pct(analysis.scores.coverage)}%</span>
            </div>
            <Progress value={pct(analysis.scores.coverage)} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>Specificity</span>
              <span>{pct(analysis.scores.specificity)}%</span>
            </div>
            <Progress value={pct(analysis.scores.specificity)} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>Impact</span>
              <span>{pct(analysis.scores.impact)}%</span>
            </div>
            <Progress value={pct(analysis.scores.impact)} />
          </div>
        </div>

        <div>
          <h3 className="mb-2">Section coverage</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {sectionBadges}
          </div>
        </div>

        <div>
          <h3 className="mb-2">Top issues</h3>
          <ul className="space-y-2">
            {analysis.issues.slice(0, 6).map((i, idx) => (
              <li key={idx} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{i.title}</span>
                  <Badge variant={i.severity === "high" ? "destructive" : "secondary"}>{i.severity}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{i.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-2">Recommendations</h3>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {analysis.recommendations.slice(0, 8).map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="hero" onClick={copyFeedback}>Copy feedback</Button>
          <Button variant="outline" onClick={() => {
            navigator.clipboard.writeText(source || "");
            toast({ title: "CV text copied" });
          }}>Copy original text</Button>
        </div>
      </CardContent>
    </Card>
  );
};
