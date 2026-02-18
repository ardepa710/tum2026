import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
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
      <div className="md:ml-16 lg:ml-[260px] pb-16 md:pb-0">
        <Header />
        <main className="p-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
