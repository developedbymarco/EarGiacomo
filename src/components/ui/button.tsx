import type { ButtonHTMLAttributes } from "react";

export function Button({
  variant = "gold",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gold" | "ghost" | "parchment"; size?: "md" | "sm" }) {
  const styles = {
    gold: "bg-gold text-espresso hover:brightness-105",
    ghost: "border border-cream/30 text-cream hover:bg-cream/10",
    parchment: "bg-parchment text-espresso hover:bg-cream",
  }[variant];
  const scale = size === "sm" ? "px-3 py-1.5 text-sm" : "px-5 py-3 text-base";
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream disabled:cursor-not-allowed disabled:opacity-50 ${scale} ${styles} ${className}`}
      {...props}
    />
  );
}
