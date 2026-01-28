# Tower of Hanoi

A Tower of Hanoi game with both a Flask web UI and a CLI. The web app exposes simple JSON endpoints for state management and solving, while the CLI offers an interactive terminal experience.

## Features

- Interactive web UI (Flask + HTML + vanilla JS)
- Canvas-based rendering with drag-and-drop moves
- Action log with timestamps and status messages
- CLI gameplay with undo/redo
- Auto-solve using recursive algorithm
- Disk count configurable from 3 to 10

## Requirements

- Python 3.10+

## Setup

1. Create and activate a virtual environment (optional).
2. Install dependencies:
   - `pip install -r requirements.txt`

## Run the web app

- `python app.py`
- Open http://127.0.0.1:5000

## Run the CLI

- `python main.py`

## API Endpoints

- `GET /state` — get current game state
- `POST /reset` — reset game with body `{ "n": 3 }` (3–10)
- `POST /move` — move a disk with body `{ "src": "A", "dest": "C" }`
- `POST /undo` — undo last move
- `POST /redo` — redo last undone move
- `POST /solve` — reset and return a solution sequence

## Project Structure

- `app.py` — Flask server
- `main.py` — CLI game
- `templates/` — HTML template(s)
- `static/` — JS/CSS assets

## JavaScript Implementation

The front-end logic is written in vanilla JavaScript and renders the towers on an HTML canvas. It fetches state from the Flask API, posts moves, and animates auto-solve sequences while locking controls during playback. Drag-and-drop uses pointer events to move the top disk between towers, with validation handled server-side.

## License

MIT. See LICENSE.
