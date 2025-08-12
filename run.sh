#!/bin/bash

echo "Checking if virtual environment exists..."
if [ ! -d ".venv" ]; then
  echo "Virtual environment not found. Creating .venv..."
  python3 -m venv .venv
else
  echo "Virtual environment already exists."
fi

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Installing dependencies from requirements.txt..."
pip install -r requirements.txt

# echo "Downloading spaCy English model..."
# python -m spacy download en_core_web_sm

# echo "Downloading NLTK punkt tokenizer..."
# python -m nltk.downloader punkt

echo "Starting Flask app..."
python -u app.py &

echo "Starting React frontend..."
cd frontend
npm start &

wait
