"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  updateProfile,
  createGoal,
  updateGoal,
  deleteGoal,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  markMilestoneAchieved,
} from "./actions";
import type {
  UserProfile,
  FinancialGoal,
  GoalMilestone,
  GoalColor,
  GoalType,
} from "@/lib/types";
import { GOAL_COLORS, GOAL_TYPES } from "@/lib/types";
import {
  User,
  Target,
  Plus,
  Trash2,
  Edit2,
  Star,
  Check,
  X,
  Milestone,
  Building2,
} from "lucide-react";
import { ConnectedAccounts } from "@/components/plaid";

interface SettingsContentProps {
  profile: UserProfile | null;
  goals: FinancialGoal[];
  milestonesMap: Record<string, GoalMilestone[]>;
  userEmail: string;
}

export function SettingsContent({
  profile,
  goals,
  milestonesMap,
  userEmail,
}: SettingsContentProps) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(
    goals.find((g) => g.is_primary)?.id || null
  );
  const [isAddingMilestone, setIsAddingMilestone] = useState<string | null>(
    null
  );
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    await updateProfile({
      full_name: formData.get("full_name") as string,
      birthday: formData.get("birthday") as string,
      currency: formData.get("currency") as "CAD" | "USD",
    });

    setIsEditingProfile(false);
    setLoading(false);
  };

  const handleGoalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const goalData = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      target_amount: parseFloat(formData.get("target_amount") as string),
      target_date: (formData.get("target_date") as string) || undefined,
      target_age: formData.get("target_age")
        ? parseInt(formData.get("target_age") as string)
        : undefined,
      goal_type: formData.get("goal_type") as GoalType,
      color: formData.get("color") as GoalColor,
      is_primary: formData.get("is_primary") === "on",
    };

    if (editingGoalId) {
      await updateGoal(editingGoalId, goalData);
      setEditingGoalId(null);
    } else {
      await createGoal(goalData);
      setIsAddingGoal(false);
    }

    setLoading(false);
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    await deleteGoal(id);
  };

  const handleMilestoneSubmit = async (
    goalId: string,
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    await createMilestone({
      goal_id: goalId,
      name: formData.get("name") as string,
      target_amount: parseFloat(formData.get("target_amount") as string),
      target_date: (formData.get("target_date") as string) || undefined,
    });

    setIsAddingMilestone(null);
    setLoading(false);
  };

  const handleMilestoneUpdate = async (
    milestoneId: string,
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    await updateMilestone(milestoneId, {
      name: formData.get("name") as string,
      target_amount: parseFloat(formData.get("target_amount") as string),
      target_date: (formData.get("target_date") as string) || undefined,
    });

    setEditingMilestoneId(null);
    setLoading(false);
  };

  const getAge = (birthday: string): number => {
    const today = new Date();
    const birth = new Date(birthday);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Connected Bank Accounts Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>
                Link your bank accounts to automatically import transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ConnectedAccounts />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20">
                  <User className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Your personal information</CardDescription>
                </div>
              </div>
              {!isEditingProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingProfile(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingProfile ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Display Name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    defaultValue={profile?.full_name || ""}
                    placeholder="Your name"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    name="birthday"
                    type="date"
                    defaultValue={profile?.birthday || ""}
                  />
                  {profile?.birthday && (
                    <p className="text-xs text-muted-foreground">
                      Current age: {getAge(profile.birthday)} years old
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="currency">Preferred Currency</Label>
                  <select
                    id="currency"
                    name="currency"
                    defaultValue={profile?.currency || "CAD"}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="CAD">🇨🇦 CAD - Canadian Dollar</option>
                    <option value="USD">🇺🇸 USD - US Dollar</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditingProfile(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{userEmail}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">
                    {profile?.full_name || "Not set"}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">
                    Birthday
                  </span>
                  <span className="text-sm font-medium">
                    {profile?.birthday
                      ? `${new Date(
                          profile.birthday
                        ).toLocaleDateString()} (Age ${getAge(
                          profile.birthday
                        )})`
                      : "Not set"}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">
                    Currency
                  </span>
                  <span className="text-sm font-medium">
                    {profile?.currency === "USD" ? "🇺🇸 USD" : "🇨🇦 CAD"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20">
                    <Target className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle>Financial Goals</CardTitle>
                    <CardDescription>
                      Your missions and milestones
                    </CardDescription>
                  </div>
                </div>
                <Button onClick={() => setIsAddingGoal(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Goal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isAddingGoal && (
                <GoalForm
                  onSubmit={handleGoalSubmit}
                  onCancel={() => setIsAddingGoal(false)}
                  loading={loading}
                  isFirst={goals.length === 0}
                />
              )}

              {goals.length === 0 && !isAddingGoal ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground mb-4">No goals set yet</p>
                  <Button onClick={() => setIsAddingGoal(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Create Your First Goal
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 mt-4">
                  {goals.map((goal) => {
                    const colorConfig =
                      GOAL_COLORS[goal.color as GoalColor] || GOAL_COLORS.amber;
                    const isExpanded = expandedGoalId === goal.id;
                    const milestones = milestonesMap[goal.id] || [];

                    if (editingGoalId === goal.id) {
                      return (
                        <GoalForm
                          key={goal.id}
                          goal={goal}
                          onSubmit={handleGoalSubmit}
                          onCancel={() => setEditingGoalId(null)}
                          loading={loading}
                        />
                      );
                    }

                    return (
                      <div
                        key={goal.id}
                        className={`rounded-lg border ${colorConfig.border} ${colorConfig.bg} overflow-hidden transition-all`}
                      >
                        <div
                          className="p-4 cursor-pointer"
                          onClick={() =>
                            setExpandedGoalId(isExpanded ? null : goal.id)
                          }
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {goal.is_primary && (
                                <Star
                                  className={`h-4 w-4 ${colorConfig.text} fill-current`}
                                />
                              )}
                              <span
                                className={`font-semibold ${colorConfig.text}`}
                              >
                                {goal.name}
                              </span>
                              <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full">
                                {GOAL_TYPES[goal.goal_type as GoalType]?.icon}{" "}
                                {GOAL_TYPES[goal.goal_type as GoalType]?.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingGoalId(goal.id);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGoal(goal.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold">
                              {formatCurrency(goal.target_amount)}
                            </span>
                            {goal.target_date && (
                              <span className="text-sm text-muted-foreground">
                                by{" "}
                                {new Date(
                                  goal.target_date
                                ).toLocaleDateString()}
                              </span>
                            )}
                            {goal.target_age && (
                              <span className="text-sm text-muted-foreground">
                                by age {goal.target_age}
                              </span>
                            )}
                          </div>

                          {goal.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {goal.description}
                            </p>
                          )}
                        </div>

                        {/* Milestones Section */}
                        {isExpanded && (
                          <div className="border-t border-white/50 p-4 bg-white/30">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Milestone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  Milestones
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsAddingMilestone(goal.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add
                              </Button>
                            </div>

                            {isAddingMilestone === goal.id && (
                              <form
                                onSubmit={(e) =>
                                  handleMilestoneSubmit(goal.id, e)
                                }
                                className="mb-3 p-3 bg-white rounded-lg space-y-3"
                              >
                                <div className="grid gap-2">
                                  <Label className="text-xs">
                                    Milestone Name
                                  </Label>
                                  <Input
                                    name="name"
                                    placeholder="e.g., First $50K"
                                    required
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="grid gap-1">
                                    <Label className="text-xs">
                                      Target Amount
                                    </Label>
                                    <Input
                                      name="target_amount"
                                      type="number"
                                      step="0.01"
                                      required
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div className="grid gap-1">
                                    <Label className="text-xs">
                                      Target Date
                                    </Label>
                                    <Input
                                      name="target_date"
                                      type="date"
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="submit"
                                    size="sm"
                                    disabled={loading}
                                  >
                                    Add
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsAddingMilestone(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            )}

                            {milestones.length === 0 &&
                            isAddingMilestone !== goal.id ? (
                              <p className="text-sm text-muted-foreground text-center py-3">
                                No milestones yet. Add checkpoints to track your
                                progress!
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {milestones.map((milestone) =>
                                  editingMilestoneId === milestone.id ? (
                                    <form
                                      key={milestone.id}
                                      onSubmit={(e) =>
                                        handleMilestoneUpdate(milestone.id, e)
                                      }
                                      className="p-3 bg-white rounded-lg space-y-3 border border-amber-200"
                                    >
                                      <div className="grid gap-2">
                                        <Label className="text-xs">
                                          Milestone Name
                                        </Label>
                                        <Input
                                          name="name"
                                          defaultValue={milestone.name}
                                          placeholder="e.g., First $50K"
                                          required
                                          className="h-8 text-sm"
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="grid gap-1">
                                          <Label className="text-xs">
                                            Target Amount
                                          </Label>
                                          <Input
                                            name="target_amount"
                                            type="number"
                                            step="0.01"
                                            defaultValue={
                                              milestone.target_amount
                                            }
                                            required
                                            className="h-8 text-sm"
                                          />
                                        </div>
                                        <div className="grid gap-1">
                                          <Label className="text-xs">
                                            Target Date
                                          </Label>
                                          <Input
                                            name="target_date"
                                            type="date"
                                            defaultValue={
                                              milestone.target_date || ""
                                            }
                                            className="h-8 text-sm"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          type="submit"
                                          size="sm"
                                          disabled={loading}
                                        >
                                          {loading ? "Saving..." : "Save"}
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            setEditingMilestoneId(null)
                                          }
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </form>
                                  ) : (
                                    <div
                                      key={milestone.id}
                                      className={`flex items-center justify-between p-2 rounded-md ${
                                        milestone.is_achieved
                                          ? "bg-emerald-50"
                                          : "bg-white"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() =>
                                            markMilestoneAchieved(
                                              milestone.id,
                                              !milestone.is_achieved
                                            )
                                          }
                                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                            milestone.is_achieved
                                              ? "bg-emerald-500 border-emerald-500 text-white"
                                              : "border-slate-300 hover:border-emerald-400"
                                          }`}
                                        >
                                          {milestone.is_achieved && (
                                            <Check className="h-3 w-3" />
                                          )}
                                        </button>
                                        <div>
                                          <span
                                            className={`text-sm font-medium ${
                                              milestone.is_achieved
                                                ? "line-through text-muted-foreground"
                                                : ""
                                            }`}
                                          >
                                            {milestone.name}
                                          </span>
                                          <span className="text-xs text-muted-foreground ml-2">
                                            {formatCurrency(
                                              milestone.target_amount
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {milestone.target_date && (
                                          <span className="text-xs text-muted-foreground mr-1">
                                            {new Date(
                                              milestone.target_date
                                            ).toLocaleDateString()}
                                          </span>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() =>
                                            setEditingMilestoneId(milestone.id)
                                          }
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                          onClick={() =>
                                            deleteMilestone(milestone.id)
                                          }
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Goal Form Component
function GoalForm({
  goal,
  onSubmit,
  onCancel,
  loading,
  isFirst = false,
}: {
  goal?: FinancialGoal;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  isFirst?: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="p-4 rounded-lg border bg-slate-50 space-y-4"
    >
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label>Goal Name *</Label>
          <Input
            name="name"
            defaultValue={goal?.name || ""}
            placeholder="e.g., $500K by 30"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label>Description</Label>
          <Input
            name="description"
            defaultValue={goal?.description || ""}
            placeholder="What does this goal mean to you?"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Target Amount *</Label>
            <Input
              name="target_amount"
              type="number"
              step="0.01"
              defaultValue={goal?.target_amount || ""}
              placeholder="500000"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Goal Type</Label>
            <select
              name="goal_type"
              defaultValue={goal?.goal_type || "net_worth"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Object.entries(GOAL_TYPES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.icon} {value.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Target Date</Label>
            <Input
              name="target_date"
              type="date"
              defaultValue={goal?.target_date || ""}
            />
          </div>
          <div className="grid gap-2">
            <Label>Target Age</Label>
            <Input
              name="target_age"
              type="number"
              defaultValue={goal?.target_age || ""}
              placeholder="30"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Color Theme</Label>
          <div className="flex gap-2">
            {(Object.keys(GOAL_COLORS) as GoalColor[]).map((color) => (
              <label key={color} className="cursor-pointer">
                <input
                  type="radio"
                  name="color"
                  value={color}
                  defaultChecked={
                    goal?.color === color || (!goal && color === "amber")
                  }
                  className="sr-only peer"
                />
                <div
                  className={`h-8 w-8 rounded-full bg-gradient-to-br ${GOAL_COLORS[color].gradient} 
                    ring-2 ring-transparent peer-checked:ring-slate-900 peer-checked:ring-offset-2 transition-all`}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_primary"
            id="is_primary"
            defaultChecked={goal?.is_primary || isFirst}
            className="h-4 w-4"
          />
          <Label htmlFor="is_primary" className="cursor-pointer">
            Set as primary goal (shown on dashboard)
          </Label>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : goal ? "Update Goal" : "Create Goal"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
