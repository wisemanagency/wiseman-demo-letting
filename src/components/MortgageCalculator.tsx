"use client";

import { useState } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  propertyPrice: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

// Monthly payment: M = P[r(1+r)^n]/[(1+r)^n – 1]
function calcMonthly(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

// ─── Donut chart colours ───────────────────────────────────────────────────────

const COLOURS = ["#1a3a5c", "#f59e0b"]; // brand + amber

// ─── Section ──────────────────────────────────────────────────────────────────

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span
          className="text-sm font-bold"
          style={{ fontFamily: "var(--font-display, Georgia, serif)" }}
        >
          {title}
        </span>
        <svg
          aria-hidden="true"
          className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MortgageCalculator({ propertyPrice }: Props) {
  const [depositAmount, setDepositAmount] = useState(Math.round(propertyPrice * 0.1));
  const [useDepositPercent, setUseDepositPercent] = useState(false);
  const [depositPercent, setDepositPercent] = useState(10);
  const [interestRate, setInterestRate] = useState(4.5);
  const [termYears, setTermYears] = useState(25);

  const effectiveDeposit = useDepositPercent
    ? Math.round((propertyPrice * depositPercent) / 100)
    : depositAmount;

  const principal = Math.max(propertyPrice - effectiveDeposit, 0);
  const monthly = calcMonthly(principal, interestRate, termYears);
  const totalPayable = monthly * termYears * 12;
  const totalInterest = totalPayable - principal;

  const chartData = [
    { name: "Principal", value: Math.round(principal), fill: COLOURS[0] },
    { name: "Interest", value: Math.round(totalInterest), fill: COLOURS[1] },
  ];

  const handleDepositAmountChange = (val: number) => {
    const clamped = Math.min(val, propertyPrice);
    setDepositAmount(clamped);
    if (useDepositPercent) {
      setDepositPercent(Math.round((clamped / propertyPrice) * 100));
    }
  };

  const handleDepositPercentChange = (pct: number) => {
    setDepositPercent(pct);
    setDepositAmount(Math.round((propertyPrice * pct) / 100));
  };

  return (
    <CollapsibleSection title="Mortgage Calculator">
      {/* Deposit row */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Deposit</span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={useDepositPercent}
                onChange={(e) => {
                  setUseDepositPercent(e.target.checked);
                }}
                className="rounded"
              />
              %
            </label>
          </div>
        </div>

        {useDepositPercent ? (
          <div className="space-y-2">
            <input
              type="range"
              min={5}
              max={75}
              step={1}
              value={depositPercent}
              onChange={(e) => handleDepositPercentChange(Number(e.target.value))}
              className="w-full accent-[var(--color-brand,#1a3a5c)]"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">5%</span>
              <span className="text-sm font-bold" style={{ color: "var(--color-brand,#1a3a5c)" }}>
                {depositPercent}% — {formatCurrency(effectiveDeposit)}
              </span>
              <span className="text-xs text-gray-400">75%</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                £
              </span>
              <input
                type="number"
                value={depositAmount}
                min={0}
                max={propertyPrice}
                onChange={(e) => handleDepositAmountChange(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setDepositPercent(10);
                setDepositAmount(Math.round(propertyPrice * 0.1));
              }}
              className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Interest rate */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Interest Rate (%)</span>
          <span className="text-sm font-bold" style={{ color: "var(--color-brand,#1a3a5c)" }}>
            {interestRate.toFixed(1)}%
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={12}
          step={0.1}
          value={interestRate}
          onChange={(e) => setInterestRate(Number(e.target.value))}
          className="w-full accent-[var(--color-brand,#1a3a5c)]"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">1%</span>
          <span className="text-xs text-gray-400">12%</span>
        </div>
      </div>

      {/* Term */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Term (Years)</span>
          <span className="text-sm font-bold" style={{ color: "var(--color-brand,#1a3a5c)" }}>
            {termYears} yrs
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={40}
          step={1}
          value={termYears}
          onChange={(e) => setTermYears(Number(e.target.value))}
          className="w-full accent-[var(--color-brand,#1a3a5c)]"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">5</span>
          <span className="text-xs text-gray-400">40</span>
        </div>
      </div>

      {/* Donut chart */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-28 h-28 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={50}
                paddingAngle={3}
                dataKey="value"
              />
              <Tooltip
                formatter={(v) => (v == null ? "" : formatCurrency(v as number))}
                contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOURS[0] }} />
            <span className="text-xs text-gray-600">Principal</span>
            <span className="text-xs font-bold ml-auto">{formatCurrency(principal)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOURS[1] }} />
            <span className="text-xs text-gray-600">Interest</span>
            <span className="text-xs font-bold ml-auto">{formatCurrency(totalInterest)}</span>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-2 mb-5">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-500">Monthly payment</span>
          <span
            className="text-lg font-bold"
            style={{
              color: "var(--color-brand,#1a3a5c)",
              fontFamily: "var(--font-display,Georgia,serif)",
            }}
          >
            {formatCurrency(Math.round(monthly))}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-xs text-gray-500">Total payable</span>
          <span className="text-sm font-semibold text-gray-700">
            {formatCurrency(Math.round(totalPayable))}
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-xs text-gray-500">Total interest</span>
          <span className="text-sm font-semibold text-amber-600">
            {formatCurrency(Math.round(totalInterest))}
          </span>
        </div>
      </div>

      {/* CTA */}
      <a
        href="/contact"
        className="block w-full text-center py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ background: "var(--color-brand,#1a3a5c)" }}
      >
        Speak to a mortgage adviser
      </a>

      <p className="text-center text-xs text-gray-400 mt-2">
        Figures are estimates only — speak to a qualified adviser for accurate advice.
      </p>
    </CollapsibleSection>
  );
}
