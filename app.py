from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import summarizer
import os

app = Flask(__name__, static_folder="frontend/build", static_url_path="/")
CORS(app)

@app.route('/api/summarize', methods=['POST'])
def summarize():
    data = request.json
    text = data.get('text', '') if data else ''
    try:
        summary = summarizer.main(text)
    except Exception as e:
        summary = "Error generating summary: " + str(e)

    return jsonify({
        'original_text': text,
        'summary': summary
    })

# Serve React app
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")

if __name__ == '__main__':
    app.run(debug=True, port=5000, use_reloader=False)
