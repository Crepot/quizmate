export const scoreMcq = (item, user) => {
  const right = new Set(item.correct || []);
  const ans = new Set(user || []);
  if (right.size !== ans.size) return false;
  for (const v of right) if (!ans.has(v)) return false;
  return true;
};
export const scoreImage = (item, user) => user === item.correct;
export const scoreFreeform = (item, text) => {
  const t = (text || '').toLowerCase();
  const hits = (item.keywords || []).filter(k => t.includes(String(k).toLowerCase()));
  return { review: true, keywordsHit: hits };
};
