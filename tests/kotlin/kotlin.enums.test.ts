import { describe, it, expect } from 'vitest';
import { parseSourceToZod } from '@/parser';

const t = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Kotlin Enums', () => {
    it('enum class + použití v data class', () => {
        const kt = t(`
      enum class Status { NEW, IN_PROGRESS, DONE }

      data class Task(
        val status: Status
      )
    `);
        const {code, diagnostics} = parseSourceToZod(kt);
        expect(diagnostics).toEqual([]);
        expect(code).toMatch(/export const StatusSchema = z\.enum\(\[/);
        expect(code).toContain(`'NEW'`);
        expect(code).toContain(`'IN_PROGRESS'`);
        expect(code).toContain(`'DONE'`);
        expect(code).toMatch(/status:\s*StatusSchema/);
    });

    it('enum entries s argumenty nebo tělem → vezmi jen identifikátory', () => {
        const kt = t(`
      enum class Kind {
        A(1),
        B { override fun toString() = "b" },
        C
      }
    `);
        const {code} = parseSourceToZod(kt);
        expect(code).toMatch(/export const KindSchema = z\.enum\(\[/);
        expect(code).toContain(`'A'`);
        expect(code).toContain(`'B'`);
        expect(code).toContain(`'C'`);
    });
});
