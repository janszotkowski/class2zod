import * as React from 'react';
import './App.css';
import { Editor } from '@/ui/Editor.tsx';

export const App: React.FC = (): React.ReactElement => (
    <main className={'main'}>
        <h1>Class → Zod v4</h1>
        <p className={'subtitle'}>Java & Kotlin DTO → Zod v4 schemas (browser-only)</p>
        <Editor/>
    </main>
);
