package com.executiveai.assistant.models

import com.google.gson.annotations.SerializedName

data class Domain(
    val id: String,
    val name: String,
    val description: String,
    val iconResource: Int
)

data class ChatRequest(
    val message: String,
    val domain: String? = null,
    val language: String = "en",
    @SerializedName("conversation_id")
    val conversationId: String? = null
)

data class ChatResponse(
    val response: String,
    @SerializedName("conversation_id")
    val conversationId: String,
    val domain: String? = null,
    val timestamp: String
)

data class VoiceRequest(
    @SerializedName("audio_data")
    val audioData: String,
    val language: String = "en"
)

data class VoiceResponse(
    val text: String,
    val confidence: Float,
    val language: String
)

data class SynthesizeRequest(
    val text: String,
    val language: String = "en",
    val voice: String? = null
)

data class SynthesizeResponse(
    @SerializedName("audio_data")
    val audioData: String,
    val format: String
)

data class HealthResponse(
    val status: String,
    val version: String,
    val timestamp: String
)

data class DomainInfo(
    val id: String,
    val name: String,
    val description: String,
    val capabilities: List<String>,
    val examples: List<String>
)

data class Message(
    val id: String,
    val text: String,
    val isUser: Boolean,
    val timestamp: Long,
    val domain: String? = null
)