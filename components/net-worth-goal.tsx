"use client";

import { TrendingUp, Target, Settings2, Sparkles } from "lucide-react";
import Link from "next/link";
import type { FinancialGoal, GoalMilestone, GoalColor } from "@/lib/types";
import { GOAL_COLORS } from "@/lib/types";

interface NetWorthGoalProps {
  currentNetWorth: number;
  goal: FinancialGoal | null;
  milestones: GoalMilestone[];
  birthday: string | null;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function getAge(birthday: Date): number {
  const now = new Date();
  const age = now.getFullYear() - birthday.getFullYear();
  const m = now.getMonth() - birthday.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthday.getDate())) {
    return age - 1;
  }
  return age;
}

function getAgeAtDate(birthday: Date, targetDate: Date): number {
  const age = targetDate.getFullYear() - birthday.getFullYear();
  const m = targetDate.getMonth() - birthday.getMonth();
  if (m < 0 || (m === 0 && targetDate.getDate() < birthday.getDate())) {
    return age - 1;
  }
  return age;
}

function NoGoalState() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100/50 p-8">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-slate-200/50 blur-3xl" />
      <div className="relative flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 mb-4">
          <Target className="h-7 w-7 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          Set Your Financial Mission
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Define a bold financial goal to track your progress. Whether it&apos;s
          reaching $500K or retiring early — your journey starts here.
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <Sparkles className="h-4 w-4" />
          Create Your First Goal
        </Link>
      </div>
    </div>
  );
}

export function NetWorthGoal({
  currentNetWorth,
  goal,
  milestones,
  birthday,
}: NetWorthGoalProps) {
  if (!goal) {
    return <NoGoalState />;
  }

  const colorConfig = GOAL_COLORS[(goal.color as GoalColor) || "amber"];
  const currentAge = birthday ? getAge(new Date(birthday)) : null;
  const overallProgress = Math.min(
    100,
    (currentNetWorth / goal.target_amount) * 100
  );

  // Milestones with calculated progress
  const milestonesWithProgress = milestones
    .map((m) => {
      const amountNeeded = Math.max(0, m.target_amount - currentNetWorth);
      const growthNeeded =
        currentNetWorth > 0
          ? ((m.target_amount - currentNetWorth) / currentNetWorth) * 100
          : Infinity;
      return {
        ...m,
        progress: Math.min(100, (currentNetWorth / m.target_amount) * 100),
        isAchieved: m.is_achieved || currentNetWorth >= m.target_amount,
        amountNeeded,
        growthNeeded,
      };
    })
    .sort((a, b) => a.target_amount - b.target_amount);

  // Final goal stats
  const goalAmountNeeded = Math.max(0, goal.target_amount - currentNetWorth);
  const goalGrowthNeeded =
    currentNetWorth > 0
      ? ((goal.target_amount - currentNetWorth) / currentNetWorth) * 100
      : Infinity;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${colorConfig.border} bg-gradient-to-br from-white via-slate-50/80 to-emerald-50/30 p-5 shadow-sm`}
    >
      {/* Subtle decorative elements */}
      <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" />

      {/* Compact Header */}
      <div className="relative flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Net Worth
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {formatCurrency(currentNetWorth)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {currentAge !== null && (
            <div className="text-right">
              <p className="text-xs text-slate-500">Age</p>
              <p className="text-2xl font-bold text-slate-700">{currentAge}</p>
            </div>
          )}
          <Link
            href="/settings"
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Edit Goal"
          >
            <Settings2 className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Main Progress to Goal */}
      <div className="relative mb-5 rounded-lg bg-white/60 backdrop-blur-sm p-4 border border-slate-200/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">
              Goal
            </span>
            <span
              className={`text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent`}
            >
              {formatCurrency(goal.target_amount)}
            </span>
            {goal.target_date && (
              <span className="text-sm text-slate-500">
                by{" "}
                {new Date(goal.target_date).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
                {birthday && (
                  <span className="ml-1 text-amber-600 font-medium">
                    (Age{" "}
                    {getAgeAtDate(
                      new Date(birthday),
                      new Date(goal.target_date)
                    )}
                    )
                  </span>
                )}
              </span>
            )}
          </div>
          <span className="text-lg font-bold text-emerald-600">
            {overallProgress.toFixed(1)}%
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Timeline with milestones + final goal */}
      <div className="relative">
        {/* Timeline track */}
        <div className="absolute left-0 right-0 top-[7px] h-0.5 bg-slate-200" />
        <div
          className="absolute left-0 top-[7px] h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
          style={{ width: `${overallProgress}%` }}
        />

        {/* Nodes: milestones + final goal */}
        <div className="relative flex justify-between">
          {/* Milestone nodes */}
          {milestonesWithProgress.slice(0, 3).map((milestone, idx) => {
            const isNext =
              !milestone.isAchieved &&
              (idx === 0 || milestonesWithProgress[idx - 1]?.isAchieved);

            return (
              <div
                key={milestone.id}
                className="flex flex-col items-center"
                style={{
                  width: `${
                    100 / (Math.min(3, milestonesWithProgress.length) + 1)
                  }%`,
                }}
              >
                <div
                  className={`relative z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all ${
                    milestone.isAchieved
                      ? "border-emerald-500 bg-emerald-500"
                      : isNext
                      ? "border-amber-400 bg-amber-400 ring-4 ring-amber-100"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {milestone.isAchieved && (
                    <svg
                      className="h-2.5 w-2.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={4}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={`text-sm font-semibold ${
                      milestone.isAchieved
                        ? "text-emerald-600"
                        : isNext
                        ? "text-slate-800"
                        : "text-slate-500"
                    }`}
                  >
                    {formatCurrency(milestone.target_amount)}
                  </p>
                  {milestone.target_date && (
                    <p className="text-[10px] text-slate-400">
                      {new Date(milestone.target_date).toLocaleDateString(
                        "en-US",
                        { month: "short", year: "numeric" }
                      )}
                      {birthday && (
                        <span className="ml-1 text-amber-500 font-medium">
                          · Age{" "}
                          {getAgeAtDate(
                            new Date(birthday),
                            new Date(milestone.target_date)
                          )}
                        </span>
                      )}
                    </p>
                  )}
                  {!milestone.isAchieved && (
                    <p className="text-[10px] font-medium text-amber-600 mt-1">
                      +{milestone.growthNeeded.toFixed(0)}% ·{" "}
                      {formatCurrency(milestone.amountNeeded)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Final Goal node */}
          <div
            className="flex flex-col items-center"
            style={{
              width: `${
                100 / (Math.min(3, milestonesWithProgress.length) + 1)
              }%`,
            }}
          >
            <div
              className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                overallProgress >= 100
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-amber-500 bg-amber-500 ring-4 ring-amber-100"
              }`}
            >
              {overallProgress >= 100 && (
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={4}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <div className="mt-2 text-center">
              <p
                className={`text-sm font-bold ${
                  overallProgress >= 100
                    ? "text-emerald-600"
                    : "bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent"
                }`}
              >
                {formatCurrency(goal.target_amount)}
              </p>
              {goal.target_date && (
                <p className="text-[10px] text-slate-400">
                  {new Date(goal.target_date).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                  {birthday && (
                    <span className="ml-1 text-amber-500 font-medium">
                      · Age{" "}
                      {getAgeAtDate(
                        new Date(birthday),
                        new Date(goal.target_date)
                      )}
                    </span>
                  )}
                </p>
              )}
              {overallProgress < 100 && (
                <p className="text-[10px] font-medium text-amber-600 mt-1">
                  +{goalGrowthNeeded.toFixed(0)}% ·{" "}
                  {formatCurrency(goalAmountNeeded)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Motivational footer */}
      <div className="mt-5 pt-4 border-t border-slate-200/60 text-center">
        <p className="text-[10px] uppercase tracking-widest text-slate-400">
          {overallProgress >= 100
            ? "🏆 Goal Achieved!"
            : overallProgress >= 50
            ? "🔥 Halfway There!"
            : "💪 Every Dollar Counts"}
        </p>
      </div>
    </div>
  );
}
