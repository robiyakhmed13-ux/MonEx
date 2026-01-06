import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";

interface VoiceInputProps {
  onTransactionParsed: (data: { type: "expense" | "income"; categoryId: string; amount: number; description: string }) => void;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTransactionParsed }) => {
  const { t, lang, showToast } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast("Speech recognition not supported", false);
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = lang === 'ru' ? 'ru-RU' : lang === 'uz' ? 'uz-UZ' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      console.log("Voice input:", text);
      setIsProcessing(true);

      try {
        const data = await api.parseVoice({ text, lang });

        if (data?.error) throw new Error(data.error);

        if (data?.type && data?.categoryId && data?.amount) {
          onTransactionParsed({
            type: data.type,
            categoryId: data.categoryId,
            amount: data.amount,
            description: data.description || data.categoryId,
          });
          showToast("✓", true);
        } else {
          showToast(t.scanError || "Could not parse", false);
        }
      } catch (err) {
        console.error("Voice parse error:", err);
        showToast(t.scanError || "Error", false);
      } finally {
        setIsProcessing(false);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      console.error("Speech recognition error:", event.error);
      
      let errorMessage = "Voice error";
      switch (event.error) {
        case 'not-allowed':
          errorMessage = lang === 'ru' ? "Доступ к микрофону запрещён" : "Microphone access denied";
          break;
        case 'no-speech':
          errorMessage = lang === 'ru' ? "Речь не обнаружена" : "No speech detected";
          break;
        case 'network':
          errorMessage = lang === 'ru' ? "Ошибка сети" : "Network error";
          break;
        case 'audio-capture':
          errorMessage = lang === 'ru' ? "Микрофон не найден" : "No microphone found";
          break;
        case 'aborted':
          return; // User cancelled, no need to show error
        default:
          errorMessage = lang === 'ru' ? `Ошибка: ${event.error}` : `Error: ${event.error}`;
      }
      showToast(errorMessage, false);
    };

    recognition.start();
  }, [lang, showToast, onTransactionParsed, t]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={isListening ? stopListening : startListening}
      disabled={isProcessing}
      className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-button transition-all ${
        isListening 
          ? 'bg-expense animate-pulse' 
          : isProcessing 
          ? 'bg-muted' 
          : 'bg-primary'
      } text-primary-foreground`}
    >
      {isProcessing ? (
        <span className="text-xl animate-spin">⏳</span>
      ) : isListening ? (
        <span className="text-2xl">🎤</span>
      ) : (
        <span className="text-2xl">🎙️</span>
      )}
    </motion.button>
  );
};

export default VoiceInput;
