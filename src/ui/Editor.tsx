import * as React from 'react';
import { parseSourceToZod } from '@/parser';
import { Diagnostics } from './Diagnostics';
import { notificationService } from '@/services/NotificationService.ts';
import { MonacoPane } from '@/ui/MonacoPane.tsx';

type Lang = 'auto' | 'java' | 'kotlin';

function guessLang(s: string): Lang {
    if (/\bdata\s+class\b/.test(s)) {
        return 'kotlin';
    }
    if (/\b(val|var)\s+\w+\s*:/.test(s)) {
        return 'kotlin';
    }
    return 'java';
}

export const Editor: React.FC = (): React.ReactElement => {
    const [input, setInput] = React.useState<string>(sampleJava);
    const [output, setOutput] = React.useState<string>('');
    const [diags, setDiags] = React.useState<any[]>([]);
    const [detected, setDetected] = React.useState<Lang>(guessLang(sampleJava));

    const leftRef = React.useRef<any>(null);
    const leftMonacoRef = React.useRef<any>(null);
    const rightRef = React.useRef<any>(null);
    const rightMonacoRef = React.useRef<any>(null);
    const debounceId = React.useRef<number | null>(null);

    // const formatTs = React.useCallback(async (code: string): Promise<string> => {
    //     try {
    //         return await prettier.format(code, {
    //             parser: 'typescript',
    //             plugins: [parserTypescript as any],
    //             semi: false,
    //             singleQuote: true,
    //             trailingComma: 'none',
    //             printWidth: 100
    //         });
    //     } catch {
    //         return code;
    //     }
    // }, []);

    const run = React.useCallback(() => {
        const res = parseSourceToZod(input);
        setOutput(res.code);
        setDiags(res.diagnostics);
        // nastav přímo do pravého editoru (pokud je)
        if (rightRef.current) {
            const model = rightRef.current.getModel?.();
            if (model) rightRef.current.setValue(res.code);
        }
    }, [input, setOutput, setDiags, rightRef.current]);

    // init parse
    React.useEffect(() => {
        run();
    }, []); // eslint-disable-line

    // debounce při psaní vlevo
    const onInputChange = (v: string): void => {
        setInput(v);
        setDetected(guessLang(v));
        if (debounceId.current) {
            window.clearTimeout(debounceId.current);
        }
        debounceId.current = window.setTimeout(run, 250);
    };

    const onFormatOut = (): void => {
        setOutput(output);
        if (rightRef.current) {
            rightRef.current.setValue(output);
        }
    };

    const onCopy = async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(output);
            notificationService.success('Copied to clipboard');
        } catch {
            notificationService.error('Failed to copy to clipboard');
        }
    };

    const bindShortcuts = React.useCallback((editor: any, monaco: any) => {
        // Ctrl/Cmd + Enter = parse
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => run());
        // Ctrl/Cmd + B = format
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => onFormatOut());
    }, [run]); // eslint-disable-line

    const onKotlin = (): void => {
        setInput(sampleKotlin);
        setDetected('kotlin');
        setTimeout(run, 0);
    };

    const onJava = (): void => {
        setInput(sampleJava);
        setDetected('java');
        setTimeout(run, 0);
    };

    return (
        <div className={'editor'}>
            <div className={'toolbar'}>
                <div className={'left'}>
                    <button onClick={onJava}>
                        Java example
                    </button>
                    <button onClick={onKotlin}>
                        Kotlin example
                    </button>
                    <span className={'badge'}>detekováno: {detected === 'kotlin' ? 'Kotlin' : 'Java'}</span>
                </div>
                <div className={'right'}>
                    <button onClick={run} title={'Ctrl/Cmd + Enter'}>Parse</button>
                    <button onClick={onCopy}>Copy</button>
                </div>
            </div>

            <div className={'panes'}>
                <MonacoPane
                    value={input}
                    language={'java'}
                    onChange={onInputChange}
                    onReady={(ed, monaco) => {
                        leftRef.current = ed;
                        leftMonacoRef.current = monaco;
                        bindShortcuts(ed, monaco);
                    }}
                />
                <MonacoPane
                    value={output}
                    language={'typescript'}
                    readOnly
                    onReady={(ed, monaco) => {
                        rightRef.current = ed;
                        rightMonacoRef.current = monaco;
                        bindShortcuts(ed, monaco);
                    }}
                />
            </div>

            <Diagnostics items={diags}/>
        </div>
    );
};

const sampleJava = `
public class Product {
  @NotNull
  @Size(min = 3, max = 50)
  @JsonProperty("id")
  public String productId;

  public Integer stock;
  @Pattern(regexp = "^[A-Z0-9_-]+$")
  public String sku;
  public boolean active;
}
`.trim();

const sampleKotlin = `
import com.squareup.moshi.Json

data class User(
  @Json(name = "id") val userId: String,
  val age: Int?,
  val tags: List<String>,
  val createdAt: java.time.Instant
)
`.trim();
