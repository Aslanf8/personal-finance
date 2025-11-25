"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "@/app/(dashboard)/settings/actions";
import { GOAL_COLORS, type GoalColor } from "@/lib/types";
import { Rocket, User, Target, Sparkles } from "lucide-react";

interface OnboardingDialogProps {
  open: boolean;
}

type Step = "welcome" | "profile" | "goal" | "complete";

export function OnboardingDialog({ open }: OnboardingDialogProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    birthday: "",
    currency: "CAD" as "CAD" | "USD",
    goal_name: "",
    goal_amount: "",
    goal_date: "",
    goal_color: "amber" as GoalColor,
  });

  const handleComplete = async () => {
    setLoading(true);
    const fd = new FormData();
    fd.append("full_name", formData.full_name);
    fd.append("birthday", formData.birthday);
    fd.append("currency", formData.currency);
    if (formData.goal_name && formData.goal_amount) {
      fd.append("goal_name", formData.goal_name);
      fd.append("goal_amount", formData.goal_amount);
      fd.append("goal_date", formData.goal_date);
    }
    await completeOnboarding(fd);
    setLoading(false);
  };

  const getAge = (): number | null => {
    if (!formData.birthday) return null;
    const today = new Date();
    const birth = new Date(formData.birthday);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Dialog open={open}>
      <DialogContent 
        className="sm:max-w-lg [&>button]:hidden" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {step === "welcome" && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
                <Rocket className="h-8 w-8 text-white" />
              </div>
              <DialogTitle className="text-2xl">Welcome to FinanceHub! 🎉</DialogTitle>
              <DialogDescription className="text-base">
                Your personal finance command center. Let&apos;s set up your profile and define your first financial mission.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-4">
              <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border border-emerald-200">
                <h4 className="font-semibold text-emerald-800">What you can track:</h4>
                <ul className="mt-2 space-y-1 text-sm text-emerald-700">
                  <li>✓ Income & Expenses</li>
                  <li>✓ Investment Portfolio</li>
                  <li>✓ Net Worth Goals & Milestones</li>
                  <li>✓ Progress visualization</li>
                </ul>
              </div>
              <Button onClick={() => setStep("profile")} className="w-full h-12 text-base">
                Let&apos;s Get Started
              </Button>
            </div>
          </>
        )}

        {step === "profile" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <DialogTitle>Your Profile</DialogTitle>
                  <DialogDescription>Tell us a bit about yourself</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="mt-6 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">What should we call you?</Label>
                <Input
                  id="full_name"
                  placeholder="Your name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="h-11"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="birthday">When were you born?</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  className="h-11"
                />
                {getAge() !== null && (
                  <p className="text-sm text-muted-foreground">
                    You&apos;re {getAge()} years old — great time to build wealth! 💪
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currency">Preferred Currency</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, currency: "CAD" })}
                    className={`flex-1 h-11 rounded-lg border-2 transition-all ${
                      formData.currency === "CAD"
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    🇨🇦 CAD
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, currency: "USD" })}
                    className={`flex-1 h-11 rounded-lg border-2 transition-all ${
                      formData.currency === "USD"
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    🇺🇸 USD
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("welcome")} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep("goal")} className="flex-1">
                  Continue
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "goal" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20">
                  <Target className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <DialogTitle>Your Mission</DialogTitle>
                  <DialogDescription>Define your primary financial goal</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="mt-6 space-y-4">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-800">
                  <strong>Pro tip:</strong> Set a bold, inspiring goal. You can always add milestones and adjust later!
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="goal_name">Goal Name</Label>
                <Input
                  id="goal_name"
                  placeholder="e.g., $500K Net Worth by 30"
                  value={formData.goal_name}
                  onChange={(e) => setFormData({ ...formData, goal_name: e.target.value })}
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="goal_amount">Target Amount ($)</Label>
                  <Input
                    id="goal_amount"
                    type="number"
                    placeholder="500000"
                    value={formData.goal_amount}
                    onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="goal_date">Target Date</Label>
                  <Input
                    id="goal_date"
                    type="date"
                    value={formData.goal_date}
                    onChange={(e) => setFormData({ ...formData, goal_date: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Color Theme</Label>
                <div className="flex gap-2">
                  {(Object.keys(GOAL_COLORS) as GoalColor[]).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, goal_color: color })}
                      className={`h-10 w-10 rounded-full bg-gradient-to-br ${GOAL_COLORS[color].gradient} 
                        ring-2 transition-all ${
                          formData.goal_color === color
                            ? "ring-slate-900 ring-offset-2"
                            : "ring-transparent hover:ring-slate-300"
                        }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("profile")} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep("complete")} className="flex-1">
                  Continue
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "complete" && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <DialogTitle className="text-2xl">You&apos;re All Set! 🚀</DialogTitle>
              <DialogDescription className="text-base">
                Your financial command center is ready. Time to start tracking your journey!
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 p-4 border">
                <h4 className="font-semibold mb-3">Your Setup Summary:</h4>
                <div className="space-y-2 text-sm">
                  {formData.full_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{formData.full_name}</span>
                    </div>
                  )}
                  {formData.birthday && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Age</span>
                      <span className="font-medium">{getAge()} years old</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Currency</span>
                    <span className="font-medium">{formData.currency === "CAD" ? "🇨🇦 CAD" : "🇺🇸 USD"}</span>
                  </div>
                  {formData.goal_name && (
                    <>
                      <div className="my-2 border-t" />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Goal</span>
                        <span className="font-medium">{formData.goal_name}</span>
                      </div>
                      {formData.goal_amount && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Target</span>
                          <span className="font-medium">
                            ${parseInt(formData.goal_amount).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <Button onClick={handleComplete} disabled={loading} className="w-full h-12 text-base">
                {loading ? "Setting up..." : "Launch Dashboard →"}
              </Button>

              <button
                onClick={() => setStep("goal")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Go back and edit
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

