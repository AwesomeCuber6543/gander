echo "Starting gander backend"
uvicorn main:app --reload --host 0.0.0.0 --port 8000