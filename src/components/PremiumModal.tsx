import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Crown, Smartphone, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';
import { setPremium } from '../lib/usageTracker';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export function PremiumModal({ isOpen, onClose, isDarkMode }: PremiumModalProps) {
  const handlePayment = (method: string) => {
    // Simulation de paiement
    const phoneNumber = prompt(`Entrez votre numéro ${method} pour recevoir la demande de paiement (Simulation) :`);
    if (phoneNumber) {
      alert(`Une demande de paiement de 2000 FCFA a été envoyée au ${phoneNumber}. Une fois le paiement effectué, Ibkane IA sera débloqué.`);
      // Pour la démo, on active le premium
      setPremium(true);
      onClose();
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border",
              isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
            )}
          >
            <div className="relative p-6">
              <button
                onClick={onClose}
                className={cn(
                  "absolute top-4 right-4 p-2 rounded-full transition-colors",
                  isDarkMode ? "hover:bg-zinc-800 text-zinc-500" : "hover:bg-zinc-100 text-zinc-400"
                )}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center mb-4">
                  <Crown className="w-10 h-10 text-yellow-500" />
                </div>
                <h2 className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-zinc-900")}>
                  Passez à Ibkane Premium
                </h2>
                <p className={cn("text-sm mt-2", isDarkMode ? "text-zinc-400" : "text-zinc-500")}>
                  Débloquez toute la puissance de l'IA sans aucune limite.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  "Messages illimités (plus de limite de 25)",
                  "Générations d'images illimitées",
                  "Accès prioritaire à Gemini 3.1 Pro",
                  "Support technique privilégié",
                  "Aucune publicité"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-emerald-500" />
                    </div>
                    <span className={cn("text-sm", isDarkMode ? "text-zinc-300" : "text-zinc-600")}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className={cn("text-center font-bold text-xl mb-2", isDarkMode ? "text-white" : "text-zinc-900")}>
                  2 000 FCFA <span className="text-sm font-normal opacity-60">/ mois</span>
                </div>
                
                <button
                  onClick={() => handlePayment('Orange Money')}
                  className="w-full py-4 rounded-2xl bg-[#FF7900] text-white font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                >
                  <Smartphone className="w-5 h-5" />
                  Payer avec Orange Money
                </button>

                <button
                  onClick={() => handlePayment('Wave')}
                  className="w-full py-4 rounded-2xl bg-[#1DA1F2] text-white font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                >
                  <CreditCard className="w-5 h-5" />
                  Payer avec Wave
                </button>
              </div>

              <p className={cn("text-[10px] text-center mt-6 opacity-50", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                En payant, vous soutenez le développement de Ibkane IA par Ibrahima Kane.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
