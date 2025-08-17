import { describe, expect, it } from 'vitest';
import { parseSourceToZod } from '@/parser';

const trim = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Kotlin → Zod v4', () => {
    it('data class + @Json(name) + optional ?', () => {
        const kt = trim(`
      import com.squareup.moshi.Json

      data class User(
        @Json(name = "id") val userId: String,
        val age: Int?,
        val tags: List<String>,
        val createdAt: java.time.Instant
      )
    `);

        const {code, diagnostics} = parseSourceToZod(kt);
        expect(diagnostics).toEqual([]);

        expect(code).toContain(`export const UserSchema = z.object({`);
        expect(code).toContain(`id: z.string()`);
        expect(code).toContain(`age: z.number().int().optional()`);
        expect(code).toContain(`tags: z.array(z.string())`);
        expect(code).toContain(`createdAt: z.string()`);

        expect((code.match(/\bid:\s*z\.string\(\)/g) || []).length).toBe(1);
    });

    it('kolekce: List/Set/Map + ByteArray', () => {
        const kt = trim(`
      data class Box(
        val codes: List<Int>,
        val tags: Set<String>,
        val prices: Map<String, Double>,
        val blob: ByteArray
      )
    `);

        const {code, diagnostics} = parseSourceToZod(kt);
        expect(diagnostics).toEqual([]);
        expect(code).toContain(`codes: z.array(z.number().int())`);
        expect(code).toContain(`tags: z.array(z.string())`);
        expect(code).toContain(`prices: z.record(z.string(), z.number())`);
        expect(code).toContain(`blob: z.array(z.number().int())`);
    });

    it('vnořené typy v Kotlinu → lazy + bez duplicit', () => {
        const kt = trim(`
      data class Address(val city: String)

      data class User(
        val address: Address
      )
    `);

        const {code} = parseSourceToZod(kt);
        expect(code).toMatch(/export const AddressSchema = z\.object/);
        expect(code).toMatch(/address:\s*z\.lazy\(\s*\(\)\s*=>\s*AddressSchema\s*\)/);

        // address klíč jen jednou
        expect((code.match(/\baddress:\s*z\.lazy/g) || []).length).toBe(1);
    });

    it('class bez data: props v těle + primární konstruktor bez val/var se ignoruje', () => {
        const kt = trim(`
      class Person(name: String) {
        val age: Int?
        var nick: String

        init {
          age = null
          nick = "x"
        }
      }
    `);

        const {code, diagnostics} = parseSourceToZod(kt);
        expect(diagnostics).toEqual([]);
        expect(code).toContain(`export const PersonSchema = z.object({`);
        expect(code).toContain(`age: z.number().int().optional()`);
        expect(code).toContain(`nick: z.string()`);
        // name z konstruktoru bez val/var se nemá objevit
        expect(code).not.toMatch(/\bname:\s/);
    });

    it('Map s ne-string klíčem → warn + unknown record', () => {
        const kt = trim(`
      data class T(val weird: Map<Int, String>)
    `);
        const {code, diagnostics} = parseSourceToZod(kt);
        expect(code).toContain(`weird: z.record(z.string(), z.unknown())`);
        expect(diagnostics.some(d => /Map key 'Int'/.test(d.message))).toBe(true);
    });

    it('MutableList/MutableSet/MutableMap, Array<T>, ByteArray', () => {
        const kt = trim(`
      data class Box(
        val a: MutableList<Int>,
        val b: MutableSet<String>,
        val c: MutableMap<String, Double>,
        val d: Array<String>,
        val e: ByteArray
      )
    `);
        const {code, diagnostics} = parseSourceToZod(kt);
        expect(diagnostics).toEqual([]);
        expect(code).toContain(`a: z.array(z.number().int())`);
        expect(code).toContain(`b: z.array(z.string())`);
        expect(code).toContain(`c: z.record(z.string(), z.number())`);
        expect(code).toContain(`d: z.array(z.string())`);
        expect(code).toContain(`e: z.array(z.number().int())`);
    });

    it('nullable kolekce a typy: List<String>? a Int?', () => {
        const kt = trim(`
      data class Nul(
        val tags: List<String>?,
        val age: Int?
      )
    `);
        const {code} = parseSourceToZod(kt);
        // pole je optional jako celek
        expect(code).toContain(`tags: z.array(z.string()).optional()`);
        // Int? → field optional
        expect(code).toContain(`age: z.number().int().optional()`);
    });

    it('@Json(name) s ne-identifikátorem vyžaduje quote', () => {
        const kt = trim(`
      import com.squareup.moshi.Json
      data class U(
        @Json(name = "full-name") val fullName: String,
        @Json(name = "2fa") val twofa: Boolean
      )
    `);
        const {code} = parseSourceToZod(kt);
        expect(code).toContain(`'full-name': z.string()`);
        expect(code).toContain(`'2fa': z.boolean()`);
    });

    it('vnořené typy a lazy reference (data class)', () => {
        const kt = trim(`
      data class Address(val city: String)
      data class User(val address: Address)
    `);
        const {code} = parseSourceToZod(kt);
        expect(code).toMatch(/export const AddressSchema = z\.object/);
        expect(code).toMatch(/address:\s*z\.lazy\(\s*\(\)\s*=>\s*AddressSchema\s*\)/);
    });

    it('class bez data: props v těle + ignorovat ctor bez val/var', () => {
        const kt = trim(`
      class Person(name: String) {
        val age: Int?
        var nick: String
        init { age = null; nick = "x" }
      }
    `);
        const {code, diagnostics} = parseSourceToZod(kt);
        expect(diagnostics).toEqual([]);
        expect(code).toContain(`export const PersonSchema = z.object({`);
        expect(code).toContain(`age: z.number().int().optional()`);
        expect(code).toContain(`nick: z.string()`);
        expect(code).not.toMatch(/\bname:\s/);
    });

    it('Map s ne-string klíčem → warn + unknown record', () => {
        const kt = trim(`
      data class T(val weird: Map<Int, String>)
    `);
        const {code, diagnostics} = parseSourceToZod(kt);
        expect(code).toContain(`weird: z.record(z.string(), z.unknown())`);
        expect(diagnostics.some(d => /Map key 'Int'/.test(d.message))).toBe(true);
    });

    it('deduplikace: stejné pole v data-ctor i v těle', () => {
        const kt = trim(`
      data class U(val id: String) {
        val id: String = "dup"
      }
    `);
        const {code} = parseSourceToZod(kt);
        // id by mělo být jen jednou
        const occurrences = (code.match(/\bid:\s*z\.string\(\)/g) || []).length;
        expect(occurrences).toBe(1);
    });

    it('vnořená generika uvnitř Map: Map<String, List<List<Int?>>> (inner ? → unknown + warn)', () => {
        const kt = trim(`
      data class G(val m: Map<String, List<List<Int?>>>)
    `);
        const {code, diagnostics} = parseSourceToZod(kt);
        // V aktuální verzi nejsme schopni číst vnitřní "Int?" → z.unknown() uvnitř
        expect(code).toContain(`m: z.record(z.string(), z.array(z.array(z.unknown())))`);
        expect(diagnostics.some(d => /Unknown type 'Int\?'/i.test(d.message))).toBe(true);
    });

    it('skalární typy: Long, Char, Boolean', () => {
        const kt = trim(`
      data class S(
        val id: Long,
        val initial: Char,
        val active: Boolean
      )
    `);
        const {code} = parseSourceToZod(kt);
        expect(code).toContain(`id: z.number()`); // Long → number
        expect(code).toContain(`initial: z.string().length(1)`);
        expect(code).toContain(`active: z.boolean()`);
    });

    it('@Email, @NotEmpty, @Positive/@Negative, @DecimalMin/Max (včetně @field: prefixu)', () => {
        const kt = trim(`
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

        const {code, diagnostics} = parseSourceToZod(kt);
        expect(diagnostics).toEqual([]);

        expect(code).toContain('email: z.string().email()');
        expect(code).toContain('code: z.string().min(1)');
        expect(code).toMatch(/qty:\s*z\.number\(\)\.int\(\)\.positive\(\)/);
        expect(code).toMatch(/debt:\s*z\.number\(\)\.int\(\)\.negative\(\)/);
        expect(code).toMatch(/price:\s*z\.number\(\)\.min\(0\.01\)\.max\(99\.9, \{ inclusive: false \}\)/);
    });
});
