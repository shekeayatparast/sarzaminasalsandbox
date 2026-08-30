"use client";

import { Product } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatToman } from "@/lib/format";
import { useNav } from "@/lib/store";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";

export function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (product: Product) => void;
}) {
  const { navigate } = useNav();
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={
        reduced
          ? undefined
          : {
              hidden: { opacity: 0, y: 28 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
              },
            }
      }
      whileHover={reduced ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="h-full"
    >
      <Card
        className={`group relative flex h-full flex-col overflow-hidden border bg-card p-0 honey-glow-hover focus-within:border-honey/60 hover:border-honey/60 ${
          product.featured ? "border-honey/45 honey-glow" : "border-border/60"
        }`}
      >
        {/* Featured ribbon */}
        {product.featured && (
          <div className="absolute end-0 top-4 z-10 flex items-center gap-1 rounded-s-full bg-honey-gradient py-1.5 ps-3 pe-4 text-xs font-bold text-primary-foreground shadow-md">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            پیشنهاد ویژه
          </div>
        )}

        {/* Image — soft zoom on hover */}
        <button
          type="button"
          onClick={() => navigate("products")}
          aria-label={`مشاهده جزئیات ${product.name}`}
          className="relative block aspect-square w-full cursor-pointer overflow-hidden bg-cream-gradient focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <img
            src={product.image ?? ""}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
          {/* subtle bottom fade for depth */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-honey-dark/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        </button>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div>
            <h3 className="mb-1 text-xl font-extrabold text-honey-dark">
              {product.name}
            </h3>
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>

          {/* Price + add button */}
          <div className="mt-auto border-t border-border/50 pt-3">
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <span className="mb-1 inline-block rounded-full bg-honey-light/30 px-2.5 py-0.5 text-[11px] font-medium text-honey-dark dark:bg-honey-light/20">
                  قیمت هر کیلو
                </span>
                <div className="truncate text-lg font-extrabold text-honey-dark">
                  {formatToman(product.pricePerKg)}
                </div>
              </div>
              <motion.div
                whileTap={reduced ? undefined : { scale: 0.94 }}
                className="shrink-0"
              >
                <Button
                  onClick={() => onAdd(product)}
                  aria-label={`افزودن ${product.name} به سبد خرید`}
                  className="honey-glow h-11 min-w-11 bg-honey-gradient text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  size="lg"
                >
                  <Plus className="ml-1 h-4 w-4" aria-hidden="true" />
                  افزودن
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
