import { describe, it, expect } from 'vitest';
import { parseSourceToZod } from '@/parser';

const t = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Kotlin kolekce & pole', () => {
    it('MutableList<Int>', () => {
        const src = t(`data class B(val a: MutableList<Int>)`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`a: z.array(z.number().int())`);
    });

    it('MutableSet<String>', () => {
        const src = t(`data class B(val a: MutableSet<String>)`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`a: z.array(z.string())`);
    });

    it('MutableMap<String, Double>', () => {
        const src = t(`data class B(val m: MutableMap<String, Double>)`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`m: z.record(z.string(), z.number())`);
    });

    it('Array<String>', () => {
        const src = t(`data class B(val a: Array<String>)`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`a: z.array(z.string())`);
    });

    it('ByteArray', () => {
        const src = t(`data class B(val blob: ByteArray)`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`blob: z.array(z.number().int())`);
    });

    it('List<List<String>> nested', () => {
        const src = t(`data class B(val m: List<List<String>>)`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`m: z.array(z.array(z.string()))`);
    });

    it('Map<String, List<Int>>', () => {
        const src = t(`data class B(val mm: Map<String, List<Int>>)`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`mm: z.record(z.string(), z.array(z.number().int()))`);
    });

    it('Map<Int, String> → warn + unknown record', () => {
        const src = t(`data class B(val mm: Map<Int, String>)`);
        const {code, diagnostics} = parseSourceToZod(src);
        expect(code).toContain(`mm: z.record(z.string(), z.unknown())`);
        expect(diagnostics.some(d => /Map key 'Int'/.test(d.message))).toBe(true);
    });
});
