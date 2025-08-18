import { describe, it, expect } from 'vitest';
import { parseSourceToZod } from '@/parser';

const t = (s: string) => s.trim().replace(/^\n+|\n+$/g, '');

describe('Java – velká třída', () => {
    it('Account: spousta polí, anotace, kolekce, vnoření, enumy', () => {
        const java = t(`
      import jakarta.validation.constraints.*;
      import com.fasterxml.jackson.annotation.JsonProperty;
      import java.util.*;

      public enum Role { USER, ADMIN, MANAGER, AUDITOR, OWNER }

      public class Address {
        @Size(min = 2, max = 50) public String street;
        @Size(min = 2) public String city;
        @Pattern(regexp = "^[0-9]{5}$") public String zip;
        public String country;
      }

      public class Preferences {
        public List<String> tags;
        public Set<Integer> favCodes;
        public Map<String, Double> weights;
        public Optional<String> note;
      }

      public class Account {
        @JsonProperty("id") public String accountId;
        @Size(min = 3, max = 20) @Pattern(regexp = "^[a-z0-9_]+$") public String username;
        @Min(0) @Max(150) public Integer age;
        public boolean active;
        public long balanceCents;
        public double score;
        public java.time.Instant createdAt;
        public java.util.Date lastLogin;
        public Role role;
        public Address address;
        public Preferences prefs;
        public String[] emails;
        public int[][] matrix;
        public Map<String, Map<String, Integer>> nestedMap;
        public Map<Integer, String> badKeyMap;
        public Optional<String> description;
        public char initial;
        public Character middleInitial;
        @Email public String contactEmail;
        @NotBlank public String code;
        @DecimalMin(value="0", inclusive=true)
        @DecimalMax(value="100.0", inclusive=false)
        public double percentile;
      }
    `);

        const {code, diagnostics} = parseSourceToZod(java);

        // Enum + použití
        expect(code).toContain(`export const RoleSchema = z.enum(['USER', 'ADMIN', 'MANAGER', 'AUDITOR', 'OWNER'])`);
        expect(code).toMatch(/role:\s*RoleSchema/);

        // Alias + validace stringu
        expect(code).toContain(`id: z.string()`);
        expect(code).toContain(`username: z.string().regex(/^[a-z0-9_]+$/).min(3).max(20)`);

        // Čísla + hranice
        expect(code).toContain(`age: z.number().int().min(0).max(150)`);
        expect(code).toContain(`active: z.boolean()`);
        expect(code).toContain(`balanceCents: z.number()`);
        expect(code).toContain(`score: z.number()`);

        // Datum/čas jako string
        expect(code).toContain(`createdAt: z.string()`);
        expect(code).toContain(`lastLogin: z.string()`);

        // Vnoření + lazy
        expect(code).toMatch(/address:\s*z\.lazy\(\s*\(\)\s*=>\s*AddressSchema\s*\)/);
        expect(code).toMatch(/prefs:\s*z\.lazy\(\s*\(\)\s*=>\s*PreferencesSchema\s*\)/);

        // Kolekce a pole
        expect(code).toContain(`tags: z.array(z.string())`);
        expect(code).toContain(`favCodes: z.array(z.number().int())`);
        expect(code).toContain(`weights: z.record(z.string(), z.number())`);
        expect(code).toContain(`emails: z.array(z.string())`);
        expect(code).toContain(`matrix: z.array(z.array(z.number().int()))`);
        expect(code).toContain(`nestedMap: z.record(z.string(), z.record(z.string(), z.number().int()))`);

        // Map s ne-string klíčem → unknown + diagnostic
        expect(code).toContain(`badKeyMap: z.record(z.string(), z.unknown())`);
        expect(diagnostics.some(d => /Map key 'Integer'/.test(d.message))).toBe(true);

        // Optional + char/Character
        expect(code).toContain(`description: z.string().optional()`);
        expect(code).toContain(`initial: z.string().length(1)`);
        expect(code).toContain(`middleInitial: z.string().length(1)`);

        // Email/NotBlank + DecimalMin/Max
        expect(code).toContain(`contactEmail: z.string().email()`);
        expect(code).toContain(`code: z.string().min(1)`);
        expect(code).toMatch(/percentile:\s*z\.number\(\)\.min\(0\)\.max\(100\.0, \{ inclusive: false \}\)/);
    });
});
