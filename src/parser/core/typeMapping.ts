import { Diagnostic, Known } from './types';
import { splitTopLevel } from './utils';

export function mapType(typeText: string, known: Known): { expr: string; diagnostics: Diagnostic[]; } {
    const diagnostics: Diagnostic[] = [];
    let t = typeText.trim().replace(/\s+/g, ' ');
    t = t.replace(/^final\s+/, '');

    // Kotlin Array<T> → T[]
    const ktArray = /^Array\s*<([\s\S]+)>$/.exec(t);
    if (ktArray) {
        t = `${ktArray[1].trim()}[]`;
    }

    // Kotlin MutableList/Set/Map
    t = t.replace(/^MutableList</, 'List<').replace(/^MutableSet</, 'Set<').replace(/^MutableMap</, 'Map<');

    // Optional<T>
    const opt = /^Optional\s*<([\s\S]+)>$/.exec(t);
    if (opt) {
        t = opt[1].trim(); // optionalitu řeší emitter
    }

    let arrayDepth = 0;
    while (/\[\s*\]$/.test(t)) {
        arrayDepth++;
        t = t.replace(/\[\s*\]$/, '').trim();
    }

    function baseToZod(name: string): { expr: string; ref?: string; } {
        const simple = name.replace(/^([A-Za-z_$][\w$]*\.)+/, '');

        // ⬇️ ENUM: pokud je to známý enum, použij přímo <Enum>Schema
        if (known.enums.has(simple)) {
            return {expr: `${simple}Schema`}; // enum schema je konečný, není potřeba lazy
        }

        switch (simple) {
            case 'String':
                return {expr: 'z.string()'};
            case 'byte':
            case 'Byte':
            case 'short':
            case 'Short':
            case 'int':
            case 'Int':
            case 'Integer':
                return {expr: 'z.number().int()'};
            case 'long':
            case 'Long':
            case 'float':
            case 'Float':
            case 'double':
            case 'Double':
                return {expr: 'z.number()'};
            case 'boolean':
            case 'Boolean':
                return {expr: 'z.boolean()'};
            case 'char':
            case 'Character':
            case 'Char':
                return {expr: 'z.string().length(1)'};
            case 'ByteArray':
                return {expr: 'z.array(z.number().int())'};
        }

        if (
            name === 'java.util.Date' ||
            /^java\.time\./.test(name) ||
            ['Instant', 'LocalDate', 'LocalTime', 'LocalDateTime', 'OffsetDateTime', 'ZonedDateTime'].includes(name)
        ) {
            return {expr: 'z.string()'};
        }

        // ⬇️ třída známá z inputu → lazy
        if (known.classes.has(simple)) {
            return {expr: `z.lazy(() => ${simple}Schema)`, ref: simple};
        }

        diagnostics.push({level: 'warn', message: `Unknown type '${name}' → z.unknown()`});
        return {expr: 'z.unknown()'};
    }

    function parseGenericList(s: string): string | null {
        const list = /^(?:List|java\.util\.List)\s*<([\s\S]+)>\s*$/.exec(s);
        return list ? list[1].trim() : null;
    }

    function parseGenericSet(s: string): string | null {
        const set = /^(?:Set|java\.util\.Set)\s*<([\s\S]+)>\s*$/.exec(s);
        return set ? set[1].trim() : null;
    }

    function parseGenericMap(s: string): [string, string] | null {
        const m = /^(?:Map|java\.util\.Map)\s*<([\s\S]+)>\s*$/.exec(s);
        if (!m) {
            return null;
        }
        const parts = splitTopLevel(m[1], ',').map(x => x.trim());
        if (parts.length !== 2) {
            return null;
        }
        return [parts[0], parts[1]];
    }

    let expr: string;
    const listOf = parseGenericList(t);
    const setOf = parseGenericSet(t);
    const mapOf = parseGenericMap(t);

    if (listOf) {
        const inner = mapType(listOf, known);
        diagnostics.push(...inner.diagnostics);
        expr = `z.array(${inner.expr})`;
    } else if (setOf) {
        const inner = mapType(setOf, known);
        diagnostics.push(...inner.diagnostics);
        expr = `z.array(${inner.expr})`;
    } else if (mapOf) {
        const key = mapType(mapOf[0], known);
        const val = mapType(mapOf[1], known);
        diagnostics.push(...key.diagnostics, ...val.diagnostics);
        const stringKey = key.expr.startsWith('z.string()') || /^[A-Za-z_]\w*Schema$/.test(key.expr); // enum schema jako key? → z.enum je string-based
        expr = stringKey ? `z.record(z.string(), ${val.expr})` : 'z.record(z.string(), z.unknown())';
        if (!stringKey) diagnostics.push({
            level: 'warn',
            message: `Map key '${mapOf[0]}' not supported → string keys used`,
        });
    } else {
        const base = baseToZod(t);
        expr = base.expr;
    }

    for (let i = 0; i < arrayDepth; i++) {
        expr = `z.array(${expr})`;
    }

    return {expr, diagnostics};
}
