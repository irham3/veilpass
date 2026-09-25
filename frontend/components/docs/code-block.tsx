"use client";

import { CheckIcon } from "@phosphor-icons/react/Check";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export function CodeBlock({ code, language = "ts" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyError(false);
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }
  return (
    <div className="my-6 overflow-hidden rounded-xl border border-line-dark bg-ink-950 text-paper-50">
      <div className="flex items-center justify-between border-b border-line-dark px-4 py-2"><span className="font-mono text-[0.6875rem] uppercase text-paper-200">{language}</span><Button type="button" variant="ghost" size="sm" onClick={copy} className="h-8 text-xs">{copied ? <CheckIcon /> : <CopyIcon />}{copied ? "Copied" : copyError ? "Copy failed" : "Copy"}</Button></div>
      <pre className="overflow-x-auto p-5 font-mono text-[0.8125rem] leading-6 text-paper-200"><code>{code}</code></pre>
    </div>
  );
}
