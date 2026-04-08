import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function normalizeVendorName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

export function confidenceColor(score: number): string {
  if (score >= 90) return "text-green-600 bg-green-50";
  if (score >= 70) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

export function getFileIcon(fileType: string): string {
  if (fileType.includes("pdf")) return "file-text";
  if (fileType.includes("image")) return "image";
  if (fileType.includes("csv") || fileType.includes("sheet") || fileType.includes("excel")) return "table";
  return "file";
}
