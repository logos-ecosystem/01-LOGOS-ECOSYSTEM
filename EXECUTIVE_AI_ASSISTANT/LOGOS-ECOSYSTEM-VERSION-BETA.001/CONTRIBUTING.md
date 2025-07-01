# 🤝 Guía de Contribución - LOGOS ECOSYSTEM

¡Gracias por tu interés en contribuir a LOGOS ECOSYSTEM! Este documento te guiará sobre cómo puedes ayudar a mejorar el proyecto.

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [¿Cómo Contribuir?](#cómo-contribuir)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Mejoras](#sugerir-mejoras)
- [Contribuir con Código](#contribuir-con-código)
- [Estándares de Código](#estándares-de-código)
- [Proceso de Pull Request](#proceso-de-pull-request)
- [Desarrollo de Agentes AI](#desarrollo-de-agentes-ai)

## 📜 Código de Conducta

Este proyecto se adhiere a un código de conducta. Al participar, se espera que respetes este código. Por favor, lee [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## 🎯 ¿Cómo Contribuir?

Hay muchas formas de contribuir:

- 🐛 Reportando bugs
- 💡 Sugiriendo nuevas características
- 📝 Mejorando la documentación
- 🔧 Enviando correcciones de código
- 🤖 Creando nuevos agentes AI
- 🌍 Traduciendo la aplicación
- 📢 Compartiendo el proyecto

## 🐛 Reportar Bugs

### Antes de Reportar

1. **Verifica** si el bug ya fue reportado en [Issues](https://github.com/tu-usuario/LOGOS-ECOSYSTEM-VERSION-BETA.001/issues)
2. **Actualiza** a la última versión para ver si el problema persiste
3. **Busca** en la documentación si es un comportamiento esperado

### Cómo Reportar

Crea un issue con:

```markdown
**Descripción del Bug**
Una descripción clara y concisa del problema.

**Pasos para Reproducir**
1. Ir a '...'
2. Hacer clic en '....'
3. Desplazarse hasta '....'
4. Ver el error

**Comportamiento Esperado**
Descripción de lo que debería suceder.

**Capturas de Pantalla**
Si aplica, agrega capturas para explicar el problema.

**Entorno:**
 - OS: [ej. Windows 10]
 - Navegador: [ej. Chrome 90]
 - Versión: [ej. Beta.001]
 
**Información Adicional**
Cualquier otro contexto sobre el problema.
```

## 💡 Sugerir Mejoras

### Proceso de Sugerencias

1. **Verifica** que la característica no exista
2. **Busca** si ya fue sugerida
3. **Crea** un issue con la etiqueta `enhancement`

### Plantilla de Sugerencia

```markdown
**¿Tu sugerencia está relacionada con un problema?**
Una descripción clara del problema. Ej. Siempre me frustro cuando [...]

**Describe la solución que te gustaría**
Una descripción clara y concisa de lo que quieres que suceda.

**Describe alternativas consideradas**
Otras soluciones o características que hayas considerado.

**Contexto adicional**
Agrega cualquier otro contexto o capturas sobre la sugerencia.
```

## 🔧 Contribuir con Código

### Configuración del Entorno

1. **Fork** el repositorio
2. **Clona** tu fork:
```bash
git clone https://github.com/tu-usuario/LOGOS-ECOSYSTEM-VERSION-BETA.001.git
cd LOGOS-ECOSYSTEM-VERSION-BETA.001
```

3. **Configura** el upstream:
```bash
git remote add upstream https://github.com/original-owner/LOGOS-ECOSYSTEM-VERSION-BETA.001.git
```

4. **Instala** dependencias:
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements-dev.txt

# Frontend
cd ../frontend
npm install
```

### Flujo de Trabajo

1. **Crea** una rama desde `main`:
```bash
git checkout -b feature/nombre-descriptivo
```

2. **Desarrolla** tu característica
3. **Escribe/actualiza** tests
4. **Documenta** tus cambios
5. **Commit** con mensajes descriptivos:
```bash
git commit -m "feat: agrega autenticación con Google OAuth"
```

### Formato de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva característica
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Formato (sin cambios en código)
- `refactor:` Refactorización
- `perf:` Mejoras de rendimiento
- `test:` Agregar tests
- `chore:` Tareas de mantenimiento

## 📏 Estándares de Código

### Python (Backend)

- **Estilo**: PEP 8
- **Linter**: `black` y `flake8`
- **Type hints**: Requeridos
- **Docstrings**: Google style

```python
def calculate_agent_score(agent_id: str, metrics: Dict[str, float]) -> float:
    """Calcula el score de un agente basado en métricas.
    
    Args:
        agent_id: ID único del agente
        metrics: Diccionario con métricas de rendimiento
        
    Returns:
        Score normalizado entre 0 y 1
        
    Raises:
        ValueError: Si las métricas son inválidas
    """
    # Implementación...
```

### TypeScript/JavaScript (Frontend)

- **Estilo**: ESLint + Prettier
- **Framework**: React hooks
- **Tipos**: TypeScript estricto

```typescript
interface AgentProps {
  id: string;
  name: string;
  onSelect: (id: string) => void;
}

export const AgentCard: React.FC<AgentProps> = ({ id, name, onSelect }) => {
  // Implementación...
};
```

### Tests

- **Backend**: pytest con coverage > 80%
- **Frontend**: Jest + React Testing Library
- **E2E**: Cypress o Playwright

## 🔄 Proceso de Pull Request

1. **Actualiza** tu rama:
```bash
git fetch upstream
git rebase upstream/main
```

2. **Push** a tu fork:
```bash
git push origin feature/nombre-descriptivo
```

3. **Crea** el Pull Request con:
   - Título descriptivo
   - Descripción detallada
   - Referencias a issues relacionados
   - Screenshots si hay cambios visuales

### Plantilla de PR

```markdown
## Descripción
Breve descripción de los cambios

## Tipo de Cambio
- [ ] Bug fix
- [ ] Nueva característica
- [ ] Breaking change
- [ ] Documentación

## ¿Cómo se ha probado?
Describe las pruebas realizadas

## Checklist:
- [ ] Mi código sigue el estilo del proyecto
- [ ] He realizado auto-revisión
- [ ] He agregado tests
- [ ] Los tests existentes pasan
- [ ] He actualizado la documentación
```

## 🤖 Desarrollo de Agentes AI

### Estructura de un Agente

```python
# backend/src/agents/implementations/mi_agente.py
from ..base import BaseAgent

class MiAgenteAI(BaseAgent):
    """Agente especializado en [descripción]."""
    
    name = "Mi Agente AI"
    description = "Descripción detallada"
    category = "categoria"
    version = "1.0.0"
    
    async def process_message(self, message: str, context: Dict) -> str:
        """Procesa el mensaje del usuario."""
        # Implementación
        return response
```

### Registro del Agente

```python
# backend/src/agents/registry.py
from .implementations.mi_agente import MiAgenteAI

AGENT_REGISTRY = {
    # ... otros agentes
    "mi-agente": MiAgenteAI,
}
```

### Tests del Agente

```python
# backend/tests/agents/test_mi_agente.py
import pytest
from src.agents.implementations.mi_agente import MiAgenteAI

@pytest.mark.asyncio
async def test_mi_agente_responde_correctamente():
    agent = MiAgenteAI()
    response = await agent.process_message("test", {})
    assert response is not None
```

## 📚 Recursos Útiles

- [Documentación de FastAPI](https://fastapi.tiangolo.com/)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Guía de TypeScript](https://www.typescriptlang.org/docs/)
- [Mejores Prácticas de React](https://react.dev/learn)

## 🙏 Reconocimientos

Todos los contribuidores serán agregados a la lista de colaboradores en el README principal.

## ❓ ¿Necesitas Ayuda?

- 💬 Únete a nuestro [Discord](https://discord.gg/logos)
- 📧 Envía un email a dev@logosecosystem.com
- 🐦 Contáctanos en Twitter [@LogosEcosystem](https://twitter.com/LogosEcosystem)

---

¡Gracias por contribuir a hacer LOGOS ECOSYSTEM mejor para todos! 🚀