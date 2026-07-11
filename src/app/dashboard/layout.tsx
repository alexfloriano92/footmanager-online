import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch coach and club data for the layout context
  const { data: coach } = await supabase
    .from('coaches')
    .select('*, club_owners(club_id)')
    .eq('user_id', user.id)
    .single();

  if (!coach) {
    redirect('/onboarding/coach');
  }

  const clubId = coach.club_owners?.[0]?.club_id;
  if (!clubId) {
    redirect('/onboarding/club');
  }

  const { data: club } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', clubId)
    .single();

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950 text-slate-50">
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <Sidebar currentClub={club} currentCoach={coach} />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-64 h-full">
          <Header user={user} coach={coach} club={club} />
          <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
