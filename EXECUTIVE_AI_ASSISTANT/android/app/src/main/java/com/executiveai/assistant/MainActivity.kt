package com.executiveai.assistant

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import com.executiveai.assistant.databinding.ActivityMainBinding
import com.executiveai.assistant.adapters.DomainAdapter
import com.executiveai.assistant.models.Domain
import com.executiveai.assistant.utils.PreferencesManager

class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private lateinit var preferencesManager: PreferencesManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        preferencesManager = PreferencesManager(this)
        
        setupToolbar()
        setupDomainGrid()
        setupVoiceButton()
    }
    
    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.title = "Executive AI Assistant"
        
        binding.settingsButton.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
    }
    
    private fun setupDomainGrid() {
        val domains = listOf(
            Domain("general", "General Assistant", "Your AI-powered executive assistant", R.drawable.ic_general),
            Domain("healthcare", "Healthcare", "Medical insights and health tracking", R.drawable.ic_healthcare),
            Domain("legal", "Legal", "Legal advice and document analysis", R.drawable.ic_legal),
            Domain("sports", "Sports", "Sports analytics and performance", R.drawable.ic_sports)
        )
        
        val adapter = DomainAdapter(domains) { domain ->
            openChat(domain)
        }
        
        binding.domainRecyclerView.apply {
            layoutManager = GridLayoutManager(this@MainActivity, 2)
            this.adapter = adapter
        }
    }
    
    private fun setupVoiceButton() {
        binding.voiceAssistantButton.setOnClickListener {
            val intent = Intent(this, ChatActivity::class.java).apply {
                putExtra("domain", "general")
                putExtra("start_voice", true)
            }
            startActivity(intent)
        }
    }
    
    private fun openChat(domain: Domain) {
        val intent = Intent(this, ChatActivity::class.java).apply {
            putExtra("domain", domain.id)
            putExtra("domain_name", domain.name)
        }
        startActivity(intent)
    }
}