import { installDocumentDiagnostics } from './lib/diagnostics';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/tokens.css';
import './styles/global.css';
import './styles/compact-ui.css';
import './styles/shell-compact.css';

installDocumentDiagnostics();

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
