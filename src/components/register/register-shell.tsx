"use client";

import Image from "next/image";
import { Logo } from "@/components/layout/logo";

export const cardStyle = { boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px" };
export const primaryButtonClass = "mt-8 inline-flex h-11 min-w-[160px] items-center justify-center rounded-control bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1";
function RegisterHeader() { return <header className="flex min-h-[60px] shrink-0 items-stretch gap-3 bg-crop-blue pr-4 sm:min-h-[70px] sm:gap-4 sm:pr-6"><span className="flex shrink-0 items-center bg-white px-3 sm:px-5"><Image src="/viriyah-logo.png" alt="วิริยะประกันภัย" width={667} height={250} priority className="h-12 w-auto sm:h-16" /></span><span className="flex items-center"><Image src="/fairness-tagline-white.png" alt="ความเป็นธรรม คือ พื้นฐาน" width={1147} height={176} className="h-6 w-auto sm:h-8" /></span></header>; }
function RegisterBanner() { return <Image src="/v-central-pay-banner.jpg" alt="V Central Pay" width={1280} height={300} priority sizes="100vw" className="h-auto w-full shrink-0" />; }
export function SubmitOverlay() { return <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-white"><Logo size={64} idPrefix="register-loading" /></div>; }
export function PageShell({ children }: { children: React.ReactNode }) { return <main className="theme-minimals min-h-dvh bg-grey-100"><RegisterHeader /><RegisterBanner />{children}</main>; }
