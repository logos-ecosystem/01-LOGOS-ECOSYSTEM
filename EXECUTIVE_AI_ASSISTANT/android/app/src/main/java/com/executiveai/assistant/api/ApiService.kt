package com.executiveai.assistant.api

import com.executiveai.assistant.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    @POST("api/chat")
    suspend fun sendMessage(@Body request: ChatRequest): Response<ChatResponse>
    
    @POST("api/voice/recognize")
    suspend fun recognizeSpeech(@Body audio: VoiceRequest): Response<VoiceResponse>
    
    @POST("api/voice/synthesize")
    suspend fun synthesizeSpeech(@Body request: SynthesizeRequest): Response<SynthesizeResponse>
    
    @GET("api/health")
    suspend fun checkHealth(): Response<HealthResponse>
    
    @GET("api/domains/{domain}/info")
    suspend fun getDomainInfo(@Path("domain") domain: String): Response<DomainInfo>
    
    @POST("api/domains/{domain}/chat")
    suspend fun sendDomainMessage(
        @Path("domain") domain: String,
        @Body request: ChatRequest
    ): Response<ChatResponse>
}