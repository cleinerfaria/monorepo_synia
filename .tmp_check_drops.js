const fs = require('fs');
const path = require('path');
const dir = 'packages/db-whitelabel/supabase/migrations';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

const createdPolicies = new Set();
const createdTriggers = new Set();
const createdViews = new Set();
const issues = [];

for (const f of files) {
  const txt = fs.readFileSync(path.join(dir, f), 'utf8');
  const lines = txt.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    let m;

    m = l.match(/^create\s+policy\s+"?([^"]+?)"?\s+on\s+([\w\.]+)/i);
    if (m) createdPolicies.add(`${m[1]}@@${m[2].toLowerCase()}`);

    m = l.match(/^create\s+trigger\s+([\w_]+)\s+/i);
    if (m) {
      const rest = [l, ...lines.slice(i + 1, i + 6)].join(' ');
      const mm = rest.match(/\son\s+([\w\.]+)/i);
      const table = mm ? mm[1].toLowerCase() : '?';
      createdTriggers.add(`${m[1]}@@${table}`);
    }

    m = l.match(/^create\s+(or\s+replace\s+)?view\s+([\w\.]+)/i);
    if (m) createdViews.add(m[2].toLowerCase());

    m = l.match(/^drop\s+policy\s+if\s+exists\s+"?([^"]+?)"?\s+on\s+([\w\.]+)/i);
    if (m) {
      const key = `${m[1]}@@${m[2].toLowerCase()}`;
      if (!createdPolicies.has(key)) {
        issues.push({ f, ln: i + 1, type: 'policy', key, line: l });
      }
    }

    m = l.match(/^drop\s+trigger\s+if\s+exists\s+([\w_]+)\s+on\s+([\w\.]+)/i);
    if (m) {
      const key = `${m[1]}@@${m[2].toLowerCase()}`;
      if (!createdTriggers.has(key)) {
        issues.push({ f, ln: i + 1, type: 'trigger', key, line: l });
      }
    }

    m = l.match(/^drop\s+view\s+if\s+exists\s+([\w\.]+)/i);
    if (m) {
      const key = m[1].toLowerCase();
      if (!createdViews.has(key)) {
        issues.push({ f, ln: i + 1, type: 'view', key, line: l });
      }
    }
  }
}

for (const x of issues) {
  console.log(`${x.f}:${x.ln} [${x.type}] ${x.key} :: ${x.line}`);
}
console.log(`TOTAL ${issues.length}`);
