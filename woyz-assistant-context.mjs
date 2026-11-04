// A confirmed UHID is required; never merge records by name, age or sex.
export const stablePatientKey = record => {
  const id = String(record?.patientData?.uhid ?? '').trim();
  return !id || /^(?:nil|n\/a|unknown|none|-+)$/i.test(id) ? null : 'uhid:'+id.toLowerCase();
};
export function historyFor(key, records, textFor = r => r.transcription) {
  const notes = new Map();
  for (const r of records) {
    if (!key || stablePatientKey(r)!==key || r.isDraft || r.isDeleted || r.deleted || !r.ownerUid || !r.firestoreId) continue;
    const text = String(textFor(r) ?? '').trim();
    if (text) notes.set(JSON.stringify([r.ownerUid,r.firestoreId]),{
      date:r.visitDate || '', title:r.selectedMode || r.heading || 'Visit Note', text
    });
  }
  return [...notes.values()].sort((a,b)=>b.date.localeCompare(a.date));
}
