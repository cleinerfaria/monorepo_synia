const fs = require('fs');
const path = require('path');
const dir = 'packages/db-whitelabel/supabase/migrations';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

const events = [];
for (const f of files) {
  const full = path.join(dir, f);
  const txt = fs.readFileSync(full, 'utf8');

  const add = (type, name, target, idx) => events.push({f, idx, type, name, target: target.toLowerCase()});

  for (const m of txt.matchAll(/create\s+policy\s+"?([^"]+?)"?\s+on\s+([\w\.]+)/gim)) {
    add('create_policy', m[1], m[2], m.index ?? 0);
  }
  for (const m of txt.matchAll(/drop\s+policy\s+if\s+exists\s+"?([^"]+?)"?\s+on\s+([\w\.]+)/gim)) {
    add('drop_policy_if_exists', m[1], m[2], m.index ?? 0);
  }

  for (const m of txt.matchAll(/create\s+trigger\s+([\w_]+)[\s\S]{0,260}?\son\s+([\w\.]+)/gim)) {
    add('create_trigger', m[1], m[2], m.index ?? 0);
  }
  for (const m of txt.matchAll(/drop\s+trigger\s+if\s+exists\s+([\w_]+)\s+on\s+([\w\.]+)/gim)) {
    add('drop_trigger_if_exists', m[1], m[2], m.index ?? 0);
  }

  for (const m of txt.matchAll(/create\s+(?:or\s+replace\s+)?view\s+([\w\.]+)/gim)) {
    add('create_view', m[1], m[1], m.index ?? 0);
  }
  for (const m of txt.matchAll(/drop\s+view\s+if\s+exists\s+([\w\.]+)/gim)) {
    add('drop_view_if_exists', m[1], m[1], m.index ?? 0);
  }
}

const fileOrder = new Map(files.map((f,i)=>[f,i]));
events.sort((a,b)=> fileOrder.get(a.f)-fileOrder.get(b.f) || a.idx-b.idx);

const seen = new Set();
const unresolved = [];
for (const e of events) {
  const key = `${e.name}@@${e.target}`.toLowerCase();
  if (e.type.startsWith('create_')) {
    seen.add(`${e.type.replace('create_','')}@@${key}`);
  }
  if (e.type==='drop_policy_if_exists') {
    if (!seen.has(`policy@@${key}`)) unresolved.push(e);
  }
  if (e.type==='drop_trigger_if_exists') {
    if (!seen.has(`trigger@@${key}`)) unresolved.push(e);
  }
  if (e.type==='drop_view_if_exists') {
    if (!seen.has(`view@@${key}`)) unresolved.push(e);
  }
}

for (const u of unresolved) console.log(`${u.f} :: ${u.type} ${u.name} on ${u.target}`);
console.log('TOTAL_UNRESOLVED', unresolved.length);
