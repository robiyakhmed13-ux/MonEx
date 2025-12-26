import React, { useState, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";

interface ParsedReceipt {
  amount?: number;
  description?: string;
  categoryId?: string;
  date?: string;
  items?: Array<{ name: string; price: number }>;
  vendor?: string;
}

interface ReceiptScannerProps {
  onScanComplete: (data: ParsedReceipt) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const ReceiptScanner = memo(({ onScanComplete, onClose, isOpen }: ReceiptScannerProps) => {
  const { t, tgUser, showToast, allCats } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      // Convert to base64 for API
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => {
          const result = r.result as string;
          resolve(result.split(",")[1]); // Remove data:image/... prefix
        };
        r.readAsDataURL(file);
      });

      // Call the Supabase edge function for receipt scanning
      const { data: result, error: funcError } = await supabase.functions.invoke('scan-receipt', {
        body: {
          image: base64,
          userId: tgUser?.id,
          mimeType: file.type,
        },
      });

      if (funcError) {
        console.error("Edge function error:", funcError);
        throw new Error(funcError.message || "Failed to process receipt");
      }

      if (result?.error) {
        throw new Error(result.error);
      }
      
      // Map the AI response to our transaction format
      const parsed: ParsedReceipt = {
        amount: result.total || result.amount,
        description: result.vendor || result.description || result.items?.[0]?.name,
        categoryId: mapToCategory(result.category, allCats.expense),
        date: result.date || new Date().toISOString().slice(0, 10),
        items: result.items,
        vendor: result.vendor,
      };

      showToast(t.receiptScanned || "Receipt scanned!", true);
      onScanComplete(parsed);
      onClose();
    } catch (err) {
      console.error("Receipt scan error:", err);
      setError(t.scanError || "Could not process receipt. Try again or enter manually.");
      showToast(t.scanError || "Scan failed", false);
    } finally {
      setIsProcessing(false);
    }
  }, [tgUser, allCats, showToast, t, onScanComplete, onClose]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  }, [processImage]);

  const openCamera = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const openGallery = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const resetScanner = useCallback(() => {
    setPreview(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 modal-content safe-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-title-1 text-foreground">
              {t.scanReceipt || "Scan Receipt"}
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground"
            >
              ✕
            </button>
          </div>

          {/* Hidden inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Content */}
          {!preview && !isProcessing && (
            <div className="space-y-4">
              {/* Info */}
              <div className="bg-accent/50 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <p className="text-sm text-foreground font-medium mb-1">
                      {t.aiPowered || "AI-Powered Scanning"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.scanInfo || "Take a photo of your receipt and our AI will automatically extract the amount, date, and category."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scan Options */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={openCamera}
                  className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border-2 border-primary/20 hover:border-primary/40 transition-all"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-3xl">📷</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {t.takePhoto || "Take Photo"}
                  </span>
                </button>

                <button
                  onClick={openGallery}
                  className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-secondary to-muted rounded-2xl border-2 border-border hover:border-muted-foreground/30 transition-all"
                >
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-3xl">🖼️</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {t.chooseImage || "Choose Image"}
                  </span>
                </button>
              </div>

              {/* Tips */}
              <div className="mt-6 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  {t.scanTips || "Tips for best results:"}
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span>
                    {t.tipFlat || "Place receipt on flat surface"}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span>
                    {t.tipLight || "Good lighting, no shadows"}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span>
                    {t.tipClear || "Capture entire receipt clearly"}
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="flex flex-col items-center py-8">
              {preview && (
                <div className="w-32 h-40 rounded-xl overflow-hidden mb-6 shadow-elevated">
                  <img src={preview} alt="Receipt" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="text-3xl"
                  >
                    🔍
                  </motion.div>
                </div>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">
                {t.analyzing || "Analyzing receipt..."}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.aiProcessing || "AI is extracting transaction details"}
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isProcessing && (
            <div className="flex flex-col items-center py-6">
              {preview && (
                <div className="w-32 h-40 rounded-xl overflow-hidden mb-4 shadow-elevated opacity-50">
                  <img src={preview} alt="Receipt" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <p className="text-sm text-destructive font-medium mb-4 text-center">{error}</p>
              <div className="flex gap-3">
                <button onClick={resetScanner} className="btn-secondary">
                  {t.tryAgain || "Try Again"}
                </button>
                <button onClick={onClose} className="btn-primary">
                  {t.enterManually || "Enter Manually"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

ReceiptScanner.displayName = "ReceiptScanner";

// Helper to map AI category response to our category IDs
function mapToCategory(aiCategory: string | undefined, categories: Array<{ id: string; uz: string; ru: string; en: string }>): string {
  if (!aiCategory) return "other";
  
  const normalized = aiCategory.toLowerCase().trim();
  
  // Common mappings
  const categoryMap: Record<string, string> = {
    food: "food",
    grocery: "food",
    groceries: "food",
    restaurant: "restaurant",
    cafe: "restaurant",
    coffee: "restaurant",
    transport: "transport",
    taxi: "taxi",
    uber: "taxi",
    yandex: "taxi",
    shopping: "shopping",
    clothes: "shopping",
    clothing: "shopping",
    health: "pharmacy",
    pharmacy: "pharmacy",
    medicine: "pharmacy",
    entertainment: "entertainment",
    movie: "entertainment",
    cinema: "entertainment",
    utilities: "utilities",
    bills: "utilities",
    electricity: "utilities",
    internet: "internet",
    phone: "phone",
    mobile: "phone",
    education: "education",
    books: "education",
    beauty: "beauty",
    salon: "beauty",
    fitness: "gym",
    gym: "gym",
    sport: "gym",
    pet: "pets",
    pets: "pets",
    gift: "gifts",
    gifts: "gifts",
    travel: "travel",
    hotel: "travel",
    flight: "travel",
    home: "home",
    furniture: "home",
    repair: "home",
  };

  // Check direct mapping
  if (categoryMap[normalized]) {
    return categoryMap[normalized];
  }

  // Check if it matches any category ID directly
  const directMatch = categories.find(c => c.id === normalized);
  if (directMatch) return directMatch.id;

  // Check if it matches category names
  const nameMatch = categories.find(c => 
    c.en.toLowerCase().includes(normalized) || 
    c.ru.toLowerCase().includes(normalized) ||
    c.uz.toLowerCase().includes(normalized)
  );
  if (nameMatch) return nameMatch.id;

  return "other";
}
