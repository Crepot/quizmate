const isStr = (v) => typeof v === 'string' && v.length > 0;
const isArr = Array.isArray;
const isObj = (v) => v && typeof v === 'object' && !isArr(v);

export function validateMetadata(o){
  if (!o || typeof o !== 'object') return { ok:false, message:'metadata inválida' };
  if (!isStr(o.id) || !isStr(o.title)) return { ok:false, message:'id/title inválidos' };
  if (o.sections && !isArr(o.sections)) return { ok:false, message:'sections debe ser array' };
  if (isArr(o.sections)) {
    const okSections = new Set(['freeform','mcq','image-map','imageMap']);
    for (const s of o.sections) if (!okSections.has(s)) return { ok:false, message:`Sección inválida: ${s}` };
  }
  return { ok:true };
}

export function validateFreeform(o){
  if (!o || !isArr(o.items)) return { ok:false, message:'freeform.items debe ser array' };
  for (const it of o.items) {
    if (!isStr(it.id) || !(isStr(it.prompt) || isStr(it.question) || isStr(it.text))) return { ok:false, message:'freeform item inválido' };
  }
  return { ok:true };
}

export function validateMcq(o){
  if (!o || !isArr(o.items)) return { ok:false, message:'mcq.items debe ser array' };
  const types = new Set(['single','multiple','truefalse']);
  for (const it of o.items){
    // allow missing type by inferring from correct
    const type = it.type || (Array.isArray(it.correct) && it.correct.length > 1 ? 'multiple' : 'single');
    if (!types.has(type)) return { ok:false, message:`mcq tipo inválido (${it.id || '?'})` };
    if (!isArr(it.options) || it.options.length < 2) return { ok:false, message:`mcq opciones inválidas (${it.id || '?'})` };
    if (!isArr(it.correct) || it.correct.length === 0) return { ok:false, message:`mcq correct vacío (${it.id || '?'})` };
  }
  return { ok:true };
}

export function validateImageMap(o){
  if (!o || !isArr(o.items)) return { ok:false, message:'imageMap.items debe ser array' };
  for (const it of o.items){
    if (!isStr(it.image)) return { ok:false, message:`image faltante (${it.id || '?'})` };
    if (!isArr(it.choices) || it.choices.length < 2) return { ok:false, message:`choices inválidas (${it.id || '?'})` };
    if (!isStr(it.correct) || !it.choices.includes(it.correct)) return { ok:false, message:`correct inválido (${it.id || '?'})` };
  }
  return { ok:true };
}

export function validateAll(data){
  if (!data || typeof data !== 'object') return { ok:false, message: 'JSON inválido' };

  // If full quiz with metadata -> validate metadata and any present sections (lenient)
  if (data.metadata) {
    const a = validateMetadata(data.metadata); if (!a.ok) return a;
    if (data.freeform) {
      const b = validateFreeform(data.freeform); if (!b.ok) return b;
    }
    if (data.mcq) {
      const c = validateMcq(data.mcq); if (!c.ok) return c;
    }
    if (data.imageMap) {
      const d = validateImageMap(data.imageMap); if (!d.ok) return d;
    }
    if (data['image-map']) {
      const d = validateImageMap(data['image-map']); if (!d.ok) return d;
    }
    // it's okay if some sections are missing; metadata may describe available ones
    return { ok:true };
  }

  // If root object directly contains items (single-section file like mcq.json or freeform.json)
  if (isArr(data.items)) {
    // Try to detect by properties on first item
    const first = data.items[0] || {};
    if (first.options) {
      return validateMcq({ items: data.items });
    }
    if (first.image || first.choices) {
      return validateImageMap({ items: data.items });
    }
    // fallback to freeform
    return validateFreeform({ items: data.items });
  }

  // Accept objects that wrap the section: { mcq: { items: [...] } } or { freeform: {...} }
  if (data.freeform && isArr(data.freeform.items)) return validateFreeform(data.freeform);
  if (data.mcq && isArr(data.mcq.items)) return validateMcq(data.mcq);
  if ((data.imageMap && isArr(data.imageMap.items)) || (data['image-map'] && isArr(data['image-map'].items))) {
    return validateImageMap(data.imageMap || data['image-map']);
  }

  return { ok:false, message:'Formato desconocido' };
}
