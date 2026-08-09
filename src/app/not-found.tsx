import Link from "next/link";
import type { Metadata } from "next";
import { ErrorScreen, errorButtonClass } from "@/components/error/error-screen";

export const metadata: Metadata = { title: "ไม่พบหน้า" };

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="ไม่พบหน้าที่ต้องการ"
      message="หน้าที่คุณเรียกอาจถูกย้ายหรือลบไปแล้ว"
    >
      <Link href="/login" className={errorButtonClass}>
        กลับหน้าเข้าสู่ระบบ
      </Link>
    </ErrorScreen>
  );
}
