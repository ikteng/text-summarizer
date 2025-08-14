#!/bin/bash

echo "Checking if virtual environment exists..."
if [ ! -d ".venv" ]; then
  echo "Virtual environment not found. Creating .venv..."
  python -m venv .venv
else
  echo "Virtual environment already exists."
fi

echo "Activating virtual environment..."
source .venv/Scripts/activate

echo "Installing dependencies from requirements.txt..."
pip install -r requirements.txt

echo "Starting Flask app..."
python -u backend/app.py &

echo "Starting React-Native frontend..."
cd TextSummarizerApp
npm run web &

wait
