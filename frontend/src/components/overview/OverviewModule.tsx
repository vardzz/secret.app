import React from 'react';
import { Plus, ShieldCheck } from 'lucide-react';

function MetricCard({ title, value, subtitle, isLast }: { title: string, value: string, subtitle: string, isLast?: boolean }) {
  return (
    <div className={`flex-1 py-8 px-6 first:pl-2 ${!isLast ? 'border-r border-border-subtle' : ''}`}>
      <h4 className="text-sm text-text-primary mb-6">{title}</h4>
      <div className="text-4xl font-bold mb-3">{value}</div>
      <div className="text-xs text-text-tertiary font-mono tracking-tight">{subtitle}</div>
    </div>
  );
}

function TaskItem({ title, date, meta }: { title: string, date: string, meta: string }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border-subtle last:border-0 group cursor-pointer transition-colors">
      <div className="flex items-start gap-4">
        <div className="mt-1.5 w-1.5 h-1.5 rounded-full border-2 border-text-secondary group-hover:border-bone transition-colors shrink-0" />
        <div>
          <div className="font-semibold text-sm text-text-primary mb-1.5">{title}</div>
          <div className="text-[11px] text-text-tertiary uppercase tracking-wider">{meta}</div>
        </div>
      </div>
      <div className="text-xs text-text-secondary font-mono tracking-tight">{date}</div>
    </div>
  );
}

function IncomeItem({ title, amount, meta }: { title: string, amount: string, meta: string }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border-subtle last:border-0 group cursor-pointer transition-colors">
      <div>
        <div className="font-semibold text-sm text-text-primary mb-1.5">{title}</div>
        <div className="text-[11px] text-text-tertiary uppercase tracking-wider">{meta}</div>
      </div>
      <div className="text-sm font-semibold font-mono tracking-tight">{amount}</div>
    </div>
  );
}

export function OverviewModule() {
  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto flex flex-col min-h-full pt-8 md:pt-12 px-6 md:px-12 relative">
        {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h3 className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase mb-3">Vault Overview</h3>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">Good evening, Alex.</h1>
        </div>
        <button className="flex items-center gap-2 bg-bone text-obsidian px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity">
          <Plus size={18} />
          <span>New record</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-border-subtle mb-12">
        <MetricCard title="Credentials" value="128" subtitle="04 added this month" />
        <MetricCard title="Secure notes" value="24" subtitle="02 updated this week" />
        <MetricCard title="Open tasks" value="07" subtitle="03 due this week" />
        <MetricCard title="Income / August" value="$8,240" subtitle="08 entries recorded" isLast />
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 mb-16">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-text-primary">Upcoming tasks</h3>
            <button className="text-sm text-text-secondary hover:text-text-primary transition-colors">View all</button>
          </div>
          <div className="space-y-0">
            <TaskItem title="Renew domain registration" date="AUG 12" meta="PERSONAL / 15 MIN" />
            <TaskItem title="Review Q3 subscriptions" date="AUG 16" meta="FINANCE / 30 MIN" />
            <TaskItem title="Update emergency contacts" date="AUG 20" meta="VAULT / 10 MIN" />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-text-primary">Recent income</h3>
            <button className="text-sm text-text-secondary hover:text-text-primary transition-colors">View all</button>
          </div>
          <div className="space-y-0">
            <IncomeItem title="Northstar Studio" amount="$3,600" meta="AUG 07 · CONSULTING" />
            <IncomeItem title="Studio Array" amount="$1,240" meta="AUG 04 · ROYALTY" />
            <IncomeItem title="Solace Labs" amount="$3,400" meta="AUG 01 · CONSULTING" />
          </div>
        </div>
      </div>

      {/* Bottom Status */}
      <div className="mt-auto pb-12 flex justify-end">
        <div className="flex items-start gap-4">
          <ShieldCheck size={20} className="mt-0.5 text-text-secondary" />
          <div>
            <div className="text-sm font-semibold text-text-primary flex gap-2 items-center tracking-tight mb-1">
              Vault backup verified
              <span className="text-[11px] font-normal text-text-tertiary uppercase tracking-widest ml-1">LAST</span>
            </div>
            <div className="text-[11px] text-text-tertiary uppercase tracking-widest">
              ENCRYPTED EXPORT · TODAY 18:42
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
