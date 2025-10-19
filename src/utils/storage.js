const PREFIX = 'quizmate:';
export function saveProgress(quizId, answers){
  try { localStorage.setItem(PREFIX + quizId, JSON.stringify({ answers })); } catch {}
}
export function loadProgress(quizId){
  try { const raw = localStorage.getItem(PREFIX + quizId); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function clearProgress(quizId){
  try { localStorage.removeItem(PREFIX + quizId); } catch {}
}

const SESS_PREFIX = 'quizmate:session:';
export function saveSession(quizId, session){
  try { localStorage.setItem(SESS_PREFIX + quizId, JSON.stringify(session)); } catch {}
}
export function loadSession(quizId){
  try { const raw = localStorage.getItem(SESS_PREFIX + quizId); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function clearSession(quizId){
  try { localStorage.removeItem(SESS_PREFIX + quizId); } catch {}
}
