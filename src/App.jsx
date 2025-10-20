import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { loadQuiz, validateAll, loadProgress, saveProgress, clearProgress, scoreMcq, loadSession, saveSession } from './utils';

const initial = {
  quizId: 'demo',
  answers: { freeform: {}, mcq: {}, imageMap: {} },
};

function reducer(state, action){
  switch(action.type){
    case 'LOAD_PROGRESS': return { ...state, answers: action.answers || initial.answers };
    case 'ANSWER_FREEFORM': {
      const { id, text } = action;
      return { ...state, answers: { ...state.answers, freeform: { ...state.answers.freeform, [id]: text } } };
    }
    case 'ANSWER_MCQ': {
      const { id, value } = action;
      return { ...state, answers: { ...state.answers, mcq: { ...state.answers.mcq, [id]: value } } };
    }
    case 'ANSWER_IMAGE': {
      const { id, value } = action;
      return { ...state, answers: { ...state.answers, imageMap: { ...state.answers.imageMap, [id]: value } } };
    }
    default: return state;
  }
}

export default function App(){
  const [state, dispatch] = useReducer(reducer, initial);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [mode, setMode] = useState('freeform');
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState({ freeform: null, mcq: null, imageMap: null });
  const importInputRef = useRef(null);

  useEffect(() => {
    const saved = loadProgress(state.quizId);
    if (saved) dispatch({ type: 'LOAD_PROGRESS', answers: saved.answers });
  }, [state.quizId]);

  useEffect(() => {
    (async () => {
      try {
        const quiz = await loadQuiz(state.quizId);
        const v = validateAll(quiz);
        if (!v.ok) throw new Error(v.message);
        setData(quiz);
        // Inicializar sesiÃ³n aleatoria (por defecto: todos los Ã­ndices)
        const ffLen = Array.isArray(quiz?.freeform?.items) ? quiz.freeform.items.length : 0;
        const mcqLen = Array.isArray(quiz?.mcq?.items) ? quiz.mcq.items.length : 0;
        const imLen = Array.isArray(quiz?.imageMap?.items) ? quiz.imageMap.items.length : 0;
        const savedSess = loadSession(state.quizId) || {};
        const def = (n) => Array.from({ length: n }, (_, i) => i);
        setSession({
          freeform: Array.isArray(savedSess.freeform) && savedSess.freeform.length ? savedSess.freeform.filter(i => i>=0 && i<ffLen) : def(ffLen),
          mcq: Array.isArray(savedSess.mcq) && savedSess.mcq.length ? savedSess.mcq.filter(i => i>=0 && i<mcqLen) : def(mcqLen),
          imageMap: Array.isArray(savedSess.imageMap) && savedSess.imageMap.length ? savedSess.imageMap.filter(i => i>=0 && i<imLen) : def(imLen),
        });
        if (Array.isArray(quiz?.metadata?.sections) && quiz.metadata.sections.length > 0) {
          setMode(quiz.metadata.sections[0]);
          setIndex(0);
          setFinished(false);
        }
      } catch (e) { setErr(e.message || String(e)); }
    })();
  }, [state.quizId]);

  useEffect(() => {
    const t = setTimeout(() => saveProgress(state.quizId, state.answers), 300);
    return () => clearTimeout(t);
  }, [state.quizId, state.answers]);

  // Hook order: compute memos unconditionally before any early return
  // Provide a safe fallback when imported file doesn't include `metadata` (e.g. mcq.json/freeform.json)
  const metadata = data?.metadata || { title: data?.name || 'Cuestionario', sections: [] };
  const freeform = data?.freeform;
  const mcq = data?.mcq;
  const imageMap = data?.imageMap;

  // Items por secciÃ³n y el item actual segÃºn Ã­ndice
  const ffAll = freeform?.items || [];
  const mcqAll = mcq?.items || [];
  const imAll = imageMap?.items || [];
  const ffItems = useMemo(() => (session.freeform ?? ffAll.map((_,i)=>i)).map(i => ffAll[i]).filter(Boolean), [ffAll, session.freeform]);
  const mcqItems = useMemo(() => (session.mcq ?? mcqAll.map((_,i)=>i)).map(i => mcqAll[i]).filter(Boolean), [mcqAll, session.mcq]);
  const imItems = useMemo(() => (session.imageMap ?? imAll.map((_,i)=>i)).map(i => imAll[i]).filter(Boolean), [imAll, session.imageMap]);

  const ffItem = useMemo(() => ffItems[index] || null, [ffItems, index]);
  const mcqItem = useMemo(() => mcqItems[index] || null, [mcqItems, index]);
  const imItem = useMemo(() => imItems[index] || null, [imItems, index]);
  // Respuestas actuales (usar antes de efectos que dependen de ellas)
  const ansFF = ffItem ? (state.answers.freeform[ffItem.id] || '') : '';
  const ansMCQ = mcqItem ? (state.answers.mcq[mcqItem.id] || []) : [];
  const ansIM = imItem ? (state.answers.imageMap[imItem.id] || '') : '';

  // Totales de MCQ para mostrar puntaje general
  const mcqScore = useMemo(() => {
    const total = mcqItems.length;
    let correct = 0;
    for (const it of mcqItems) {
      const user = state.answers.mcq[it.id] || [];
      if (scoreMcq(it, user)) correct++;
    }
    return { correct, total };
  }, [mcqItems, state.answers.mcq]);

  // Mantener foco en el textarea de Freeform
  const taRef = useRef(null);
  // Local state for textarea to avoid dispatch on every keystroke (prevents focus loss)
  const [inputFF, setInputFF] = useState('');
  // Sync local input when the current ffItem or stored answer changes
  useEffect(() => {
    setInputFF(ansFF || '');
  }, [ansFF, ffItem?.id]);
  
  // Debounce local input to dispatch ANSWER_FREEFORM
  useEffect(() => {
    if (!ffItem) return;
    const id = ffItem.id;
    const t = setTimeout(() => {
      // only dispatch if different from stored answer
      if ((state.answers.freeform[id] || '') !== inputFF) {
        dispatch({ type: 'ANSWER_FREEFORM', id, text: inputFF });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [inputFF, ffItem, dispatch, state.answers.freeform]);
  useEffect(() => {
    if (mode === 'freeform' && taRef.current) {
      if (document.activeElement !== taRef.current) {
        taRef.current.focus({ preventScroll: true });
      }
    }
  }, [mode, index, ffItem]);

  if (err) return <div style={{padding:16,color:'#c33'}}>Error: {err}</div>;
  if (!data) return <div style={{padding:16,opacity:.7}}>Cargando…</div>;


  // Cambio de modo: reset índice y finalizado
  const changeMode = (m) => { setMode(m); setIndex(0); setFinished(false); setSidebarOpen(false); };

  // Navegación y acciones
  const countForMode = mode === 'freeform' ? ffItems.length : mode === 'mcq' ? mcqItems.length : imItems.length;
  const atFirst = index <= 0;
  const atLast = index >= Math.max(0, countForMode - 1);

  const onPrev = () => setIndex(i => Math.max(0, i - 1));
  const onNext = () => setIndex(i => Math.min(countForMode - 1, i + 1));
  const onFinish = () => setFinished(true);
  const onNew = () => {
    // Elegir cantidad y generar sesión aleatoria para la sección actual
    const total = mode === 'freeform' ? ffAll.length : mode === 'mcq' ? mcqAll.length : imAll.length;
    if (!total) return;
    const suggested = Math.min(10, total);
    const input = window.prompt(`¿Cuántas preguntas quieres para ${mode}? (1..${total})`, String(suggested));
    if (input == null) return;
    let n = parseInt(input, 10);
    if (!Number.isFinite(n) || n <= 0) n = 1;
    n = Math.min(Math.max(1, n), total);
    const arr = Array.from({ length: total }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const subset = arr.slice(0, n);
    setSession(prev => {
      const next = { ...prev };
      const key = mode === 'image-map' ? 'imageMap' : mode;
      next[key] = subset;
      saveSession(state.quizId, next);
      return next;
    });
    // Limpiar respuestas solo de la sección actual
    if (mode === 'freeform') {
      dispatch({ type: 'LOAD_PROGRESS', answers: { ...state.answers, freeform: {} } });
    } else if (mode === 'mcq') {
      dispatch({ type: 'LOAD_PROGRESS', answers: { ...state.answers, mcq: {} } });
    } else {
      dispatch({ type: 'LOAD_PROGRESS', answers: { ...state.answers, imageMap: {} } });
    }
    setIndex(0);
    setFinished(false);
  };
  const onExport = () => {
    const payload = { quizId: state.quizId, answers: state.answers, finishedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-${state.quizId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onImportQuiz = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || '{}'));
        const v = validateAll(obj);
        if (!v.ok) throw new Error(v.message || 'JSON invÃ¡lido');
        // Cargar en memoria sin tocar rutas; resetea sesiÃ³n a todos
        setData(obj);
        const ffLen = Array.isArray(obj?.freeform?.items) ? obj.freeform.items.length : 0;
        const mcqLen = Array.isArray(obj?.mcq?.items) ? obj.mcq.items.length : 0;
        const imLen = Array.isArray(obj?.imageMap?.items) ? obj.imageMap.items.length : 0;
        const def = (n) => Array.from({ length: n }, (_, i) => i);
        const nextSession = {
          freeform: def(ffLen),
          mcq: def(mcqLen),
          imageMap: def(imLen),
        };
        setSession(nextSession);
        saveSession(state.quizId, nextSession);
        // Reset UI
        dispatch({ type: 'LOAD_PROGRESS', answers: initial.answers });
        if (Array.isArray(obj?.metadata?.sections) && obj.metadata.sections.length > 0) {
          setMode(obj.metadata.sections[0]);
        } else {
          setMode('freeform');
        }
        setIndex(0);
        setFinished(false);
      } catch (e) {
        alert('Error al importar cuestionario: ' + (e?.message || String(e)));
      }
    };
    reader.onerror = () => alert('No se pudo leer el archivo');
    reader.readAsText(file);
  };

  const ModeButton = ({ id, label }) => (
    <button
      onClick={() => changeMode(id)}
      style={{
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid',
        borderColor: mode === id ? '#646cff' : 'transparent',
        background: mode === id ? 'rgba(100,108,255,.12)' : '#1a1a1a',
        color: 'inherit',
        cursor: 'pointer'
      }}
    >{label}</button>
  );

  const Section = ({ children }) => (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(100,108,255,0.25)',
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      textAlign: 'center'
    }}>{children}</div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px 16px' }}>
      <div style={{ width: 'min(100%, 960px)', margin: '0 auto' }}>
        <header style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center', position: 'relative' }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>{metadata.title}</h1>
          {/* Progress bar for current section */}
          <div style={{ width: '100%', maxWidth: 960 }}>
            <div style={{ height: 8, background: '#1a1a1a', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${countForMode ? Math.round((index + 1) / countForMode * 100) : 0}%`, background: 'linear-gradient(90deg,#646cff,#3b82f6)' }} />
            </div>
            <div style={{ fontSize: 12, marginTop: 6, opacity: .85 }}>{index + 1}/{countForMode} en sección</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <ModeButton id="freeform" label="Preguntas y respuestas" />
            <ModeButton id="mcq" label="Múltiple opción" />
            <ModeButton id="image-map" label="Imagen" />
          </div>
          {mode === 'mcq' && finished && (
            <div style={{ fontSize: 14, fontWeight: 600 }}>Puntaje: {mcqScore.correct} / {mcqScore.total}</div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={onNew} style={{
              background: 'linear-gradient(135deg, #22c55e, #10b981)',
              color: 'white', border: '1px solid #16a34a', borderRadius: 8, padding: '8px 12px'
            }}>Nuevo</button>
            <button onClick={onExport} style={{
              background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              color: 'white', border: '1px solid #0ea5e9', borderRadius: 8, padding: '8px 12px'
            }}>Exportar resultados</button>
            <button onClick={() => setSidebarOpen(s => !s)} style={{
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              color: 'white', border: '1px solid #fb923c', borderRadius: 8, padding: '8px 12px'
            }}>{sidebarOpen ? 'Cerrar índice' : 'Abrir índice'}</button>
          </div>
        </header>

        {/* Sidebar de navegación */}
        {sidebarOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setSidebarOpen(false)}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, background: '#0f0f0f', borderRight: '1px solid #2a2a2a', padding: 12, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Navegar preguntas ({mode})</div>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: 8 }}>
              <button onClick={() => importInputRef.current?.click()} style={{
                background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                color: 'white', border: '1px solid #fb923c', borderRadius: 8, padding: '8px 12px'
              }}>Importar cuestionario</button>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) onImportQuiz(f);
                e.target.value = '';
              }}
            />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {Array.from({ length: countForMode }).map((_, i) => {
                  const isActive = i === index;
                  // Estado respondido por cada modo
                  let answered = false;
                  if (mode === 'freeform') answered = !!(ffItems[i] && (state.answers.freeform[ffItems[i].id] || '').length);
                  else if (mode === 'mcq') answered = !!(mcqItems[i] && Array.isArray(state.answers.mcq[mcqItems[i].id]) && state.answers.mcq[mcqItems[i].id].length);
                  else if (mode === 'image-map') answered = !!(imItems[i] && (state.answers.imageMap[imItems[i].id] || ''));
                  return (
                    <button key={i} onClick={() => { setIndex(i); setSidebarOpen(false); }} style={{
                      padding: '8px 0', borderRadius: 8, border: '1px solid',
                      borderColor: isActive ? '#646cff' : answered ? '#4cc38a' : '#3a3a3a',
                      background: isActive ? 'rgba(100,108,255,.12)' : answered ? 'rgba(76,195,138,.10)' : '#111',
                      color: 'inherit'
                    }}>{i + 1}</button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      {mode === 'freeform' && ffItem && (
        <Section>
          <h2 style={{ margin: '4px 0 12px', fontSize: 18 }}>{ffItem.prompt}</h2>
          <textarea
            ref={taRef}
            value={inputFF}
            onChange={(e) => setInputFF(e.target.value)}
            onBlur={() => {
              // dispatch immediately on blur to persist
              if (ffItem && (state.answers.freeform[ffItem.id] || '') !== inputFF) {
                dispatch({ type: 'ANSWER_FREEFORM', id: ffItem.id, text: inputFF });
              }
            }}
            placeholder="Escribe tu respuesta…"
            maxLength={ffItem.maxLength || 1000}
            rows={8}
            style={{ width: '100%', resize: 'vertical', padding: 12, borderRadius: 8, border: '1px solid #3a3a3a', background: '#111', color: '#eee' }}
          />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop: 8, fontSize: 12, opacity: .8 }}>
            <span>{ffItem.required ? 'Requerido' : 'Opcional'}</span>
            <span>{(ansFF || '').length}/{ffItem.maxLength || 1000}</span>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop: 16, flexWrap:'wrap' }}>
            <button onClick={onPrev} disabled={atFirst}>Volver</button>
            {!atLast && (<button onClick={onNext}>Siguiente</button>)}
            {atLast && (<button onClick={onFinish} disabled={finished}>Finalizar</button>)}
          </div>
          {finished && (
            <div style={{ marginTop: 16, fontSize: 14, opacity: .9 }}>
              <div>Revisión manual sugerida.</div>
              <div style={{ marginTop: 8 }}>Palabras clave esperadas: {(ffItem.keywords || []).join(', ') || '—'}</div>
              {ffItem.correct && (
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(76,195,138,.12)', border: '1px solid #4cc38a', borderRadius: 8, fontSize: 13 }}>
                  <strong>Respuesta esperada:</strong>
                  <div style={{ marginTop: 6 }}>{ffItem.correct}</div>
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      {mode === 'mcq' && mcqItem && (
        <Section>
          <h2 style={{ margin: '4px 0 12px', fontSize: 18 }}>{mcqItem.stem}</h2>

          <div style={{ display: 'grid', gap: 8 }}>
            {(mcqItem.options || []).map((opt) => {
              const isMultiple = mcqItem.type === 'multiple';
              const checked = Array.isArray(ansMCQ) && ansMCQ.includes(opt.id);
              const isCorrect = Array.isArray(mcqItem.correct) && mcqItem.correct.includes(opt.id);
              const toggle = () => {
                if (finished) return; // no changes after finish
                if (isMultiple) {
                  const next = checked ? ansMCQ.filter(v => v !== opt.id) : [...ansMCQ, opt.id];
                  dispatch({ type: 'ANSWER_MCQ', id: mcqItem.id, value: next });
                } else {
                  dispatch({ type: 'ANSWER_MCQ', id: mcqItem.id, value: [opt.id] });
                }
              };

              // styling: green for correct options after finish, red for selected incorrect ones
              let background = '#111';
              if (finished && isCorrect) background = 'rgba(76,195,138,.12)';
              else if (finished && checked && !isCorrect) background = 'rgba(220,38,38,.12)';

              return (
                <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: '1px solid #3a3a3a', background }}>
                  <input
                    type={mcqItem.type === 'multiple' ? 'checkbox' : 'radio'}
                    name={mcqItem.id}
                    checked={checked}
                    onChange={toggle}
                    disabled={finished}
                  />
                  <span style={{ flex: 1 }}>{opt.text}</span>
                  {finished && (
                    <span style={{ marginLeft: 8, fontWeight: 700 }}>
                      {isCorrect ? '✔️' : (checked && !isCorrect ? '❌' : null)}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {Array.isArray(mcqItem.correct) && (
            finished ? (
              <div style={{ marginTop: 12, fontSize: 14 }}>Correcta(s): {mcqItem.correct.join(', ')}</div>
            ) : null
          )}
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop: 16, flexWrap:'wrap' }}>
            <button onClick={onPrev} disabled={atFirst}>Volver</button>
            {!atLast && (<button onClick={onNext}>Siguiente</button>)}
            {atLast && (<button onClick={onFinish} disabled={finished}>Finalizar</button>)}
          </div>
        </Section>
      )}

      {mode === 'image-map' && imItem && (
        <Section>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr', alignItems: 'start' }}>
            <div>
              <div style={{
                width: '100%',
                background: '#0d0d0d',
                border: '1px solid #3a3a3a',
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 200
              }}>
                {imItem.image ? (
                  <img src={imItem.image} alt={imItem.alt || ''} style={{ maxWidth: '100%', display: 'block' }} />
                ) : (
                  <div style={{ padding: 24, opacity: .6 }}>Sin imagen</div>
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: .7 }}>{imItem.alt || 'Imagen'}</div>
            </div>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Elige palabra clave:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(imItem.choices || []).map(ch => {
                  const active = ansIM === ch;
                  return (
                    <button
                      key={ch}
                      onClick={() => dispatch({ type: 'ANSWER_IMAGE', id: imItem.id, value: ch })}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 999,
                        border: '1px solid',
                        borderColor: active ? '#4cc38a' : '#3a3a3a',
                        background: active ? 'rgba(76,195,138,.15)' : '#111',
                        color: 'inherit',
                        cursor: 'pointer'
                      }}
                    >{ch}</button>
                  );
                })}
              </div>
              {imItem.correct && finished && (
                <div style={{ marginTop: 12, fontSize: 14 }}>Correcta: {imItem.correct}</div>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop: 16, flexWrap:'wrap' }}>
            <button onClick={onPrev} disabled={atFirst}>Volver</button>
            {!atLast && (<button onClick={onNext}>Siguiente</button>)}
            {atLast && (<button onClick={onFinish} disabled={finished}>Finalizar</button>)}
          </div>
        </Section>
      )}
      </div>
    </div>
  );
}
