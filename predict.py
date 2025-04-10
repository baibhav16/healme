from predictor import diagnose_with_followups

def ask_user(question):
    return input(question)

if __name__ == "__main__":
    symptoms = input("Enter your symptoms (comma-separated): ").split(",")

    result = diagnose_with_followups(symptoms, ask_user)

    print(f"\n🔍 Predicted Disease: {result['Disease']}")
    print(f"📊 Confidence: {result['Confidence']}%")
    print(f"\n📖 Description:\n{result['Description']}")

    print("\n🥗 Recommended Diet:")
    for item in result['Diet']:
        print(f"- {item}")

    print("\n🛡️ Precautions:")
    for precaution in result['Precautions']:
        print(f"- {precaution}")
