import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from collections import Counter

# Load pre-trained model and encoders
model = joblib.load("model.pkl")
le = joblib.load("label_encoder.pkl")
symptom_vocabulary = joblib.load("symptom_vocab.pkl")

df = pd.read_csv("DiseaseAndSymptoms.csv")
desc_df = pd.read_csv("description.csv")
prec_df = pd.read_csv("precautions_df.csv")
diet_df = pd.read_csv("diets.csv")
tests_df = pd.read_csv("DiseaseAndDiagnosticTests.csv")
df.fillna("", inplace=True)

# Extract symptom columns
symptom_columns = [col for col in df.columns if col.startswith("Symptom_")]
df["symptoms_processed"] = df[symptom_columns].apply(
    lambda row: [str(s).strip().lower().replace(" ", "_") for s in row if pd.notna(s) and str(s).strip()],
    axis=1
)

def encode_symptoms(symptom_list):
    symptom_list = [s.strip().lower().replace(" ", "_") for s in symptom_list]
    return [1 if sym in symptom_list else 0 for sym in symptom_vocabulary]

def get_additional_info(disease_name):
    disease_name = disease_name.lower()
    description = desc_df.loc[desc_df["Disease"].str.lower() == disease_name, "Description"]
    diet = diet_df.loc[diet_df["Disease"].str.lower() == disease_name, "Diet"]
    precautions = prec_df.loc[prec_df["Disease"].str.lower() == disease_name].iloc[:, 1:].values.flatten()
    tests = tests_df.loc[tests_df["Disease"].str.lower() == disease_name, "Diagnostic_Test"]

    return {
        "Description": description.values[0] if not description.empty else "No description available.",
        "Diet": eval(diet.values[0]) if not diet.empty else [],
        "Precautions": [p for p in precautions if isinstance(p, str) and p.strip()],
        "Tests": tests.values[0].split(",") if not tests.empty else []
    }

def suggest_follow_ups(current_symptoms, asked_set, top_n=10):
    current_symptoms_set = set(current_symptoms)
    suggestions = []

    for row_syms in df["symptoms_processed"]:
        if any(sym in row_syms for sym in current_symptoms_set):
            for s in row_syms:
                if s not in current_symptoms_set and s not in asked_set:
                    suggestions.append(s)

    counter = Counter(suggestions)
    return [s for s, _ in counter.most_common(top_n)]

def diagnose_with_followups(initial_symptoms, ask_user_func, max_questions=10):
    current_symptoms = [s.strip().lower().replace(" ", "_") for s in initial_symptoms]
    asked = set()

    for _ in range(max_questions):
        input_vector = encode_symptoms(current_symptoms)
        prediction = model.predict([input_vector])
        prob = model.predict_proba([input_vector]).max()
        predicted_disease = le.inverse_transform(prediction)[0]

        if prob > 0.85:
            info = get_additional_info(predicted_disease)
            return {
                "Disease": predicted_disease,
                "Confidence": round(prob * 100, 2),
                "Description": info["Description"],
                "Diet": info["Diet"],
                "Precautions": info["Precautions"],
                "Tests": info["Tests"],
                "done": True
            }

        follow_ups = suggest_follow_ups(current_symptoms, asked)
        if not follow_ups:
            break

        for follow_symptom in follow_ups:
            asked.add(follow_symptom)
            question = f"Do you have '{follow_symptom.replace('_', ' ').title()}'? (yes/no): "
            answer = ask_user_func(question).strip().lower()
            if answer == "yes":
                current_symptoms.append(follow_symptom)
            break

    info = get_additional_info(predicted_disease)
    return {
        "Disease": predicted_disease,
        "Confidence": round(prob * 100, 2),
        "Description": info["Description"],
        "Diet": info["Diet"],
        "Precautions": info["Precautions"],
        "Tests": info["Tests"],
        "done": True
    }
