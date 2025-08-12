// Home.js

import React, { useState, useRef, useEffect } from 'react';
import './Home.css';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = "http://localhost:5000";

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      
      if (res.ok) {
        const data = await res.json();
        const now = new Date();
        const title = now.toLocaleString();
        setSummary({ ...data, title });
        setInputText('');
      } else {
        alert('Failed to summarize');
      }
    } catch (err) {
      alert('Error connecting to backend');
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="app-container">
      <div className="input-section">
        <h2>Paste Text to Summarize</h2>
        <textarea
          className="input-textarea"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste or type text here..."
        />
        <button
          className="submit-button"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Summarizing...' : 'Summarize'}
        </button>
      </div>

      <div className="summary-section">
        <h2>Summary</h2>
        {!summary ? (
          <p className="no-summary-text">No summary yet.</p>
        ) : (
          <SummaryRecord
            title={summary.title}
            original={summary.original_text}
            summary={summary.summary}
          />
        )}
      </div>
    </div>
  );
}

function SummaryRecord({ title, original, summary }) {
  const [expanded, setExpanded] = React.useState(false);

  // Copy text to clipboard with a fallback alert
  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
      }).catch(() => {
        alert('Failed to copy.');
      });
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        alert('Copied to clipboard!');
      } catch {
        alert('Failed to copy.');
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="summary-record">
      <div
        className="summary-title"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => { if (e.key === 'Enter') setExpanded(!expanded); }}
        aria-expanded={expanded}
      >
        {title}
      </div>

      {expanded && (
        <>
          <div className="original-text">
            <div className="header-with-copy">
              <strong>Original Text</strong>
              <button
                className="copy-button"
                onClick={() => copyToClipboard(original)}
                aria-label="Copy original text"
              >
                Copy
              </button>
            </div>
            <p className="expanded">{original}</p>
          </div>

          <div className="summary-text">
            <div className="header-with-copy">
              <strong>Summary</strong>
              <button
                className="copy-button"
                onClick={() => copyToClipboard(summary)}
                aria-label="Copy summary text"
              >
                Copy
              </button>
            </div>
            <p>{summary}</p>
          </div>
        </>
      )}
    </div>
  );
}
