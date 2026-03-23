import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import './styles/components.css';
import './styles/settings.css';
import './styles/ui.css';
import './styles/dashboard.css';
import './styles/goals.css';
import './styles/projects.css';
import './styles/tasks.css';
import './styles/notes.css';
import './styles/calendar.css';
import './styles/finance.css';
import './styles/email.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
