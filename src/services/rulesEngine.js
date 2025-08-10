// Lightweight Rules Engine for legal drafting

function parseFrontmatter(markdownText) {
  if (!markdownText) return { data: {}, content: '' };
  const fmStart = markdownText.indexOf('---');
  if (fmStart !== 0) return { data: {}, content: markdownText };
  const fmEnd = markdownText.indexOf('\n---', 3);
  if (fmEnd === -1) return { data: {}, content: markdownText };
  const fmBlock = markdownText.substring(3, fmEnd).trim();
  const rest = markdownText.substring(fmEnd + 4).trim();
  const data = {};
  const lines = fmBlock.split(/\r?\n/);
  let currentKey = null;
  let currentArray = null;
  for (const line of lines) {
    const keyMatch = line.match(/^([A-Za-z0-9_\-]+):\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1];
      let value = keyMatch[2];
      if (value === '') {
        // possibly a block or array starts next lines
        currentKey = key;
        currentArray = [];
        data[currentKey] = currentArray;
        continue;
      }
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (/^\[.*\]$/.test(value)) {
        try { value = JSON.parse(value); } catch (_) {}
      }
      data[key] = value;
      currentKey = null;
      currentArray = null;
    } else if (/^\-\s+/.test(line) && currentArray) {
      currentArray.push(line.replace(/^\-\s+/, ''));
    }
  }
  return { data, content: rest };
}

function normalizeArray(val) {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
}

function isGlobalRule(rule) {
  if (rule.alwaysApply === true) return true;
  const hasScope = (rule.globs && rule.globs.length > 0) || (rule.regex && rule.regex.length > 0);
  if (!hasScope && rule.alwaysApply !== false) return true;
  return false;
}

function globToRegex(pattern) {
  // simple glob -> regex converter supporting ** and * and ? and negative ! at caller level
  let escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp('^' + escaped + '$');
}

function matchesGlobs(filePath, globs) {
  const list = normalizeArray(globs).filter(Boolean);
  if (list.length === 0) return false;
  let matched = false;
  for (const pat of list) {
    if (pat.startsWith('!')) {
      const rx = globToRegex(pat.slice(1));
      if (rx.test(filePath)) return false; // excluded
      continue;
    }
    const rx = globToRegex(pat);
    if (rx.test(filePath)) matched = true;
  }
  return matched;
}

function contentMatchesRegex(content, regex) {
  const list = normalizeArray(regex).filter(Boolean);
  if (list.length === 0) return false;
  for (const r of list) {
    try {
      const re = new RegExp(r, 'i');
      if (re.test(content || '')) return true;
    } catch (_) {
      // ignore invalid regex
    }
  }
  return false;
}

function appliesByScope(rule, filePaths, fileContents) {
  const paths = Array.isArray(filePaths) ? filePaths : [];
  if (!paths.length) return false;
  const hasGlobs = rule.globs && rule.globs.length > 0;
  const hasRegex = rule.regex && rule.regex.length > 0;
  if (!hasGlobs && !hasRegex) return false;
  let anyPathMatch = false;
  for (const p of paths) {
    if (hasGlobs && matchesGlobs(p, rule.globs)) {
      anyPathMatch = true;
      if (!hasRegex) return true;
      const content = fileContents[p] || '';
      if (contentMatchesRegex(content, rule.regex)) return true;
    }
  }
  return false;
}

function shouldApplyRule(rule, filePaths, rulePolicies, fileContents) {
  const policies = rulePolicies || {};
  const policy = policies[rule.name];
  if (policy === 'off') return false;
  if (isGlobalRule(rule)) return true;
  return appliesByScope(rule, filePaths, fileContents);
}

async function loadRules() {
  try {
    const ws = (await window.electronAPI?.store?.get('currentWorkspace')) || null;
    const basePath = ws?.path || null;
    if (!basePath || !window.electronAPI?.rules?.listRuleFiles) return [];
    const files = await window.electronAPI.rules.listRuleFiles(basePath);
    const rules = [];
    for (const f of files) {
      try {
        const text = await window.electronAPI.fs.readFileText(f);
        const { data, content } = parseFrontmatter(text);
        const rule = {
          name: data.name || f.split('/').pop(),
          description: data.description || '',
          globs: normalizeArray(data.globs),
          regex: normalizeArray(data.regex),
          alwaysApply: data.alwaysApply === true,
          rule: content || '',
          ruleFile: f,
        };
        rules.push(rule);
      } catch (_) {}
    }
    return rules;
  } catch (_) {
    return [];
  }
}

function extractPathsFromMessage(userMessage) {
  // very simple: capture @filename tokens
  const res = [];
  const regex = /@([^\s]+)/g;
  let m;
  while ((m = regex.exec(userMessage || '')) !== null) {
    res.push(m[1]);
  }
  return res;
}

function getApplicableRules(userMessage, contextItems, rules, rulePolicies) {
  const filePaths = [];
  const fileContents = {};
  const ctx = Array.isArray(contextItems) ? contextItems : [];
  for (const it of ctx) {
    if (it && it.path) filePaths.push(it.path);
    else if (it && it.name) filePaths.push(it.name);
    if (it && it.path && typeof it.content === 'string') fileContents[it.path] = it.content;
  }
  const fromMsg = extractPathsFromMessage(userMessage);
  filePaths.push(...fromMsg);

  // also allow regex on user message content
  if (!fileContents['__USER__']) fileContents['__USER__'] = String(userMessage || '');

  const applied = [];
  for (const rule of rules) {
    if (shouldApplyRule(rule, filePaths, rulePolicies, fileContents)) {
      applied.push(rule);
    }
  }
  return applied;
}

function buildSystemMessage(baseSystemMessage, appliedRules, rulePolicies) {
  const parts = [baseSystemMessage || ''];
  for (const r of appliedRules || []) {
    const pol = (rulePolicies || {})[r.name];
    parts.push(r.rule);
    if (pol === 'strict') {
      parts.push(`(Bu kural strict: İhlal edilirse yanıtı reddet ve kullanıcıdan düzeltme iste.)`);
    }
  }
  return parts.filter(Boolean).join('\n\n');
}

export default {
  loadRules,
  isGlobalRule,
  matchesGlobs,
  contentMatchesRegex,
  shouldApplyRule,
  getApplicableRules,
  buildSystemMessage,
};


