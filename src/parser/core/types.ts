export type DiagnosticLevel = 'warn' | 'error';

export type Diagnostic = {
    level: DiagnosticLevel;
    message: string;
    where?: { class?: string; field?: string; };
};

export type Ann = {
    notNull?: boolean;
    nullable?: boolean;
    size?: { min?: number; max?: number; };
    min?: number;
    max?: number;
    pattern?: string;
    jsonProperty?: string;
    raw?: string[];
};

export type Field = {
    name: string;
    emitName: string;
    type: string;
    optional?: boolean;
    ann: Ann;
};

export type Clazz = {
    name: string;
    fields: Field[];
};

export type EnumDef = {
    name: string;
    values: string[];
};

export type Known = {
    classes: Set<string>;
    enums: Set<string>;
};

export type ParseResult = {
    code: string;
    diagnostics: Diagnostic[];
};