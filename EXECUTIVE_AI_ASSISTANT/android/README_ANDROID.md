# Executive AI Assistant - Android App

Esta es la aplicación nativa Android para el Executive AI Assistant.

## Características

- ✅ Interfaz nativa con Material Design
- ✅ Chat en tiempo real con el backend
- ✅ Soporte multidominio (General, Healthcare, Legal, Sports)
- ✅ Reconocimiento de voz (Speech-to-Text)
- ✅ Síntesis de voz (Text-to-Speech)
- ✅ Soporte multiidioma (Inglés/Español)
- ✅ Configuración de servidor personalizable

## Requisitos

- Android Studio Arctic Fox o superior
- Android SDK 24+ (Android 7.0+)
- Gradle 8.1+
- Servidor backend ejecutándose

## Instalación

1. **Clonar el repositorio**
```bash
cd /home/juan/EXECUTIVE_AI_ASSISTANT/android
```

2. **Abrir en Android Studio**
- File → Open → Seleccionar la carpeta `android`
- Esperar a que se sincronicen las dependencias

3. **Configurar el servidor backend**
- Para emulador: El código usa `10.0.2.2:8000` por defecto
- Para dispositivo físico: Cambiar la IP en `ApiClient.kt` a la IP de tu computadora

4. **Ejecutar la aplicación**
- Conectar dispositivo o iniciar emulador
- Click en "Run" o Shift+F10

## Estructura del Proyecto

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/com/executiveai/assistant/
│   │   │   ├── MainActivity.kt          # Pantalla principal
│   │   │   ├── ChatActivity.kt         # Interfaz de chat
│   │   │   ├── SettingsActivity.kt     # Configuración
│   │   │   ├── api/                    # Cliente API REST
│   │   │   ├── models/                 # Modelos de datos
│   │   │   ├── adapters/               # Adaptadores RecyclerView
│   │   │   └── utils/                  # Utilidades
│   │   └── res/                        # Recursos (layouts, strings, etc.)
│   └── build.gradle                    # Configuración del módulo
└── build.gradle                        # Configuración del proyecto
```

## Uso

1. **Pantalla Principal**
   - Seleccionar un dominio (Healthcare, Legal, Sports)
   - O usar el asistente de voz general

2. **Chat**
   - Escribir mensajes o usar el botón de micrófono
   - Las respuestas se reproducen por voz automáticamente

3. **Configuración**
   - Cambiar URL del servidor
   - Seleccionar idioma (EN/ES)
   - Activar/desactivar voz

## Próximos Pasos

- [ ] Agregar autenticación de usuario
- [ ] Implementar notificaciones push
- [ ] Modo offline con caché local
- [ ] Historial de conversaciones
- [ ] Compartir respuestas
- [ ] Widget de pantalla de inicio

## Compilar APK

```bash
# Debug APK
./gradlew assembleDebug

# Release APK
./gradlew assembleRelease
```

El APK se genera en `app/build/outputs/apk/`

## Troubleshooting

**Error de conexión al servidor:**
- Verificar que el backend esté ejecutándose
- Revisar la IP del servidor en Settings
- Verificar permisos de Internet en el manifest

**Problemas con el micrófono:**
- Otorgar permisos de micrófono en Settings del dispositivo
- Verificar que el idioma esté soportado

**Crash al iniciar:**
- Limpiar y reconstruir: `./gradlew clean build`
- Verificar versión mínima de Android (API 24+)