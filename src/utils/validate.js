const isStr = (v) => typeof v === 'string' && v.length > 0;
const isArr = Array.isArray;

export function validateMetadata(o){
  if (!o || typeof o !== 'object') return { ok:false, message:'metadata inválida' };
  if (!isStr(o.id) || !isStr(o.title)) return { ok:false, message:'id/title inválidos' };
  if (!isArr(o.sections)) return { ok:false, message:'sections debe ser array' };
  const okSections = new Set(['freeform','mcq','image-map']);
  for (const s of o.sections) if (!okSections.has(s)) return { ok:false, message:`Sección inválida: ${s}` };
  return { ok:true };
}

export function validateFreeform(o){
  if (!o || !isArr(o.items)) return { ok:false, message:'freeform.items debe ser array' };
  for (const it of o.items) {
    if (!isStr(it.id) || !isStr(it.prompt)) return { ok:false, message:'freeform item inválido' };
  }
  return { ok:true };
}

export function validateMcq(o){
  if (!o || !isArr(o.items)) return { ok:false, message:'mcq.items debe ser array' };
  const types = new Set(['single','multiple','truefalse']);
  for (const it of o.items){
    if (!types.has(it.type)) return { ok:false, message:`mcq tipo inválido (${it.id})` };
    if (!isArr(it.options) || it.options.length < 2) return { ok:false, message:`mcq opciones inválidas (${it.id})` };
    if (!isArr(it.correct) || it.correct.length === 0) return { ok:false, message:`mcq correct vacío (${it.id})` };
  }
  return { ok:true };
}

export function validateImageMap(o){
  if (!o || !isArr(o.items)) return { ok:false, message:'imageMap.items debe ser array' };
  for (const it of o.items){
    if (!isStr(it.image)) return { ok:false, message:`image faltante (${it.id})` };
    if (!isArr(it.choices) || it.choices.length < 2) return { ok:false, message:`choices inválidas (${it.id})` };
    if (!isStr(it.correct) || !it.choices.includes(it.correct)) return { ok:false, message:`correct inválido (${it.id})` };
  }
  return { ok:true };
}

export function validateAll(data){
  const a = validateMetadata(data.metadata); if (!a.ok) return a;
  const b = validateFreeform(data.freeform); if (!b.ok) return b;
  const c = validateMcq(data.mcq); if (!c.ok) return c;
  const d = validateImageMap(data.imageMap); if (!d.ok) return d;
  return { ok:true };
}
