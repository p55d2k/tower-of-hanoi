from __future__ import annotations

from threading import Lock
from typing import Dict, List

from flask import Flask, jsonify, render_template, request

from main import TowerOfHanoi


app = Flask(__name__)
state_lock = Lock()
game = TowerOfHanoi(3)


def serialize_game() -> Dict[str, object]:
    return {
        "n": game.get_n(),
        "step": game.get_step(),
        "last_action": game.get_last_action(),
        "towers": {key: value.items[:] for key, value in game.towers.items()},
    }


def generate_moves(n: int, src: str, dest: str, aux: str) -> List[Dict[str, str]]:
    if n == 1:
        return [{"src": src, "dest": dest}]
    moves = generate_moves(n - 1, src, aux, dest)
    moves.append({"src": src, "dest": dest})
    moves.extend(generate_moves(n - 1, aux, dest, src))
    return moves


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/state", methods=["GET"])
def state():
    with state_lock:
        return jsonify({"ok": True, "state": serialize_game()})


@app.route("/reset", methods=["POST"])
def reset():
    data = request.get_json(silent=True) or {}
    n = int(data.get("n", 3))
    if n < 3 or n > 10:
        return jsonify({"ok": False, "message": "Disk count must be between 3 and 10."})

    with state_lock:
        global game
        game = TowerOfHanoi(n)
        return jsonify({"ok": True, "state": serialize_game()})


@app.route("/move", methods=["POST"])
def move():
    data = request.get_json(silent=True) or {}
    src = str(data.get("src", "")).upper()
    dest = str(data.get("dest", "")).upper()

    if src not in ("A", "B", "C") or dest not in ("A", "B", "C"):
        return jsonify({"ok": False, "message": "Invalid tower names."})

    with state_lock:
        result = game.move_disk(src, dest)
        if result is False:
            return jsonify(
                {"ok": False, "message": "Invalid move.", "state": serialize_game()}
            )
        return jsonify({"ok": True, "state": serialize_game()})


@app.route("/undo", methods=["POST"])
def undo():
    with state_lock:
        game.undo_move()
        return jsonify({"ok": True, "state": serialize_game()})


@app.route("/redo", methods=["POST"])
def redo():
    with state_lock:
        game.redo_move()
        return jsonify({"ok": True, "state": serialize_game()})


@app.route("/solve", methods=["POST"])
def solve():
    with state_lock:
        game.reset_step()
        game.reset_towers()
        game.reset_moves()
        game.last_action = "Solving started."
        moves = generate_moves(game.get_n(), "A", "C", "B")
        return jsonify({"ok": True, "state": serialize_game(), "moves": moves})


if __name__ == "__main__":
    app.run(debug=True)
