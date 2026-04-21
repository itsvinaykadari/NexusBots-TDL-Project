# Sarvam — Function-Calling Accuracy (thinking=off)

- Model: `llama-3.3-70b-versatile`
- Endpoint: `https://api.groq.com/openai/v1/chat/completions`
- max_tokens: 500
- Rows: 100
- API errors: 67 | Parse errors: 0

| System | Tool Acc | Arg F1 | UI Guide Acc | p50 (ms) |
|--------|----------|--------|--------------|----------|
| Sarvam (llama-3.3-70b-versatile) think=off | 0.27 | 0.2025 | 0.46 | 206.3 |
