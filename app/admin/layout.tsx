import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/admin" className="text-lg font-semibold">
          Concierge <span className="text-blush">queue</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/admin/metrics"
            className="text-sm text-white/60 transition hover:text-white"
          >
            Metrics
          </Link>
          <LogoutButton />
        </nav>
      </header>
      {children}
    </div>
  );
}
