import { quizDataPath } from './paths';

const mustOk = async (res, name) => {
  if (!res.ok) throw new Error(`No se pudo cargar ${name}`);
  return res.json();
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
    fetch(quizDataPath(ffId, 'freeform')).then(r => mustOk(r, 'freeform.json')),
    fetch(quizDataPath(mcqId, 'mcq')).then(r => mustOk(r, 'mcq.json')),
    fetch(quizDataPath(imId, 'image-map')).then(r => mustOk(r, 'image-map.json')),
  ]);

  return { metadata, freeform, mcq, imageMap };
}
