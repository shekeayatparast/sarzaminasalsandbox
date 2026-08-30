"use client";

import { useEffect } from "react";
import { useNav } from "@/lib/store";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { HomeView } from "@/components/site/HomeView";
import { ProductsView } from "@/components/site/ProductsView";
import { AboutView } from "@/components/site/AboutView";
import { BenefitsView } from "@/components/site/BenefitsView";
import { CartView } from "@/components/site/CartView";
import { ContactView } from "@/components/site/ContactView";
import { TrackOrdersView } from "@/components/site/TrackOrdersView";
import { BlogView } from "@/components/site/BlogView";
import { BlogPostView } from "@/components/site/BlogPostView";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export default function Home() {
  const view = useNav((s) => s.view);
  const selectedSlug = useNav((s) => s.selectedSlug);
  const reduced = useReducedMotion();

  // scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {view === "home" && <HomeView />}
            {view === "products" && <ProductsView />}
            {view === "about" && <AboutView />}
            {view === "benefits" && <BenefitsView />}
            {view === "cart" && <CartView />}
            {view === "contact" && <ContactView />}
            {view === "track" && <TrackOrdersView />}
            {view === "blog" &&
              (selectedSlug ? <BlogPostView /> : <BlogView />)}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
