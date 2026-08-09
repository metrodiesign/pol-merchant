import { MerchantShellGate } from "@/components/layout/merchant-shell-gate";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <MerchantShellGate>{children}</MerchantShellGate>;
}
