from flask import Flask, request, jsonify
from flask_cors import CORS
from predictor import diagnose_with_followups, suggest_follow_ups
import uuid
import os

app = Flask(__name__)
CORS(app)

sessions = {}

@app.route("/start", methods=["POST"])
def start():
    data = request.get_json()
    symptoms = [s.strip().lower().replace(" ", "_") for s in data.get("symptoms", [])]
    name = data.get("name")
    age = data.get("age")
    gender = data.get("gender")
    session_id = str(uuid.uuid4())

    sessions[session_id] = {
        "symptoms": symptoms,
        "asked": set(),
        "name": name,
        "age": age,
        "gender": gender,
        "followup_qa": []
    }

    return run_diagnosis(session_id)

@app.route("/answer", methods=["POST"])
def answer():
    data = request.get_json()
    session_id = data.get("session_id")
    answer = data.get("answer")
    follow_symptom = data.get("symptom")

    if session_id not in sessions:
        return jsonify({"error": "Invalid session"}), 400

    session = sessions[session_id]

    if answer == "yes":
        session["symptoms"].append(follow_symptom)

    session["asked"].add(follow_symptom)
    session["followup_qa"].append({
        "question": follow_symptom,
        "answer": answer
    })

    return run_diagnosis(session_id)

@app.route("/update-followups", methods=["POST"])
def update_followups():
    data = request.get_json()
    name = data.get("name")
    age = data.get("age")
    gender = data.get("gender")
    qa = data.get("followup_qa", [])
    initial_symptoms = data.get("initial_symptoms", [])

    # Rebuild symptoms based on all "yes" answers
    updated_symptoms = initial_symptoms.copy()
    for item in qa:
        if item["answer"] == "yes" and item["question"] not in updated_symptoms:
            updated_symptoms.append(item["question"])
        elif item["answer"] == "no" and item["question"] in updated_symptoms:
            updated_symptoms.remove(item["question"])

    # Dummy session to evaluate diagnosis
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "symptoms": updated_symptoms,
        "asked": {item["question"] for item in qa},
        "name": name,
        "age": age,
        "gender": gender,
        "followup_qa": qa
    }

    return run_diagnosis(session_id)

def run_diagnosis(session_id):
    session = sessions[session_id]

    def ask_user_func(question):
        next_symptom = question.split("'")[1].replace(" ", "_").lower()
        session["last_question"] = next_symptom
        return "no"

    result = diagnose_with_followups(session["symptoms"], ask_user_func)

    if result["Confidence"] >= 85 or len(session["asked"]) >= 10:
        result["done"] = True
        result["name"] = session.get("name")
        result["age"] = session.get("age")
        result["gender"] = session.get("gender")
        result["initial_symptoms"] = session.get("symptoms", [])
        result["followups_asked"] = list(session.get("asked", []))
        result["followup_qa"] = session.get("followup_qa", [])
        sessions.pop(session_id, None)
        return jsonify(result)

    follow_ups = suggest_follow_ups(session["symptoms"], session["asked"])
    if follow_ups:
        return jsonify({
            "done": False,
            "symptom": follow_ups[0],
            "session_id": session_id
        })
    else:
        result["done"] = True
        result["name"] = session.get("name")
        result["age"] = session.get("age")
        result["gender"] = session.get("gender")
        result["initial_symptoms"] = session.get("symptoms", [])
        result["followups_asked"] = list(session.get("asked", []))
        result["followup_qa"] = session.get("followup_qa", [])
        sessions.pop(session_id, None)
        return jsonify(result)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
