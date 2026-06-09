import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 px-4 pt-safe pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
