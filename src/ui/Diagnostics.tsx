import * as React from 'react';

type Item = {
    level: 'warn' | 'error';
    message: string;
    where?: { class?: string; field?: string; };
};

type DiagnosticsProps = {
    items: Item[];
};

export const Diagnostics: React.FC<DiagnosticsProps> = (props: DiagnosticsProps): React.ReactElement | null => {
    if (!props.items?.length) {
        return null;
    }

    return (
        <div className={'diag'}>
            <div className={'diag-title'}>Diagnostics ({props.items.length})</div>
            <ul>
                {props.items.map((d, i) => (
                    <li key={i} className={`diag-item ${d.level}`}>
                        <div className={'diag-msg'}>{d.message}</div>

                        {(d.where?.class || d.where?.field) && (
                            <div className={'diag-where'}>
                                {d.where?.class ? `class: ${d.where.class}` : ''}
                                {d.where?.field ? `, field: ${d.where.field}` : ''}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};
