import { describe, it, expect } from 'vitest';
import { parseSourceToZod } from '@/parser';

const t = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Diagnostics – očekávaná varování', () => {
    it('Unknown typ v poli', () => {
        const src = t(`public class X { public FooBar baz; }`);
        const {code, diagnostics} = parseSourceToZod(src);
        expect(code).toContain(`baz: z.unknown()`);
        expect(diagnostics.some(d => /Unknown type 'FooBar'/.test(d.message))).toBe(true);
    });

    it('Unknown typ uvnitř List', () => {
        const src = t(`import java.util.*; public class X { public List<Foo> xs; }`);
        const {code, diagnostics} = parseSourceToZod(src);
        expect(code).toContain(`xs: z.array(z.unknown())`);
        expect(diagnostics.some(d => /Unknown type 'Foo'/.test(d.message))).toBe(true);
    });

    it('Map s ne-string klíčem (Java)', () => {
        const src = t(`import java.util.*; public class X { public Map<Integer, String> m; }`);
        const {code, diagnostics} = parseSourceToZod(src);
        expect(code).toContain(`m: z.record(z.string(), z.unknown())`);
        expect(diagnostics.some(d => /Map key 'Integer'/.test(d.message))).toBe(true);
    });

    it('Map s ne-string klíčem (Kotlin)', () => {
        const src = t(`data class X(val m: Map<Int, String>)`);
        const {code, diagnostics} = parseSourceToZod(src);
        expect(code).toContain(`m: z.record(z.string(), z.unknown())`);
        expect(diagnostics.some(d => /Map key 'Int'/.test(d.message))).toBe(true);
    });

    it('Nested unknown uvnitř pole polí', () => {
        const src = t(`import java.util.*; public class X { public List<List<Foo>> mm; }`);
        const {code, diagnostics} = parseSourceToZod(src);
        expect(code).toContain(`mm: z.array(z.array(z.unknown()))`);
        expect(diagnostics.some(d => /Unknown type 'Foo'/.test(d.message))).toBe(true);
    });
});
