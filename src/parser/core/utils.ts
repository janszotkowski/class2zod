export function detectLanguage(s: string): 'java' | 'kotlin' {
    const t = s;
    if (/\benum\s+class\b/.test(t)) {
        return 'kotlin';
    }
    if (/\bdata\s+class\b/.test(t)) {
        return 'kotlin';
    }
    if (/\b(val|var)\s+\w+\s*:/.test(t)) {
        return 'kotlin';
    }
    return 'java';
}

export function stripComments(s: string): string {
    return s.replace(/\/\/[^\n]*\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');
}

export function looseNormalize(javaOrKt: string): string {
    // doplnění středníků za importy, pokud chybí — tolerantní na testy
    return javaOrKt.replace(/^(import\s+[^;]+)$/gm, '$1;');
}

export function splitTopLevel(s: string, sep: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let str = false;
    let q = '';
    let cur = '';

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if ((ch === '"' || ch === '\'') && s[i - 1] !== '\\') {
            if (!str) {
                str = true;
                q = ch;
            } else if (q === ch) {
                str = false;
                q = '';
            }
        } else if (!str) {
            if ('<([{'.includes(ch)) {
                depth++;
            } else if ('>)]}'.includes(ch)) {
                depth = Math.max(0, depth - 1);
            } else if (ch === sep && depth === 0) {
                out.push(cur);
                cur = '';
                continue;
            }
        }
        cur += ch;
    }
    if (cur) {
        out.push(cur);
    }
    return out;
}

export function quoteKey(k: string): string {
    return /^[A-Za-z_]\w*$/.test(k) ? k : `'${k.replace(/'/g, '\\\'')}'`;
}

export function javaRegexToJsLiteral(pattern: string): string {
    return `/${pattern.replace(/\//g, '\\/')}/`;
}

export const isNum = (x: unknown): x is number => typeof x === 'number' && !Number.isNaN(x);

export function readBalanced(
    s: string,
    start: number,
    open: string = '(',
    close: string = ')',
): { content: string; end: number; } | null {
    if (s[start] !== open) {
        return null;
    }

    let depth = 1;
    let i = start + 1;
    const begin = i;

    while (i < s.length) {
        const ch = s[i];
        if (ch === open) depth++;
        else if (ch === close) {
            depth--;
            if (depth === 0) {
                return {content: s.slice(begin, i), end: i};
            }
        }
        i++;
    }
    return null;
}

export function topLevelSemicolon(s: string): number {
    let depthParen = 0;
    let depthBrace = 0;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '(') {
            depthParen++;
        } else if (ch === ')') {
            depthParen = Math.max(0, depthParen - 1);
        } else if (ch === '{') {
            depthBrace++;
        } else if (ch === '}') {
            depthBrace = Math.max(0, depthBrace - 1);
        } else if (ch === ';' && depthParen === 0 && depthBrace === 0) {
            return i;
        }
    }
    return -1;
}