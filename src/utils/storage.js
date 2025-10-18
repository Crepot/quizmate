const PREFIX = 'quizmate:';
export function saveProgress(quizId, answers){
  try { localStorage.setItem(PREFIX + quizId, JSON.stringify({ answers })); } catch {}
}
export function loadProgress(quizId){
  try { const raw = localStorage.getItem(PREFIX + quizId); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
