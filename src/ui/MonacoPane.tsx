import * as React from 'react';
import { Editor, OnMount } from '@monaco-editor/react';

type MonacoPane = {
    value: string;
    language: 'java' | 'typescript' | 'plaintext';
    readOnly?: boolean;
    onChange?: (v: string) => void;
    onReady?: (editor: any, monaco: any) => void;
}

export const MonacoPane: React.FC<MonacoPane> = (props: MonacoPane): React.ReactElement => {
    const handleMount: OnMount = (editor, monaco): void => {
        editor.updateOptions({
            minimap: {enabled: true},
            fontSize: 13,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on'
        });
        props.onReady?.(editor, monaco);
    };

    return (
        <div className={'pane monaco'}>
            <Editor
                height={'60vh'}
                theme={'vs-dark'}
                defaultLanguage={props.language}
                language={props.language}
                value={props.value}
                onChange={(v) => props.onChange?.(v ?? '')}
                onMount={handleMount}
                options={{
                    readOnly: !!props.readOnly,
                    renderWhitespace: 'selection',
                    lineNumbers: 'on'
                }}
            />
        </div>
    );
};