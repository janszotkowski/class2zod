import { Ann } from './types';

export function parseAnnotationsJava(raw: string): Ann {
    const a: Ann = {raw: []};
    a.raw = raw.match(/@\w+(?:\([^)]*\))?/g) || [];

    if (/@(?:[\w.]+)?Nullable\b/.test(raw)) {
        a.nullable = true;
    }
    if (/@(?:[\w.]+)?NotNull\b|@(?:[\w.]+)?Nonnull\b/.test(raw)) {
        a.notNull = true;
    }

    const size = /@(?:[\w.]+)?Size\s*\(\s*(?:min\s*=\s*(\d+))?\s*(?:,\s*)?(?:max\s*=\s*(\d+))?\s*\)/.exec(raw);
    if (size) {
        a.size = {min: size[1] ? Number(size[1]) : undefined, max: size[2] ? Number(size[2]) : undefined};
    }

    const min = /@(?:[\w.]+)?Min\s*\(\s*(?:value\s*=\s*)?(-?\d+)\s*\)/.exec(raw);
    if (min) {
        a.min = Number(min[1]);
    }

    const max = /@(?:[\w.]+)?Max\s*\(\s*(?:value\s*=\s*)?(-?\d+)\s*\)/.exec(raw);
    if (max) {
        a.max = Number(max[1]);
    }

    const pat = /@(?:[\w.]+)?Pattern\s*\(\s*regexp\s*=\s*"([\s\S]*?)"\s*\)/.exec(raw);
    if (pat) {
        a.pattern = pat[1];
    }

    const jp1 = /@(?:[\w.]+)?JsonProperty\s*\(\s*"([^"]+)"\s*\)/.exec(raw);
    const jp2 = /@(?:[\w.]+)?JsonProperty\s*\(\s*value\s*=\s*"([^"]+)"\s*\)/.exec(raw);
    if (jp1) {
        a.jsonProperty = jp1[1];
    }
    if (jp2) {
        a.jsonProperty = jp2[1];
    }

    return a;
}

export function parseAnnotationsKotlin(raw: string): Ann {
    const normalized = raw.replace(/@field:/g, '@').replace(/@get:/g, '@');
    const a = parseAnnotationsJava(normalized);
    const moshi = /@Json\s*\(\s*name\s*=\s*"([^"]+)"\s*\)/.exec(normalized);

    if (moshi) {
        a.jsonProperty = moshi[1];
    }
    return a;
}
