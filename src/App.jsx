import React, { useEffect, useReducer, useState } from 'react';
import { loadQuiz, validateAll, loadProgress, saveProgress } from './utils';

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
      } catch (e) { setErr(e.message || String(e)); }
    })();
  }, [state.quizId]);

  useEffect(() => {
    const t = setTimeout(() => saveProgress(state.quizId, state.answers), 300);
    return () => clearTimeout(t);
  }, [state.quizId, state.answers]);

  if (err) return <div style={{padding:16,color:'#c33'}}>Error: {err}</div>;
  if (!data) return <div style={{padding:16,opacity:.7}}>Cargando…</div>;

  // Vista mínima para verificar datos
  return (
    <div style={{padding:16}}>
      <h1>{data.metadata.title}</h1>
      <p>Secciones: {data.metadata.sections.join(', ')}</p>
      <pre style={{background:'#111',color:'#9fd',padding:12,borderRadius:8}}>
        {JSON.stringify(data.freeform.items[0], null, 2)}
      </pre>
      <small style={{opacity:.7}}>Estado listo. Próximo paso: Tabs + páginas.</small>
    </div>
  );
}
