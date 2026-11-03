import React from 'react';
import { SECTIONS } from '@/lib/consumerTestPlan';

export default function TestPlanScript({ sections = SECTIONS }) {
  let n = 0;
  return (
    <section className="space-y-10">
      <h2 className="text-3xl">Step-by-step script</h2>
      {sections.map((s) => (
        <div key={s.id}>
          <h3 className="text-xl mb-4">{s.title}</h3>
          <ol className="space-y-3">
            {s.steps.map(([action, expected]) => {
              n += 1;
              return (
                <li key={n} className="grid sm:grid-cols-[2.5rem_1fr_1fr] gap-2 sm:gap-6 border-b border-border pb-3">
                  <span className="text-primary font-semibold">{n}</span>
                  <p>{action}</p>
                  <p className="text-muted-foreground"><span className="font-semibold text-foreground">Expected: </span>{expected}</p>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}