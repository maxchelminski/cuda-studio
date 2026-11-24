(() => {
  'use strict';

  const own = (object, key) => object != null && Object.prototype.hasOwnProperty.call(object, key);

  function body(value) {
    if (typeof value !== 'string') return '';
    const normalized = value.replace(/\r\n?|\u2028|\u2029/g, '\n').replace(/\u0000/g, '');
    if (!normalized.trim()) return '';
    // Keep indentation, nested lists, fenced code and Markdown hard breaks intact.
    return normalized.replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, '');
  }

  function singleLine(value) {
    return body(value).replace(/\s+/g, ' ').trim();
  }

  function heading(text) {
    return text.replace(/[\\`*_\[\]<>~#!|]/g, '\\$&');
  }

  function title(brief, values) {
    const authored = own(values, 'title') ? singleLine(values.title) : '';
    return authored || singleLine(brief?.title) || 'CUDA case study';
  }

  function markdown(brief, values) {
    const seen = new Set(['title', '__proto__', 'constructor', 'prototype']);
    const sections = [];
    let incomplete = !(own(values, 'title') && singleLine(values.title));
    for (const field of Array.isArray(brief?.fields) ? brief.fields : []) {
      const key = field?.key;
      const label = singleLine(field?.label);
      if (typeof key !== 'string' || !key || seen.has(key) || !label) continue;
      seen.add(key);
      const answer = own(values, key) ? body(values[key]) : '';
      if (!answer && field.required === false) continue;
      if (!answer) incomplete = true;
      sections.push(`## ${heading(label)}\n\n${answer || '_To write._'}`);
    }
    const blocks = [`# ${heading(title(brief, values))}`];
    if (incomplete) blocks.push('_Draft in progress._');
    return [...blocks, ...sections].join('\n\n') + '\n';
  }

  function filename(brief, values) {
    let stem = title(brief, values).normalize('NFKC').toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-').replace(/^-+|-+$/g, '');
    stem = Array.from(stem).slice(0, 80).join('').replace(/-+$/g, '') || 'case-study';
    if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(stem)) stem = `case-study-${stem}`;
    return `${stem}.md`;
  }

  window.PublicationExport = Object.freeze({ markdown, filename });
})();
