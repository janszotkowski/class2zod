import { describe, it, expect } from 'vitest';
import { parseSourceToZod } from '@/parser';

const t = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Optionalita & nullability', () => {
    it('Java: Optional<T> a @Nullable → přesně jedna .optional() na každé', () => {
        const src = t(`
      import java.util.*
      import jakarta.validation.constraints.*
      public class Opts {
        @Nullable public String note;
        public Optional<String> maybe;
      }
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toContain('note: z.string().optional()');
        expect(code).toContain('maybe: z.string().optional()');
        expect((code.match(/optional\(\)/g) || []).length).toBe(2);
    });

    it('Kotlin: Int? optional, List<String>? optional jako celek', () => {
        const src = t(`
      data class K(
        val age: Int?,
        val tags: List<String>?
      )
    `);
        const {code} = parseSourceToZod(src);
        expect(code).toContain('age: z.number().int().optional()');
        expect(code).toContain('tags: z.array(z.string()).optional()');
    });
});
