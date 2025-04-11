import React, { useState } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import "./App.css";

function App() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [input, setInput] = useState("");
  const [symptoms, setSymptoms] = useState([]);
  const [followupQA, setFollowupQA] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [ask, setAsk] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = "https://healme-1-jhun.onrender.com";

  const startDiagnosis = async () => {
    const parsed = input
      .split(",")
      .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
      .filter((s) => s.length > 0);

    if (!parsed.length || !name || !age || !gender) {
      return alert("Please fill in all fields and symptoms.");
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/start`, {
        name,
        age,
        gender,
        symptoms: parsed,
      });
      if (res.data.done) {
        setResult(res.data);
      } else {
        setSessionId(res.data.session_id);
        setAsk(res.data.symptom);
        setSymptoms(parsed);
        setFollowupQA([]);
      }
    } catch (err) {
      alert("Failed to connect to backend.");
    }
    setLoading(false);
  };

  const handleAnswer = async (answer) => {
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/answer`, {
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

      setFollowupQA((prev) => [...prev, { question: ask, answer }]);
      if (answer === "yes") {
        setSymptoms((prev) => [...prev, ask]);
      }
    } catch (err) {
      alert("Something went wrong while answering follow-up.");
    }
    setLoading(false);
  };

  const handleEditAnswer = async (index, newAnswer) => {
    const updatedQA = [...followupQA];
    updatedQA[index].answer = newAnswer;
    setFollowupQA(updatedQA);

    // Recalculate symptoms
    const updatedSymptoms = [...symptoms];
    updatedQA.forEach((item) => {
      if (item.answer === "yes" && !updatedSymptoms.includes(item.question)) {
        updatedSymptoms.push(item.question);
      } else if (item.answer === "no" && updatedSymptoms.includes(item.question)) {
        updatedSymptoms.splice(updatedSymptoms.indexOf(item.question), 1);
      }
    });

    // Restart session with updated symptoms
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/start`, {
        name,
        age,
        gender,
        symptoms: updatedSymptoms,
      });
      if (res.data.done) {
        setResult(res.data);
        setAsk(null);
      } else {
        setSessionId(res.data.session_id);
        setAsk(res.data.symptom);
        setSymptoms(updatedSymptoms);
        setFollowupQA(updatedQA);
      }
    } catch (err) {
      alert("Failed to re-evaluate diagnosis.");
    }
    setLoading(false);
  };

  const reset = () => {
    setName("");
    setAge("");
    setGender("");
    setInput("");
    setSymptoms([]);
    setSessionId(null);
    setAsk(null);
    setResult(null);
    setFollowupQA([]);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(16);
    doc.text("🧾 Diagnosis Report", 20, y);

    doc.setFontSize(12);
    y += 10;
    doc.text(`Name: ${result.name}`, 20, (y += 10));
    doc.text(`Age: ${result.age}`, 20, (y += 10));
    doc.text(`Gender: ${result.gender}`, 20, (y += 10));
    doc.text(`Disease: ${result.Disease}`, 20, (y += 10));
    doc.text(`Confidence: ${result.Confidence}%`, 20, (y += 10));

    doc.text(`Initial Symptoms: ${result.initial_symptoms?.join(", ")}`, 20, (y += 10));
    doc.text(`Follow-up Answers:`, 20, (y += 10));
    result.followup_qa?.forEach((item) => {
      doc.text(`• ${item.question.replace(/_/g, " ")} — ${item.answer}`, 30, (y += 8));
    });

    doc.text("Description:", 20, (y += 10));
    result.Description?.split(" ").forEach((word, i) => {
      if (i % 10 === 0) y += 8;
      doc.text(word, 30 + (i % 10) * 20, y);
    });

    y += 10;
    doc.text("Diet:", 20, y);
    result.Diet?.forEach((d) => {
      doc.text(`• ${d}`, 30, (y += 8));
    });

    y += 10;
    doc.text("Precautions:", 20, y);
    result.Precautions?.forEach((p) => {
      doc.text(`• ${p}`, 30, (y += 8));
    });

    y += 10;
    doc.text("Recommended Tests:", 20, y);
    result.Tests?.forEach((t) => {
      doc.text(`• ${t}`, 30, (y += 8));
    });

    doc.save("diagnosis-report.pdf");
  };

  return (
    <div>
      <div className="nav">
  <button className="nav-btn left" onClick={reset}>🏠 Home</button>
      <h2 className="title">🩺HealMe</h2>
      <a
    href="https://druginteractions.vercel.app/"  // <-- Replace this with your link
    target="_blank"
    rel="noopener noreferrer"
    className="nav-btn right"
  >
    🔗Check Drug Interaction
  </a>
      </div>
    <div className="app">
      

      {!symptoms.length && !result && (
        <div className="form-card">
          <label>👤 Name:</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
          <label>🎂 Age:</label>
          <input value={age} onChange={(e) => setAge(e.target.value)} type="number" placeholder="30" />
          <label>⚧️ Gender:</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <label>🩹 Symptoms (comma-separated):</label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. headache, fatigue"
          />
          <button className="btn primary" onClick={startDiagnosis}>Start Diagnosis</button>
        </div>
      )}

      {loading && <p className="loading">🔎 Analyzing...</p>}

      {ask && !result && (
  <div className="followup-box animated-fade">
    <h4>🩺 Follow-Up Question</h4>
    <p className="question-text">Do you also have <strong>{ask.replace(/_/g, " ")}</strong>?</p>
    <div className="btn-group">
      <button className="btn yes" onClick={() => handleAnswer("yes")}>✅ Yes</button>
      <button className="btn no" onClick={() => handleAnswer("no")}>❌ No</button>
    </div>
  </div>
)}

      {followupQA.length > 0 && !result && (
        <div className="edit-list">
          <h4>Edit Follow-up Answers:</h4>
          {followupQA.map((item, index) => (
            <div key={index} className="followup-edit-row">
              <span>{item.question.replace(/_/g, " ")}</span>
              <select
                value={item.answer}
                onChange={(e) => handleEditAnswer(index, e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="result-card">
          <h3>🧾 Diagnosis Report</h3>
          <p><strong>Name:</strong> {result.name}</p>
          <p><strong>Age:</strong> {result.age}</p>
          <p><strong>Gender:</strong> {result.gender}</p>
          <p><strong>Disease:</strong> {result.Disease}</p>
          <p><strong>Confidence:</strong> {result.Confidence}%</p>
          <p><strong>Initial Symptoms:</strong> {result.initial_symptoms?.join(", ")}</p>
          <p><strong>Follow-up Answers:</strong></p>
          <ul>
            {result.followup_qa?.map((item, idx) => (
              <li key={idx}>
                {item.question.replace(/_/g, " ")} — <strong>{item.answer.toUpperCase()}</strong>
              </li>
            ))}
          </ul>
          <p><strong>Description:</strong> {result.Description}</p>
          <p><strong>Diet:</strong> {result.Diet?.join(", ") || "N/A"}</p>
          <p><strong>Precautions:</strong> {result.Precautions?.join(", ") || "N/A"}</p>
          <p><strong>Tests:</strong> {result.Tests?.join(", ") || "N/A"}</p>

          <div className="button-row">
            <button className="btn download" onClick={downloadPDF}>📄 Download PDF</button>
            <button className="btn reset" onClick={reset}>🔄 Start Over</button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

export default App;
