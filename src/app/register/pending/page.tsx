import Link from "next/link";
import { Clock } from "lucide-react";
import { PageShell, cardStyle, primaryButtonClass } from "@/components/register/register-shell";

export default function PendingPage() { return <PageShell><div className="flex justify-center p-12"><div className="w-full max-w-md rounded-card bg-card p-10 text-center" style={cardStyle}><Clock className="mx-auto size-12 text-warning" /><h1 className="mt-4 text-xl font-bold">รอการอนุมัติ</h1><p className="mt-2 text-sm text-muted-foreground">ระบบได้รับข้อมูลการลงทะเบียนแล้ว กรุณารอการอนุมัติจากผู้ดูแลระบบ</p><Link href="/login" className={primaryButtonClass}>กลับสู่หน้าหลัก</Link></div></div></PageShell>; }
