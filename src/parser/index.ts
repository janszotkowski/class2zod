import { Known, ParseResult } from './core/types';
import { emitSchemas } from './core/emitter';
import { detectLanguage, looseNormalize, stripComments } from './core/utils';
import { extractJavaClasses, extractJavaEnums } from './java/extract';
import { extractKotlinClasses, extractKotlinEnums } from './kotlin/extract';

export function parseSourceToZod(source: string): ParseResult {
    const s0 = stripComments(source);
    const s = looseNormalize(s0);
    const lang = detectLanguage(s);

    const classes = lang === 'kotlin' ? extractKotlinClasses(s) : extractJavaClasses(s);
    const enums = lang === 'kotlin' ? extractKotlinEnums(s) : extractJavaEnums(s);

    const known: Known = {
        classes: new Set(classes.map(c => c.name)),
        enums: new Set(enums.map(e => e.name))
    };

    const {code, diagnostics} = emitSchemas(classes, known, enums);
    return {code, diagnostics};
}
