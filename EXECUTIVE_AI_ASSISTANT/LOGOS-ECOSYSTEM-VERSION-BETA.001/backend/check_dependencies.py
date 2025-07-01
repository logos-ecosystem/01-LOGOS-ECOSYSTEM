#!/usr/bin/env python3
"""Check for potential dependency conflicts."""

import subprocess
import sys
from packaging import version

# Define groups of dependencies that might conflict
DEPENDENCY_GROUPS = {
    "AI/ML Core": [
        "openai==1.8.0",
        "langchain==0.1.0",
        "tiktoken==0.5.2",
    ],
    "Vector Databases": [
        "pinecone-client==3.0.0",
        "weaviate-client==4.4.0", 
        "qdrant-client==1.7.0",
        "chromadb==0.4.22",
        "faiss-cpu==1.7.4",
    ],
    "Embeddings & NLP": [
        "sentence-transformers==2.3.1",
        "cohere==4.37",
        "nltk==3.8.1",
        "spacy==3.7.2",
    ],
    "PyTorch & Transformers": [
        "torch==2.1.2",
        "transformers==4.36.2",
        "datasets==2.16.1",
        "accelerate==0.25.0",
        "optimum==1.16.0",
        "torchaudio==2.1.2",
    ],
    "Audio Processing": [
        "gtts==2.3.0",
        "SpeechRecognition==3.9.0",
        "pygame==2.1.3",
        "pydub==0.25.1",
        "soundfile==0.12.1",
        "librosa==0.10.1",
        "scipy==1.11.4",
        "sounddevice==0.4.6",
        "joblib==1.3.2",
    ],
    "IoT & Hardware": [
        "pyserial==3.5",
        # "RPi.GPIO==0.7.1",  # Skip - requires Raspberry Pi
        "cbor2==5.5.1",
        "scapy==2.5.0",
    ],
    "Payment Processing": [
        "stripe==7.8.0",
        "web3==6.13.0",
        "qrcode==7.4.2",
        "Pillow==10.2.0",
    ]
}

def check_package_installation(package_spec):
    """Try to install a package in dry-run mode to check for conflicts."""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "--dry-run", package_spec],
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Timeout expired"
    except Exception as e:
        return False, "", str(e)

def main():
    print("Checking dependency compatibility...\n")
    
    issues = []
    
    for group_name, packages in DEPENDENCY_GROUPS.items():
        print(f"Checking {group_name}...")
        for package in packages:
            success, stdout, stderr = check_package_installation(package)
            if not success:
                issues.append({
                    "group": group_name,
                    "package": package,
                    "error": stderr
                })
                print(f"  ❌ {package} - CONFLICT")
            else:
                print(f"  ✓ {package}")
        print()
    
    if issues:
        print("\n⚠️  DEPENDENCY CONFLICTS FOUND:")
        for issue in issues:
            print(f"\n{issue['group']} - {issue['package']}:")
            print(f"  Error: {issue['error'][:200]}...")
    else:
        print("\n✅ All dependencies appear to be compatible!")
    
    return 0 if not issues else 1

if __name__ == "__main__":
    sys.exit(main())