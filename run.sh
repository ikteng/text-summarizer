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

# echo "Starting Flask app..."
# python -u app.py &

# echo "Starting React frontend..."
# cd frontend
# npm start &

# wait

echo "Building React frontend..."
cd frontend
npm install
npm run build


echo "Running application..."
cd ..
python launcher.py