import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type StatePanelProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { href: string; label: string };
  tone?: "default" | "dark";
};

export function StatePanel({ icon: Icon, title, description, action, tone = "default" }: StatePanelProps) {
  return (
    <section className="state-panel" data-tone={tone}>
      <Icon size={30} strokeWidth={1.7} aria-hidden="true" />
      <h2 className="display">{title}</h2>
      <p>{description}</p>
      {action ? <Link className={tone === "dark" ? "primary-button" : "secondary-button"} href={action.href}>{action.label}</Link> : null}
    </section>
  );
}
