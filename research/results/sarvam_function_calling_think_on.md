# Sarvam — Function-Calling Accuracy (thinking=on)

- Model: `llama-3.1-8b-instant`
- Endpoint: `https://api.groq.com/openai/v1/chat/completions`
- max_tokens: 500
- Rows: 100
- API errors: 53 | Parse errors: 0

| System | Tool Acc | Arg F1 | UI Guide Acc | p50 (ms) |
|--------|----------|--------|--------------|----------|
| Sarvam (llama-3.1-8b-instant) think=on | 0.41 | 0.3417 | 0.48 | 147.3 |
