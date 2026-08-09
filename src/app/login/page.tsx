import type { Metadata } from "next";

import { LoginView } from "@/components/auth/login-view";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default function LoginPage() {
  return <LoginView />;
}
