import { describe, it, expect } from 'vitest';
import { parseSourceToZod } from '@/parser';

const t = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Kotlin aliasy + optionalita', () => {
    it('Moshi @Json(name) alias', () => {
        const src = t(`
      import com.squareup.moshi.Json
      data class U(@Json(name="id") val userId: String)
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`id: z.string()`);
    });

    it('alias s ne-identifikátorem → quoted', () => {
        const src = t(`
      import com.squareup.moshi.Json
      data class U(
        @Json(name="full-name") val fullName: String,
        @Json(name="2fa") val twofa: Boolean
      )
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`'full-name': z.string()`);
        expect(code).toContain(`'2fa': z.boolean()`);
    });

    it('Int? → optional', () => {
        const src = t(`data class U(val age: Int?)`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`age: z.number().int().optional()`);
    });

    it('List<String>? → optional jako celek', () => {
        const src = t(`data class U(val tags: List<String>?)`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`tags: z.array(z.string()).optional()`);
    });

    it('java.time.Instant → string', () => {
        const src = t(`data class E(val createdAt: java.time.Instant)`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`createdAt: z.string()`);
    });

    it('deduplikace při shodném poli v těle', () => {
        const src = t(`
      data class U(val id: String) { val id: String = "dup" }
    `);
        const {code} = parseSourceToZod(src);
        const hits = (code.match(/\bid:\s*z\.string\(\)/g) || []).length;
        expect(hits).toBe(1);
    });

    it('lazy reference na jiný typ', () => {
        const src = t(`
      data class Address(val city: String)
      data class User(val address: Address)
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toMatch(/address:\s*z\.lazy\(\s*\(\)\s*=>\s*AddressSchema\s*\)/);
    });

    it('char/Char → string().length(1)', () => {
        const src = t(`data class C(val a: Char)`);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`a: z.string().length(1)`);
    });
});
