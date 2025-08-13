# launcher.py
import webview
import threading
from app import app  # Import Flask app

# Start Flask in a separate thread
def start_flask():
    app.run(debug=False, port=5000, use_reloader=False)

flask_thread = threading.Thread(target=start_flask)
flask_thread.daemon = True
flask_thread.start()

# Start PyWebview window pointing to Flask app
webview.create_window("Text Summarizer", "http://127.0.0.1:5000")
webview.start()
