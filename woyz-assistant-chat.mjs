export const questions = [
  'What major points are missing from the history?',
  'What alternative diagnoses should I consider?',
  'What investigations should I consider?',
  'What medication changes should I consider?'
];

export function createChat({answer, render}) {
  let patient = null, generation = 0, pending, open = false, messages = [];
  const reset = () => { generation++; pending?.abort(); pending = null; messages = []; };
  const update = () => render({patientId:patient?.id, open, messages:[...messages], busy:!!pending});
  return {
    select(next) {
      if (patient?.id === next?.id) { patient = next; update(); return; }
      reset(); patient = next; update();
    },
    show() { if (patient) { open = true; update(); } },
    close() { reset(); open = false; update(); },
    async ask(value) {
      const question = String(value ?? '').trim().slice(0, 500);
      if (!open || !patient || !question || pending) return;
      const version = generation;
      const controller = new AbortController();
      pending = controller;
      messages.push({role:'You', text:question});
      // Only this patient's visits, independent of which visit is open in the editor.
      const context = patient.visits.map(({date,title,text}) => ({date,title,text}));
      update();
      try {
        const lines = await answer(question, context, controller.signal, patient);
        if (lines.length && generation === version && !controller.signal.aborted) {
          messages.push({role:'Assistant', text:lines.slice(0,2).map(s=>s.replace(/\s+/g,' ').trim().slice(0,160)).join('\n')});
        }
      } catch (error) {
        if (generation === version && !controller.signal.aborted) messages.push({role:'Assistant', text:error.publicMessage || 'Unable to answer. Please try again.'});
      } finally {
        if (generation === version && pending === controller) { pending = null; update(); }
      }
    }
  };
}

// Fixture-only stand-in for an AI provider. No clinical advice or network calls.
export async function demoAnswer(_question, visits, signal) {
  signal.throwIfAborted();
  return [`Preview included ${visits.length} saved notes for this patient.`,
    'No clinical answer generated; no data was sent to an AI service.'];
}
