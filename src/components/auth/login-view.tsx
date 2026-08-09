import Image from "next/image";
import Link from "next/link";

const registrationLinkClass =
  "mt-8 inline-flex h-12 w-full items-center justify-center rounded-control bg-white px-5 text-sm font-bold text-crop-blue transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-crop-blue";

export function LoginView() {
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <header className="flex min-h-[60px] shrink-0 items-stretch gap-3 bg-crop-blue pr-4 sm:min-h-[70px] sm:gap-4 sm:pr-6">
        <span className="flex shrink-0 items-center bg-white px-3 sm:px-5">
          <Image
            src="/viriyah-logo.png"
            alt="วิริยะประกันภัย"
            width={667}
            height={250}
            priority
            className="h-12 w-auto sm:h-16"
          />
        </span>
        <span className="flex items-center">
          <Image
            src="/fairness-tagline-white.png"
            alt="ความเป็นธรรม คือ พื้นฐาน"
            width={1147}
            height={176}
            className="h-6 w-auto sm:h-8"
          />
        </span>
      </header>

      <Image
        src="/v-central-pay-banner.jpg"
        alt="V Central Pay"
        width={1280}
        height={300}
        priority
        sizes="100vw"
        className="h-auto w-full shrink-0"
      />

      <div className="flex flex-1 items-start justify-center px-4 py-12">
        <section
          aria-labelledby="merchant-login-title"
          className="flex min-h-[280px] w-full max-w-md flex-col justify-center rounded-2xl bg-crop-blue p-8 text-center shadow-card"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
            POL Merchant
          </p>
          <h1 id="merchant-login-title" className="mt-3 text-2xl font-bold text-white">
            สำหรับตัวแทน/นายหน้า
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/80">
            ลงทะเบียนเพื่อเริ่มต้นใช้งานระบบ Merchant
          </p>
          <Link href="/register" className={registrationLinkClass}>
            ลงทะเบียนตัวแทน/นายหน้า
          </Link>
        </section>
      </div>
    </main>
  );
}
