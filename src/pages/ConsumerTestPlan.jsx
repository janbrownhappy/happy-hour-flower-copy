import React from 'react';
import { DEMO_CONSUMER, PREREQS } from '@/lib/consumerTestPlan';
import TestPlanScript from '@/components/testplan/TestPlanScript';
import TestPlanChecklist from '@/components/testplan/TestPlanChecklist';

export default function ConsumerTestPlan() {
  return (
    <div className="force-light min-h-screen bg-background text-foreground">
      <main className="max-w-4xl mx-auto px-5 py-14 space-y-14 safe-area-pt">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-widest text-primary">App Review Guide</p>
          <h1 className="text-4xl sm:text-5xl">Consumer test plan</h1>
          <p className="text-muted-foreground text-lg">Happy Hour Flower helps adults 21+ find local happy hours, deals and venues. This guide walks through the full consumer experience in about 10 minutes.</p>
        </header>
        <section className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-2xl">Before you start</h2>
          <p className="allow-select">Demo login: <b>{DEMO_CONSUMER.email}</b> / <b>{DEMO_CONSUMER.password}</b></p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {PREREQS.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </section>
        <TestPlanScript />
        <TestPlanChecklist />
      </main>
    </div>
  );
}