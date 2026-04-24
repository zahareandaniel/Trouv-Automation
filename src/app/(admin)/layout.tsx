import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getSessionEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionEmail = await getSessionEmail();
  if (!sessionEmail) redirect("/login");

  return (
    <div className="min-h-screen bg-canvas text-text">
      <Sidebar userEmail={sessionEmail} />
      <div className="md:pl-[220px]">
        <main className="mx-auto max-w-6xl px-4 pb-10 pt-[72px] sm:px-6 md:px-8 md:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}
