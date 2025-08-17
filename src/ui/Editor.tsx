import * as React from 'react';
import { parseSourceToZod } from '@/parser';
import { Diagnostics } from './Diagnostics';
import { notificationService } from '@/services/NotificationService.ts';

type Lang = 'auto' | 'java' | 'kotlin';

export const Editor: React.FC = (): React.ReactElement => {
    const [lang, setLang] = React.useState<Lang>('auto');
    const [input, setInput] = React.useState<string>(sampleJava);
    const [output, setOutput] = React.useState<string>('');
    const [diags, setDiags] = React.useState<any[]>([]);

    const run = React.useCallback(() => {
        const res = parseSourceToZod(input);
        setOutput(res.code);
        setDiags(res.diagnostics);
    }, [input, setOutput, setDiags]);

    React.useEffect(() => {
        run();
    }, [run]);

    const onExample = (which: 'java' | 'kotlin'): void => {
        if (which === 'java') {
            setInput(sampleJava);
        } else {
            setInput(sampleKotlin);
        }
        setTimeout(run, 0);
    };

    const copy = async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(output);
            notificationService.success('Copied to clipboard');
        } catch {
            notificationService.error('Failed to copy to clipboard');
        }
    };

    return (
        <div className={'editor'}>
            <div className={'toolbar'}>
                <div className={'left'}>
                    <button onClick={() => onExample('java')}>
                        Java example
                    </button>

                    <button onClick={() => onExample('kotlin')}>
                        Kotlin example
                    </button>
                </div>
                <div className={'right'}>
                    <select
                        value={lang}
                        onChange={e => setLang(e.target.value as Lang)}
                        disabled
                    >
                        <option value={'auto'}>auto-detect</option>
                        <option value={'java'}>java</option>
                        <option value={'kotlin'}>kotlin</option>
                    </select>
                    <button onClick={run}>Parse</button>
                    <button onClick={copy}>Copy</button>
                </div>
            </div>

            <div className={'panes'}>
                <textarea
                    className={'pane input'}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={'Vlož Java nebo Kotlin class...'}
                />
                <textarea
                    className={'pane output'}
                    value={output}
                    onChange={e => setOutput(e.target.value)}
                    placeholder={'Zod v4 output...'}
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
