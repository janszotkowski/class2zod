import { describe, it, expect } from 'vitest';
import { parseSourceToZod } from '@/parser';

const t = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Combined (Java + Kotlin) – parsed separately', () => {
    const javaSrc = t(`
    public enum Role { USER, ADMIN }

    public class Person {
      public String name;
      public Integer age;
      public Role role;
    }
  `);

    const ktSrc = t(`
    data class Address(val city: String)
    data class User(
      val id: String,
      val tags: List<String>,
      val address: Address
    )
  `);

    it('Java část obsahuje enum a třídu s odkazem na enum', () => {
        const {code} = parseSourceToZod(javaSrc);

        // enum
        expect(code).toMatch(/export const RoleSchema = z\.enum\(\[['"]USER['"],\s*['"]ADMIN['"]\]\)/);
        // třída
        expect(code).toMatch(/export const PersonSchema = z\.object\(\{/);
        expect(code).toContain('name: z.string()');
        expect(code).toContain('age: z.number().int()');
        // odkaz na enum
        expect(code).toMatch(/role:\s*RoleSchema/);
    });

    it('Kotlin část obsahuje Address a User s lazy referencí', () => {
        const {code} = parseSourceToZod(ktSrc);

        // Address
        expect(code).toMatch(/export const AddressSchema = z\.object\(\{\s*city:\s*z\.string\(\)\s*\}\)/);

        // User + lazy na Address
        expect(code).toMatch(/export const UserSchema = z\.object\(\{/);
        expect(code).toContain('id: z.string()');
        expect(code).toContain('tags: z.array(z.string())');
        expect(code).toMatch(/address:\s*z\.lazy\(\s*\(\)\s*=>\s*AddressSchema\s*\)/);
    });

    it('Volitelně: můžeme z obou výstupů složit jeden řetězec a zkontrolovat klíčové bloky', () => {
        const a = parseSourceToZod(javaSrc).code;
        const b = parseSourceToZod(ktSrc).code;
        const merged = [a.trim(), b.trim()].join('\n\n');

        // místo křehkého snapshotu kontrolujeme, že všechny bloky jsou přítomné
        expect(merged).toMatch(/export const RoleSchema = z\.enum\(/);
        expect(merged).toMatch(/export const PersonSchema = z\.object\(/);
        expect(merged).toMatch(/export const AddressSchema = z\.object\(/);
        expect(merged).toMatch(/export const UserSchema = z\.object\(/);
    });
});
