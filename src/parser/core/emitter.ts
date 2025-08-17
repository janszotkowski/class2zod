import { Ann, Clazz, Diagnostic } from './types';
import { isNum, javaRegexToJsLiteral, quoteKey } from './utils';
import { mapType } from './typeMapping';

export function emitSchemas(models: Clazz[], known: Set<string>): { code: string; diagnostics: Diagnostic[]; } {
    const diagnostics: Diagnostic[] = [];
    const lines: string[] = [];
    lines.push('import { z } from \'zod\'', '');

    for (const m of models) {
        lines.push(`// ${m.name}`);

        const objectLines: string[] = [];
        for (const f of m.fields) {
            const mapped = mapType(f.type, known);
            mapped.diagnostics.forEach(d => diagnostics.push({...d, where: {class: m.name, field: f.name}}));

            let expr = mapped.expr;
            expr = applyAnnotations(expr, f.ann);

            const alreadyOptional = /\.optional\(\)/.test(expr);
            const shouldBeOptional = !!f.optional || !!f.ann.nullable;
            if (shouldBeOptional && !alreadyOptional) {
                expr = `${expr}.optional()`;
            }

            expr = expr.replace(/(\.optional\(\))+/, '.optional()');

            objectLines.push(`  ${quoteKey(f.emitName)}: ${expr}`);
        }

        lines.push(`export const ${m.name}Schema = z.object({`);
        lines.push(objectLines.join(',\n'));
        lines.push('})');
        lines.push(`export type ${m.name} = z.infer<typeof ${m.name}Schema>`, '');
    }

    return {code: lines.join('\n'), diagnostics};
}

function applyAnnotations(expr: string, a: Ann): string {
    if (a.pattern && expr.startsWith('z.string()')) {
        expr = `${expr}.regex(${javaRegexToJsLiteral(a.pattern)})`;
    }
    if (a.size && (expr.startsWith('z.string()') || expr.startsWith('z.array('))) {
        if (isNum(a.size.min)) expr = `${expr}.min(${a.size.min})`;
        if (isNum(a.size.max)) expr = `${expr}.max(${a.size.max})`;
    }
    if (isNum(a.min) && expr.startsWith('z.number()')) {
        expr = `${expr}.min(${a.min})`;
    }
    if (isNum(a.max) && expr.startsWith('z.number()')) {
        expr = `${expr}.max(${a.max})`;
    }
    return expr;
}
