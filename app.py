from flask import Flask, request, jsonify
from flask_cors import CORS
import summarizer

app = Flask(__name__)
CORS(app)

@app.route('/api/summarize', methods=['POST'])
def summarize():
    print("Summarizing text...")
    data = request.json
    text = data.get('text', '') if data else ''
    try:
        summary = summarizer.main(text)
    except Exception as e:
        summary = "Error generating summary: " + str(e)

    record = {
        'original_text': text,
        'summary': summary
    }
    return jsonify(record)

if __name__ == '__main__':
    app.run(debug=True, use_reloader=True)
