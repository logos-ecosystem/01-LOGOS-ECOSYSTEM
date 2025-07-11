# Executive AI Assistant

A comprehensive AI-powered assistant system designed for executives and business leaders, featuring multi-domain expertise, voice control, and intelligent decision support.

## Features

- **Multi-Domain AI Assistance**: Specialized modules for healthcare, legal, and sports domains
- **Voice Control**: Natural language voice interaction with speech recognition and synthesis
- **Unified Control Interface**: Centralized dashboard for all AI capabilities
- **Multi-Language Support**: Available in English and Spanish
- **Decision Intelligence**: Advanced analytics and insights for executive decision-making
- **API-First Architecture**: RESTful API for integration with existing systems

## Quick Start

### Prerequisites

- Python 3.11 or higher
- pip or poetry for dependency management
- Virtual environment (recommended)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/executive-ai-assistant.git
cd executive-ai-assistant
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

5. Initialize the database:
```bash
python -m src.backend.database.init_db
```

### Running the Application

1. Start the backend API server:
```bash
uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000
```

2. For voice assistant demo:
```bash
python src/prototype/voice_assistant_demo.py
```

3. For unified control demo:
```bash
python src/prototype/unified_control_demo.py
```

4. Access the interactive demo:
   - Open `demo/interactive_demo.html` in your browser
   - Or navigate to `http://localhost:8000` for the API documentation

## Project Structure

```
executive-ai-assistant/
   backend/            # FastAPI backend services
   src/               # Source code
      prototype/     # Demo implementations
   ui/                # Frontend components
   healthcare/        # Healthcare AI module
   legal/            # Legal AI module
   sports/           # Sports AI module
   docs/             # Documentation
   tests/            # Test suite
   demo/             # Interactive demonstrations
```

## Development

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
black src tests
flake8 src tests
mypy src
```

### Building Documentation

```bash
cd docs
make html
```

## API Documentation

Once the server is running, access the interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Configuration

Key configuration options in `.env`:
- `OPENAI_API_KEY`: Your OpenAI API key
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `DEFAULT_LANGUAGE`: Default language (en/es)
- `ENABLE_VOICE_ASSISTANT`: Enable/disable voice features
- See `.env.example` for all available options

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@executiveai.com or open an issue in the GitHub repository.