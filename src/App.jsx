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
  const mq = (q) => (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia(q).matches : false;
  const [isDesktop, setIsDesktop] = useState(() => mq('(min-width: 1024px)'));
  const [sidebarOpen, setSidebarOpen] = useState(() => mq('(min-width: 1024px)'));
  const [session, setSession] = useState({ freeform: null, mcq: null, imageMap: null });
  const [review, setReview] = useState({ freeform: false, mcq: false, imageMap: false });
  const importInputRef = useRef(null);
  const importFolderRef = useRef(null);
  const importQuizFolderRef = useRef(null);

  useEffect(() => {
    const saved = loadProgress(state.quizId);
    if (saved) dispatch({ type: 'LOAD_PROGRESS', answers: saved.answers });
  }, [state.quizId]);

  // Detect desktop/mobile to decide sidebar default and persistence
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = (e) => {
      setIsDesktop(e.matches);
      // Do not override user toggled state; default is handled via initial value
    };
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const quiz = await loadQuiz(state.quizId);
        const v = validateAll(quiz);
        if (!v.ok) throw new Error(v.message);
        setData(quiz);
        // Inicializar sesión aleatoria (por defecto: todos los índices)
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
        if (Array.isArray(quiz?.metadata?.sections)) {
          const sections = quiz.metadata.sections;
          const firstSection =
            sections.find(s => (s === 'freeform' && ffLen) || (s === 'mcq' && mcqLen) || ((s === 'image-map' || s === 'imageMap') && imLen))
            || (ffLen ? 'freeform' : (mcqLen ? 'mcq' : (imLen ? 'image-map' : 'freeform')));
          setMode(firstSection);
          setIndex(0);
          setFinished(false);
        }
      } catch (e) {
        // Fallback a esqueleto cuando no hay datos para que no se rompa
        const sk = skeletonDataset();
        setData(sk);
        const ffLen = sk.freeform.items.length;
        const mcqLen = sk.mcq.items.length;
        const imLen = sk.imageMap.items.length;
        const def = (n) => Array.from({ length: n }, (_, i) => i);
        setSession({ freeform: def(ffLen), mcq: def(mcqLen), imageMap: def(imLen) });
        setMode(sk.metadata.sections[0]);
        setIndex(0);
        setFinished(false);
        setErr('');
      }
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

  // Items por sección y el item actual según índice
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

  // Imagen: mostrar solo 4 opciones (1 correcta + 3 distractores) de forma determinista por item
  const seedFromString = (s) => {
    let h = 2166136261 >>> 0; // FNV-1a
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const seededShuffle = (arr, seed) => {
    const a = arr.slice();
    let s = seed >>> 0;
    const rnd = () => {
      // xorshift32
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17; s >>>= 0;
      s ^= s << 5;  s >>>= 0;
      return (s & 0x7fffffff) / 0x80000000;
    };
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const imVisibleChoices = useMemo(() => {
    if (!imItem) return [];
    const all = Array.isArray(imItem.choices) ? imItem.choices.slice() : [];
    if (all.length <= 4) return all;
    const correct = imItem.correct;
    const pool = all.filter(c => c !== correct);
    const seed = seedFromString(imItem.id || '');
    const distractors = seededShuffle(pool, seed).slice(0, 3);
    return seededShuffle([correct, ...distractors], seed + 1);
  }, [imItem]);

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
  const changeMode = (m) => { setMode(m); setIndex(0); setFinished(false); };

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
                const raw = String(reader.result || '{}');
        let obj;
        try { obj = JSON.parse(raw); } catch { throw new Error('Archivo JSON inválido. No se pudo parsear.'); }
        const detectSingle = (o) => {
          const it = Array.isArray(o?.items) ? o.items : null;
          if (!it || !it.length) return {};
          const first = it[0] || {};
          if (Array.isArray(first.options)) return { mcq: { items: it } };
          if (first.image || Array.isArray(first.choices)) return { imageMap: { items: it } };
          return { freeform: { items: it } };
        };
        let norm = obj;        // Ensure metadata has id/title if provided
        if (obj?.metadata && (!obj?.metadata?.id || !obj?.metadata?.title)) {
          const sections0 = Array.isArray(obj?.metadata?.sections) ? obj.metadata.sections : [];
          const secsGuess = [];
          if (obj.freeform?.items?.length) secsGuess.push('freeform');
          if (obj.mcq?.items?.length) secsGuess.push('mcq');
          if (obj.imageMap?.items?.length) secsGuess.push('image-map');
          const mergedSections = sections0.length ? sections0 : secsGuess;
          norm = { ...obj, metadata: { id: obj?.metadata?.id || 'imported', title: obj?.metadata?.title || obj?.name || 'Cuestionario importado', sections: mergedSections } };
        }
        if (!obj?.metadata || (!obj?.freeform && !obj?.mcq && !obj?.imageMap && Array.isArray(obj?.items))) {
          const secs = detectSingle(obj);
          const sections = [];
          if (secs.freeform) sections.push('freeform');
          if (secs.mcq) sections.push('mcq');
          if (secs.imageMap) sections.push('image-map');
          norm = { metadata: { id: 'imported', title: obj?.name || 'Cuestionario importado', sections }, ...secs };
        }
        const v = validateAll(norm);
        if (!v.ok) throw new Error(v.message || 'JSON inválido');
        setData(norm);
        const ffLen = Array.isArray(norm?.freeform?.items) ? norm.freeform.items.length : 0;
        const mcqLen = Array.isArray(norm?.mcq?.items) ? norm.mcq.items.length : 0;
        const imLen = Array.isArray(norm?.imageMap?.items) ? norm.imageMap.items.length : 0;
        if (!ffLen && !mcqLen && !imLen) throw new Error('El archivo no contiene items válidos.');
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
        const sections = Array.isArray(norm?.metadata?.sections) ? norm.metadata.sections : [];
        const firstSection = sections[0] || (ffLen ? 'freeform' : (mcqLen ? 'mcq' : (imLen ? 'image-map' : 'freeform')));
        setMode(firstSection);
        setIndex(0);
        setFinished(false);
      } catch (e) {
        alert('Error al importar cuestionario: ' + (e?.message || String(e)));
      }
    };
    reader.onerror = () => alert('No se pudo leer el archivo');
    reader.readAsText(file);
  };

  // Dataset esqueleto para mostrar ejemplo cuando no hay datos (función hoisted)
  function skeletonDataset() {
    return {
      metadata: { id: 'skeleton', title: 'Ejemplo (sin datos cargados)', sections: ['freeform', 'mcq', 'image-map'] },
      freeform: { items: [ { id: 'ff-skel-1', prompt: 'Ejemplo: Escribe tu respuesta aquí.', keywords: ['EJEMPLO'] } ] },
      mcq: { items: [ { id: 'mcq-skel-1', stem: 'Ejemplo: Selecciona la opción correcta', type: 'single', options: [ { id: 'A', text: 'Opción A' }, { id: 'B', text: 'Opción B' }, { id: 'C', text: 'Opción C' }, { id: 'D', text: 'Opción D' } ], correct: ['A'] } ] },
      imageMap: { items: [ { id: 'im-skel-1', image: '', alt: 'Ejemplo', choices: ['EJEMPLO', 'OPCIÓN 2', 'OPCIÓN 3', 'OPCIÓN 4'], correct: 'EJEMPLO' } ] }
    };
  }

  // Importar carpeta de cuestionario con JSONs (metadata/freeform/mcq/image-map) y opcionalmente imágenes
  const onImportQuizFolder = async (files) => {
    try {
      const list = Array.from(files || []);
      if (!list.length) { alert('No se seleccionaron archivos.'); return; }
      const jsonFiles = list.filter(f => (f.type === 'application/json') || /\.json$/i.test(f.name));
      const imageFiles = list.filter(f => typeof f.type === 'string' && f.type.startsWith('image/'));

      const byBase = new Map();
      for (const f of jsonFiles) {
        const base = (f.webkitRelativePath || f.name).split(/\\|\//).pop().toLowerCase();
        byBase.set(base, f);
      }

      const readJson = async (f) => {
        const raw = await f.text();
        try { return JSON.parse(raw); } catch { throw new Error(`Archivo JSON inválido: ${f.name}`); }
      };

      const tryGet = async (name) => byBase.has(name) ? await readJson(byBase.get(name)) : null;

      let metadata = await tryGet('metadata.json');
      let freeform = await tryGet('freeform.json');
      let mcq = await tryGet('mcq.json');
      let imageMap = await tryGet('image-map.json');

      if (!metadata && !freeform && !mcq && !imageMap && jsonFiles.length) {
        const obj = await readJson(jsonFiles[0]);
        const detectSingle = (o) => {
          const it = Array.isArray(o?.items) ? o.items : null;
          if (!it || !it.length) return {};
          const first = it[0] || {};
          if (Array.isArray(first.options)) return { mcq: { items: it } };
          if (first.image || Array.isArray(first.choices)) return { imageMap: { items: it } };
          return { freeform: { items: it } };
        };
        let norm = obj;
        if (!obj?.metadata || (!obj?.freeform && !obj?.mcq && !obj?.imageMap && Array.isArray(obj?.items))) {
          const secs = detectSingle(obj);
          const sections = [];
          if (secs.freeform) sections.push('freeform');
          if (secs.mcq) sections.push('mcq');
          if (secs.imageMap) sections.push('image-map');
          norm = { metadata: { id: 'imported', title: obj?.name || 'Cuestionario importado', sections }, ...secs };
        }
        metadata = norm.metadata || null;
        freeform = norm.freeform || null;
        mcq = norm.mcq || null;
        imageMap = norm.imageMap || null;
      }

      // Relink imágenes en imageMap a Object URLs si están en la carpeta
      if (imageMap && Array.isArray(imageMap.items)) {
        const imgByBase = new Map(imageFiles.map(f => [f.name, f]));
        imageMap = {
          ...imageMap,
          items: imageMap.items.map((it) => {
            const p = String(it.image || '');
            const base = p.split('/').pop();
            const f = imgByBase.get(base);
            if (f) {
              const url = URL.createObjectURL(f);
              return { ...it, image: url };
            }
            return it;
          })
        };
      }

      const sectionsGuess = [];
      if (freeform?.items?.length) sectionsGuess.push('freeform');
      if (mcq?.items?.length) sectionsGuess.push('mcq');
      if (imageMap?.items?.length) sectionsGuess.push('image-map');
      const meta = metadata || { id: 'imported-folder', title: 'Cuestionario (carpeta)', sections: sectionsGuess };
      const dataset = { metadata: meta, freeform, mcq, imageMap };

      const v = validateAll(dataset);
      if (!v.ok) throw new Error(v.message || 'Contenido inválido en carpeta.');

      setData(dataset);
      const ffLen = Array.isArray(dataset?.freeform?.items) ? dataset.freeform.items.length : 0;
      const mcqLen = Array.isArray(dataset?.mcq?.items) ? dataset.mcq.items.length : 0;
      const imLen = Array.isArray(dataset?.imageMap?.items) ? dataset.imageMap.items.length : 0;
      const def = (n) => Array.from({ length: n }, (_, i) => i);
      const nextSession = { freeform: def(ffLen), mcq: def(mcqLen), imageMap: def(imLen) };
      setSession(nextSession);
      saveSession(state.quizId, nextSession);
      dispatch({ type: 'LOAD_PROGRESS', answers: initial.answers });
      const firstSection = (meta.sections && meta.sections[0]) || (sectionsGuess[0] || 'freeform');
      setMode(firstSection);
      setIndex(0);
      setFinished(false);
    } catch (e) {
      alert('Error al importar carpeta de cuestionario: ' + (e?.message || String(e)));
    }
  };
  // Importar carpeta con imágenes y armar cuestionario de "image-map" en memoria
  const onImportImagesFolder = (files) => {
    try {
      const all = Array.from(files || []).filter(f => f && typeof f.type === 'string' && f.type.startsWith('image/'));
      if (!all.length) {
        alert('No se encontraron imágenes en la carpeta seleccionada.');
        return;
      }
      const labelFromName = (name) => {
        const base = String(name || '').replace(/\.[^.]+$/, '');
        return base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
      };
      const toSlug = (s) => String(s || '')
        .normalize('NFD').replace(/[^\p{Letter}\p{Number}]+/gu, '-').replace(/^-+|-+$/g, '')
        .toLowerCase();
      const choices = Array.from(new Set(all.map(f => labelFromName(f.name)))).sort((a,b) => a.localeCompare(b));

      // Crear Object URLs para las imágenes seleccionadas
      const items = all.map((f, idx) => {
        const label = labelFromName(f.name);
        const url = URL.createObjectURL(f);
        return {
          id: `im-${idx}-${toSlug(label)}`,
          image: url,
          alt: label,
          choices,
          correct: label,
        };
      });

      const dataset = {
        metadata: { id: 'local-images', title: 'Imágenes desde carpeta', sections: ['image-map'] },
        imageMap: { items },
      };

      // Cargar dataset en la app
      setData(dataset);
      const def = (n) => Array.from({ length: n }, (_, i) => i);
      const nextSession = { freeform: [], mcq: [], imageMap: def(items.length) };
      setSession(nextSession);
      saveSession(state.quizId, nextSession);
      dispatch({ type: 'LOAD_PROGRESS', answers: initial.answers });
      setMode('image-map');
      setIndex(0);
      setFinished(false);
    } catch (e) {
      alert('Error al importar carpeta: ' + (e?.message || String(e)));
    }
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

  const contentWrapperStyle = { width: 'min(100%, 960px)', margin: '0 auto' };
  if (isDesktop && sidebarOpen) Object.assign(contentWrapperStyle, { marginLeft: 300 });

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px 16px' }}>
      {/* Botón hamburguesa esquina superior izquierda */}
      <button
        aria-label="Abrir/cerrar índice"
        onClick={() => setSidebarOpen(s => !s)}
        style={{ position: 'fixed', top: 12, left: 12, zIndex: 50, width: 40, height: 36, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', justifyContent: 'center', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, cursor: 'pointer', color: 'inherit' }}
      >
        <span style={{ display: 'block', width: 22, height: 2, background: 'currentColor' }} />
        <span style={{ display: 'block', width: 22, height: 2, background: 'currentColor' }} />
        <span style={{ display: 'block', width: 22, height: 2, background: 'currentColor' }} />
      </button>

      <div style={contentWrapperStyle}>
        <header style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center', position: 'relative' }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>{metadata.title}</h1>
          {/* Progress bar for current section */}
          <div style={{ width: '100%', maxWidth: 960 }}>
            <div style={{ height: 8, background: '#1a1a1a', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${countForMode ? Math.round((index + 1) / countForMode * 100) : 0}%`, background: 'linear-gradient(90deg,#646cff,#3b82f6)' }} />
            </div>
            <div style={{ fontSize: 12, marginTop: 6, opacity: .85 }}>{index + 1}/{countForMode} en sección</div>
          </div>
          {/* Botones de modo movidos al sidebar */}
          {mode === 'mcq' && finished && (
            <div style={{ fontSize: 14, fontWeight: 600 }}>Puntaje: {mcqScore.correct} / {mcqScore.total}</div>
          )}
          {/* Acciones movidas al sidebar */}
        </header>

        {/* Sidebar de Navegación */}
        {sidebarOpen && !isDesktop && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setSidebarOpen(false)}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, background: '#0f0f0f', borderRight: '1px solid #2a2a2a', padding: 12, paddingTop: 60, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            <ModeButton id="freeform" label="Preguntas y respuestas" />
            <ModeButton id="mcq" label="Múltiple opción" />
            <ModeButton id="image-map" label="Imagen" />
                <button onClick={() => setReview(prev => { const key = (mode === 'image-map') ? 'imageMap' : mode; return { ...prev, [key]: !prev[key] }; })} style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', color: 'white', border: '1px solid #7c3aed', borderRadius: 8, padding: '8px 12px' }}>
                  {(() => { const key = (mode === 'image-map') ? 'imageMap' : mode; return (review?.[key] ? 'Desactivar repaso' : 'Activar repaso'); })()}
                </button>
                <button onClick={onNew} style={{
                  background: 'linear-gradient(135deg, #22c55e, #10b981)',
                  color: 'white', border: '1px solid #16a34a', borderRadius: 8, padding: '8px 12px'
                }}>Nuevo</button>
                <button onClick={onExport} style={{
                  background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                  color: 'white', border: '1px solid #0ea5e9', borderRadius: 8, padding: '8px 12px'
                }}>Exportar resultados</button>
                <button onClick={() => importInputRef.current?.click()} style={{
                  background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                  color: 'white', border: '1px solid #fb923c', borderRadius: 8, padding: '8px 12px'
                }}>Importar cuestionario</button>
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
                <button onClick={() => importQuizFolderRef.current?.click()} style={{
                  background: 'linear-gradient(135deg, #9333ea, #6366f1)',
                  color: 'white', border: '1px solid #7c3aed', borderRadius: 8, padding: '8px 12px'
                }}>Importar carpeta de cuestionario</button>
                <input
                  ref={importQuizFolderRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  webkitdirectory="true"
                  directory="true"
                  accept=".json,image/*"
                  onChange={(e) => { const fl = e.target.files; if (fl && fl.length) onImportQuizFolder(fl); e.target.value = ''; }}
                />
              </div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Navegar preguntas ({mode})</div>
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
        {isDesktop && sidebarOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 280, background: '#0f0f0f', borderRight: '1px solid #2a2a2a', padding: 12, paddingTop: 60, overflowY: 'auto', zIndex: 40 }}>
            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              <ModeButton id="freeform" label="Preguntas y respuestas" />
              <ModeButton id="mcq" label="Múltiple opción" />
              <ModeButton id="image-map" label="Imagen" />
              <button onClick={() => setReview(prev => { const key = (mode === 'image-map') ? 'imageMap' : mode; return { ...prev, [key]: !prev[key] }; })} style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', color: 'white', border: '1px solid #7c3aed', borderRadius: 8, padding: '8px 12px' }}>
                {(() => { const key = (mode === 'image-map') ? 'imageMap' : mode; return (review?.[key] ? 'Desactivar repaso' : 'Activar repaso'); })()}
              </button>
              <button onClick={onNew} style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', color: 'white', border: '1px solid #16a34a', borderRadius: 8, padding: '8px 12px' }}>Nuevo</button>
              <button onClick={onExport} style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', color: 'white', border: '1px solid #0ea5e9', borderRadius: 8, padding: '8px 12px' }}>Exportar resultados</button>
              <button onClick={() => importInputRef.current?.click()} style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: 'white', border: '1px solid #fb923c', borderRadius: 8, padding: '8px 12px' }}>Importar cuestionario</button>
              <input ref={importInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onImportQuiz(f); e.target.value = ''; }} />
              <button onClick={() => importQuizFolderRef.current?.click()} style={{ background: 'linear-gradient(135deg, #9333ea, #6366f1)', color: 'white', border: '1px solid #7c3aed', borderRadius: 8, padding: '8px 12px' }}>Importar carpeta de cuestionario</button>
              <input
                ref={importQuizFolderRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                webkitdirectory="true"
                directory="true"
                accept=".json,image/*"
                onChange={(e) => { const fl = e.target.files; if (fl && fl.length) onImportQuizFolder(fl); e.target.value = ''; }}
              />
              <button onClick={() => importFolderRef.current?.click()} style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)', color: 'white', border: '1px solid #0ea5e9', borderRadius: 8, padding: '8px 12px' }}>Importar carpeta de imágenes</button>
              <input
                ref={importFolderRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                // Atributos no estándar para permitir seleccionar carpetas en navegadores basados en Chromium
                webkitdirectory="true"
                directory="true"
                accept="image/*"
                onChange={(e) => { const fl = e.target.files; if (fl && fl.length) onImportImagesFolder(fl); e.target.value = ''; }}
              />
            </div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Navegar preguntas ({mode})</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {Array.from({ length: countForMode }).map((_, i) => {
                const isActive = i === index;
                let answered = false;
                if (mode === 'freeform') answered = !!(ffItems[i] && (state.answers.freeform[ffItems[i].id] || '').length);
                else if (mode === 'mcq') answered = !!(mcqItems[i] && Array.isArray(state.answers.mcq[mcqItems[i].id]) && state.answers.mcq[mcqItems[i].id].length);
                else if (mode === 'image-map') answered = !!(imItems[i] && (state.answers.imageMap[imItems[i].id] || ''));
                return (
                  <button key={i} onClick={() => setIndex(i)} style={{ padding: '8px 0', borderRadius: 8, border: '1px solid', borderColor: isActive ? '#646cff' : answered ? '#4cc38a' : '#3a3a3a', background: isActive ? 'rgba(100,108,255,.12)' : answered ? 'rgba(76,195,138,.10)' : '#111', color: 'inherit' }}>{i + 1}</button>
                );
              })}
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
            placeholder="Escribe tu respuesta."
            maxLength={ffItem.maxLength || 1000}
            rows={8}
            style={{ width: '100%', resize: 'vertical', padding: 12, borderRadius: 8, border: '1px solid #3a3a3a', background: '#111', color: '#eee' }}
          />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop: 8, fontSize: 12, opacity: .8 }}>
            {/* <span>{ffItem.required ? 'Requerido' : 'Opcional'}</span> */}
            <span>{(ansFF || '').length}/{ffItem.maxLength || 1000}</span>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop: 16, flexWrap:'wrap' }}>
            <button onClick={onPrev} disabled={atFirst}>Volver</button>
            {!atLast && (<button onClick={onNext}>Siguiente</button>)}
            {atLast && (<button onClick={onFinish} disabled={finished}>Finalizar</button>)}
          </div>
          {(finished || (review && review.freeform)) && (
            <div style={{ marginTop: 16, fontSize: 14, opacity: .9 }}>
              <div>Revisión manual sugerida.</div>
              <div style={{ marginTop: 8 }}>Palabras clave esperadas: {(ffItem.keywords || []).join(', ') || '-'}</div>
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
              const isReview = review?.mcq || review?.[mode === 'image-map' ? 'imageMap' : mode];
              if ((finished || isReview) && isCorrect) background = 'rgba(76,195,138,.12)';
              else if ((finished || isReview) && checked && !isCorrect) background = 'rgba(220,38,38,.12)';

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
                      {isCorrect ? '✔' : (checked && !isCorrect ? '✖' : null)}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {Array.isArray(mcqItem.correct) && (finished || (review?.mcq)) && (
            <div style={{ marginTop: 12, fontSize: 14 }}>Correcta(s): {mcqItem.correct.join(', ')}</div>
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
                {imVisibleChoices.map(ch => {
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
              {imItem.correct && (finished || review?.imageMap) && (
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
