import { describe, expect, it } from 'vitest';
import { parseSourceToZod } from '@/parser';

const trim = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Java → Zod v4', () => {
    it('primitiva + anotace + JsonProperty', () => {
        const java = trim(`
      import jakarta.validation.constraints.*;
      import com.fasterxml.jackson.annotation.JsonProperty;

      public class Product {
        @NotNull
        @Size(min = 3, max = 50)
        @JsonProperty("id")
        public String productId;

        public Integer stock;
        @Pattern(regexp = "^[A-Z0-9_-]+$")
        public String sku;
        public boolean active;
      }
    `);

        const {code, diagnostics} = parseSourceToZod(java);
        expect(diagnostics).toEqual([]);

        expect(code).toContain('export const ProductSchema = z.object({');
        expect(code).toContain(`id: z.string().min(3).max(50)`);
        expect(code).toContain(`stock: z.number().int()`);
        expect(code).toContain(`sku: z.string().regex(/^[A-Z0-9_-]+$/)`);
        expect(code).toContain(`active: z.boolean()`);

        // klíče nesmí být duplicitní
        expect((code.match(/\bid:\s*z\.string\(\)/g) || []).length).toBeLessThanOrEqual(1);
    });

    it('kolekce a Optional', () => {
        const java = trim(`
      import java.util.*;

      public class Order {
        public List<String> tags;
        public Set<Integer> codes;
        public Map<String, Double> prices;
        public Optional<String> note;
      }
    `);

        const {code, diagnostics} = parseSourceToZod(java);
        expect(diagnostics).toEqual([]);
        expect(code).toContain(`tags: z.array(z.string())`);
        expect(code).toContain(`codes: z.array(z.number().int())`);
        expect(code).toContain(`prices: z.record(z.string(), z.number())`);
        expect(code).toContain(`note: z.string().optional()`);
    });

    it('datum/čas → string', () => {
        const java = trim(`
      public class Event {
        public java.time.Instant createdAt;
        public java.util.Date scheduled;
      }
    `);

        const {code} = parseSourceToZod(java);
        expect(code).toContain(`createdAt: z.string()`);
        expect(code).toContain(`scheduled: z.string()`);
    });

    it('pole: suffix u deklarátoru', () => {
        const java = trim(`
      public class A {
        public int a[];
        public String names[][];
      }
    `);

        const {code} = parseSourceToZod(java);
        expect(code).toContain(`a: z.array(z.number().int())`);
        expect(code).toContain(`names: z.array(z.array(z.string()))`);
    });

    it('vnořené typy → lazy', () => {
        const java = trim(`
      public class User {
        public Address address;
      }

      class Address {
        public String city;
      }
    `);

        const {code} = parseSourceToZod(java);
        expect(code).toMatch(/export const AddressSchema = z\.object/);
        expect(code).toMatch(/address:\s*z\.lazy\(\s*\(\)\s*=>\s*AddressSchema\s*\)/);
    });

    it('Map s ne-string klíčem → warn + unknown record', () => {
        const java = trim(`
      import java.util.*;

      public class M {
        public Map<Integer, String> weird;
      }
    `);
        const {code, diagnostics} = parseSourceToZod(java);
        expect(code).toContain(`weird: z.record(z.string(), z.unknown())`);
        expect(diagnostics.some(d => /Map key 'Integer'/.test(d.message))).toBe(true);
    });

    it('neznámý typ → unknown + warn', () => {
        const java = trim(`
      public class X { public CustomThing c; }
    `);
        const {code, diagnostics} = parseSourceToZod(java);
        expect(code).toContain(`c: z.unknown()`);
        expect(diagnostics.some(d => /Unknown type 'CustomThing'/.test(d.message))).toBe(true);
    });

    it('vícenásobné deklarace a pole se suffixem [] u proměnné', () => {
        const java = trim(`
      public class Many {
        public int a, b[], c[][];
        public String[] s1, s2[];
      }
    `);
        const {code, diagnostics} = parseSourceToZod(java);
        expect(diagnostics).toEqual([]);

        // int a, b[], c[][];
        expect(code).toContain('a: z.number().int()');
        expect(code).toContain('b: z.array(z.number().int())');
        expect(code).toContain('c: z.array(z.array(z.number().int()))');

        // String[] s1, s2[];
        expect(code).toContain('s1: z.array(z.string())');
        expect(code).toContain('s2: z.array(z.array(z.string()))');
    });

    it('@JsonProperty s ne-identifikátorem vyžaduje quote', () => {
        const java = trim(`
      import com.fasterxml.jackson.annotation.JsonProperty;
      public class U {
        @JsonProperty("full-name")
        public String fullName;
        @JsonProperty("2fa")
        public boolean twofaEnabled;
      }
    `);
        const {code} = parseSourceToZod(java);
        expect(code).toContain(`'full-name': z.string()`);
        expect(code).toContain(`'2fa': z.boolean()`);
    });

    it('@Size/@Pattern na stringu a @Min/@Max na čísle', () => {
        const java = trim(`
      import jakarta.validation.constraints.*;
      public class Constraints {
        @Size(min = 3, max = 5)
        public String code;
        @Pattern(regexp = "^[A-Z0-9]+$")
        public String sku;
        @Min(0) @Max(10)
        public Integer stock;
      }
    `);
        const {code} = parseSourceToZod(java);
        expect(code).toContain(`code: z.string().min(3).max(5)`);
        expect(code).toContain(`sku: z.string().regex(/^[A-Z0-9]+$/)`);
        expect(code).toContain(`stock: z.number().int().min(0).max(10)`);
    });

    it('Map<String, Map<String, Integer>> je zanořený record', () => {
        const java = trim(`
      import java.util.*;
      public class DeepMap {
        public Map<String, Map<String, Integer>> stats;
      }
    `);
        const {code, diagnostics} = parseSourceToZod(java);
        expect(diagnostics).toEqual([]);
        expect(code).toContain(`stats: z.record(z.string(), z.record(z.string(), z.number().int()))`);
    });

    it('Map s ne-string klíčem → warn + unknown record', () => {
        const java = trim(`
      import java.util.*;
      public class WeirdKey {
        public Map<Integer, String> m;
      }
    `);
        const {code, diagnostics} = parseSourceToZod(java);
        expect(code).toContain(`m: z.record(z.string(), z.unknown())`);
        expect(diagnostics.some(d => /Map key 'Integer'/.test(d.message))).toBe(true);
    });

    it('char → z.string().length(1)', () => {
        const java = trim(`
      public class C {
        public char initial;
        public Character letter;
      }
    `);
        const {code} = parseSourceToZod(java);
        expect(code).toContain(`initial: z.string().length(1)`);
        expect(code).toContain(`letter: z.string().length(1)`);
    });

    it('Optional vs. @Nullable → jen jednou optional()', () => {
        const java = trim(`
      import java.util.*;
      import jakarta.validation.constraints.*;
      public class Opts {
        @Nullable
        public String note;
        public Optional<String> maybe;
      }
    `);
        const {code} = parseSourceToZod(java);
        // note: optional() díky @Nullable
        expect(code).toContain(`note: z.string().optional()`);
        // maybe: optional() díky Optional<T>
        expect(code).toContain(`maybe: z.string().optional()`);
        // žádné dvojité .optional().optional()
        expect((code.match(/optional\(\)/g) || []).length).toBe(2);
    });

    it('forward reference → z.lazy', () => {
        const java = trim(`
      public class Order {
        public Customer customer;
      }
      class Customer {
        public String id;
      }
    `);
        const {code} = parseSourceToZod(java);
        expect(code).toMatch(/export const CustomerSchema = z\.object/);
        expect(code).toMatch(/customer:\s*z\.lazy\(\s*\(\)\s*=>\s*CustomerSchema\s*\)/);
    });

    it('neznámý typ → unknown + warn', () => {
        const java = trim(`
      public class X { public FooBar baz; }
    `);
        const {code, diagnostics} = parseSourceToZod(java);
        expect(code).toContain(`baz: z.unknown()`);
        expect(diagnostics.some(d => /Unknown type 'FooBar'/.test(d.message))).toBe(true);
    });

    it('@Email, @NotBlank, @Positive/@Negative, @DecimalMin/Max', () => {
        const java = trim(`
      import jakarta.validation.constraints.*;

      public class C {
        @Email
        public String email;
        @NotBlank
        public String code;
        @Positive
        public int qty;
        @Negative
        public int debt;
        @DecimalMin(value="1.5", inclusive=false)
        @DecimalMax(value="10.0", inclusive=true)
        public double price;
      }
    `);

        const {code, diagnostics} = parseSourceToZod(java);
        expect(diagnostics).toEqual([]);

        expect(code).toContain('email: z.string().email()');
        expect(code).toContain('code: z.string().min(1)');
        expect(code).toMatch(/qty:\s*z\.number\(\)\.int\(\)\.positive\(\)/);
        expect(code).toMatch(/debt:\s*z\.number\(\)\.int\(\)\.negative\(\)/);
        expect(code).toMatch(/price:\s*z\.number\(\)\.min\(1\.5, \{ inclusive: false \}\)\.max\(10\.0\)/);
    });
});
