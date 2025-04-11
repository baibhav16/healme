import React, { useState } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";

function App() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [input, setInput] = useState("");
  const [symptoms, setSymptoms] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [ask, setAsk] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = "https://healme-1-jhun.onrender.com"; // Replace with your Render URL

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
    setName("");
    setAge("");
    setGender("");
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(16);
    doc.text("🧾 Diagnosis Report", 20, y);

    doc.setFontSize(12);
    y += 10;
    doc.text(`Name: ${result.name}`, 20, y);
    y += 10;
    doc.text(`Age: ${result.age}`, 20, y);
    y += 10;
    doc.text(`Gender: ${result.gender}`, 20, y);
    y += 10;
    doc.text(`Disease: ${result.Disease}`, 20, y);
    y += 10;
    doc.text(`Confidence: ${result.Confidence}%`, 20, y);
    y += 10;

    const wrapText = (text, maxWidth = 85) => {
      const words = text.split(" ");
      let lines = [];
      let line = "";
      for (let word of words) {
        if ((line + word).length > maxWidth) {
          lines.push(line.trim());
          line = "";
        }
        line += word + " ";
      }
      lines.push(line.trim());
      return lines;
    };

    doc.text("Description:", 20, y += 10);
    wrapText(result.Description).forEach(line => {
      doc.text(line, 30, y += 8);
    });

    y += 10;
    doc.text("Diet:", 20, y);
    result.Diet?.forEach(d => {
      doc.text(`• ${d}`, 30, y += 8);
    });

    y += 10;
    doc.text("Precautions:", 20, y);
    result.Precautions?.forEach(p => {
      doc.text(`• ${p}`, 30, y += 8);
    });

    y += 10;
    doc.text("Recommended Tests:", 20, y);
    result.Tests?.forEach(t => {
      doc.text(`• ${t}`, 30, y += 8);
    });

    doc.save("diagnosis-report.pdf");
  };

  return (
    <div style={{ padding: 30, maxWidth: 700, margin: "auto" }}>
      <h2>🩺 Smart Disease Predictor</h2>

      {!symptoms.length && !result && (
        <div>
          <label>👤 Name:</label><br />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
          <br /><br />

          <label>🎂 Age:</label><br />
          <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="30" type="number" />
          <br /><br />

          <label>⚧️ Gender:</label><br />
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <br /><br />

          <label>🩹 Symptoms (comma-separated):</label><br />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. headache, fever"
            style={{ width: "100%", padding: "10px", marginTop: 10 }}
          />
          <button onClick={startDiagnosis} style={{ marginTop: 10 }}>
            Start Diagnosis
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
        <div style={{ marginTop: 30, border: "1px solid #ccc", padding: 20, borderRadius: 8 }}>
          <h3>🧾 Diagnosis Report</h3>
          <p><strong>Name:</strong> {result.name}</p>
          <p><strong>Age:</strong> {result.age}</p>
          <p><strong>Gender:</strong> {result.gender}</p>
          <p><strong>Disease:</strong> {result.Disease}</p>
          <p><strong>Confidence:</strong> {result.Confidence}%</p>
          <p><strong>Description:</strong> {result.Description}</p>
          <p><strong>Diet:</strong> {result.Diet?.join(", ") || "N/A"}</p>
          <p><strong>Precautions:</strong> {result.Precautions?.join(", ") || "N/A"}</p>
          <p><strong>Tests:</strong> {result.Tests?.join(", ") || "N/A"}</p>

          <button onClick={downloadPDF} style={{ marginTop: 15, marginRight: 10 }}>📄 Download PDF</button>
          <button onClick={reset} style={{ marginTop: 15 }}>🔄 Start Over</button>
        </div>
      )}
    </div>
  );
}

export default App;
