import { Clazz, EnumDef, Field } from '../core/types';
import { parseAnnotationsJava } from '../core/annotations';
import { readBalanced, splitTopLevel, topLevelSemicolon } from '../core/utils';

export function extractJavaClasses(src: string): Clazz[] {
    const classes: Clazz[] = [];
    const classRe = /(?:public\s+|protected\s+|private\s+)?class\s+([A-Za-z_]\w*)[\s\S]*?\{([\s\S]*?)\}/g;
    let m: RegExpExecArray | null;
    while ((m = classRe.exec(src))) {
        const name = m[1];
        const body = m[2];
        const fields = extractJavaFields(body);
        classes.push({name, fields});
    }
    return classes;
}

export function extractJavaEnums(src: string): EnumDef[] {
    const enums: EnumDef[] = [];
    const re = /(?:public\s+|protected\s+|private\s+)?enum\s+([A-Za-z_]\w*)\s*\{/g;
    let m: RegExpExecArray | null;

    while ((m = re.exec(src))) {
        const name = m[1];
        const bracePos = src.indexOf('{', m.index);
        const blk = readBalanced(src, bracePos, '{', '}');
        if (!blk) {
            continue;
        }

        // vezmeme jen část před případným ';' (po něm mohou být members)
        let body = blk.content;
        const semi = topLevelSemicolon(body);
        if (semi >= 0) {
            body = body.slice(0, semi);
        }

        const items = splitTopLevel(body, ',');
        const values: string[] = [];
        for (const raw of items) {
            const seg = raw.trim();
            if (!seg) {
                continue;
            }
            const mm = /^([A-Za-z_]\w*)/.exec(seg); // A(1), GREEN { ... }, BLUE → název
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

function extractJavaFields(body: string): Field[] {
    const fields: Field[] = [];

    // vezmeme statementy končící středníkem + případné anotace nad nimi
    const stmtRe = /((?:\s*@[\w.]+(?:\([^)]*\))?\s*)*)([\s\S]*?);/g;
    let m: RegExpExecArray | null;
    while ((m = stmtRe.exec(body))) {
        const annRaw = m[1] || '';
        let stmt = (m[2] || '').trim();
        if (!stmt) {
            continue;
        }

        // přeskoč vnořené typy/definice a metody
        if (/\b(class|interface|enum)\b/.test(stmt)) {
            continue;
        }
        if (/\b\w+\s*\(/.test(stmt)) {
            continue;
        } // metoda/ctor

        // sundej modifikátory
        stmt = stmt.replace(/\b(public|private|protected|static|final|transient|volatile)\b/g, '').trim();

        // rozpad na typ + deklarátory oddělené čárkou
        const parts = splitTopLevel(stmt, ',').map(s => s.trim()).filter(Boolean);
        if (parts.length === 0) {
            continue;
        }

        // typ je první část bez závěrečného názvu proměnné
        const typeToken = parts[0];
        const type = typeToken.replace(/\s*[A-Za-z_]\w*(?:\s*\[.*?\])?(?:\s*=.*)?$/, '').trim();

        const ann = parseAnnotationsJava(annRaw);

        for (const p of parts) {
            // VEM POSLEDNÍ IDENTIFIKÁTOR před volitelnými [] a případnou inicializací
            // např.: "stock", "names[][]", "b[] = new int[2]"
            const varMatch = /([A-Za-z_]\w*)\s*((?:\[\s*\]\s*)*)(?:=\s*[^,]+)?\s*$/.exec(p);
            if (!varMatch) {
                continue;
            }

            const name = varMatch[1];
            const arrSuffix = varMatch[2];
            const dims = (arrSuffix.match(/\[\s*\]/g) || []).length;

            // pole via suffix u konkrétní proměnné (int a, b[], c[][])
            let finalType = type;
            for (let i = 0; i < dims; i++) {
                finalType += '[]';
            }

            const optional = /Optional\s*<.+>/.test(type) || !!ann.nullable;

            fields.push({
                name,
                emitName: ann.jsonProperty || name,
                type: finalType,
                optional,
                ann,
            });
        }
    }
    return fields;
}
