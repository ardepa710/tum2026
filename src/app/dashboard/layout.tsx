import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getSessionRole } from "@/lib/rbac";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getSessionRole();

  return (
    <div className="min-h-screen">
      <Sidebar role={role} />
      <div className="ml-[var(--sidebar-width)]">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
