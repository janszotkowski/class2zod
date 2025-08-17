import { describe, it, expect } from 'vitest';
import { parseSourceToZod } from '@/parser';

const t = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Java Enums', () => {
    it('enum definice + použití v třídě', () => {
        const java = t(`
      public enum Role { USER, ADMIN, SUPER_ADMIN }

      public class Account {
        public Role role;
      }
    `);
        const {code, diagnostics} = parseSourceToZod(java);
        expect(diagnostics).toEqual([]);

        // enum schema
        expect(code).toMatch(/export const RoleSchema = z\.enum\(\[/);
        expect(code).toContain(`'USER'`);
        expect(code).toContain(`'ADMIN'`);
        expect(code).toContain(`'SUPER_ADMIN'`);

        // použití v třídě
        expect(code).toMatch(/role:\s*RoleSchema/);
    });

    it('enum s tělem a argumenty u konstant (heuristicky jen jména)', () => {
        const java = t(`
      public enum Color {
        RED(0xFF0000),
        GREEN {
          @Override public String toString() { return "G"; }
        },
        BLUE;
        private final int rgb;
        Color(int rgb) { this.rgb = rgb; }
      }
    `);
        const {code} = parseSourceToZod(java);
        expect(code).toMatch(/export const ColorSchema = z\.enum\(\[/);
        expect(code).toContain(`'RED'`);
        expect(code).toContain(`'GREEN'`);
        expect(code).toContain(`'BLUE'`);
    });
});
