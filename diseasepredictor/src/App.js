import React, { useState } from "react";
import axios from "axios";

function App() {
  const [input, setInput] = useState("");
  const [symptoms, setSymptoms] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [ask, setAsk] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const startDiagnosis = async () => {
    const parsed = input
      .split(",")
      .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
      .filter((s) => s.length > 0);

    if (!parsed.length) return alert("Please enter some symptoms.");

    setLoading(true);
    try {
      const res = await axios.post("/start", { symptoms: parsed });
      if (res.data.done) {
        setResult(res.data);
      } else {
        setSessionId(res.data.session_id);
        setAsk(res.data.symptom);
        setSymptoms(parsed);
      }
    } catch (err) {
      alert("Failed to connect to backend.");
    }
    setLoading(false);
  };

  const handleAnswer = async (answer) => {
    setLoading(true);
    try {
      const res = await axios.post("/answer", {
        session_id: sessionId,
        answer,
        symptom: ask,
      });

      if (res.data.done) {
        setResult(res.data);
        setAsk(null);
      } else {
        setAsk(res.data.symptom);
      }
    } catch (err) {
      alert("Something went wrong while answering follow-up.");
    }
    setLoading(false);
  };

  const reset = () => {
    setInput("");
    setSymptoms([]);
    setAsk(null);
    setResult(null);
    setSessionId(null);
  };

  return (
    <div style={{ padding: 30, maxWidth: 600, margin: "auto" }}>
      <h2>🩺 Smart Disease Predictor</h2>

      {!symptoms.length && !result && (
        <div>
          <label>Enter your symptoms (comma separated):</label>
          <br />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. headache, fatigue"
            style={{ width: "100%", padding: "10px", marginTop: 10 }}
          />
          <button onClick={startDiagnosis} style={{ marginTop: 10 }}>
            Diagnose
          </button>
        </div>
      )}

      {loading && <p>Analyzing...</p>}

      {ask && !result && (
        <div style={{ marginTop: 30 }}>
          <p>Do you also have <strong>{ask.replace(/_/g, " ")}</strong>?</p>
          <button onClick={() => handleAnswer("yes")}>Yes</button>
          <button onClick={() => handleAnswer("no")} style={{ marginLeft: 10 }}>
            No
          </button>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 30 }}>
          <h3>🦠 Disease: {result.Disease}</h3>
          <p><strong>Confidence:</strong> {result.Confidence}%</p>
          <p><strong>Description:</strong> {result.Description}</p>
          <p><strong>Diet:</strong> {result.Diet?.join(", ") || "Not available"}</p>
          <p><strong>Precautions:</strong> {result.Precautions?.join(", ") || "Not available"}</p>
          <button onClick={reset} style={{ marginTop: 20 }}>🔄 Start Over</button>
        </div>
      )}
    </div>
  );
}

export default App;
