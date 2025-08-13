import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import summarizer
from werkzeug.utils import secure_filename
import PyPDF2
import mammoth
from io import BytesIO

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/api/extract-text', methods=['POST'])
def extract_text():
    uploaded_file = request.files.get('file')
    if not uploaded_file or not uploaded_file.filename:
        return jsonify({'text': ''})

    filename = secure_filename(uploaded_file.filename)
    file_ext = filename.rsplit('.', 1)[-1].lower()

    file_bytes = uploaded_file.read()
    text = ''

    if file_ext == 'pdf':
        reader = PyPDF2.PdfReader(BytesIO(file_bytes))
        # Extract text from pages efficiently
        text = "\n".join(page.extract_text() or '' for page in reader.pages)

    elif file_ext == 'docx':
        result = mammoth.extract_raw_text(BytesIO(file_bytes))
        text = result.value

    elif file_ext == 'txt':
        text = file_bytes.decode('utf-8')

    else:
        return jsonify({'text': ''})

    return jsonify({'text': text})

@app.route('/api/summarize', methods=['POST'])
def summarize():
    print("Summarizing text...")
    data = request.json
    text = data.get('text', '') if data else ''
    try:
        summary = summarizer.summarize(text)
    except Exception as e:
        summary = "Error generating summary: " + str(e)

    record = {
        'original_text': text,
        'summary': summary
    }
    return jsonify(record)

if __name__ == '__main__':
    app.run(debug=True, use_reloader=True)