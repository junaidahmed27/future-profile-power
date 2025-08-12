import React, { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

// PDF parsing
import * as pdfjsLib from "pdfjs-dist";
// Configure pdf.js worker via CDN to avoid bundler resolution issues
(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

// DOCX parsing
import mammoth from "mammoth";

type Props = {
  onText: (text: string) => void;
};

export const CVUpload: React.FC<Props> = ({ onText }) => {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  const handleFiles = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext === "txt") {
        const content = await file.text();
        setText(content);
        onText(content);
        toast({ title: "Text loaded", description: `${file.name}` });
        return;
      }
      const buf = await file.arrayBuffer();
      if (ext === "docx") {
        const res = await mammoth.extractRawText({ arrayBuffer: buf });
        const content = res.value || "";
        setText(content);
        onText(content);
        toast({ title: "DOCX parsed", description: `${file.name}` });
        return;
      }
      if (ext === "pdf") {
        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
        let fullText = "";
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((it: any) => (it.str ? String(it.str) : ""));
          fullText += strings.join(" ") + "\n";
        }
        fullText = fullText.replace(/\s+/g, " ").trim();
        setText(fullText);
        onText(fullText);
        toast({ title: "PDF parsed", description: `${file.name}` });
        return;
      }
      toast({ title: "Unsupported file", description: "Use PDF, DOCX, or TXT.", });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to read file", description: e?.message || "Try another file.", });
    } finally {
      setLoading(false);
    }
  }, [onText]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.files?.length) return;
    void handleFiles(e.dataTransfer.files[0]);
  }, [handleFiles]);

  const onBrowse = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFiles(f);
  }, [handleFiles]);

  const analyzeNow = useCallback(() => {
    if (!text.trim()) {
      toast({ title: "Paste or upload your CV first." });
      return;
    }
    onText(text);
    toast({ title: "Analyzing CV...", description: "Generating feedback" });
  }, [onText, text]);

  return (
    <Card className="bg-card/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Upload or Paste Your CV</CardTitle>
        <CardDescription>PDF, DOCX, or plain text. We only analyze in your browser.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
          onDrop={onDrop}
          className="glow-cursor relative flex flex-col items-center justify-center rounded-md border border-dashed p-6 text-center transition-colors hover:bg-accent/30"
          style={{}}>
          <p className="mb-2">Drag and drop your file here</p>
          <Input type="file" accept=".pdf,.docx,.txt" onChange={onBrowse} className="max-w-sm" />
        </div>

        <div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Or paste your CV text here..."
            className="min-h-[160px]"
          />
          <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>{text.trim().split(/\s+/).filter(Boolean).length} words</span>
            <Button onClick={analyzeNow} variant="hero" size="lg" disabled={loading}>
              {loading ? "Processing..." : "Analyze CV"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
