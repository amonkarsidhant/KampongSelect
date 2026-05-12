import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges Tailwind classes with clsx */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
