import { ParseResult } from './core/types';
import { emitSchemas } from './core/emitter';
import { detectLanguage, looseNormalize, stripComments } from './core/utils';
import { extractJavaClasses } from './java/extract';
import { extractKotlinClasses } from './kotlin/extract';

export function parseSourceToZod(source: string): ParseResult {
    const s0 = stripComments(source);
    const s = looseNormalize(s0);
    const lang = detectLanguage(s);
    const classes = lang === 'kotlin' ? extractKotlinClasses(s) : extractJavaClasses(s);
    const known = new Set(classes.map(c => c.name));
    const {code, diagnostics} = emitSchemas(classes, known);
    return {code, diagnostics};
}
