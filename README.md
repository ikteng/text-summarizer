# React Native Text Summarizer

A mobile-friendly text summarization app built with **React Native** and **Expo**. Users can paste text or upload documents to extract and summarize content, then view, copy, or download the summaries.

---

## Features

- **Text Input & Summarization**
  - Paste or type text directly into the app.
  - Summarize the input text with a single tap.

- **File Upload & Text Extraction**
  - Upload `.txt`, `.pdf`, or `.docx` files.
  - Extract text from uploaded documents before summarization.
  - Compatible with both **web** and **mobile** platforms.

- **Summary Management**
  - Keep multiple summary records.
  - Expand records to view original text and summary.
  - Copy text to clipboard or download as `.txt`.

- **Status Tracking**
  - Shows pending, done, or error status for each summary.
  - Retry summarization for failed attempts.

- **Cross-Platform**
  - Works on **iOS**, **Android**, and **Web**.

---

## Usage
1.Paste Text
    Enter the text you want summarized in the input box.

2. Upload File
    Choose a file (.txt, .pdf, .docx) to extract text.

3. Summarize
    Tap the Summarize button to generate a summary.

4. Manage Summaries
    - Expand a summary record to view original text and summary.
    - Copy or download each text block.
    - Delete or re-summarize any record.

--

## Installation

1. clone the reponsitory
2. run `npx expo start`
3. make sure the backend is running

---

# Future Improvements
- support additional file formats 
- store summaries locally for offline access
- make the summarizer faster
- improve the file handling
- improve the UI

---

You can test this app out by downloading the apk in this project!

Backend: https://huggingface.co/spaces/ikteng/text-summarizer-docker
