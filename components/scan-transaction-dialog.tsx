"use client";

import { useState, useRef, useCallback } from "react";
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
import { ScanResult, ScannedTransaction } from "@/lib/types";
import { addTransaction } from "@/app/(dashboard)/transactions/actions";

const EXPENSE_CATEGORIES = [
  "Housing", "Transport", "Food", "Utilities", "Insurance",
  "Healthcare", "Saving", "Personal", "Entertainment", "Credit", "Miscellaneous"
];

const INCOME_CATEGORIES = ["Salary", "Bonus", "Investment", "Deposit", "Other"];

interface ScanTransactionDialogProps {
  onScanComplete: (transactions: ScannedTransaction[]) => void;
  children?: React.ReactNode;
}

type ScanState = "camera" | "preview" | "analyzing" | "results" | "saving" | "error";

export function ScanTransactionDialog({ onScanComplete, children }: ScanTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ScanState>("camera");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [editableTransactions, setEditableTransactions] = useState<ScannedTransaction[]>([]);
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
    setEditableTransactions([]);
    setEditingIndex(null);
    setError(null);
    setState("camera");
  };

  const analyze = async () => {
    if (!capturedImage) return;

    setState("analyzing");
    setError(null);

    try {
      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: capturedImage }),
      });

      const data: ScanResult = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to analyze image");
        setState("error");
        return;
      }

      setResult(data);
      setEditableTransactions([...data.transactions]);
      setState("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setState("error");
    }
  };

  const updateTransaction = (index: number, field: keyof ScannedTransaction, value: string | number) => {
    setEditableTransactions(prev => {
      const updated = [...prev];
      if (field === "amount") {
        updated[index] = { ...updated[index], [field]: parseFloat(value as string) || 0 };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleSaveTransaction = async (index: number) => {
    const t = editableTransactions[index];
    setState("saving");

    try {
      const formData = new FormData();
      formData.append("amount", t.amount.toString());
      formData.append("description", t.description);
      formData.append("category", t.category);
      formData.append("date", t.date);
      formData.append("type", t.type);
      formData.append("currency", t.currency);

      await addTransaction(formData);
      
      // Remove saved transaction from list
      const remaining = editableTransactions.filter((_, i) => i !== index);
      setEditableTransactions(remaining);
      
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
      for (const t of editableTransactions) {
        const formData = new FormData();
        formData.append("amount", t.amount.toString());
        formData.append("description", t.description);
        formData.append("category", t.category);
        formData.append("date", t.date);
        formData.append("type", t.type);
        formData.append("currency", t.currency);

        await addTransaction(formData);
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
      setEditableTransactions([]);
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

  const categories = (type: string) => type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Scan className="h-4 w-4" />
            Scan Receipt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Transaction
          </DialogTitle>
          <DialogDescription>
            {state === "camera" && "Take a photo of your receipt, invoice, or financial document"}
            {state === "preview" && "Review your photo before analyzing"}
            {state === "analyzing" && "Analyzing document..."}
            {state === "results" && "Review and edit extracted transactions"}
            {state === "saving" && "Saving transaction..."}
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
                  {/* @ts-expect-error React 19 type compatibility issue with react-webcam */}
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
                  alt="Captured receipt"
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
                {state === "analyzing" ? "Analyzing your document..." : "Saving transaction..."}
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
                    {editableTransactions.length} transaction{editableTransactions.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {/* Editable Transactions List */}
              <div className="space-y-3 max-h-[350px] overflow-y-auto">
                {editableTransactions.map((t, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg bg-card space-y-3"
                  >
                    {editingIndex === index ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Description</Label>
                            <Input
                              value={t.description}
                              onChange={(e) => updateTransaction(index, "description", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Amount</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={t.amount}
                              onChange={(e) => updateTransaction(index, "amount", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Category</Label>
                            <select
                              value={t.category}
                              onChange={(e) => updateTransaction(index, "category", e.target.value)}
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                            >
                              {categories(t.type).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">Date</Label>
                            <Input
                              type="date"
                              value={t.date}
                              onChange={(e) => updateTransaction(index, "date", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Type</Label>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => updateTransaction(index, "type", "expense")}
                                className={`flex-1 px-2 py-1 text-xs rounded ${
                                  t.type === "expense" 
                                    ? "bg-red-100 text-red-700 border border-red-200" 
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                Expense
                              </button>
                              <button
                                type="button"
                                onClick={() => updateTransaction(index, "type", "income")}
                                className={`flex-1 px-2 py-1 text-xs rounded ${
                                  t.type === "income" 
                                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                Income
                              </button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Currency</Label>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => updateTransaction(index, "currency", "CAD")}
                                className={`flex-1 px-2 py-1 text-xs rounded ${
                                  t.currency === "CAD" 
                                    ? "bg-primary text-primary-foreground" 
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                🇨🇦 CAD
                              </button>
                              <button
                                type="button"
                                onClick={() => updateTransaction(index, "currency", "USD")}
                                className={`flex-1 px-2 py-1 text-xs rounded ${
                                  t.currency === "USD" 
                                    ? "bg-primary text-primary-foreground" 
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                🇺🇸 USD
                              </button>
                            </div>
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
                            onClick={() => handleSaveTransaction(index)}
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
                          <span className="font-medium">{t.description}</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${t.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                              {t.type === "income" ? "+" : "-"}${t.amount.toFixed(2)}
                              <span className="ml-1 text-sm">{t.currency === "USD" ? "🇺🇸" : "🇨🇦"}</span>
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingIndex(index)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="px-1.5 py-0.5 bg-muted rounded">{t.category}</span>
                          <span>{t.date}</span>
                          <span className={`px-1.5 py-0.5 rounded ${t.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {t.type}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="pt-2 border-t">
                {editableTransactions.length === 1 ? (
                  <Button onClick={() => handleSaveTransaction(0)} className="w-full gap-2">
                    <Save className="h-4 w-4" />
                    Save Transaction
                  </Button>
                ) : (
                  <Button onClick={handleSaveAll} className="w-full gap-2">
                    <Save className="h-4 w-4" />
                    Save All ({editableTransactions.length})
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
