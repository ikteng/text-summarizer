import os
import re
import spacy
import subprocess
import sys
from transformers import pipeline
import nltk
from nltk.tokenize import sent_tokenize
import heapq

# Download NLTK resources
for resource in ["punkt", "punkt_tab"]:
    try:
        nltk.data.find(f"tokenizers/{resource}")
    except LookupError:
        nltk.download(resource)

# Load spaCy model (download if missing)
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
    nlp = spacy.load("en_core_web_sm")

# Load abstractive summarizer
summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")

MAX_CHARS = 3000

def clean_text(text: str) -> str:
    """Remove citations, links, page numbers, and normalize spaces."""
    text = re.sub(r'\[\d+\]', '', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'Page \d+ of \d+', '', text)
    text = re.sub(r'(https?://\S+)', '', text)
    return text.strip()

def extract_key_sentences(text: str, n=8) -> str:
    """Select top N sentences by length as a simple importance heuristic."""
    sentences = sent_tokenize(text)
    if len(sentences) <= n:
        return " ".join(sentences)
    scored = [(len(s), s) for s in sentences]
    top_sentences = [s for _, s in heapq.nlargest(n, scored)]
    return " ".join(top_sentences)

def abstractive_summarize(text: str) -> str:
    """Summarize text using abstractive method with chunking."""
    # Preselect important sentences
    preselected_text = extract_key_sentences(text, n=8)
    
    text_length = len(preselected_text)
    max_len = min(250, max(80, int(text_length * 0.5)))
    min_len = min(80, max(50, int(max_len * 0.5)))

    if len(preselected_text) <= MAX_CHARS:
        result = summarizer(preselected_text, max_length=max_len, min_length=min_len, do_sample=False)
        return result[0]['summary_text']

    # Chunking for very long preselected text
    doc = nlp(preselected_text)
    chunks = []
    current_chunk = ""
    for sent in doc.sents:
        if len(current_chunk) + len(sent.text) > MAX_CHARS:
            chunk_summary = summarizer(
                current_chunk,
                max_length=min(200, int(len(current_chunk)*0.5)),
                min_length=50,
                do_sample=False
            )[0]['summary_text']
            chunks.append(chunk_summary)
            current_chunk = sent.text
        else:
            current_chunk += " " + sent.text

    if current_chunk.strip():
        chunk_summary = summarizer(
            current_chunk,
            max_length=min(200, int(len(current_chunk)*0.5)),
            min_length=50,
            do_sample=False
        )[0]['summary_text']
        chunks.append(chunk_summary)

    combined = " ".join(chunks)
    final_summary = summarizer(
        combined,
        max_length=250,
        min_length=80,
        do_sample=False
    )[0]['summary_text']
    return final_summary

def summarize(text: str) -> str:
    """Clean text and summarize using enhanced abstractive approach."""
    text = clean_text(text)
    return abstractive_summarize(text)

if __name__ == "__main__":
    long_text = """
    The Internet (or internet) is the global system of interconnected computer networks...
    (rest of your text here)
    """
    result = summarize(long_text)
    print("Summary:\n", result)