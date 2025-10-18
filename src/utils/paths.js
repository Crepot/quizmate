// Base públicas (Vite sirve /public en la raíz)
export const DATA_BASE = '/data';
export const IMAGES_BASE = '/images';

/** Ruta a JSON de un quiz: metadata|freeform|mcq|image-map */
export const quizDataPath = (quizId, file) => `${DATA_BASE}/${quizId}/${file}.json`;

/** Ruta a una imagen dentro del quiz */
export const imagePath = (quizId, filename) => `${IMAGES_BASE}/${quizId}/${filename}`;
