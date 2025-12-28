import React, { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { DebtItem } from "@/types";
import { formatCurrency } from "@/lib/exportData";

const DEBT_QUESTIONS = {
  uz: [
    { q: "Bu kredit nima uchun kerak?", options: ["Zaruriy xarid", "Biznes uchun", "Ta'lim", "Tibbiyot", "Ixtiyoriy xarid", "Boshqa qarzni to'lash"] },
    { q: "Kredit to'lovlarini qanday to'laysiz?", options: ["Oylik maoshdan", "Qo'shimcha daromaddan", "Jamg'armadan", "Bilmayman"] },
    { q: "Agar daromad kamaysa nima bo'ladi?", options: ["Jamg'armam bor", "Oilam yordam beradi", "Boshqa ish topaman", "Rejam yo'q"] },
    { q: "Bu kreditni olishdan oldin boshqa variantlarni ko'rib chiqdingizmi?", options: ["Ha, eng yaxshisi shu", "Yo'q, ko'rib chiqmadim", "Boshqa variant yo'q"] },
  ],
  ru: [
    { q: "Зачем вам нужен этот кредит?", options: ["Необходимая покупка", "Для бизнеса", "Образование", "Медицина", "Необязательная покупка", "Погасить другой долг"] },
    { q: "Как вы планируете платить?", options: ["Из зарплаты", "Из дополнительного дохода", "Из сбережений", "Не знаю"] },
    { q: "Что будет, если доход уменьшится?", options: ["Есть сбережения", "Семья поможет", "Найду другую работу", "Нет плана"] },
    { q: "Рассматривали ли вы альтернативы?", options: ["Да, это лучший вариант", "Нет, не рассматривал", "Других вариантов нет"] },
  ],
  en: [
    { q: "Why do you need this loan?", options: ["Essential purchase", "Business", "Education", "Medical", "Optional purchase", "Pay off other debt"] },
    { q: "How will you make payments?", options: ["From salary", "From side income", "From savings", "I don't know"] },
    { q: "What if your income decreases?", options: ["I have savings", "Family will help", "I'll find another job", "No plan"] },
    { q: "Have you considered alternatives?", options: ["Yes, this is best", "No, I haven't", "No other options"] },
  ],
};

export const DebtAssessmentScreen = memo(() => {
  const { lang, setActiveScreen, currency, showToast, monthSpend } = useApp();
  
  const [debts, setDebts] = useState<DebtItem[]>(() => {
    const saved = localStorage.getItem("hamyon_debts");
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showAssessment, setShowAssessment] = useState(false);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [assessmentStep, setAssessmentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [newLoan, setNewLoan] = useState({ amount: "", monthlyPayment: "", income: "" });
  const [debtForm, setDebtForm] = useState({ name: "", totalAmount: "", monthlyPayment: "", interestRate: "", lender: "", type: "loan" as DebtItem["type"] });

  const questions = DEBT_QUESTIONS[lang] || DEBT_QUESTIONS.en;

  const totalDebt = useMemo(() => debts.reduce((sum, d) => sum + d.remainingAmount, 0), [debts]);
  const totalMonthlyPayments = useMemo(() => debts.reduce((sum, d) => sum + d.monthlyPayment, 0), [debts]);

  const saveDebts = (newDebts: DebtItem[]) => {
    setDebts(newDebts);
    localStorage.setItem("hamyon_debts", JSON.stringify(newDebts));
  };

  const debtToIncomeRatio = useMemo(() => {
    const income = Number(newLoan.income) || 1;
    const newPayment = Number(newLoan.monthlyPayment) || 0;
    return ((totalMonthlyPayments + newPayment) / income) * 100;
  }, [totalMonthlyPayments, newLoan]);

  const riskLevel = useMemo(() => {
    if (debtToIncomeRatio < 20) return { level: "low", color: "text-income", label: lang === "uz" ? "Past xavf" : lang === "ru" ? "Низкий риск" : "Low Risk" };
    if (debtToIncomeRatio < 35) return { level: "medium", color: "text-yellow-500", label: lang === "uz" ? "O'rtacha xavf" : lang === "ru" ? "Средний риск" : "Medium Risk" };
    if (debtToIncomeRatio < 50) return { level: "high", color: "text-orange-500", label: lang === "uz" ? "Yuqori xavf" : lang === "ru" ? "Высокий риск" : "High Risk" };
    return { level: "critical", color: "text-expense", label: lang === "uz" ? "Juda xavfli!" : lang === "ru" ? "Критический риск!" : "Critical Risk!" };
  }, [debtToIncomeRatio, lang]);

  const handleAnswer = (answer: string) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    
    if (assessmentStep < questions.length - 1) {
      setAssessmentStep(assessmentStep + 1);
    } else {
      // Assessment complete
      setAssessmentStep(questions.length);
    }
  };

  const getRecommendations = () => {
    const recs = [];
    const hasRiskyAnswers = answers.includes("Bilmayman") || answers.includes("Не знаю") || answers.includes("I don't know") ||
                           answers.includes("Rejam yo'q") || answers.includes("Нет плана") || answers.includes("No plan") ||
                           answers.includes("Boshqa qarzni to'lash") || answers.includes("Погасить другой долг") || answers.includes("Pay off other debt");
    
    if (hasRiskyAnswers) {
      recs.push(lang === "uz" ? "⚠️ Javoblaringiz xavotirli. Kreditni qayta ko'rib chiqing." : 
                lang === "ru" ? "⚠️ Ваши ответы вызывают беспокойство. Пересмотрите решение о кредите." :
                "⚠️ Your answers are concerning. Please reconsider this loan.");
    }
    
    if (debtToIncomeRatio > 35) {
      recs.push(lang === "uz" ? "🔴 Qarz yuklamangiz yuqori. Yangi kredit olish tavsiya etilmaydi." :
                lang === "ru" ? "🔴 Ваша долговая нагрузка высокая. Новый кредит не рекомендуется." :
                "🔴 Your debt load is high. A new loan is not recommended.");
    }
    
    if (answers.includes("Ixtiyoriy xarid") || answers.includes("Необязательная покупка") || answers.includes("Optional purchase")) {
      recs.push(lang === "uz" ? "💡 Ixtiyoriy xaridlar uchun kredit olish tavsiya etilmaydi. Jamg'arib oling." :
                lang === "ru" ? "💡 Не рекомендуется брать кредит на необязательные покупки. Накопите." :
                "💡 Loans for optional purchases are not recommended. Save up instead.");
    }
    
    if (recs.length === 0) {
      recs.push(lang === "uz" ? "✅ Moliyaviy holatngiz yaxshi ko'rinadi." :
                lang === "ru" ? "✅ Ваше финансовое положение выглядит хорошо." :
                "✅ Your financial situation looks good.");
    }
    
    return recs;
  };

  const handleAddDebt = () => {
    if (!debtForm.name || !debtForm.totalAmount || !debtForm.monthlyPayment) return;
    
    const newDebt: DebtItem = {
      id: Date.now().toString(),
      name: debtForm.name,
      totalAmount: Number(debtForm.totalAmount),
      remainingAmount: Number(debtForm.totalAmount),
      monthlyPayment: Number(debtForm.monthlyPayment),
      interestRate: Number(debtForm.interestRate) || 0,
      startDate: new Date().toISOString().slice(0, 10),
      type: debtForm.type,
      lender: debtForm.lender,
    };
    
    saveDebts([...debts, newDebt]);
    setShowAddDebt(false);
    setDebtForm({ name: "", totalAmount: "", monthlyPayment: "", interestRate: "", lender: "", type: "loan" });
    showToast("✓", true);
  };

  const labels = {
    title: lang === "uz" ? "Qarz baholash" : lang === "ru" ? "Оценка долга" : "Debt Assessment",
    totalDebt: lang === "uz" ? "Jami qarz" : lang === "ru" ? "Общий долг" : "Total Debt",
    monthlyPayments: lang === "uz" ? "Oylik to'lovlar" : lang === "ru" ? "Ежемесячные платежи" : "Monthly Payments",
    debtLoad: lang === "uz" ? "Qarz yuklamasi" : lang === "ru" ? "Долговая нагрузка" : "Debt Load",
    newLoan: lang === "uz" ? "Yangi kredit baholash" : lang === "ru" ? "Оценить новый кредит" : "Assess New Loan",
    addDebt: lang === "uz" ? "Qarz qo'shish" : lang === "ru" ? "Добавить долг" : "Add Debt",
    income: lang === "uz" ? "Oylik daromad" : lang === "ru" ? "Месячный доход" : "Monthly Income",
    amount: lang === "uz" ? "Kredit summasi" : lang === "ru" ? "Сумма кредита" : "Loan Amount",
    payment: lang === "uz" ? "Oylik to'lov" : lang === "ru" ? "Ежемесячный платёж" : "Monthly Payment",
    start: lang === "uz" ? "Boshlash" : lang === "ru" ? "Начать" : "Start Assessment",
    result: lang === "uz" ? "Natija" : lang === "ru" ? "Результат" : "Result",
  };

  return (
    <div className="screen-container pb-32 safe-top">
      <div className="px-4 pt-2">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveScreen("home")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            ←
          </motion.button>
          <div className="flex-1">
            <h1 className="text-title-1 text-foreground">{labels.title}</h1>
          </div>
        </div>

        {/* Debt Load Overview */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-elevated p-4 bg-gradient-to-br from-expense/10 to-expense/5"
          >
            <p className="text-xs text-muted-foreground mb-1">{labels.totalDebt}</p>
            <p className="text-xl font-bold text-expense">{formatCurrency(totalDebt, currency)}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-elevated p-4"
          >
            <p className="text-xs text-muted-foreground mb-1">{labels.monthlyPayments}</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalMonthlyPayments, currency)}</p>
          </motion.div>
        </div>

        {/* Debt List */}
        {debts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-title-3 text-foreground mb-3">
              {lang === "uz" ? "Mavjud qarzlar" : lang === "ru" ? "Существующие долги" : "Existing Debts"}
            </h3>
            <div className="space-y-3">
              {debts.map((debt, i) => (
                <motion.div
                  key={debt.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-elevated p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{debt.name}</p>
                      <p className="text-xs text-muted-foreground">{debt.lender} • {debt.type}</p>
                    </div>
                    <p className="text-expense font-bold">{formatCurrency(debt.remainingAmount, currency)}</p>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{labels.payment}:</span>
                    <span className="text-foreground">{formatCurrency(debt.monthlyPayment, currency)}/oy</span>
                  </div>
                  {debt.interestRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">%:</span>
                      <span className="text-foreground">{debt.interestRate}%</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setShowAssessment(true); setAssessmentStep(0); setAnswers([]); }}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
          >
            🧠 {labels.newLoan}
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddDebt(true)}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-border text-muted-foreground font-medium"
          >
            + {labels.addDebt}
          </motion.button>
        </div>
      </div>

      {/* Assessment Modal */}
      <AnimatePresence>
        {showAssessment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background"
          >
            <div className="h-full flex flex-col p-6 safe-top safe-bottom">
              {/* Progress */}
              <div className="flex gap-2 mb-8">
                {[...Array(questions.length + 2)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1 rounded-full ${i <= assessmentStep ? "bg-primary" : "bg-secondary"}`}
                  />
                ))}
              </div>

              {assessmentStep === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col"
                >
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {lang === "uz" ? "Kredit ma'lumotlari" : lang === "ru" ? "Данные о кредите" : "Loan Details"}
                  </h2>
                  
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={labels.income}
                    value={newLoan.income}
                    onChange={e => setNewLoan({ ...newLoan, income: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full p-4 mb-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground"
                  />
                  
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={labels.amount}
                    value={newLoan.amount}
                    onChange={e => setNewLoan({ ...newLoan, amount: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full p-4 mb-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground"
                  />
                  
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={labels.payment}
                    value={newLoan.monthlyPayment}
                    onChange={e => setNewLoan({ ...newLoan, monthlyPayment: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full p-4 mb-6 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground"
                  />

                  {/* Debt Load Preview */}
                  {newLoan.income && (
                    <div className="card-elevated p-4 mb-6">
                      <p className="text-sm text-muted-foreground mb-2">{labels.debtLoad}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-4 rounded-full bg-secondary overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(debtToIncomeRatio, 100)}%` }}
                            className={`h-full ${riskLevel.level === "low" ? "bg-income" : riskLevel.level === "medium" ? "bg-yellow-500" : riskLevel.level === "high" ? "bg-orange-500" : "bg-expense"}`}
                          />
                        </div>
                        <span className={`font-bold ${riskLevel.color}`}>{debtToIncomeRatio.toFixed(0)}%</span>
                      </div>
                      <p className={`text-sm mt-2 ${riskLevel.color}`}>{riskLevel.label}</p>
                    </div>
                  )}

                  <div className="mt-auto flex gap-3">
                    <button onClick={() => setShowAssessment(false)} className="btn-secondary flex-1">
                      {lang === "uz" ? "Bekor" : lang === "ru" ? "Отмена" : "Cancel"}
                    </button>
                    <button
                      onClick={() => setAssessmentStep(1)}
                      disabled={!newLoan.income}
                      className="btn-primary flex-1"
                    >
                      {lang === "uz" ? "Davom" : lang === "ru" ? "Далее" : "Continue"}
                    </button>
                  </div>
                </motion.div>
              )}

              {assessmentStep > 0 && assessmentStep <= questions.length && (
                <motion.div
                  key={assessmentStep}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="flex-1 flex flex-col"
                >
                  <h2 className="text-xl font-bold text-foreground mb-6">
                    {questions[assessmentStep - 1].q}
                  </h2>
                  
                  <div className="space-y-3">
                    {questions[assessmentStep - 1].options.map((opt, i) => (
                      <motion.button
                        key={opt}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAnswer(opt)}
                        className="w-full p-4 rounded-xl bg-secondary text-foreground text-left hover:bg-primary/10 transition-colors"
                      >
                        {opt}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {assessmentStep > questions.length && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex flex-col items-center justify-center text-center"
                >
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-6 ${
                    riskLevel.level === "low" ? "bg-income/20" : 
                    riskLevel.level === "medium" ? "bg-yellow-500/20" :
                    riskLevel.level === "high" ? "bg-orange-500/20" : "bg-expense/20"
                  }`}>
                    {riskLevel.level === "low" ? "✅" : riskLevel.level === "medium" ? "⚠️" : riskLevel.level === "high" ? "🔶" : "🛑"}
                  </div>
                  
                  <h2 className="text-2xl font-bold text-foreground mb-2">{labels.result}</h2>
                  <p className={`text-lg font-semibold mb-6 ${riskLevel.color}`}>{riskLevel.label}</p>
                  
                  <div className="w-full space-y-3 text-left mb-8">
                    {getRecommendations().map((rec, i) => (
                      <div key={i} className="p-4 rounded-xl bg-secondary">
                        <p className="text-sm text-foreground">{rec}</p>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setShowAssessment(false)}
                    className="btn-primary w-full"
                  >
                    {lang === "uz" ? "Tushundim" : lang === "ru" ? "Понятно" : "Got It"}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Debt Modal */}
      <AnimatePresence>
        {showAddDebt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowAddDebt(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="absolute bottom-0 left-0 right-0 modal-content safe-bottom max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-title-2 text-foreground mb-4">{labels.addDebt}</h3>
              
              <input
                type="text"
                placeholder={lang === "uz" ? "Nomi" : lang === "ru" ? "Название" : "Name"}
                value={debtForm.name}
                onChange={e => setDebtForm({ ...debtForm, name: e.target.value })}
                className="w-full p-4 mb-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground"
              />
              
              <input
                type="text"
                inputMode="numeric"
                placeholder={lang === "uz" ? "Jami summa" : lang === "ru" ? "Общая сумма" : "Total Amount"}
                value={debtForm.totalAmount}
                onChange={e => setDebtForm({ ...debtForm, totalAmount: e.target.value.replace(/[^0-9]/g, '') })}
                className="w-full p-4 mb-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground"
              />
              
              <input
                type="text"
                inputMode="numeric"
                placeholder={labels.payment}
                value={debtForm.monthlyPayment}
                onChange={e => setDebtForm({ ...debtForm, monthlyPayment: e.target.value.replace(/[^0-9]/g, '') })}
                className="w-full p-4 mb-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground"
              />
              
              <input
                type="text"
                placeholder={lang === "uz" ? "Kreditor" : lang === "ru" ? "Кредитор" : "Lender"}
                value={debtForm.lender}
                onChange={e => setDebtForm({ ...debtForm, lender: e.target.value })}
                className="w-full p-4 mb-4 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground"
              />

              <div className="flex gap-3">
                <button onClick={() => setShowAddDebt(false)} className="btn-secondary flex-1">
                  {lang === "uz" ? "Bekor" : lang === "ru" ? "Отмена" : "Cancel"}
                </button>
                <button onClick={handleAddDebt} className="btn-primary flex-1">
                  {lang === "uz" ? "Saqlash" : lang === "ru" ? "Сохранить" : "Save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

DebtAssessmentScreen.displayName = "DebtAssessmentScreen";
