import { describe, it, expect } from 'vitest';
import { parseSourceToZod } from '@/parser';

const t = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Kotlin – velká data class', () => {
    it('UserAggregate/Order/Profile: aliasy, nullable, kolekce, ByteArray, vnoření, enum', () => {
        const kt = t(`
      import com.squareup.moshi.Json
      import jakarta.validation.constraints.*

      enum class Status { NEW, IN_PROGRESS, PAUSED, DONE, CANCELED }

      data class Address(
        val street: String,
        val city: String,
        @Json(name = "zip_code") val zip: String
      )

      data class Item(
        val sku: String,
        val qty: Int
      )

      data class Profile(
        @field:Email val email: String,
        @field:NotEmpty val nickname: String?,
        val tags: List<String>,
        val tones: MutableSet<String>,
        val prefs: Map<String, Double>,
        val blob: ByteArray?
      )

      data class Order(
        @Json(name = "id") val orderId: String,
        val status: Status,
        val address: Address,
        val items: List<Item>,
        val createdAt: java.time.Instant,
        val updatedAt: java.time.Instant?,
        val metadata: Map<String, String>,
        val attempts: Array<Int>,
        val refMatrix: List<List<String>>,
        val contactAge: Int?,
        val price: Double,
        @field:Positive val qty: Int,
        @field:DecimalMin(value="0.01", inclusive=true)
        @field:DecimalMax(value="9999.99", inclusive=false)
        val amount: Double
      )

      data class UserAggregate(
        val profile: Profile,
        val orders: List<Order>
      )
    `);

        const {code, diagnostics} = parseSourceToZod(kt);
        expect(diagnostics).toEqual([]);

        // Enum
        expect(code).toContain(`export const StatusSchema = z.enum(['NEW', 'IN_PROGRESS', 'PAUSED', 'DONE', 'CANCELED'])`);

        // Alias klíčů
        expect(code).toContain(`zip_code: z.string()`);
        expect(code).toContain(`id: z.string()`);

        // Lazy vnořené typy
        expect(code).toMatch(/address:\s*z\.lazy\(\s*\(\)\s*=>\s*AddressSchema\s*\)/);
        expect(code).toMatch(/items:\s*z\.array\(z\.lazy\(\s*\(\)\s*=>\s*ItemSchema\s*\)\)/);

        // Datum/čas + optional
        expect(code).toContain(`createdAt: z.string()`);
        expect(code).toContain(`updatedAt: z.string().optional()`);

        // Kolekce + Array + ByteArray
        expect(code).toContain(`tags: z.array(z.string())`);
        expect(code).toContain(`tones: z.array(z.string())`);
        expect(code).toContain(`prefs: z.record(z.string(), z.number())`);
        expect(code).toContain(`blob: z.array(z.number().int()).optional()`);
        expect(code).toContain(`attempts: z.array(z.number().int())`);
        expect(code).toContain(`refMatrix: z.array(z.array(z.string()))`);

        // Nullable & čísla s hranicemi
        expect(code).toContain(`contactAge: z.number().int().optional()`);
        expect(code).toContain(`price: z.number()`);
        expect(code).toMatch(/qty:\s*z\.number\(\)\.int\(\)\.positive\(\)/);
        expect(code).toMatch(/amount:\s*z\.number\(\)\.min\(0\.01\)\.max\(9999\.99, \{ inclusive: false \}\)/);

        // Agregát s lazy referencemi
        expect(code).toMatch(/profile:\s*z\.lazy\(\s*\(\)\s*=>\s*ProfileSchema\s*\)/);
        expect(code).toMatch(/orders:\s*z\.array\(z\.lazy\(\s*\(\)\s*=>\s*OrderSchema\s*\)\)/);
    });
});
