import { Sidebar } from "@/components/sidebar";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas text-text">
      <Sidebar />
      <div className="md:pl-[220px]">
        <main className="mx-auto max-w-6xl px-4 pb-10 pt-[72px] sm:px-6 md:px-8 md:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}
