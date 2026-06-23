import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface PolicyPageProps {
  title: string;
  badge: string;
  badgeColor: string;
  content: string;
  updatedAt?: Date;
}

export function PolicyPage({ title, badge, badgeColor, content, updatedAt }: PolicyPageProps) {
  return (
    <div className="pt-28 pb-20">
      <div className="container-brand max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="space-y-4 mb-12">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10`}>
            <span className={`text-xs font-semibold tracking-wider uppercase ${badgeColor}`}>{badge}</span>
          </div>
          <h1 className="font-display font-bold text-4xl lg:text-5xl text-white">{title}</h1>
          {updatedAt && (
            <p className="text-white/30 text-sm">Last updated: {formatDateTime(updatedAt, "dd MMM yyyy")}</p>
          )}
        </div>

        <div className="prose prose-invert prose-sm max-w-none
          prose-headings:font-display prose-headings:text-white prose-headings:font-bold
          prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
          prose-p:text-white/60 prose-p:leading-relaxed
          prose-li:text-white/60 prose-strong:text-white
          prose-a:text-brand-citrus prose-a:no-underline hover:prose-a:underline">
          {content.split("\n").map((line, i) => {
            if (line.startsWith("## "))  return <h2 key={i}>{line.slice(3)}</h2>;
            if (line.startsWith("**") && line.endsWith("**")) return <p key={i}><strong>{line.slice(2, -2)}</strong></p>;
            if (line.startsWith("- "))   return <li key={i}>{line.slice(2)}</li>;
            if (line.trim() === "")      return <br key={i} />;
            return <p key={i}>{line}</p>;
          })}
        </div>
      </div>
    </div>
  );
}
