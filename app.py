from flask import Flask, request, jsonify
from flask_cors import CORS
from predictor import diagnose_with_followups, continue_diagnosis

app = Flask(__name__)
CORS(app)

sessions = {}

@app.route("/start", methods=["POST"])
def start_diagnosis():
    data = request.json
    symptoms = data.get("symptoms", [])

    result = diagnose_with_followups(symptoms)

    if result["done"]:
        return jsonify(result)
    else:
        session_id = str(len(sessions) + 1)
        sessions[session_id] = result
        return jsonify({
            "session_id": session_id,
            "symptom": result["symptom"],
            "done": False
        })

@app.route("/answer", methods=["POST"])
def continue_diag():
    data = request.json
    session_id = data["session_id"]
    answer = data["answer"]
    symptom = data["symptom"]

    session_data = sessions.get(session_id)

    if not session_data:
        return jsonify({"error": "Invalid session"}), 400

    result = continue_diagnosis(session_data, symptom, answer)
    
    if result["done"]:
        return jsonify(result)
    else:
        sessions[session_id] = result
        return jsonify({
            "session_id": session_id,
            "symptom": result["symptom"],
            "done": False
        })

# 👇 Required for Render to bind to the correct port
if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
