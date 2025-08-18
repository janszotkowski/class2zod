import { describe, it, expect } from 'vitest';
import { parseSourceToZod } from '@/parser';

const t = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Větší schémata (samostatně Java/Kotlin)', () => {
    it('Java větší: enum + 3 třídy + reference', () => {
        const src = t(`
      import jakarta.validation.constraints.*; import java.util.*;
      public enum Role { USER, ADMIN, SUPER }
      public class Address { @Size(min=2) public String city; public String country; }
      public class Profile { @Email public String email; public Integer age; public List<String> tags; }
      public class Person {
        public String id;
        public Role role;
        public Address address;
        public Profile profile;
        public Map<String, Integer> scores;
      }
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`export const RoleSchema = z.enum(['USER', 'ADMIN', 'SUPER'])`);
        expect(code).toMatch(/address:\s*z\.lazy\(\s*\(\)\s*=>\s*AddressSchema\s*\)/);
        expect(code).toMatch(/profile:\s*z\.lazy\(\s*\(\)\s*=>\s*ProfileSchema\s*\)/);
        expect(code).toContain(`scores: z.record(z.string(), z.number().int())`);
    });

    it('Java větší: kolekce + pattern + size', () => {
        const src = t(`
      import jakarta.validation.constraints.*; import java.util.*;
      public class Catalog {
        @Pattern(regexp="^[A-Z0-9_-]+$") public String code;
        @Size(min=1) public List<String> items;
        public Map<String, Double> prices;
        public java.time.Instant updatedAt;
      }
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`code: z.string().regex(/^[A-Z0-9_-]+$/)`);
        expect(code).toContain(`items: z.array(z.string()).min(1)`);
        expect(code).toContain(`prices: z.record(z.string(), z.number())`);
        expect(code).toContain(`updatedAt: z.string()`);
    });

    it('Kotlin větší: enum + nested typy', () => {
        const src = t(`
      enum class Status { NEW, IN_PROGRESS, DONE }
      data class Address(val city: String, val zip: String)
      data class Item(val sku: String, val qty: Int)
      data class Order(
        val id: String,
        val status: Status,
        val shipping: Address,
        val items: List<Item>
      )
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`export const StatusSchema = z.enum(['NEW', 'IN_PROGRESS', 'DONE'])`);
        expect(code).toMatch(/shipping:\s*z\.lazy\(\s*\(\)\s*=>\s*AddressSchema\s*\)/);
        expect(code).toContain(`items: z.array(z.lazy(() => ItemSchema))`);
    });

    it('Kotlin větší: alias + nullable + ByteArray', () => {
        const src = t(`
      import com.squareup.moshi.Json
      data class Blob(@Json(name="data-bytes") val bytes: ByteArray)
      data class User(
        @Json(name="id") val userId: String,
        val age: Int?,
        val photo: Blob?
      )
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toContain(`'data-bytes': z.array(z.number().int())`);
        expect(code).toContain(`id: z.string()`);
        expect(code).toContain(`age: z.number().int().optional()`);
        expect(code).toMatch(/photo:\s*z\.lazy\(\s*\(\)\s*=>\s*BlobSchema\s*\)\.optional\(\)/);
    });
});
