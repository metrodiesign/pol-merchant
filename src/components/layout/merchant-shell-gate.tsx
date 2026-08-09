import { notFound } from "next/navigation";

import { isMerchantShellPreviewEnabled } from "@/lib/merchant/shell-preview";

import { MinimalsLayout } from "./minimals-layout";

export function MerchantShellGate({ children }: { children: React.ReactNode }) {
  if (!isMerchantShellPreviewEnabled(process.env)) notFound();

  return <MinimalsLayout>{children}</MinimalsLayout>;
}
