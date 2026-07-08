"use client";

import React from "react";

function parseInline(text: string, keyBase: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*)/g;
  let last = 0;
  let idx = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    if (m[0].startsWith("**")) {
      parts.push(
        <strong key={`${keyBase}-b${idx}`} className="font-semibold text-slate-900">
          {m[0].slice(2, -2)}
        </strong>
      );
    } else {
      parts.push(
        <em key={`${keyBase}-i${idx}`}>
          {m[0].slice(1, -1)}
        </em>
      );
    }
    last = m.index! + m[0].length;
    idx++;
  }
  if (last < text.length) parts.push(text.slice(last));
  if (parts.length === 0) return "";
  if (parts.length === 1 && typeof parts[0] === "string") return parts[0];
  return <>{parts}</>;
}

export function MarkdownContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const k = String(key++);

    if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={k} className="mt-5 mb-1 text-sm font-bold text-slate-800">
          {parseInline(line.slice(4), k)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={k} className="mt-6 mb-2 text-base font-bold text-slate-900">
          {parseInline(line.slice(3), k)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      nodes.push(
        <h1 key={k} className="mt-6 mb-2 text-lg font-bold text-slate-900">
          {parseInline(line.slice(2), k)}
        </h1>
      );
    } else if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={k} className="my-4 border-slate-200" />);
    } else if (/^[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+] /, ""));
        i++;
      }
      nodes.push(
        <ul key={k} className="my-2 space-y-0.5 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 leading-6 text-slate-700">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span>{parseInline(item, `${k}-li${j}`)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    } else if (/^\d+\. /.test(line)) {
      const items: Array<{ num: string; text: string }> = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const m = lines[i].match(/^(\d+)\. (.*)$/);
        if (m) items.push({ num: m[1], text: m[2] });
        i++;
      }
      nodes.push(
        <ol key={k} className="my-2 space-y-0.5 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 leading-6 text-slate-700">
              <span className="w-5 shrink-0 text-right font-semibold text-slate-500">{item.num}.</span>
              <span>{parseInline(item.text, `${k}-oli${j}`)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    } else if (line.trim() === "") {
      nodes.push(<div key={k} className="h-2" />);
    } else {
      nodes.push(
        <p key={k} className="leading-7 text-slate-700">
          {parseInline(line, k)}
        </p>
      );
    }

    i++;
  }

  return <div className="text-[13px] sm:text-sm">{nodes}</div>;
}
