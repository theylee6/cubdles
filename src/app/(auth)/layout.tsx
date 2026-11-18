import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { SofaScene } from "@/components/illustrations";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link href="/" aria-label="Cubdles home" className="w-fit rounded-lg">
          <Wordmark />
        </Link>
        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <p className="text-center text-xs text-mocha">Cubdles is for adults 18 and over.</p>
      </div>
      <div aria-hidden className="hidden items-center justify-center bg-[linear-gradient(160deg,#F6E4DC,#F3ECE3)] p-12 lg:flex">
        <SofaScene className="w-full max-w-lg" />
      </div>
    </div>
  );
}
