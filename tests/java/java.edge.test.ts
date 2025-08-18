import { describe, it, expect } from 'vitest';
import { parseSourceToZod } from '@/parser';

const t = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Java – edge cases', () => {
    it('vícenásobné deklarace + pole se suffixem [] u proměnné', () => {
        const src = t(`
      public class Many {
        public int a, b[], c[][];
        public String[] s1, s2[];
      }
    `);
        const {code, diagnostics} = parseSourceToZod(src);
        expect(diagnostics).toEqual([]);
        expect(code).toContain('a: z.number().int()');
        expect(code).toContain('b: z.array(z.number().int())');
        expect(code).toContain('c: z.array(z.array(z.number().int()))');
        expect(code).toContain('s1: z.array(z.string())');
        expect(code).toContain('s2: z.array(z.array(z.string()))');
    });

    it('@JsonProperty s non-identifier klíčem → quoted', () => {
        const src = t(`
      import com.fasterxml.jackson.annotation.JsonProperty;
      public class U {
        @JsonProperty("full-name")
        public String fullName;
        @JsonProperty("2fa")
        public boolean twofa;
      }
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`'full-name': z.string()`);
        expect(code).toContain(`'2fa': z.boolean()`);
    });

    it('DecimalMin/Max (inclusive true/false) + Positive/Negative + Email/NotBlank', () => {
        const src = t(`
      import jakarta.validation.constraints.*;
      public class C {
        @Email public String email;
        @NotBlank public String code;
        @Positive public int qty;
        @Negative public int debt;
        @DecimalMin(value="1.5", inclusive=false)
        @DecimalMax(value="10.0", inclusive=true)
        public double price;
      }
    `);
        const {code, diagnostics} = parseSourceToZod(src);
        expect(diagnostics).toEqual([]);
        expect(code).toContain('email: z.string().email()');
        expect(code).toContain('code: z.string().min(1)');
        expect(code).toMatch(/qty:\s*z\.number\(\)\.int\(\)\.positive\(\)/);
        expect(code).toMatch(/debt:\s*z\.number\(\)\.int\(\)\.negative\(\)/);
        expect(code).toMatch(/price:\s*z\.number\(\)\.min\(1\.5, \{ inclusive: false \}\)\.max\(10\.0\)/);
    });

    it('Map<String, Map<String, Integer>> + Map<Enum, String>', () => {
        const src = t(`
      import java.util.*;
      public enum Status { NEW, DONE }
      public class C {
        public Map<String, Map<String, Integer>> stats;
        public Map<Status, String> byStatus;
      }
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toContain('export const StatusSchema = z.enum([');
        expect(code).toContain('stats: z.record(z.string(), z.record(z.string(), z.number().int()))');
        // enum key → record se string klíči (serializovaná hodnota enumu)
        expect(code).toContain('byStatus: z.record(z.string(), z.string())');
    });

    it('forward reference → z.lazy', () => {
        const src = t(`
      public class User { public Address address; }
      class Address { public String city; }
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toMatch(/export const AddressSchema = z\.object/);
        expect(code).toMatch(/address:\s*z\.lazy\(\s*\(\)\s*=>\s*AddressSchema\s*\)/);
    });

    it('neznámý typ → z.unknown() + warn diagnostic', () => {
        const src = t(`public class X { public FooBar baz; }`);
        const {code, diagnostics} = parseSourceToZod(src);
        expect(code).toContain('baz: z.unknown()');
        expect(diagnostics.some(d => /Unknown type 'FooBar'/.test(d.message))).toBe(true);
    });
});
