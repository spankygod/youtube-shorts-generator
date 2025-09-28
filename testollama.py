import requests

def query_llama(prompt):
    url = "http://localhost:11434/api/generate"
    headers = {"Content-Type": "application/json"}
    data = {
        "model": "llama3.2",
        "prompt": prompt,
        "stream": False
    }

    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        result = response.json()
        print("Model response:")
        print(result.get("response", "[No response]"))
    except requests.exceptions.RequestException as e:
        print(f"Error querying Ollama: {e}")

if __name__ == "__main__":
    query_llama("Explain how black holes work in simple terms.")
