"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Camera, 
  RotateCcw, 
  Scan, 
  Loader2, 
  AlertCircle, 
  ImageIcon,
  Save,
  Pencil,
} from "lucide-react";
import { ScanInvestmentResult, ScannedInvestment } from "@/lib/types";
import { addInvestment } from "@/app/(dashboard)/investments/actions";

const ASSET_TYPES = ['stock', 'crypto'] as const;
const ACCOUNT_LABELS = ['Margin', 'TFSA', 'RRSP', 'FHSA', 'Cash', 'Crypto'] as const;

interface ScanInvestmentDialogProps {
  onScanComplete?: (investments: ScannedInvestment[]) => void;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type ScanState = "camera" | "preview" | "analyzing" | "results" | "saving" | "error";

export function ScanInvestmentDialog({ 
  onScanComplete, 
  children, 
  defaultOpen = false,
  onOpenChange 
}: ScanInvestmentDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [state, setState] = useState<ScanState>("camera");

  // Sync open state with external defaultOpen prop
  useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);

  // Notify parent of open state changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setOpen(true);
    } else {
      handleClose();
    }
    onOpenChange?.(isOpen);
  };
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<ScanInvestmentResult | null>(null);
  const [editableInvestments, setEditableInvestments] = useState<ScannedInvestment[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    facingMode: facingMode,
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setState("preview");
    }
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setCapturedImage(base64);
        setState("preview");
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const retake = () => {
    setCapturedImage(null);
    setResult(null);
    setEditableInvestments([]);
    setEditingIndex(null);
    setError(null);
    setState("camera");
  };

  const analyze = async () => {
    if (!capturedImage) return;

    setState("analyzing");
    setError(null);

    try {
      const response = await fetch("/api/scan-investment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: capturedImage }),
      });

      const data: ScanInvestmentResult = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to analyze image");
        setState("error");
        return;
      }

      // Ensure all investments have a valid date (default to current local date, not UTC)
      const now = new Date();
      const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const investmentsWithDates = data.investments.map(inv => ({
        ...inv,
        date: inv.date && inv.date.trim() ? inv.date : currentDate
      }));

      setResult(data);
      setEditableInvestments(investmentsWithDates);
      setState("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setState("error");
    }
  };

  const updateInvestment = (index: number, field: keyof ScannedInvestment, value: string | number) => {
    setEditableInvestments(prev => {
      const updated = [...prev];
      if (field === "quantity" || field === "avg_cost") {
        updated[index] = { ...updated[index], [field]: parseFloat(value as string) || 0 };
      } else if (field === "symbol") {
        updated[index] = { ...updated[index], [field]: String(value).toUpperCase().trim() };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleSaveInvestment = async (index: number) => {
    const inv = editableInvestments[index];
    setState("saving");

    try {
      const formData = new FormData();
      formData.append("symbol", inv.symbol);
      formData.append("quantity", inv.quantity.toString());
      formData.append("avg_cost", inv.avg_cost.toString());
      formData.append("asset_type", inv.asset_type);
      formData.append("account_label", inv.account_label);
      formData.append("date", inv.date);

      await addInvestment(formData);
      
      // Remove saved investment from list
      const remaining = editableInvestments.filter((_, i) => i !== index);
      setEditableInvestments(remaining);
      
      if (remaining.length === 0) {
        handleClose();
      } else {
        setState("results");
        setEditingIndex(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setState("results");
    }
  };

  const handleSaveAll = async () => {
    setState("saving");

    try {
      for (const inv of editableInvestments) {
        const formData = new FormData();
        formData.append("symbol", inv.symbol);
        formData.append("quantity", inv.quantity.toString());
        formData.append("avg_cost", inv.avg_cost.toString());
        formData.append("asset_type", inv.asset_type);
        formData.append("account_label", inv.account_label);
        formData.append("date", inv.date);

        await addInvestment(formData);
      }
      
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setState("results");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setState("camera");
      setCapturedImage(null);
      setResult(null);
      setEditableInvestments([]);
      setEditingIndex(null);
      setError(null);
      setCameraError(null);
    }, 200);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  const handleCameraError = useCallback(() => {
    setCameraError("Unable to access camera. Please check permissions or use file upload.");
  }, []);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high": return "text-emerald-600 bg-emerald-50";
      case "medium": return "text-amber-600 bg-amber-50";
      case "low": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Scan className="h-4 w-4" />
            Scan Investment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Investment
          </DialogTitle>
          <DialogDescription>
            {state === "camera" && "Take a photo of your brokerage statement, trade confirmation, or investment document"}
            {state === "preview" && "Review your photo before analyzing"}
            {state === "analyzing" && "Analyzing document..."}
            {state === "results" && "Review and edit extracted investments"}
            {state === "saving" && "Saving investment..."}
            {state === "error" && "Something went wrong"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera View */}
          {state === "camera" && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="aspect-[4/3] bg-muted rounded-lg flex flex-col items-center justify-center text-center p-6">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">{cameraError}</p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Upload Image Instead
                  </Button>
                </div>
              ) : (
                <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                  {/* @ts-ignore React 19 type compatibility issue with react-webcam */}
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={0.9}
                    videoConstraints={videoConstraints}
                    onUserMediaError={handleCameraError}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-4 border-2 border-white/30 rounded-lg pointer-events-none" />
                </div>
              )}

              <div className="flex gap-2 justify-center">
                {!cameraError && (
                  <>
                    <Button onClick={capture} className="gap-2 flex-1 max-w-[200px]">
                      <Camera className="h-4 w-4" />
                      Capture
                    </Button>
                    <Button variant="outline" size="icon" onClick={switchCamera} title="Switch camera">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  Upload
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <p className="text-xs text-center text-muted-foreground">
                Tip: Ensure good lighting and the document is fully visible
              </p>
            </div>
          )}

          {/* Preview */}
          {state === "preview" && capturedImage && (
            <div className="space-y-3">
              <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured document"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={retake} className="flex-1 gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Retake
                </Button>
                <Button onClick={analyze} className="flex-1 gap-2">
                  <Scan className="h-4 w-4" />
                  Analyze
                </Button>
              </div>
            </div>
          )}

          {/* Analyzing / Saving */}
          {(state === "analyzing" || state === "saving") && (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                {state === "analyzing" ? "Analyzing your document..." : "Saving investment..."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
            </div>
          )}

          {/* Results with Editing */}
          {state === "results" && (
            <div className="space-y-4">
              {/* Confidence Badge */}
              {result && (
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConfidenceColor(result.confidence)}`}>
                    {result.confidence.charAt(0).toUpperCase() + result.confidence.slice(1)} confidence
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {editableInvestments.length} investment{editableInvestments.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {/* Editable Investments List */}
              <div className="space-y-3 max-h-[350px] overflow-y-auto">
                {editableInvestments.map((inv, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg bg-card space-y-3"
                  >
                    {editingIndex === index ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Symbol</Label>
                            <Input
                              value={inv.symbol}
                              onChange={(e) => updateInvestment(index, "symbol", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="AAPL"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              step="any"
                              value={inv.quantity}
                              onChange={(e) => updateInvestment(index, "quantity", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Avg Cost</Label>
                            <Input
                              type="number"
                              step="any"
                              value={inv.avg_cost}
                              onChange={(e) => updateInvestment(index, "avg_cost", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Date</Label>
                            <Input
                              type="date"
                              value={inv.date}
                              onChange={(e) => updateInvestment(index, "date", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Asset Type</Label>
                            <select
                              value={inv.asset_type}
                              onChange={(e) => updateInvestment(index, "asset_type", e.target.value)}
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                            >
                              {ASSET_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">Account</Label>
                            <select
                              value={inv.account_label}
                              onChange={(e) => updateInvestment(index, "account_label", e.target.value)}
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                            >
                              {ACCOUNT_LABELS.map(label => (
                                <option key={label} value={label}>{label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setEditingIndex(null)}
                            className="flex-1"
                          >
                            Done Editing
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveInvestment(index)}
                            className="flex-1 gap-1"
                          >
                            <Save className="h-3 w-3" />
                            Save This
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{inv.symbol}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              inv.account_label === 'TFSA' ? 'bg-emerald-100 text-emerald-700' :
                              inv.account_label === 'RRSP' ? 'bg-blue-100 text-blue-700' :
                              inv.account_label === 'FHSA' ? 'bg-purple-100 text-purple-700' :
                              inv.account_label === 'Cash' ? 'bg-amber-100 text-amber-700' :
                              inv.account_label === 'Crypto' ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {inv.account_label}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                              {inv.asset_type}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingIndex(index)}
                            className="h-7 w-7 p-0"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{inv.quantity} @ ${inv.avg_cost.toFixed(2)}</span>
                          <span className="font-medium text-foreground">
                            ${(inv.quantity * inv.avg_cost).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Date: {inv.date}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="pt-2 border-t">
                {editableInvestments.length === 1 ? (
                  <Button onClick={() => handleSaveInvestment(0)} className="w-full gap-2">
                    <Save className="h-4 w-4" />
                    Save Investment
                  </Button>
                ) : (
                  <Button onClick={handleSaveAll} className="w-full gap-2">
                    <Save className="h-4 w-4" />
                    Save All ({editableInvestments.length})
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-3" />
              <p className="text-sm font-medium text-destructive mb-1">Analysis Failed</p>
              <p className="text-xs text-muted-foreground mb-4 max-w-[280px]">
                {error || "Could not analyze the document. Please try again with a clearer image."}
              </p>
              <Button variant="outline" onClick={retake} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

