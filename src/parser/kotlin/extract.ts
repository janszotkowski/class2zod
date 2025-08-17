import { Clazz, EnumDef, Field } from '../core/types';
import { parseAnnotationsKotlin } from '../core/annotations';
import { readBalanced, splitTopLevel, topLevelSemicolon } from '../core/utils';

export function extractKotlinClasses(src: string): Clazz[] {
    const classes: Clazz[] = [];
    const seenNames = new Set<string>(); // <- NEW

    // --- data class Name(...)
    const reData = /data\s+class\s+([A-Za-z_]\w*)\s*\(/g;
    let m: RegExpExecArray | null;

    while ((m = reData.exec(src))) {
        const name = m[1];
        const parenStart = src.indexOf('(', m.index);
        const par = readBalanced(src, parenStart, '(', ')');

        if (!par) {
            continue;
        }

        const params = par.content;
        const fields: Field[] = parseKotlinParams(params);

        const body = readBodyAfter(src, par.end + 1);
        if (body) {
            fields.push(...parseKotlinBodyProps(body));
        }

        classes.push({name, fields});
        seenNames.add(name); // <- NEW
    }

    // --- class Name(...) { ... } (ne-data class)
    const reClass = /(^|\s)class\s+([A-Za-z_]\w*)/g;
    while ((m = reClass.exec(src))) {
        const name = m[2];
        if (seenNames.has(name)) {
            continue; // <- NEW: vynech, už je to data class
        }

        let idx = m.index + m[0].length;
        while (/\s/.test(src[idx] || '')) idx++;

        const fields: Field[] = [];

        if (src[idx] === '(') {
            const par = readBalanced(src, idx, '(', ')');
            if (par) {
                fields.push(...parseKotlinParams(par.content));
                idx = par.end + 1;
            }
        }

        const body = readBodyAfter(src, idx);
        if (body) fields.push(...parseKotlinBodyProps(body));

        classes.push({name, fields});
    }

    return coalesceByName(classes);
}

export function extractKotlinEnums(src: string): EnumDef[] {
    const enums: EnumDef[] = [];
    const re = /enum\s+class\s+([A-Za-z_]\w*)\s*\{/g;
    let m: RegExpExecArray | null;

    while ((m = re.exec(src))) {
        const name = m[1];
        const bracePos = src.indexOf('{', m.index);
        const blk = readBalanced(src, bracePos, '{', '}');
        if (!blk) {
            continue;
        }

        let body = blk.content;
        // část před případným ';' (po něm mohou být metody/vlastnosti)
        const semi = topLevelSemicolon(body);
        if (semi >= 0) {
            body = body.slice(0, semi);
        }

        const parts = splitTopLevel(body, ',');
        const values: string[] = [];
        for (const raw of parts) {
            const seg = raw.trim();
            if (!seg) {
                continue;
            }
            const mm = /^([A-Za-z_]\w*)/.exec(seg);
            if (mm) {
                values.push(mm[1]);
            }
        }
        if (values.length) {
            enums.push({name, values});
        }
    }
    return enums;
}

function readBodyAfter(src: string, start: number): string | null {
    // najdi další '{' od pozice start a načti vyvážený blok
    const brace = src.indexOf('{', start);
    if (brace < 0) {
        return null;
    }
    const blk = readBalanced(src, brace, '{', '}');
    return blk ? blk.content : null;
}

/** robustní parser parametrů z "val/var" konstruktoru (oddělené top-level čárkou) */
function parseKotlinParams(params: string): Field[] {
    const out: Field[] = [];

    for (const raw of splitTopLevel(params, ',')) {
        let p = raw.trim();
        if (!p) {
            continue;
        }

        // seber leading anotace (@Json(name="x") @field:Size(...))
        const annLead = /^(\s*(?:@\w+(?::\w+)?(?:\([^)]*\))?\s*)*)/.exec(p);
        const annRaw = annLead ? annLead[1] : '';
        p = p.slice(annRaw.length).trim();

        // očekáváme: val|var name : Type (= default)?
        const m = /^(?:val|var)\s+([A-Za-z_]\w*)\s*:\s*([\s\S]+?)\s*(?:=\s*[\s\S]+)?$/.exec(p);
        if (!m) {
            continue;
        }

        const name = m[1];
        let type = m[2].trim();

        const ann = parseAnnotationsKotlin(annRaw);

        // optionalita přes ?
        const optional = /\?$/.test(type) || !!ann.nullable;
        type = type.replace(/\?$/, '');

        out.push({
            name,
            emitName: ann.jsonProperty || name,
            type,
            optional,
            ann
        });
    }
    return out;
}

function parseKotlinBodyProps(body: string): Field[] {
    const out: Field[] = [];
    const propRe = /((?:@\w+(?::\w+)?(?:\([^)]*\))?\s*)*)(?:public|private|protected)?\s*(?:override\s+)?(?:lateinit\s+)?(?:val|var)\s+([A-Za-z_]\w*)\s*:\s*([^=\n]+)(?:=.*)?/g;
    let m: RegExpExecArray | null;

    while ((m = propRe.exec(body))) {
        const ann = parseAnnotationsKotlin(m[1] || '');
        const name = m[2];
        const rawType = (m[3] || '').trim();
        const optional = /\?$/.test(rawType) || !!ann.nullable;
        const type = rawType.replace(/\?$/, '');

        out.push({
            name,
            emitName: ann.jsonProperty || name,
            type,
            optional,
            ann
        });
    }
    return out;
}

function coalesceByName(items: Clazz[]): Clazz[] {
    const map = new Map<string, Clazz>();

    for (const c of items) {
        if (!map.has(c.name)) {
            map.set(c.name, {name: c.name, fields: []});
        }
        const target = map.get(c.name)!;
        const seen = new Set<string>(target.fields.map(f => (f.emitName || f.name)));

        for (const f of c.fields) {
            const key = f.emitName || f.name;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            target.fields.push(f);
        }
    }

    return [...map.values()];
}

