
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { INITIAL_JOBS } from './constants';

const JOBS_DB_KEY = 'hirestream_jobs_db';

// Bootstrap Jobs Database
if (!localStorage.getItem(JOBS_DB_KEY)) {
  localStorage.setItem(JOBS_DB_KEY, JSON.stringify(INITIAL_JOBS));
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
