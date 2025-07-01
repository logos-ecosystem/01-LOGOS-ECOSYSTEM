#!/usr/bin/env python3
"""
Unified Control Demo
Central command interface for all AI assistant capabilities
"""

import asyncio
import requests
import json
import sys
import os
from datetime import datetime
from typing import Dict, Any, Optional, List
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt, IntPrompt
from rich.markdown import Markdown
from rich.progress import Progress, SpinnerColumn, TextColumn

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.backend.core.config import settings

console = Console()


class UnifiedControlInterface:
    def __init__(self):
        self.api_base = f"http://localhost:{settings.PORT}/api/v1"
        self.conversation_id = None
        self.current_domain = "general"
        self.language = "en"
        self.session_start = datetime.now()
    
    def display_header(self):
        """Display the application header"""
        console.clear()
        console.print(Panel.fit(
            "[bold cyan]Executive AI Assistant - Unified Control Center[/bold cyan]\n"
            f"[dim]Session started: {self.session_start.strftime('%Y-%m-%d %H:%M:%S')}[/dim]",
            border_style="cyan"
        ))
    
    def display_menu(self):
        """Display the main menu"""
        table = Table(title="Main Menu", show_header=True, header_style="bold magenta")
        table.add_column("Option", style="cyan", width=12)
        table.add_column("Description", style="white")
        
        table.add_row("1", "Chat Assistant - Interactive conversation")
        table.add_row("2", "Voice Control - Speech interaction (requires microphone)")
        table.add_row("3", "Domain Expert - Specialized assistance")
        table.add_row("4", "Analytics Dashboard - View insights and metrics")
        table.add_row("5", "Settings - Configure preferences")
        table.add_row("6", "Help - View documentation")
        table.add_row("0", "Exit - Close application")
        
        console.print(table)
    
    async def chat_mode(self):
        """Interactive chat mode"""
        console.print("\n[bold green]Chat Assistant Mode[/bold green]")
        console.print("[dim]Type 'back' to return to main menu[/dim]\n")
        
        while True:
            message = Prompt.ask("[bold cyan]You[/bold cyan]")
            
            if message.lower() == 'back':
                break
            
            # Send to API
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                transient=True,
            ) as progress:
                progress.add_task(description="Processing...", total=None)
                
                response = await self.send_chat_message(message)
            
            if response:
                console.print(f"\n[bold green]Assistant[/bold green]: {response}\n")
            else:
                console.print("[red]Error: Failed to get response[/red]\n")
    
    async def domain_expert_mode(self):
        """Domain-specific expert mode"""
        console.print("\n[bold green]Domain Expert Mode[/bold green]")
        
        # Select domain
        table = Table(title="Available Domains", show_header=False)
        table.add_column("Option", style="cyan")
        table.add_column("Domain", style="white")
        
        table.add_row("1", "Healthcare - Medical and health management")
        table.add_row("2", "Legal - Corporate law and compliance")
        table.add_row("3", "Sports - Athletic performance and management")
        table.add_row("4", "General - All-purpose assistance")
        
        console.print(table)
        
        choice = IntPrompt.ask("Select domain", choices=["1", "2", "3", "4"])
        
        domains = {
            1: ("healthcare", "Healthcare"),
            2: ("legal", "Legal"),
            3: ("sports", "Sports"),
            4: ("general", "General")
        }
        
        self.current_domain, domain_name = domains[choice]
        
        console.print(f"\n[bold]Selected: {domain_name} Domain[/bold]")
        console.print("[dim]Type 'back' to return to main menu[/dim]\n")
        
        while True:
            query = Prompt.ask(f"[bold cyan]{domain_name} Query[/bold cyan]")
            
            if query.lower() == 'back':
                break
            
            # Send domain-specific query
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                transient=True,
            ) as progress:
                progress.add_task(description="Consulting expert...", total=None)
                
                response = await self.send_domain_query(query)
            
            if response:
                console.print(f"\n[bold green]{domain_name} Expert[/bold green]:")
                console.print(response)
                
                # Show recommendations if available
                if response.get("recommendations"):
                    console.print("\n[bold]Recommendations:[/bold]")
                    for rec in response["recommendations"]:
                        console.print(f"" {rec}")
                console.print()
            else:
                console.print("[red]Error: Failed to get expert response[/red]\n")
    
    async def analytics_dashboard(self):
        """Display analytics and insights"""
        console.print("\n[bold green]Analytics Dashboard[/bold green]\n")
        
        # Get system status
        status = await self.get_system_status()
        
        if status:
            # System Health
            health_table = Table(title="System Health", show_header=True)
            health_table.add_column("Component", style="cyan")
            health_table.add_column("Status", style="green")
            
            health_table.add_row("API Server", " Online")
            health_table.add_row("Database", status.get("components", {}).get("database", {}).get("status", "Unknown"))
            health_table.add_row("AI Services", " Configured" if status.get("components", {}).get("ai_services", {}) else " Not configured")
            
            console.print(health_table)
            
            # Feature Status
            features = status.get("components", {}).get("features", {})
            if features:
                feature_table = Table(title="Feature Status", show_header=True)
                feature_table.add_column("Feature", style="cyan")
                feature_table.add_column("Enabled", style="yellow")
                
                for feature, enabled in features.items():
                    feature_table.add_row(
                        feature.replace("_", " ").title(),
                        "" if enabled else ""
                    )
                
                console.print(feature_table)
        
        console.print("\n[dim]Press Enter to continue...[/dim]")
        input()
    
    def settings_menu(self):
        """Configure application settings"""
        console.print("\n[bold green]Settings[/bold green]\n")
        
        # Language selection
        console.print("[bold]Language Settings:[/bold]")
        console.print(f"Current language: {self.language}")
        
        change_lang = Prompt.ask("Change language? (y/n)", default="n")
        if change_lang.lower() == 'y':
            lang_choice = Prompt.ask("Select language", choices=["en", "es"])
            self.language = lang_choice
            console.print(f"[green]Language changed to: {lang_choice}[/green]")
        
        console.print("\n[dim]Press Enter to continue...[/dim]")
        input()
    
    async def send_chat_message(self, message: str) -> Optional[str]:
        """Send a chat message to the API"""
        try:
            response = requests.post(
                f"{self.api_base}/chat/",
                json={
                    "message": message,
                    "conversation_id": self.conversation_id,
                    "language": self.language,
                    "domain": self.current_domain if self.current_domain != "general" else None
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.conversation_id = data.get("conversation_id")
                return data.get("response")
            
        except Exception as e:
            console.print(f"[red]API Error: {str(e)}[/red]")
        
        return None
    
    async def send_domain_query(self, query: str) -> Optional[Dict[str, Any]]:
        """Send a domain-specific query"""
        try:
            response = requests.post(
                f"{self.api_base}/domains/{self.current_domain}",
                json={
                    "query": query,
                    "domain": self.current_domain,
                    "language": self.language
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            
        except Exception as e:
            console.print(f"[red]API Error: {str(e)}[/red]")
        
        return None
    
    async def get_system_status(self) -> Optional[Dict[str, Any]]:
        """Get system status from API"""
        try:
            response = requests.get(f"{self.api_base}/health/status", timeout=5)
            if response.status_code == 200:
                return response.json()
        except:
            pass
        return None
    
    async def run(self):
        """Main application loop"""
        while True:
            self.display_header()
            self.display_menu()
            
            choice = IntPrompt.ask("\nSelect option", choices=["0", "1", "2", "3", "4", "5", "6"])
            
            if choice == 0:
                console.print("\n[bold green]Thank you for using Executive AI Assistant![/bold green]")
                break
            elif choice == 1:
                await self.chat_mode()
            elif choice == 2:
                console.print("\n[yellow]Voice control requires running voice_assistant_demo.py[/yellow]")
                console.print("[dim]Press Enter to continue...[/dim]")
                input()
            elif choice == 3:
                await self.domain_expert_mode()
            elif choice == 4:
                await self.analytics_dashboard()
            elif choice == 5:
                self.settings_menu()
            elif choice == 6:
                self.display_help()
    
    def display_help(self):
        """Display help information"""
        help_text = """
# Executive AI Assistant Help

## Features

### Chat Assistant
- Natural language conversation with AI
- Context-aware responses
- Multi-turn dialogue support

### Domain Experts
- **Healthcare**: Medical knowledge and health management
- **Legal**: Corporate law and compliance guidance
- **Sports**: Athletic performance and management

### Voice Control
- Speech-to-text input
- Text-to-speech responses
- Hands-free operation

## Tips
- Be specific in your queries for better results
- Use domain experts for specialized knowledge
- Check analytics for system insights
        """
        
        console.print(Markdown(help_text))
        console.print("\n[dim]Press Enter to continue...[/dim]")
        input()


async def main():
    """Main entry point"""
    # Check if API is running
    try:
        response = requests.get(f"http://localhost:{settings.PORT}/api/v1/health/", timeout=5)
        if response.status_code != 200:
            console.print("[red]Warning: API server is not responding properly[/red]")
    except:
        console.print("[red]Error: API server is not running![/red]")
        console.print(f"Please start the server first:")
        console.print(f"  [cyan]uvicorn src.backend.main:app --reload --port {settings.PORT}[/cyan]")
        return
    
    # Run the interface
    interface = UnifiedControlInterface()
    await interface.run()


if __name__ == "__main__":
    try:
        # Add rich to requirements if not present
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("\n[yellow]Interrupted by user[/yellow]")
    except Exception as e:
        console.print(f"\n[red]Error: {str(e)}[/red]")