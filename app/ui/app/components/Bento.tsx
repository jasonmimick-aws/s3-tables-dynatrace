import React, { type ReactNode } from "react";

export const BentoGrid = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`bento-grid ${className}`}>{children}</div>
);

export const BentoCard = ({
  children,
  className = "",
  eyebrow,
  title,
  accent,
}: {
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  title?: string;
  accent?: string;
}) => (
  <section
    className={`bento-card ${className}`}
    style={accent ? ({ "--card-accent": accent } as React.CSSProperties) : undefined}
  >
    {(eyebrow || title) && (
      <header className="bento-card__header">
        {eyebrow && <span className="bento-eyebrow">{eyebrow}</span>}
        {title && <h2 className="bento-title">{title}</h2>}
      </header>
    )}
    {children}
  </section>
);

export const Hero = ({
  kicker,
  title,
  description,
  aside,
}: {
  kicker: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) => (
  <div className="page-hero">
    <div>
      <span className="hero-kicker">{kicker}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {aside && <div className="hero-aside">{aside}</div>}
  </div>
);
