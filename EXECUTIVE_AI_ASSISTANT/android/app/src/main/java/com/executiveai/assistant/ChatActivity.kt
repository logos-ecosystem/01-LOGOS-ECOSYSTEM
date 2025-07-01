package com.executiveai.assistant

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.executiveai.assistant.adapters.ChatAdapter
import com.executiveai.assistant.api.ApiClient
import com.executiveai.assistant.databinding.ActivityChatBinding
import com.executiveai.assistant.models.ChatRequest
import com.executiveai.assistant.models.Message
import com.executiveai.assistant.utils.PreferencesManager
import kotlinx.coroutines.launch
import java.util.*

class ChatActivity : AppCompatActivity(), TextToSpeech.OnInitListener {
    
    private lateinit var binding: ActivityChatBinding
    private lateinit var chatAdapter: ChatAdapter
    private lateinit var preferencesManager: PreferencesManager
    private lateinit var speechRecognizer: SpeechRecognizer
    private lateinit var textToSpeech: TextToSpeech
    
    private val messages = mutableListOf<Message>()
    private var domain: String = "general"
    private var conversationId: String? = null
    private var isListening = false
    
    companion object {
        private const val PERMISSION_REQUEST_RECORD_AUDIO = 1
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityChatBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        preferencesManager = PreferencesManager(this)
        domain = intent.getStringExtra("domain") ?: "general"
        
        setupUI()
        setupSpeech()
        checkPermissions()
        
        if (intent.getBooleanExtra("start_voice", false)) {
            startListening()
        }
    }
    
    private fun setupUI() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            title = intent.getStringExtra("domain_name") ?: "Chat"
        }
        
        chatAdapter = ChatAdapter(messages)
        binding.chatRecyclerView.apply {
            layoutManager = LinearLayoutManager(this@ChatActivity)
            adapter = chatAdapter
        }
        
        binding.sendButton.setOnClickListener {
            sendMessage()
        }
        
        binding.voiceButton.setOnClickListener {
            toggleVoiceRecognition()
        }
    }
    
    private fun setupSpeech() {
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        speechRecognizer.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                runOnUiThread {
                    binding.voiceIndicator.visibility = View.VISIBLE
                    binding.voiceStatusText.text = getString(R.string.listening)
                }
            }
            
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {
                runOnUiThread {
                    binding.voiceIndicator.visibility = View.GONE
                }
            }
            
            override fun onError(error: Int) {
                runOnUiThread {
                    binding.voiceIndicator.visibility = View.GONE
                    Toast.makeText(this@ChatActivity, "Speech recognition error", Toast.LENGTH_SHORT).show()
                }
                isListening = false
            }
            
            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    val text = matches[0]
                    binding.messageEditText.setText(text)
                    sendMessage()
                }
                isListening = false
                runOnUiThread {
                    binding.voiceIndicator.visibility = View.GONE
                }
            }
            
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        
        textToSpeech = TextToSpeech(this, this)
    }
    
    private fun checkPermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.RECORD_AUDIO),
                PERMISSION_REQUEST_RECORD_AUDIO
            )
        }
    }
    
    private fun toggleVoiceRecognition() {
        if (isListening) {
            stopListening()
        } else {
            startListening()
        }
    }
    
    private fun startListening() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED) {
            val intent = android.content.Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, preferencesManager.getLanguage())
            }
            speechRecognizer.startListening(intent)
            isListening = true
        }
    }
    
    private fun stopListening() {
        speechRecognizer.stopListening()
        isListening = false
        binding.voiceIndicator.visibility = View.GONE
    }
    
    private fun sendMessage() {
        val messageText = binding.messageEditText.text.toString().trim()
        if (messageText.isEmpty()) return
        
        val userMessage = Message(
            id = UUID.randomUUID().toString(),
            text = messageText,
            isUser = true,
            timestamp = System.currentTimeMillis()
        )
        
        messages.add(userMessage)
        chatAdapter.notifyItemInserted(messages.size - 1)
        binding.chatRecyclerView.scrollToPosition(messages.size - 1)
        binding.messageEditText.text.clear()
        
        sendToAPI(messageText)
    }
    
    private fun sendToAPI(message: String) {
        lifecycleScope.launch {
            try {
                binding.progressBar.visibility = View.VISIBLE
                
                val apiService = ApiClient.getApiService(preferencesManager.getServerUrl())
                val request = ChatRequest(
                    message = message,
                    domain = domain,
                    language = preferencesManager.getLanguage(),
                    conversationId = conversationId
                )
                
                val response = if (domain == "general") {
                    apiService.sendMessage(request)
                } else {
                    apiService.sendDomainMessage(domain, request)
                }
                
                if (response.isSuccessful) {
                    response.body()?.let { chatResponse ->
                        conversationId = chatResponse.conversationId
                        
                        val aiMessage = Message(
                            id = UUID.randomUUID().toString(),
                            text = chatResponse.response,
                            isUser = false,
                            timestamp = System.currentTimeMillis()
                        )
                        
                        messages.add(aiMessage)
                        chatAdapter.notifyItemInserted(messages.size - 1)
                        binding.chatRecyclerView.scrollToPosition(messages.size - 1)
                        
                        if (preferencesManager.isVoiceEnabled()) {
                            speakResponse(chatResponse.response)
                        }
                    }
                } else {
                    showError("Error: ${response.message()}")
                }
            } catch (e: Exception) {
                showError(getString(R.string.error_connection))
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }
    
    private fun speakResponse(text: String) {
        if (::textToSpeech.isInitialized) {
            textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "response")
        }
    }
    
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
    
    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val locale = if (preferencesManager.getLanguage() == "es") {
                Locale("es", "ES")
            } else {
                Locale.US
            }
            textToSpeech.language = locale
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        speechRecognizer.destroy()
        textToSpeech.shutdown()
    }
    
    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
}