import { quizDataPath } from './paths';

const mustOk = async (res, name) => {
  if (!res.ok) throw new Error(`No se pudo cargar ${name}`);
  return res.json();
};

// Carga JSON opcionalmente: si no existe o no es válido, devuelve null en lugar de lanzar.
const fetchJsonMaybe = async (url) => {
  const res = await fetch(url);
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
};

export async function loadQuiz(quizId = 'demo') {
  // Cargar primero metadata principal
  const metadata = await fetch(quizDataPath(quizId, 'metadata')).then(r => mustOk(r, 'metadata.json'));
  // Permitir definir fuentes por sección en metadata.sources
  const sources = metadata?.sources || {};
  const ffId = sources.freeform || quizId;
  const mcqId = sources.mcq || quizId;
  const imId = sources['image-map'] || sources.imageMap || quizId;

  const [freeform, mcq, imageMap] = await Promise.all([
    fetchJsonMaybe(quizDataPath(ffId, 'freeform')),
    fetchJsonMaybe(quizDataPath(mcqId, 'mcq')),
    fetchJsonMaybe(quizDataPath(imId, 'image-map')),
  ]);

  return { metadata, freeform: freeform || null, mcq: mcq || null, imageMap: imageMap || null };
}
