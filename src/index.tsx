import React from 'react';
import ReactDOM from 'react-dom/client';
import { ToastContainer, Zoom } from 'react-toastify';
import { App } from '@/App.tsx';

const rootEl = document.getElementById('root');
if (rootEl) {
    const root = ReactDOM.createRoot(rootEl);
    root.render(
        <React.StrictMode>
            <ToastContainer transition={Zoom}/>
            <App/>
        </React.StrictMode>
    );
}
