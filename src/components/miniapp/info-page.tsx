import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";

export type InfoSection = {
  title: string;
  body: string;
};

export function InfoPage({ icon: Icon, kicker, title, intro, sections }: { icon: LucideIcon; kicker: string; title: string; intro: string; sections: InfoSection[] }) {
  return (
    <article className="page-width info-page">
      <Link href="/profile" className="text-button"><ArrowLeft size={17} aria-hidden="true" /> В профиль</Link>
      <header className="info-hero">
        <span className="info-icon"><Icon size={30} strokeWidth={1.6} aria-hidden="true" /></span>
        <p className="hero-kicker">{kicker}</p>
        <h1 className="display">{title}</h1>
        <p>{intro}</p>
      </header>
      <div className="info-sections">
        {sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}
      </div>
    </article>
  );
}
