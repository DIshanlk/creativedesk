export function formatId(doc: any): any {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map(formatId);

  const obj = doc.toJSON ? doc.toJSON() : { ...doc };
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  delete obj.__v;
  if (obj.password) delete obj.password;
  return obj;
}

export function formatPopulated(doc: any, field: string, alias?: string): any {
  const formatted = formatId(doc);
  const value = formatted[field];
  if (value && typeof value === 'object') {
    formatted[alias || field.replace(/Id$/, '')] = formatId(value);
  }
  return formatted;
}
