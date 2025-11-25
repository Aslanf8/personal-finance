"use client";

import { TrendingUp, Target, Calendar, Percent } from "lucide-react";

interface NetWorthGoalProps {
  currentNetWorth: number;
}

interface Milestone {
  date: Date;
  target: number;
  label: string;
  age: number;
}

const BIRTHDAY = new Date("2003-01-23");
const MILESTONES: Milestone[] = [
  { date: new Date("2026-05-01"), target: 0, label: "Start Work", age: 23 },
  { date: new Date("2027-12-31"), target: 150000, label: "Year 1", age: 24 },
  { date: new Date("2028-12-31"), target: 300000, label: "Year 2", age: 25 },
  {
    date: new Date("2029-12-31"),
    target: 500000,
    label: "Goal Achieved",
    age: 26,
  },
];

const FINAL_GOAL = 500000;
const GOAL_AGE = 26;

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function getDaysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getAge(birthday: Date, atDate: Date = new Date()): number {
  const age = atDate.getFullYear() - birthday.getFullYear();
  const m = atDate.getMonth() - birthday.getMonth();
  if (m < 0 || (m === 0 && atDate.getDate() < birthday.getDate())) {
    return age - 1;
  }
  return age;
}

function calculateGrowthNeeded(current: number, target: number): number {
  if (current <= 0) return target > 0 ? Infinity : 0;
  return ((target - current) / current) * 100;
}

export function NetWorthGoal({ currentNetWorth }: NetWorthGoalProps) {
  const now = new Date();
  const currentAge = getAge(BIRTHDAY);

  // Find current/next milestone
  const currentMilestoneIndex = MILESTONES.findIndex((m) => m.date > now);
  const nextMilestone =
    MILESTONES[currentMilestoneIndex] || MILESTONES[MILESTONES.length - 1];

  // Calculate overall progress to final goal
  const overallProgress = Math.min(100, (currentNetWorth / FINAL_GOAL) * 100);

  // Days until next milestone
  const daysUntilNext = getDaysUntil(nextMilestone.date);

  // Calculate required monthly savings to hit next target
  const monthsUntilNext = Math.max(1, daysUntilNext / 30);
  const amountNeeded = Math.max(0, nextMilestone.target - currentNetWorth);
  const requiredMonthlySavings = amountNeeded / monthsUntilNext;

  // Calculate growth percentages needed for each milestone
  const milestonesWithGrowth = MILESTONES.filter((m) => m.target > 0).map(
    (m) => ({
      ...m,
      growthNeeded: calculateGrowthNeeded(currentNetWorth, m.target),
      amountNeeded: Math.max(0, m.target - currentNetWorth),
      isAchieved: currentNetWorth >= m.target,
    })
  );

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50/30 p-6 shadow-sm">
      {/* Decorative elements */}
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="absolute right-1/4 top-1/2 h-24 w-24 rounded-full bg-blue-400/10 blur-2xl" />

      {/* Header */}
      <div className="relative mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Mission
            </h3>
            <p className="mt-1 text-2xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
                $500K
              </span>
              <span className="ml-2 text-lg text-slate-600">
                by Age {GOAL_AGE}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Current Age</p>
            <p className="text-3xl font-bold text-slate-800">{currentAge}</p>
          </div>
        </div>
      </div>

      {/* Current Position & Overall Progress */}
      <div className="relative mb-6 rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4 border border-emerald-200/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Current Net Worth</p>
              <p className="text-xl font-bold text-slate-800">
                {formatCurrency(currentNetWorth)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Overall Progress</p>
            <p className="text-xl font-bold text-emerald-600">
              {overallProgress.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="h-3 rounded-full bg-slate-200 overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-amber-400 transition-all duration-1000 shadow-sm"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-400">$0</span>
          <span className="text-xs text-slate-400">
            {formatCurrency(FINAL_GOAL)}
          </span>
        </div>
      </div>

      {/* Growth Needed Cards */}
      <div className="relative mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Percent className="h-4 w-4 text-slate-500" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Growth Needed to Reach Milestones
          </h4>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {milestonesWithGrowth.map((milestone, index) => (
            <div
              key={index}
              className={`rounded-lg p-3 border transition-all ${
                milestone.isAchieved
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-white/60 border-slate-200 hover:border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    milestone.isAchieved ? "text-emerald-600" : "text-slate-500"
                  }`}
                >
                  {milestone.label}
                </span>
                {milestone.isAchieved && (
                  <svg
                    className="h-4 w-4 text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <p
                className={`text-lg font-bold ${
                  milestone.isAchieved ? "text-emerald-600" : "text-slate-800"
                }`}
              >
                {formatCurrency(milestone.target)}
              </p>
              <p className="text-[10px] text-slate-400 mb-2">
                Dec {milestone.date.getFullYear()}
              </p>
              {milestone.isAchieved ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-emerald-600">
                    ✓ Achieved
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      Need to grow:
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        milestone.growthNeeded > 100
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {milestone.growthNeeded === Infinity
                        ? "∞"
                        : `+${milestone.growthNeeded.toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      Amount left:
                    </span>
                    <span className="text-[10px] font-semibold text-slate-700">
                      {formatCurrency(milestone.amountNeeded)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-slate-500" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Timeline
          </h4>
        </div>
        <div className="flex justify-between items-start">
          {MILESTONES.map((milestone, index) => {
            const isPast = milestone.date < now;
            const isCurrent = index === currentMilestoneIndex;
            const isAchieved =
              currentNetWorth >= milestone.target && milestone.target > 0;

            return (
              <div key={index} className="flex flex-col items-center flex-1">
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className="absolute h-0.5 bg-slate-200"
                    style={{
                      left: `${
                        ((index - 1) / (MILESTONES.length - 1)) * 100 + 12.5
                      }%`,
                      right: `${
                        100 - (index / (MILESTONES.length - 1)) * 100 + 12.5
                      }%`,
                      top: "32px",
                    }}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-500"
                      style={{ width: isPast || isAchieved ? "100%" : "0%" }}
                    />
                  </div>
                )}

                {/* Node */}
                <div
                  className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all shadow-sm ${
                    isAchieved
                      ? "border-emerald-500 bg-emerald-500"
                      : isCurrent
                      ? "border-amber-500 bg-amber-100 ring-2 ring-amber-400/40"
                      : isPast
                      ? "border-slate-300 bg-slate-200"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isAchieved && (
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  {isCurrent && !isAchieved && (
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>

                {/* Label */}
                <p
                  className={`mt-2 text-[10px] font-medium ${
                    isCurrent
                      ? "text-amber-600"
                      : isAchieved
                      ? "text-emerald-600"
                      : "text-slate-500"
                  }`}
                >
                  {milestone.label}
                </p>
                <p className="text-[10px] text-slate-400">
                  {milestone.target === 0
                    ? `May ${milestone.date.getFullYear()}`
                    : `Dec ${milestone.date.getFullYear()}`}
                </p>
                <p
                  className={`text-xs font-semibold ${
                    isAchieved
                      ? "text-emerald-600"
                      : isCurrent
                      ? "text-slate-800"
                      : "text-slate-500"
                  }`}
                >
                  {milestone.target > 0
                    ? formatCurrency(milestone.target)
                    : "—"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Target Card */}
      <div className="rounded-lg bg-white/60 backdrop-blur-sm p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-amber-500" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Next Target
          </h4>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xl font-bold text-slate-800">
              {nextMilestone.target > 0
                ? formatCurrency(nextMilestone.target)
                : "Start Work"}
            </p>
            <p className="text-xs text-slate-500">{nextMilestone.label}</p>
          </div>
          <div className="text-right">
            <p
              className={`text-2xl font-bold ${
                daysUntilNext > 365
                  ? "text-emerald-600"
                  : daysUntilNext > 180
                  ? "text-amber-600"
                  : "text-red-500"
              }`}
            >
              {daysUntilNext > 0 ? daysUntilNext : 0}
            </p>
            <p className="text-xs text-slate-500">days left</p>
          </div>
        </div>

        {nextMilestone.target > 0 && (
          <>
            {/* Progress to next target */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">
                  Progress to {formatCurrency(nextMilestone.target)}
                </span>
                <span className="font-medium text-slate-700">
                  {Math.min(
                    100,
                    (currentNetWorth / nextMilestone.target) * 100
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    currentNetWorth >= nextMilestone.target
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (currentNetWorth / nextMilestone.target) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Required savings */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Required monthly savings:</span>
              <span
                className={`font-semibold ${
                  requiredMonthlySavings > 10000
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              >
                {formatCurrency(requiredMonthlySavings)}/mo
              </span>
            </div>
          </>
        )}
      </div>

      {/* Motivational footer */}
      <div className="mt-4 text-center">
        <p className="text-[10px] uppercase tracking-widest text-slate-400">
          {overallProgress >= 100
            ? "🏆 Goal Achieved — You Made It!"
            : overallProgress >= 50
            ? "🔥 Halfway There — Keep Pushing!"
            : "💪 Stay Focused — Every Dollar Counts"}
        </p>
      </div>
    </div>
  );
}
