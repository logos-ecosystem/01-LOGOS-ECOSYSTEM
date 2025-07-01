package com.executiveai.assistant.api

import com.google.gson.GsonBuilder
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    
    private const val DEFAULT_BASE_URL = "http://10.0.2.2:8000/"
    private var retrofit: Retrofit? = null
    
    fun getClient(baseUrl: String = DEFAULT_BASE_URL): Retrofit {
        if (retrofit == null || retrofit?.baseUrl().toString() != baseUrl) {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            
            val client = OkHttpClient.Builder()
                .addInterceptor(logging)
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build()
            
            val gson = GsonBuilder()
                .setLenient()
                .create()
            
            retrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build()
        }
        
        return retrofit!!
    }
    
    fun getApiService(baseUrl: String = DEFAULT_BASE_URL): ApiService {
        return getClient(baseUrl).create(ApiService::class.java)
    }
}