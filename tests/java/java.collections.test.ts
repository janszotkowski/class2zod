import { describe, it, expect } from 'vitest';
import { parseSourceToZod } from '@/parser';

const t = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Java kolekce & pole', () => {
    it('List<String>', () => {
        const src = t(`import java.util.*; public class C{ public List<String> tags; }`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`tags: z.array(z.string())`);
    });

    it('Set<Integer>', () => {
        const src = t(`import java.util.*; public class C{ public Set<Integer> codes; }`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`codes: z.array(z.number().int())`);
    });

    it('Map<String, Double>', () => {
        const src = t(`import java.util.*; public class C{ public Map<String, Double> prices; }`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`prices: z.record(z.string(), z.number())`);
    });

    it('Map<Integer, String> → warn + unknown record', () => {
        const src = t(`import java.util.*; public class C{ public Map<Integer, String> m; }`);
        const {code, diagnostics} = parseSourceToZod(src);
        expect(code).toContain(`m: z.record(z.string(), z.unknown())`);
        expect(diagnostics.some(d => /Map key 'Integer'/.test(d.message))).toBe(true);
    });

    it('nested Map<String, Map<String, Integer>>', () => {
        const src = t(`import java.util.*; public class C{ public Map<String, Map<String, Integer>> mm; }`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`mm: z.record(z.string(), z.record(z.string(), z.number().int()))`);
    });

    it('vícerozměrná pole', () => {
        const src = t(`public class C{ public String names[][]; public int a[]; }`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`names: z.array(z.array(z.string()))`);
        expect(code).toContain(`a: z.array(z.number().int())`);
    });
});
