import { describe, it, expect } from 'vitest';
import { parseSourceToZod } from '@/parser';

const t = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Kotlin – edge cases', () => {
    it('Moshi @Json(name) alias + optional ?', () => {
        const src = t(`
      import com.squareup.moshi.Json
      data class User(
        @Json(name = "id") val userId: String,
        val age: Int?,
        val tags: List<String>,
        val createdAt: java.time.Instant
      )
    `);
        const {code, diagnostics} = parseSourceToZod(src);
        expect(diagnostics).toEqual([]);
        expect(code).toContain('id: z.string()');
        expect(code).toContain('age: z.number().int().optional()');
        expect(code).toContain('tags: z.array(z.string())');
        expect(code).toContain('createdAt: z.string()');
    });

    it('alias s non-identifier → quoted key', () => {
        const src = t(`
      import com.squareup.moshi.Json
      data class U(
        @Json(name = "full-name") val fullName: String,
        @Json(name = "2fa") val twofa: Boolean
      )
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`'full-name': z.string()`);
        expect(code).toContain(`'2fa': z.boolean()`);
    });

    it('MutableList/Set/Map + Array<T> + ByteArray', () => {
        const src = t(`
      data class Box(
        val a: MutableList<Int>,
        val b: MutableSet<String>,
        val c: MutableMap<String, Double>,
        val d: Array<String>,
        val e: ByteArray
      )
    `);
        const {code, diagnostics} = parseSourceToZod(src);
        expect(diagnostics).toEqual([]);
        expect(code).toContain('a: z.array(z.number().int())');
        expect(code).toContain('b: z.array(z.string())');
        expect(code).toContain('c: z.record(z.string(), z.number())');
        expect(code).toContain('d: z.array(z.string())');
        expect(code).toContain('e: z.array(z.number().int())');
    });

    it('deduplikace: stejné pole v data-ctor i v těle', () => {
        const src = t(`
      data class U(val id: String) {
        val id: String = "dup"
      }
    `);
        const {code} = parseSourceToZod(src);
        const hits = (code.match(/\bid:\s*z\.string\(\)/g) || []).length;
        expect(hits).toBe(1);
    });

    it('Map s ne-string klíčem → warn + unknown record', () => {
        const src = t(`data class T(val weird: Map<Int, String>)`);
        const {code, diagnostics} = parseSourceToZod(src);
        expect(code).toContain('weird: z.record(z.string(), z.unknown())');
        expect(diagnostics.some(d => /Map key 'Int'/.test(d.message))).toBe(true);
    });

    it('extra anotace (@field:) – Email/NotEmpty/Positive/Negative/DecimalMin/Max', () => {
        const src = t(`
      import jakarta.validation.constraints.*
      data class K(
        @field:Email val email: String,
        @field:NotEmpty val code: String,
        @field:Positive val qty: Int,
        @field:Negative val debt: Int,
        @field:DecimalMin(value="0.01", inclusive=true)
        @field:DecimalMax(value="99.9", inclusive=false)
        val price: Double
      )
    `);
        const {code, diagnostics} = parseSourceToZod(src);
        expect(diagnostics).toEqual([]);
        expect(code).toContain('email: z.string().email()');
        expect(code).toContain('code: z.string().min(1)');
        expect(code).toMatch(/qty:\s*z\.number\(\)\.int\(\)\.positive\(\)/);
        expect(code).toMatch(/debt:\s*z\.number\(\)\.int\(\)\.negative\(\)/);
        expect(code).toMatch(/price:\s*z\.number\(\)\.min\(0\.01\)\.max\(99\.9, \{ inclusive: false \}\)/);
    });
});
