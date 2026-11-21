from flask import Flask, render_template, request, jsonify
import sqlite3
import os

app = Flask(__name__)

# Connexion à la base de données
def get_db_connection():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mood_journal.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


# Créer la table
def create_table():
    conn = get_db_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mood TEXT NOT NULL,
            content TEXT NOT NULL,
            date TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


# Page principale
@app.route("/")
def home():
    return render_template("index.html")


# Ajouter une entrée
@app.route("/add", methods=["POST"])
def add_entry():

    data = request.get_json()

    if not data:
        return jsonify({"error": "Données manquantes"}), 400

    mood = data.get("mood", "").strip()
    content = data.get("content", "").strip()
    date = data.get("date", "").strip()

    if not mood or not content or not date:
        return jsonify({"error": "Champs obligatoires"}), 400

    conn = get_db_connection()

    conn.execute(
        "INSERT INTO entries (mood, content, date) VALUES (?, ?, ?)",
        (mood, content, date)
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "Entry saved successfully"})


# Afficher les entrées
@app.route("/entries", methods=["GET"])
def get_entries():

    conn = get_db_connection()

    entries = conn.execute(
        "SELECT * FROM entries ORDER BY id DESC"
    ).fetchall()

    conn.close()

    return jsonify([dict(entry) for entry in entries])


# Supprimer une entrée
@app.route("/delete/<int:entry_id>", methods=["DELETE"])
def delete_entry(entry_id):

    conn = get_db_connection()

    cursor = conn.execute(
        "DELETE FROM entries WHERE id = ?",
        (entry_id,)
    )

    conn.commit()
    deleted = cursor.rowcount
    conn.close()

    if deleted == 0:
        return jsonify({"error": "Entry not found"}), 404

    return jsonify({"message": "Entry deleted successfully"})

# Modifier une entrée
@app.route("/update/<int:entry_id>", methods=["PUT"])
def update_entry(entry_id):
    data = request.get_json()

    mood = data.get("mood", "").strip()
    content = data.get("content", "").strip()
    date = data.get("date", "").strip()

    if not mood or not content or not date:
        return jsonify({"error": "Champs obligatoires"}), 400

    conn = get_db_connection()

    cursor = conn.execute("""
        UPDATE entries
        SET mood = ?, content = ?, date = ?
        WHERE id = ?
    """, (mood, content, date, entry_id))

    conn.commit()
    updated = cursor.rowcount
    conn.close()

    if updated == 0:
        return jsonify({"error": "Entry not found"}), 404

    return jsonify({"message": "Entry updated successfully"})

create_table()
if __name__ == "__main__":
    app.run(debug=True)