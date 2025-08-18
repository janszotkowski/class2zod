import { describe, it, expect } from 'vitest';
import { parseSourceToZod } from '@/parser';

const t = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Java numbers + hranice', () => {
    it('int → number().int()', () => {
        const src = t(`public class N { public int a; }`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`a: z.number().int()`);
    });

    it('Integer → number().int()', () => {
        const src = t(`public class N { public Integer a; }`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`a: z.number().int()`);
    });

    it('long → number()', () => {
        const src = t(`public class N { public long a; }`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`a: z.number()`);
    });

    it('double → number()', () => {
        const src = t(`public class N { public double a; }`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`a: z.number()`);
    });

    it('@Min/@Max na Integer', () => {
        const src = t(`
      import jakarta.validation.constraints.*;
      public class N { @Min(1) @Max(9) public Integer a; }
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`a: z.number().int().min(1).max(9)`);
    });

    it('@Positive', () => {
        const src = t(`import jakarta.validation.constraints.*; public class N{ @Positive public int a; }`);
        const {code} = parseSourceToZod(src);
        expect(code).toMatch(/a:\s*z\.number\(\)\.int\(\)\.positive\(\)/);
    });

    it('@Negative', () => {
        const src = t(`import jakarta.validation.constraints.*; public class N{ @Negative public int a; }`);
        const {code} = parseSourceToZod(src);
        expect(code).toMatch(/a:\s*z\.number\(\)\.int\(\)\.negative\(\)/);
    });

    it('DecimalMin(inclusive=false)', () => {
        const src = t(`
      import jakarta.validation.constraints.*;
      public class N{ @DecimalMin(value="1.5", inclusive=false) public double price; }
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toMatch(/price:\s*z\.number\(\)\.min\(1\.5, \{ inclusive: false \}\)/);
    });

    it('DecimalMax(inclusive=true)', () => {
        const src = t(`
      import jakarta.validation.constraints.*;
      public class N{ @DecimalMax(value="10.0", inclusive=true) public double price; }
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toMatch(/price:\s*z\.number\(\)\.max\(10\.0\)/);
    });

    it('kombinace DecimalMin/Max', () => {
        const src = t(`
      import jakarta.validation.constraints.*;
      public class N{
        @DecimalMin(value="0.01", inclusive=true)
        @DecimalMax(value="99.9", inclusive=false)
        public double price;
      }
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toMatch(/price:\s*z\.number\(\)\.min\(0\.01\)\.max\(99\.9, \{ inclusive: false \}\)/);
    });
});
