import React, { useMemo, useRef, useState } from "react";
import { analyzeCV, type Analysis } from "@/lib/cv-analyzer";
import { CVUpload } from "@/components/CVUpload";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { Button } from "@/components/ui/button";
import { SignatureField } from "@/components/SignatureField";
import { trackCVAnalysis, trackUserAction, traceAsyncOperation } from "@/lib/datadog";

const Index = () => {
  const [source, setSource] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const analyze = async (text: string) => {
    setSource(text);
    const result = await traceAsyncOperation('cv_analysis', async () => {
      return analyzeCV(text);
    }, {
      textLength: text.length,
      wordCount: text.split(/\s+/).filter(Boolean).length
    });
    setAnalysis(result);
    
    // Track the analysis results
    trackCVAnalysis({
      coverage: result.scores.coverage,
      specificity: result.scores.specificity,
      impact: result.scores.impact,
      wordCount: result.metrics.words,
      issueCount: result.issues.length,
    });
  };
  const mainRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="relative">
        <SignatureField className="bg-gradient-hero">
          <div className="container mx-auto px-6 py-20 text-center text-primary-foreground">
            <h1>High School CV Coach</h1>
            <p className="mx-auto mt-3 max-w-2xl text-base opacity-90">
              Upload your CV and get instant, actionable feedback to strengthen college applications and build a standout early career profile.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="hero" size="lg" onClick={() => {
                trackUserAction('cta_clicked', { button: 'get_feedback_now' });
                mainRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Get feedback now
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#how-it-works">How it works</a>
              </Button>
            </div>
          </div>
        </SignatureField>
      </header>

      <main ref={mainRef} className="container mx-auto px-6 py-10">
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <CVUpload onText={analyze} />
          <FeedbackPanel analysis={analysis} source={source} />
        </section>

        <section id="how-it-works" className="mt-16">
          <h2 className="mb-2">How it works</h2>
          <p className="text-muted-foreground max-w-3xl">
            We evaluate your CV locally on your device using proven admissions and early-career heuristics: section coverage, measurable outcomes, leadership signals, and clarity. No sign-up required.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Index;
