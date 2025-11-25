import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsContent } from "./settings-content";
import type { GoalMilestone } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile and goals
  const [profileResult, goalsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("financial_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("display_order", { ascending: true }),
  ]);

  // Fetch milestones for all goals
  const goals = goalsResult.data || [];
  let milestonesMap: Record<string, GoalMilestone[]> = {};

  if (goals.length > 0) {
    const goalIds = goals.map((g) => g.id);
    const { data: milestones } = await supabase
      .from("goal_milestones")
      .select("*")
      .in("goal_id", goalIds)
      .order("display_order", { ascending: true });

    milestonesMap = (milestones || []).reduce((acc, m) => {
      if (!acc[m.goal_id]) acc[m.goal_id] = [];
      acc[m.goal_id].push(m as GoalMilestone);
      return acc;
    }, {} as Record<string, GoalMilestone[]>);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and financial goals
        </p>
      </div>

      <SettingsContent
        profile={profileResult.data}
        goals={goals}
        milestonesMap={milestonesMap}
        userEmail={user.email || ""}
      />
    </div>
  );
}
