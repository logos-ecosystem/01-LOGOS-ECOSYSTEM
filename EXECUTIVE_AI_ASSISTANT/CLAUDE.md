# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Executive AI Assistant is a comprehensive AI-powered assistant system designed for executives and business leaders. The project is currently in the initial scaffolding phase with an extensive directory structure but no implementation yet.

## Project Structure

The codebase is organized into the following key directories:

- `/backend/` - Backend services (currently empty)
- `/ui/` - Frontend user interface components (currently empty)
- `/src/prototype/` - Python prototype implementations
  - `voice_assistant_demo.py` - Voice control functionality
  - `unified_control_demo.py` - Unified control interface
- `/docs/` - Extensive documentation for various features
- `/healthcare/`, `/legal/`, `/sports/` - Domain-specific AI assistant modules
- `/demo/` - Interactive demonstration files
- `/tests/` - Test suite (currently empty)

## Development Setup

**Note**: This project currently has no dependency management files or build configuration. When implementing features:

1. For Python development:
   - Create a `requirements.txt` or `pyproject.toml` file
   - Set up a virtual environment
   - Document any required Python version

2. For web interface development:
   - Consider adding `package.json` for JavaScript dependencies
   - Set up appropriate build tools

## Architecture Considerations

The project structure suggests:
- Multi-domain AI assistant covering healthcare, legal, and sports verticals
- Voice control and unified control interfaces
- Multi-language support (English and Spanish)
- Separation of backend services and frontend UI

When implementing features, maintain this modular architecture and keep domain-specific logic isolated in their respective directories.

## Development Commands

### Starting the Application
```bash
# Quick start (installs dependencies, initializes DB, starts server)
./run.sh

# Manual start
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m src.backend.database.init_db
uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Running Demos
```bash
# Voice Assistant Demo
python src/prototype/voice_assistant_demo.py

# Unified Control Interface
python src/prototype/unified_control_demo.py
```

### Testing and Linting
```bash
# Run tests
pytest

# Code formatting
black src tests
flake8 src tests
mypy src
```

## Architecture Overview

The Executive AI Assistant follows a modular, API-first architecture:

### Backend (FastAPI)
- **API Layer** (`src/backend/api/`): RESTful endpoints for chat, voice, health, and domain-specific services
- **Services Layer** (`src/backend/services/`): Business logic including AI integration, conversation management, and domain expertise
- **Models** (`src/backend/models/`): Pydantic models for request/response validation
- **Database** (`src/backend/database/`): SQLAlchemy async models and session management

### Key Integration Points
- **AI Services**: Supports both OpenAI and Anthropic models with fallback capabilities
- **Voice Processing**: Speech recognition via SpeechRecognition library and TTS via gTTS/pyttsx3
- **Domain Modules**: Pluggable architecture for healthcare, legal, and sports expertise

### Frontend Components
- **Interactive Web Demo** (`demo/interactive_demo.html`): Real-time chat interface with domain switching
- **Presentation Pages**: Marketing pages in English and Spanish
- **CLI Interfaces**: Rich-based terminal UI for unified control

## Current Implementation Status

The project has been implemented with:
- ✅ FastAPI backend with full API structure
- ✅ AI service integration (OpenAI/Anthropic)
- ✅ Voice assistant capabilities
- ✅ Multi-domain support (Healthcare, Legal, Sports)
- ✅ Interactive web interface
- ✅ CLI demos (voice and unified control)
- ✅ Multi-language support framework
- ✅ Database models and persistence

## Language Support

The project includes both English and Spanish versions of presentation files (`*_es.html`), indicating multi-language support is a requirement. When implementing features, consider internationalization from the start.

## Planned Features

The `/docs/` directory suggests an ambitious feature set including:
- AI Employees System
- Decision Intelligence
- Longevity Optimization
- Mobile Features
- Voice Control and Entertainment
- Various integration suites

Given the scope, consider implementing an MVP first focusing on core executive assistant functionality before expanding to specialized domains.

## Claude Code Permissions

The `.claude/settings.local.json` file allows `find` and `ls` bash commands for easier navigation during development.