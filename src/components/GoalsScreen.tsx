import React, { useState, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { formatUZS, clamp } from "@/lib/storage";
import { Target, Home, Car, Plane, Heart, Smartphone, GraduationCap, Wallet, Palmtree, Gift, X, Plus, PiggyBank, ArrowLeft } from "lucide-react";

export const GoalsScreen: React.FC = () => {
  const { t, goals, addGoal, updateGoal, deleteGoal, depositToGoal, showToast, setActiveScreen } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");

  const handleDeposit = useCallback(() => {
    if (!showDepositModal || !depositAmount) return;
    const amount = parseInt(depositAmount);
    if (amount > 0) {
      depositToGoal(showDepositModal, amount);
      setShowDepositModal(null);
      setDepositAmount("");
    }
  }, [showDepositModal, depositAmount, depositToGoal]);

  return (
    <div className="screen-container">
      {/* Large Title */}
      <header className="screen-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveScreen("home")}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:opacity-70"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-large-title text-foreground">{t.goals}</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:opacity-70"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Primary Section: Goals List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="card-info text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <p className="text-body text-muted-foreground mb-4">{t.noGoals}</p>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              {t.add}
            </button>
          </div>
        ) : (
          goals.map((goal, index) => {
            const progress = goal.target ? clamp((goal.current / goal.target) * 100, 0, 100) : 0;
            const remaining = Math.max(0, goal.target - goal.current);
            
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                className="card-info"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <GoalIcon iconId={goal.emoji} className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-medium text-foreground mb-1">{goal.name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-title text-primary">{formatUZS(goal.current)}</span>
                      <span className="text-caption">/ {formatUZS(goal.target)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="w-8 h-8 rounded-full bg-secondary text-muted-foreground flex items-center justify-center active:opacity-70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="progress-bar">
                    <div
                      className="progress-fill progress-fill-success"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-caption">{progress.toFixed(0)}%</span>
                    <span className="text-caption">{t.remaining}: {formatUZS(remaining)}</span>
                  </div>
                </div>

                {/* Deposit Button */}
                <button
                  onClick={() => {
                    setShowDepositModal(goal.id);
                    setDepositAmount("");
                  }}
                  className="w-full py-3 rounded-xl bg-primary/10 text-primary text-body-medium flex items-center justify-center gap-2 active:opacity-70"
                >
                  <PiggyBank className="w-5 h-5" />
                  {t.deposit}
                </button>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add Goal Modal */}
      <AddGoalModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowDepositModal(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25 }}
              className="absolute bottom-0 left-0 right-0 modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
              <h2 className="text-title text-foreground mb-6">{t.deposit}</h2>
              
              <div className="mb-6">
                <label className="text-caption mb-2 block">{t.amount}</label>
                <input
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value.replace(/[^\d]/g, ""))}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="input-clean text-display"
                  placeholder="0"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowDepositModal(null)} className="btn-secondary flex-1">
                  {t.cancel}
                </button>
                <button onClick={handleDeposit} className="btn-primary flex-1">
                  {t.save}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Goal icon mapping
const GOAL_ICONS = [
  { id: "target", icon: Target },
  { id: "home", icon: Home },
  { id: "car", icon: Car },
  { id: "plane", icon: Plane },
  { id: "heart", icon: Heart },
  { id: "phone", icon: Smartphone },
  { id: "education", icon: GraduationCap },
  { id: "wallet", icon: Wallet },
  { id: "vacation", icon: Palmtree },
  { id: "gift", icon: Gift },
];

const GoalIcon = memo(({ iconId, className }: { iconId: string; className?: string }) => {
  const iconDef = GOAL_ICONS.find(i => i.id === iconId);
  const IconComponent = iconDef?.icon || Target;
  return <IconComponent className={className} />;
});
GoalIcon.displayName = "GoalIcon";

const AddGoalModal = memo(({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { t, addGoal } = useApp();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [iconId, setIconId] = useState("target");

  const handleSave = () => {
    if (!name || !target) return;
    addGoal({
      name,
      target: parseInt(target),
      current: 0,
      emoji: iconId,
    });
    setName("");
    setTarget("");
    setIconId("target");
    onClose();
  };

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
          transition={{ duration: 0.25 }}
          className="absolute bottom-0 left-0 right-0 modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-title text-foreground">{t.add}</h2>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground active:opacity-70">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Icon Selection */}
          <div className="mb-4">
            <label className="text-caption mb-2 block">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {GOAL_ICONS.map((item) => {
                const IconComp = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setIconId(item.id)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center active:opacity-70 ${
                      iconId === item.id ? "bg-primary/20 ring-2 ring-primary" : "bg-secondary"
                    }`}
                  >
                    <IconComp className={`w-6 h-6 ${iconId === item.id ? "text-primary" : "text-foreground"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="text-caption mb-2 block">{t.description}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              className="input-clean"
              placeholder="e.g. New iPhone, Vacation..."
            />
          </div>

          {/* Target Amount */}
          <div className="mb-6">
            <label className="text-caption mb-2 block">{t.amount}</label>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="input-clean text-display"
              placeholder="0"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              {t.cancel}
            </button>
            <button onClick={handleSave} className="btn-primary flex-1">
              {t.save}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

AddGoalModal.displayName = "AddGoalModal";

export default GoalsScreen;