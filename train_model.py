# train_model.py

import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
import joblib

# Load and clean data
df = pd.read_csv("DiseaseAndSymptoms.csv")
df.fillna("None", inplace=True)

# Get all unique symptoms
symptom_columns = [col for col in df.columns if col.startswith("Symptom_")]
all_symptoms = set()

for col in symptom_columns:
    all_symptoms.update(df[col].apply(lambda x: x.strip().lower().replace(" ", "_")))

all_symptoms.discard("none")
symptom_list = sorted(all_symptoms)

# Build feature vectors
def row_to_vector(row):
    symptoms = set(row[symptom_columns].apply(lambda x: x.strip().lower().replace(" ", "_")))
    return [1 if symptom in symptoms else 0 for symptom in symptom_list]

X = df.apply(row_to_vector, axis=1, result_type='expand')
y = df["Disease"]

# Encode labels
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X, y_encoded)

# Save model and vocab
joblib.dump(model, "model.pkl")
joblib.dump(symptom_list, "symptom_vocab.pkl")
joblib.dump(le, "label_encoder.pkl")

print("✅ Model training complete and saved!")
