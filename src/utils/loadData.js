import { quizDataPath } from './paths';

const mustOk = async (res, name) => {
  if (!res.ok) throw new Error(`No se pudo cargar ${name}`);
  return res.json();
};

export async function loadQuiz(quizId = 'demo') {
  const [metadata, freeform, mcq, imageMap] = await Promise.all([
    fetch(quizDataPath(quizId, 'metadata')).then(r => mustOk(r, 'metadata.json')),
    fetch(quizDataPath(quizId, 'freeform')).then(r => mustOk(r, 'freeform.json')),
    fetch(quizDataPath(quizId, 'mcq')).then(r => mustOk(r, 'mcq.json')),
    fetch(quizDataPath(quizId, 'image-map')).then(r => mustOk(r, 'image-map.json')),
  ]);
  return { metadata, freeform, mcq, imageMap };
}
