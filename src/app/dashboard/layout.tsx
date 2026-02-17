import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="ml-[var(--sidebar-width)]">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
