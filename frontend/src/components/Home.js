import React, { useState } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import './Home.css';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState('');
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = "http://localhost:5000";

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setInputText(event.target.result);
    };
    reader.readAsText(file);
  };

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
        setSummaries(prev => [{ ...data, title }, ...prev]);
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

  const handleDelete = (index) => {
    setSummaries(prev => prev.filter((_, i) => i !== index));
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

        {/* File Upload */}
        <div className="file-upload-wrapper">
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="upload-button"
            id="fileUpload"
          />
          <label htmlFor="fileUpload" className="upload-label">
            Choose file
          </label>
          <span className="file-name">{inputText ? fileName : 'No file chosen'}</span>
        </div>

        <button
          className="submit-button"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Summarizing...' : 'Summarize'}
        </button>
      </div>

      <div className="summary-section">
        <h2>Summaries</h2>
        {summaries.length === 0 ? (
          <p className="no-summary-text">No summaries yet.</p>
        ) : (
          summaries.map((s, index) => (
            <SummaryRecord
              key={index}
              index={index}
              title={s.title}
              original={s.original_text}
              summary={s.summary}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SummaryRecord({ index, title, original, summary, onDelete }) {
  const [expanded, setExpanded] = React.useState(false);

  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'))
        .catch(() => alert('Failed to copy.'));
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try { document.execCommand('copy'); alert('Copied to clipboard!'); } 
      catch { alert('Failed to copy.'); }
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="summary-record">
      <div className="summary-title-wrapper">
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
        <button
          className="delete-button"
          onClick={() => onDelete(index)}
          aria-label="Delete summary"
        >
          <DeleteIcon fontSize="small" />
        </button>
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
