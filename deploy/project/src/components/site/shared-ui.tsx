"use client";

/**
 * Shared modern-UI helpers for the main site views.
 * RTL-aware motion primitives (entrance slides come from the RIGHT,
 * matching the Persian reading direction) + a consistent section header.
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/* ── Motion variants ──────────────────────────────────────────────── */

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Slide-in from the physical right (natural for RTL) */
export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 36 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Slide-in from the physical left (far side of a 2-col layout) */
export const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -36 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

type RevealFrom = "up" | "right" | "left" | "scale" | "none";

const fromVariants: Record<
  Exclude<RevealFrom, "none">,
  Variants
> = {
  up: fadeUp,
  right: slideFromRight,
  left: slideFromLeft,
  scale: scaleIn,
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ── Reveal on scroll ─────────────────────────────────────────────── */

export function Reveal({
  children,
  from = "up",
  delay = 0,
  className,
}: {
  children: ReactNode;
  from?: RevealFrom;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  // Reduced motion: plain fade only, no transforms
  if (reduced || from === "none") {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.3, delay }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      variants={fromVariants[from]}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      transition={delay ? { delay, duration: 0.55, ease: EASE } : undefined}
    >
      {children}
    </motion.div>
  );
}

/* ── Staggered grid ───────────────────────────────────────────────── */

export function StaggerGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduced ? undefined : staggerContainer}
      initial={reduced ? undefined : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  from = "up",
}: {
  children: ReactNode;
  className?: string;
  from?: RevealFrom;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduced ? undefined : fromVariants[from]}
    >
      {children}
    </motion.div>
  );
}

/* ── Section header (badge + big title + honey divider) ───────────── */

export function SectionHeading({
  badge,
  title,
  description,
  align = "center",
  light = false,
  className,
}: {
  badge: string;
  title: string;
  description?: string;
  align?: "center" | "start";
  light?: boolean;
  className?: string;
}) {
  return (
    <Reveal
      from="up"
      className={cn(
        "mb-10 md:mb-12",
        align === "center" ? "text-center" : "text-start",
        className,
      )}
    >
      <Badge
        className={cn(
          "mb-3 border-0 px-3 py-1 text-sm",
          light
            ? "bg-honey-light/25 text-primary-foreground"
            : "bg-accent text-accent-foreground",
        )}
      >
        {badge}
      </Badge>
      <h2
        className={cn(
          "text-3xl font-extrabold md:text-4xl",
          light ? "text-primary-foreground drop-shadow" : "text-honey-gradient",
        )}
      >
        {title}
      </h2>
      <div
        aria-hidden="true"
        className={cn(
          "honey-divider mt-4 w-28",
          align === "center" ? "mx-auto" : "ms-1",
        )}
      />
      {description && (
        <p
          className={cn(
            "mx-auto mt-4 max-w-2xl leading-relaxed",
            align === "start" && "mx-0",
            light ? "text-primary-foreground/85" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      )}
    </Reveal>
  );
}
