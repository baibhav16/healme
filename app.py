from flask import Flask, request, jsonify
from flask_cors import CORS
from predictor import diagnose_with_followups, suggest_follow_ups, encode_symptoms, get_additional_info
import uuid

app = Flask(__name__)
CORS(app)

# Session-like storage
user_sessions = {}

@app.route("/start", methods=["POST"])
def start():
    data = request.get_json()
    symptoms = [s.strip().lower().replace(" ", "_") for s in data.get("symptoms", [])]
    session_id = str(uuid.uuid4())
    user_sessions[session_id] = {
        "symptoms": symptoms,
        "asked": set()
    }

    return run_diagnosis(session_id)

@app.route("/answer", methods=["POST"])
def answer():
    data = request.get_json()
    session_id = data.get("session_id")
    answer = data.get("answer")
    follow_symptom = data.get("symptom")

    if session_id not in user_sessions:
        return jsonify({"error": "Invalid session"}), 400

    session = user_sessions[session_id]

    if answer == "yes":
        session["symptoms"].append(follow_symptom)

    session["asked"].add(follow_symptom)

    return run_diagnosis(session_id)

def run_diagnosis(session_id):
    session = user_sessions[session_id]

    def fake_user_func(q):
        return "no"  # We skip this — frontend handles asking

    encoded = encode_symptoms(session["symptoms"])
    pred = diagnose_with_followups(session["symptoms"], fake_user_func)

    if pred["Confidence"] >= 85 or len(session["asked"]) >= 10:
        pred["done"] = True
        return jsonify(pred)

    follow_ups = suggest_follow_ups(session["symptoms"], session["asked"])
    if follow_ups:
        return jsonify({
            "done": False,
            "symptom": follow_ups[0],
            "session_id": session_id
        })
    else:
        pred["done"] = True
        return jsonify(pred)

if __name__ == "__main__":
    app.run(debug=True)
