# Java/Kotlin → Zod v4 (browser-only)

Nástroj, který přímo v prohlížeči převádí datové třídy z Javy nebo Kotlinu do TypeScriptu se Zod v4 schématy. Bez Javy a bez backendu – vše běží na frontendu.

Klíčové vlastnosti:
- Běh čistě v prohlížeči (React + Monaco), žádná Java/Gradle/Maven, žádný server.
- Auto‑detekce vstupního jazyka (Java/Kotlin).
- Výstup: Zod v4 schémata + `export type … = z.infer<typeof …>`.
- Lazy reference (`z.lazy`) pro vnořené a vzájemně se odkazující typy.
- Enumy (Java i Kotlin) → `z.enum([...])`.
- Kolekce: `List<T>`/`MutableList<T>` → `z.array(T)`, `Set<T>`/`MutableSet<T>` → `z.array(T)`, `Map<String, V>` → `z.record(z.string(), V)`, ostatní klíče v mapě → `z.record(z.string(), z.unknown())` + diagnostika; pole `T[]`, `Array<T>`, vícerozměrná pole.
- Primitiva a wrappery: int/Integer → `z.number().int()`, long/double/float → `z.number()`, boolean → `z.boolean()`, char/Character/Char → `z.string().length(1)`, String → `z.string()`.
- Datum/čas (java.util.Date, java.time.*) konzervativně jako `z.string()`.
- Optionalita/Nullability: Java `Optional<T>`, `@Nullable`, Kotlin `T?` → `.optional()` (deduplikace: nikdy `.optional().optional()`).
- Anotace → Zod: `@Size`, `@Min/@Max`, `@Pattern`, `@Email`, `@NotBlank/@NotEmpty`, `@Positive/@Negative`, `@DecimalMin/@DecimalMax`, alias klíče přes `@JsonProperty` (Jackson) / `@Json(name=…)` (Moshi/Kotlin).
- Ignorování polí anotovaných k ignoraci nebo označených jako transient (viz níže).
- Diagnostiky: neznámé typy, ne‑string klíče v mapách, apod.
- 100+ unit testů (Vitest) pokrývá primitiva, kolekce, enumy, optionalitu, anotace, aliasy, lazy reference, edge‑cases a „velké“ třídy.
- Styl generovaného TS: single quotes, bez středníků.

## Ukázky

Vstup (Java):

```java
public enum Role { USER, ADMIN }

public class Address {
  @Size(min = 2, max = 50) public String street;
  public String city;
}

public class Account {
  @JsonProperty("id") public String accountId;
  public Optional<Integer> age;
  public Role role;
  public Address address;
  public List<String> tags;
  public Map<String, Double> weights;
}
```

Výstup (TypeScript + Zod v4):

```ts
import { z } from 'zod'

// Role (enum)
export const RoleSchema = z.enum(['USER', 'ADMIN'])
export type Role = z.infer<typeof RoleSchema>

// Address
export const AddressSchema = z.object({
  street: z.string().min(2).max(50),
  city: z.string()
})
export type Address = z.infer<typeof AddressSchema>

// Account
export const AccountSchema = z.object({
  id: z.string(),
  age: z.number().int().optional(),
  role: RoleSchema,
  address: z.lazy(() => AddressSchema),
  tags: z.array(z.string()),
  weights: z.record(z.string(), z.number())
})
export type Account = z.infer<typeof AccountSchema>
```

## Co to umí převádět

### Mapování typů

| Java/Kotlin | Výsledek (Zod) |
|---|---|
| `String` | `z.string()` |
| `char` / `Character` / `Char` | `z.string().length(1)` |
| `byte/Byte`, `short/Short`, `int/Int`, `Integer` | `z.number().int()` |
| `long/Long`, `float/Float`, `double/Double` | `z.number()` |
| `boolean/Boolean` | `z.boolean()` |
| `java.util.Date`, `java.time.*`, `Instant`, `LocalDate`, … | `z.string()` |
| `List<T>` / `MutableList<T>` | `z.array(T)` |
| `Set<T>` / `MutableSet<T>` | `z.array(T)` |
| `Map<String, V>` | `z.record(z.string(), V)` |
| `Map<Other, V>` | `z.record(z.string(), z.unknown())` + diagnostic |
| `T[]`, `Array<T>` (Kotlin) | `z.array(T)`; vícerozměrně: `z.array(z.array(T))` |
| Enum (Java/Kotlin) | `z.enum(['A', 'B', ...])` |
| Vnořené/známé třídy | `z.lazy(() => NameSchema)` |
| Neznámé typy | `z.unknown()` + diagnostic |

Pozn.: Klíč enumu v mapě je považován za string‑based (kompatibilní s `z.record(z.string(), ...)`).

### Optionalita / Nullability
- Java `Optional<T>` → `T.optional()`.
- Java `@Nullable` → `T.optional()`.
- Kotlin `T?` → `T.optional()`.
- Deduplikace: nikdy nevznikne `...optional().optional()`.

### Podporované anotace → Zod
- `@Size(min=, max=)` → `.min/.max` pro `z.string()` a `z.array()`.
- `@Min`, `@Max` → `.min/.max` pro `z.number()`.
- `@Pattern(regexp="…")` → `.regex(/…/)` (bezpečný převod Java regexu do JS literálu).
- `@JsonProperty("name")` (Jackson, Java) → alias klíče ve výstupu.
- `@Json(name="…")` (Moshi, Kotlin) → alias klíče ve výstupu.
- `@Email` → `.email()`.
- `@NotBlank` / `@NotEmpty` → `z.string().min(1)`.
- `@Positive` / `@Negative` → `.positive()` / `.negative()` pro `z.number()`.
- `@DecimalMin(value="…", inclusive=…)` → `.min(…, { inclusive })`.
- `@DecimalMax(value="…", inclusive=…)` → `.max(…, { inclusive })`.

### Ignorování polí
- Java: `@JsonIgnore`, `transient` → pole se neemitují do schématu.
- Kotlinx: `@Transient` → pole se neemitují do schématu.

### Diagnostics
Funkce `parseSourceToZod(source)` vrací `{ code, diagnostics }`, kde `diagnostics: Diagnostic[]` obsahuje varování/chyby mapování. Generuje se např. když:
- narazíme na neznámý typ → mapuje se jako `z.unknown()`;
- klíč `Map<K, V>` není string‑based → `z.record(z.string(), z.unknown())` a varování;
- vnořené konstrukce obsahují neznámé typy.

## UI & UX
- Dvě synchronní Monaco okna: vlevo Java/Kotlin vstup, vpravo generovaný TypeScript (read‑only), zvýraznění syntaxe, minimap, word‑wrap.
- Klávesové zkratky: Ctrl/Cmd+Enter = Parse, Ctrl/Cmd+B = Format output.
- Toolbar akce: Parse, Copy; ukázkové vstupy (Java/Kotlin).
- Volitelně: download vygenerovaného souboru a share‑link s obsahem (pokud je povoleno v buildu).

## Testy
- Test runner: Vitest; 100+ unit testů.
- Spuštění:
  - `yarn i`
  - `yarn test` (jednorázově) / `yarn test:watch` (watch mód)
- Pokrytí: primitiva, kolekce, enumy, optionalita, anotace, aliasy, lazy reference, diagnostiky, edge‑cases i „velké“ modely.

## Rychlý start (vývoj)
- Instalace: `yarn i`
- Dev server: `yarn dev` (otevře se prohlížeč)
- Build: `yarn build`
- Lokální preview buildu: `yarn preview`
- Lint: `yarn lint` / `yarn lint:fix`

## Struktura projektu

```
class2zod/
├─ src/
│  ├─ App.tsx
│  ├─ ui/
│  │  ├─ Editor.tsx
│  │  ├─ MonacoPane.tsx
│  │  └─ Diagnostics.tsx
│  └─ parser/
│     ├─ index.ts              # export: parseSourceToZod
│     ├─ core/
│     │  ├─ annotations.ts
│     │  ├─ emitter.ts
│     │  ├─ typeMapping.ts
│     │  ├─ types.ts
│     │  └─ utils.ts
│     ├─ java/
│     │  └─ extract.ts
│     └─ kotlin/
│        └─ extract.ts
├─ tests/
│  ├─ diagnostics.test.ts
│  ├─ java/*.test.ts
│  └─ kotlin/*.test.ts
├─ package.json
├─ rsbuild.config.ts
├─ tsconfig.json
└─ vitest.config.ts
```

## Známá omezení
- Datum/čas: zatím konzervativně jako `z.string()`; zpřísnění je v roadmapě.
- Map s ne‑string klíčem: používá se `z.record(z.string(), z.unknown())` + varování.
- Generika na úrovni třídy nejsou rozvazována (typové parametry, bounded generics apod.).
- Dědičnost (extends/implements/sealed hierarchie) není v současnosti reprezentována jako unie/kompozice.

## Roadmap (chystaná vylepšení)
- Discriminated unions: Kotlin `sealed` hierarchie, Jackson `@JsonTypeInfo`.
- Režimy pro datum/čas: `z.string().datetime()`, Unix epoch, custom parsery.
- `.strict()` pro generované objekty + volitelná politika neznámých klíčů.
- Unikátnost `Set<T>` (ověření unikátnosti prvků při validaci).
- BigDecimal/BigInteger režim (řetězec vs. přesná čísla; vlastní zod refinements).
- Aliasy `enum` hodnot (např. `@Json(name)`/`@SerializedName`) a mapování na string literal union typy.

## Licence / Contributing
- Licence: MIT (pokud není uvedeno jinak v repozitáři).
- Příspěvky vítány – issues a PRs jsou otevřené; prosím přidejte testy (Vitest) a dodržte styl výstupu (single quotes).
