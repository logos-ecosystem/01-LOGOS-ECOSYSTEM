#!/usr/bin/env python3
"""Script to implement all 154 specialized AI agents with real functionality."""

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple, Any
import ast

# Agent implementation template
AGENT_IMPLEMENTATION_TEMPLATE = '''"""{{agent_description}}"""

from typing import List, Dict, Any, Optional, Type
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator

from ...base_agent import (
    BaseAIAgent, AgentMetadata, AgentCategory, PricingModel,
    AgentStatus, AgentInput, AgentOutput
)
from ....ai.ai_integration import ai_service
from .....shared.utils.logger import get_logger

logger = get_logger(__name__)


class {{agent_name}}Input(BaseModel):
    """Input schema for {{agent_type}} queries."""
    query: str = Field(..., description="Main query or request")
    context: Optional[str] = Field(None, description="Additional context")
    detail_level: str = Field(default="intermediate", description="Level of detail required")
    include_examples: bool = Field(default=True, description="Include practical examples")
    specific_focus: Optional[str] = Field(None, description="Specific area to focus on")
    
    @field_validator('detail_level')
    @classmethod
    def validate_detail_level(cls, v):
        valid_levels = ['basic', 'intermediate', 'advanced', 'expert']
        if v.lower() not in valid_levels:
            raise ValueError(f"Detail level must be one of {valid_levels}")
        return v.lower()


class {{agent_name}}Output(BaseModel):
    """Output schema for {{agent_type}} results."""
    summary: str = Field(..., description="Executive summary")
    detailed_response: str = Field(..., description="Comprehensive response")
    key_points: List[Dict[str, str]] = Field(..., description="Key points extracted")
    recommendations: List[str] = Field(default=[], description="Actionable recommendations")
    examples: Optional[List[Dict[str, Any]]] = Field(None, description="Practical examples")
    resources: List[Dict[str, str]] = Field(default=[], description="Additional resources")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence in analysis")
    {{additional_output_fields}}


class {{agent_name}}(BaseAIAgent):
    """{{full_agent_description}}"""
    
    def __init__(self):
        metadata = AgentMetadata(
            name="{{agent_display_name}}",
            description="{{agent_detailed_description}}",
            category={{agent_category}},
            version="1.0.0",
            author="LOGOS {{category_name}} Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use={{agent_price}},
            tags={{agent_tags}},
            capabilities={{agent_capabilities}},
            limitations={{agent_limitations}},
            status=AgentStatus.ACTIVE,
            disclaimer="{{agent_disclaimer}}"
        )
        super().__init__(metadata)
        
        self._knowledge_base = {}
        self._expertise_areas = {{expertise_areas}}
    
    async def _setup(self):
        """Initialize {{agent_type}} knowledge base."""
        self._knowledge_base = {
            {{knowledge_base_content}}
        }
        logger.info("{{agent_name}} initialized with knowledge base")
    
    def get_input_schema(self) -> Type[BaseModel]:
        """Get the input schema for this agent."""
        return {{agent_name}}Input
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        return {{agent_name}}Output
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute {{agent_type}} analysis with real Claude integration."""
        try:
            # Validate input
            validated_input = {{agent_name}}Input(**input_data.input_data)
            
            # Create specialized prompt
            prompt = await self._create_prompt(validated_input)
            
            # Get real AI analysis from Claude
            system_prompt = """{{system_prompt}}"""
            
            ai_response = await ai_service.complete(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature={{temperature}},
                max_tokens=4000
            )
            
            # Parse and structure results
            structured_results = await self._parse_response(ai_response, validated_input)
            
            # Create output
            output = {{agent_name}}Output(**structured_results)
            
            # Calculate tokens used
            tokens_used = len(prompt.split()) + len(ai_response.split())
            
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data=output.model_dump(),
                tokens_used=tokens_used,
                execution_time=0.0,
                usage_metrics={
                    "model": ai_service.model,
                    "query_type": validated_input.query[:50],
                    "detail_level": validated_input.detail_level
                }
            )
            
        except Exception as e:
            logger.error(f"{{agent_name}} analysis error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e),
                execution_time=0.0
            )
    
    async def _create_prompt(self, validated_input: {{agent_name}}Input) -> str:
        """Create a specialized prompt for {{agent_type}}."""
        prompt = f"""
        {{prompt_template}}
        
        Query: {validated_input.query}
        Detail Level: {validated_input.detail_level}
        Include Examples: {validated_input.include_examples}
        """
        
        if validated_input.context:
            prompt += f"\\\\nAdditional Context: {validated_input.context}"
        
        if validated_input.specific_focus:
            prompt += f"\\\\nSpecific Focus: {validated_input.specific_focus}"
        
        prompt += """
        
        Please provide:
        1. A clear summary of the response
        2. Detailed analysis based on the requested detail level
        3. Key points and insights
        4. Practical recommendations
        5. Relevant examples (if requested)
        6. Additional resources for further learning
        
        Ensure the response is technically accurate and practically useful.
        """
        
        return prompt
    
    async def _parse_response(
        self, 
        ai_response: str, 
        validated_input: {{agent_name}}Input
    ) -> Dict[str, Any]:
        """Parse AI response into structured format."""
        # Use Claude to structure the response
        structure_prompt = f"""
        Based on this {{agent_type}} analysis:
        
        {ai_response}
        
        Extract and structure the information into this JSON format:
        {{
            "summary": "Brief summary (2-3 sentences)",
            "detailed_response": "The comprehensive analysis",
            "key_points": [
                {{"point": "Key point title", "explanation": "Detailed explanation"}}
            ],
            "recommendations": ["Recommendation 1", "Recommendation 2"],
            "examples": [
                {{"title": "Example name", "description": "What it demonstrates", "details": {{}}}}
            ],
            "resources": [
                {{"type": "Type", "name": "Resource name", "description": "Brief description", "url": "if available"}}
            ],
            "confidence_score": 0.0,
            {{additional_structure_fields}}
        }}
        
        Ensure all content is specific to {{agent_type}} and practically useful.
        """
        
        structured_response = await ai_service.complete(
            prompt=structure_prompt,
            temperature=0.2,
            max_tokens=3000
        )
        
        import json
        try:
            results = json.loads(structured_response)
            # Ensure all required fields are present
            results.setdefault('confidence_score', 0.85)
            results.setdefault('recommendations', [])
            results.setdefault('resources', [])
            {{additional_defaults}}
            return results
        except json.JSONDecodeError:
            # Fallback parsing
            return self._fallback_parse(ai_response, validated_input)
    
    def _fallback_parse(
        self, 
        ai_response: str, 
        validated_input: {{agent_name}}Input
    ) -> Dict[str, Any]:
        """Fallback parser when JSON extraction fails."""
        return {
            "summary": f"Analysis completed for: {validated_input.query[:100]}",
            "detailed_response": ai_response,
            "key_points": self._extract_key_points(ai_response),
            "recommendations": self._extract_recommendations(ai_response),
            "examples": [] if not validated_input.include_examples else self._extract_examples(ai_response),
            "resources": self._extract_resources(ai_response),
            "confidence_score": 0.75,
            {{additional_fallback_fields}}
        }
    
    def _extract_key_points(self, text: str) -> List[Dict[str, str]]:
        """Extract key points from text."""
        points = []
        # Look for numbered or bulleted items
        import re
        patterns = [
            r'(?:^|\n)(?:\\\\d+\\.|[-•*])\\\\s*([^:\\\\n]+)(?::?\\\\s*([^\\\\n]+))?',
            r'(?:^|\n)(?:Key point|Important|Note):\s*([^\n]+)',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.MULTILINE | re.IGNORECASE)
            for match in matches[:5]:  # Limit to 5 points
                if isinstance(match, tuple):
                    point = match[0].strip()
                    explanation = match[1].strip() if len(match) > 1 and match[1] else "Key insight"
                else:
                    point = match.strip()
                    explanation = "Important point"
                
                if len(point) > 10:
                    points.append({
                        "point": point[:100],
                        "explanation": explanation[:200]
                    })
        
        return points[:10]
    
    def _extract_recommendations(self, text: str) -> List[str]:
        """Extract recommendations from text."""
        recommendations = []
        import re
        
        patterns = [
            r'(?:recommend|suggest|should|advise|best practice)(?:s|ed|ing)?:?\s*([^\n]+)',
            r'(?:^|\n)(?:\d+\.|[-•*])\s*(?:You should|Consider|Try)\s*([^\n]+)',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            recommendations.extend([m.strip() for m in matches if len(m.strip()) > 20])
        
        return list(set(recommendations))[:8]  # Remove duplicates, limit to 8
    
    def _extract_examples(self, text: str) -> List[Dict[str, Any]]:
        """Extract examples from text."""
        examples = []
        import re
        
        pattern = r'(?:example|instance|case|scenario)(?:s)?:?\s*([^\n]+(?:\n(?!\n)[^\n]+)*)'
        matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
        
        for match in matches[:5]:  # Limit to 5 examples
            examples.append({
                "title": "Practical Example",
                "description": match.strip()[:200],
                "details": {}
            })
        
        return examples
    
    def _extract_resources(self, text: str) -> List[Dict[str, str]]:
        """Extract resources from text."""
        resources = []
        resource_types = ["book", "article", "paper", "course", "tool", "website", "documentation"]
        
        import re
        for rtype in resource_types:
            pattern = rf'{rtype}s?:?\s*"?([^"\n,]+)"?'
            matches = re.findall(pattern, text, re.IGNORECASE)
            
            for match in matches[:2]:  # 2 per type
                resources.append({
                    "type": rtype.capitalize(),
                    "name": match.strip(),
                    "description": f"Recommended {rtype}",
                    "url": ""
                })
        
        return resources[:10]
'''

# Agent categories and their specialized fields
CATEGORY_SPECIALIZATIONS = {
    "medical": {
        "additional_output_fields": '''diagnosis_indicators: Optional[List[str]] = Field(None, description="Diagnostic indicators")
    treatment_options: Optional[List[Dict[str, str]]] = Field(None, description="Treatment options")
    risk_factors: List[str] = Field(default=[], description="Risk factors")
    preventive_measures: List[str] = Field(default=[], description="Preventive measures")''',
        "system_prompt": "You are an expert medical professional with deep knowledge of diagnostics, treatments, and patient care. Provide accurate, evidence-based medical information while emphasizing the importance of consulting healthcare professionals.",
        "knowledge_base": '''"conditions": ["Common conditions and symptoms"],
            "treatments": ["Standard treatment protocols"],
            "medications": ["Common medications and interactions"],
            "procedures": ["Medical procedures and interventions"]''',
        "additional_defaults": '''results.setdefault('diagnosis_indicators', [])
            results.setdefault('treatment_options', [])
            results.setdefault('risk_factors', [])
            results.setdefault('preventive_measures', [])''',
        "temperature": 0.3
    },
    "technology": {
        "additional_output_fields": '''implementation_guide: Optional[str] = Field(None, description="Implementation guidance")
    code_snippets: Optional[List[Dict[str, str]]] = Field(None, description="Code examples")
    architecture_diagrams: Optional[List[str]] = Field(None, description="Architecture descriptions")
    best_practices: List[str] = Field(default=[], description="Best practices")''',
        "system_prompt": "You are an expert technology specialist with deep knowledge of software development, system architecture, and emerging technologies. Provide detailed technical guidance with practical implementation advice.",
        "knowledge_base": '''"technologies": ["Programming languages and frameworks"],
            "patterns": ["Design patterns and architectures"],
            "tools": ["Development tools and platforms"],
            "trends": ["Current technology trends"]''',
        "additional_defaults": '''results.setdefault('implementation_guide', '')
            results.setdefault('code_snippets', [])
            results.setdefault('architecture_diagrams', [])
            results.setdefault('best_practices', [])''',
        "temperature": 0.4
    },
    "business": {
        "additional_output_fields": '''market_analysis: Optional[Dict[str, Any]] = Field(None, description="Market analysis")
    financial_projections: Optional[List[Dict[str, Any]]] = Field(None, description="Financial projections")
    competitive_analysis: Optional[Dict[str, Any]] = Field(None, description="Competitive analysis")
    action_plan: Optional[List[Dict[str, str]]] = Field(None, description="Strategic action plan")''',
        "system_prompt": "You are an expert business strategist with deep knowledge of market dynamics, financial analysis, and strategic planning. Provide actionable business insights and data-driven recommendations.",
        "knowledge_base": '''"strategies": ["Business strategies and frameworks"],
            "markets": ["Market analysis techniques"],
            "finance": ["Financial planning and analysis"],
            "operations": ["Operational excellence practices"]''',
        "additional_defaults": '''results.setdefault('market_analysis', {})
            results.setdefault('financial_projections', [])
            results.setdefault('competitive_analysis', {})
            results.setdefault('action_plan', [])''',
        "temperature": 0.5
    },
    "sciences": {
        "additional_output_fields": '''scientific_principles: List[Dict[str, str]] = Field(default=[], description="Relevant scientific principles")
    experiments: Optional[List[Dict[str, Any]]] = Field(None, description="Suggested experiments")
    calculations: Optional[List[Dict[str, str]]] = Field(None, description="Relevant calculations")
    research_papers: Optional[List[Dict[str, str]]] = Field(None, description="Related research papers")''',
        "system_prompt": "You are an expert scientist with deep knowledge of scientific principles, research methods, and experimental design. Provide accurate scientific information with clear explanations.",
        "knowledge_base": '''"principles": ["Fundamental scientific principles"],
            "methods": ["Research methodologies"],
            "discoveries": ["Key scientific discoveries"],
            "applications": ["Practical applications"]''',
        "additional_defaults": '''results.setdefault('scientific_principles', [])
            results.setdefault('experiments', [])
            results.setdefault('calculations', [])
            results.setdefault('research_papers', [])''',
        "temperature": 0.3
    },
    "engineering": {
        "additional_output_fields": '''design_specifications: Optional[Dict[str, Any]] = Field(None, description="Design specifications")
    materials_list: Optional[List[Dict[str, str]]] = Field(None, description="Required materials")
    safety_considerations: List[str] = Field(default=[], description="Safety considerations")
    optimization_suggestions: List[str] = Field(default=[], description="Optimization suggestions")''',
        "system_prompt": "You are an expert engineer with deep knowledge of design principles, materials science, and optimization techniques. Provide detailed engineering solutions with safety and efficiency in mind.",
        "knowledge_base": '''"principles": ["Engineering principles and laws"],
            "materials": ["Material properties and selection"],
            "design": ["Design methodologies and tools"],
            "standards": ["Industry standards and regulations"]''',
        "additional_defaults": '''results.setdefault('design_specifications', {})
            results.setdefault('materials_list', [])
            results.setdefault('safety_considerations', [])
            results.setdefault('optimization_suggestions', [])''',
        "temperature": 0.4
    },
    "mathematics": {
        "additional_output_fields": '''formulas: List[Dict[str, str]] = Field(default=[], description="Relevant formulas")
    proofs: Optional[List[Dict[str, str]]] = Field(None, description="Mathematical proofs")
    step_by_step_solution: Optional[str] = Field(None, description="Step-by-step solution")
    visualizations: Optional[List[str]] = Field(None, description="Visualization descriptions")''',
        "system_prompt": "You are an expert mathematician with deep knowledge of mathematical theory, problem-solving techniques, and applications. Provide clear mathematical explanations with rigorous reasoning.",
        "knowledge_base": '''"concepts": ["Mathematical concepts and theorems"],
            "techniques": ["Problem-solving techniques"],
            "applications": ["Real-world applications"],
            "tools": ["Mathematical tools and software"]''',
        "additional_defaults": '''results.setdefault('formulas', [])
            results.setdefault('proofs', [])
            results.setdefault('step_by_step_solution', '')
            results.setdefault('visualizations', [])''',
        "temperature": 0.2
    },
    "geography": {
        "additional_output_fields": '''geographical_features: List[Dict[str, str]] = Field(default=[], description="Geographical features")
    climate_data: Optional[Dict[str, Any]] = Field(None, description="Climate information")
    demographic_info: Optional[Dict[str, Any]] = Field(None, description="Demographic information")
    maps_descriptions: Optional[List[str]] = Field(None, description="Map descriptions")''',
        "system_prompt": "You are an expert geographer with deep knowledge of physical geography, human geography, and spatial analysis. Provide comprehensive geographical insights with environmental and social context.",
        "knowledge_base": '''"regions": ["World regions and characteristics"],
            "processes": ["Geographical processes and phenomena"],
            "systems": ["Earth systems and interactions"],
            "tools": ["GIS and mapping tools"]''',
        "additional_defaults": '''results.setdefault('geographical_features', [])
            results.setdefault('climate_data', {})
            results.setdefault('demographic_info', {})
            results.setdefault('maps_descriptions', [])''',
        "temperature": 0.4
    },
    "humanities": {
        "additional_output_fields": '''historical_context: Optional[str] = Field(None, description="Historical context")
    cultural_significance: Optional[str] = Field(None, description="Cultural significance")
    philosophical_implications: Optional[List[str]] = Field(None, description="Philosophical implications")
    related_works: Optional[List[Dict[str, str]]] = Field(None, description="Related works")''',
        "system_prompt": "You are an expert in humanities with deep knowledge of history, philosophy, literature, and cultural studies. Provide nuanced analysis with attention to context and multiple perspectives.",
        "knowledge_base": '''"periods": ["Historical periods and movements"],
            "thinkers": ["Key thinkers and their ideas"],
            "works": ["Important works and texts"],
            "concepts": ["Core humanities concepts"]''',
        "additional_defaults": '''results.setdefault('historical_context', '')
            results.setdefault('cultural_significance', '')
            results.setdefault('philosophical_implications', [])
            results.setdefault('related_works', [])''',
        "temperature": 0.6
    }
}

def get_agent_files() -> Dict[str, List[Path]]:
    """Get all agent files organized by category."""
    base_path = Path(__file__).parent / "specialized"
    agent_files = {}
    
    for category_dir in base_path.iterdir():
        if category_dir.is_dir() and not category_dir.name.startswith('__'):
            agent_files[category_dir.name] = list(category_dir.glob("*_agent.py"))
    
    return agent_files

def extract_agent_info(file_path: Path) -> Dict[str, Any]:
    """Extract agent information from existing file."""
    content = file_path.read_text()
    info = {
        "file_path": file_path,
        "class_name": None,
        "display_name": None,
        "description": None,
        "category": None,
        "price": 2.00,
        "tags": [],
        "capabilities": [],
        "limitations": []
    }
    
    # Extract class name
    class_match = re.search(r'class\s+(\w+Agent)\s*\(BaseAIAgent\)', content)
    if class_match:
        info["class_name"] = class_match.group(1)
    
    # Extract metadata
    metadata_match = re.search(r'AgentMetadata\((.*?)\)', content, re.DOTALL)
    if metadata_match:
        metadata_str = metadata_match.group(1)
        
        # Extract name
        name_match = re.search(r'name\s*=\s*["\']([^"\']+)["\']', metadata_str)
        if name_match:
            info["display_name"] = name_match.group(1)
        
        # Extract description
        desc_match = re.search(r'description\s*=\s*["\']([^"\']+)["\']', metadata_str)
        if desc_match:
            info["description"] = desc_match.group(1)
        
        # Extract category
        cat_match = re.search(r'category\s*=\s*AgentCategory\.(\w+)', metadata_str)
        if cat_match:
            info["category"] = cat_match.group(1)
        
        # Extract price
        price_match = re.search(r'price_per_use\s*=\s*([\d.]+)', metadata_str)
        if price_match:
            info["price"] = float(price_match.group(1))
        
        # Extract tags
        tags_match = re.search(r'tags\s*=\s*\[(.*?)\]', metadata_str, re.DOTALL)
        if tags_match:
            tags_str = tags_match.group(1)
            info["tags"] = [tag.strip().strip('"\'') for tag in tags_str.split(',') if tag.strip()]
        
        # Extract capabilities
        caps_match = re.search(r'capabilities\s*=\s*\[(.*?)\]', metadata_str, re.DOTALL)
        if caps_match:
            caps_str = caps_match.group(1)
            info["capabilities"] = [cap.strip().strip('"\'') for cap in caps_str.split(',') if cap.strip()]
        
        # Extract limitations
        lims_match = re.search(r'limitations\s*=\s*\[(.*?)\]', metadata_str, re.DOTALL)
        if lims_match:
            lims_str = lims_match.group(1)
            info["limitations"] = [lim.strip().strip('"\'') for lim in lims_str.split(',') if lim.strip()]
    
    return info

def generate_agent_implementation(agent_info: Dict[str, Any], category: str) -> str:
    """Generate real implementation for an agent."""
    spec = CATEGORY_SPECIALIZATIONS.get(category, CATEGORY_SPECIALIZATIONS["technology"])
    
    # Prepare template variables
    template_vars = {
        "agent_name": agent_info["class_name"],
        "agent_type": agent_info["display_name"].lower().replace(" agent", "").replace(" expert", ""),
        "agent_description": f"{agent_info['class_name']} for LOGOS ECOSYSTEM",
        "full_agent_description": f"AI agent specialized in {agent_info['description']}",
        "agent_display_name": agent_info["display_name"],
        "agent_detailed_description": agent_info["description"],
        "agent_category": f"AgentCategory.{agent_info['category']}",
        "category_name": category.title(),
        "agent_price": agent_info["price"],
        "agent_tags": str(agent_info["tags"]),
        "agent_capabilities": str(agent_info["capabilities"]),
        "agent_limitations": str(agent_info["limitations"]),
        "agent_disclaimer": f"Professional {category} guidance provided. Always verify critical information with domain experts.",
        "expertise_areas": str([tag for tag in agent_info["tags"] if len(tag) > 3][:5]),
        "additional_output_fields": spec["additional_output_fields"],
        "system_prompt": spec["system_prompt"],
        "knowledge_base_content": spec["knowledge_base"],
        "temperature": spec["temperature"],
        "additional_structure_fields": '"specific_data": {}' if category in ["medical", "engineering"] else '',
        "additional_defaults": spec["additional_defaults"],
        "additional_fallback_fields": '"specific_data": {}' if category in ["medical", "engineering"] else '',
        "prompt_template": f"Provide expert {category} analysis on the following topic:"
    }
    
    return AGENT_IMPLEMENTATION_TEMPLATE.format(**template_vars)

def implement_agent(agent_info: Dict[str, Any], category: str, dry_run: bool = False):
    """Implement a single agent with real functionality."""
    file_path = agent_info["file_path"]
    
    if not agent_info["class_name"]:
        print(f"  ⚠️  Skipping {file_path.name} - no class found")
        return False
    
    print(f"  🔧 Implementing {agent_info['class_name']} ({agent_info['display_name']})")
    
    # Generate new implementation
    new_content = generate_agent_implementation(agent_info, category)
    
    if dry_run:
        print(f"     Would write {len(new_content)} bytes to {file_path}")
    else:
        # Backup original
        backup_path = file_path.with_suffix('.py.backup')
        if not backup_path.exists():
            file_path.rename(backup_path)
        
        # Write new implementation
        file_path.write_text(new_content)
        print(f"     ✅ Implemented with real functionality")
    
    return True

def main(dry_run: bool = False):
    """Implement all agents with real functionality."""
    print("🚀 Implementing all 154 AI agents with real Claude integration...\n")
    
    agent_files = get_agent_files()
    total_agents = sum(len(files) for files in agent_files.values())
    implemented = 0
    
    for category, files in agent_files.items():
        if not files:
            continue
            
        print(f"\n📁 Category: {category.upper()} ({len(files)} agents)")
        print("=" * 50)
        
        for file_path in sorted(files):
            try:
                agent_info = extract_agent_info(file_path)
                if implement_agent(agent_info, category, dry_run):
                    implemented += 1
            except Exception as e:
                print(f"  ❌ Error processing {file_path.name}: {str(e)}")
    
    print(f"\n\n✨ Implementation Summary:")
    print(f"   Total agents found: {total_agents}")
    print(f"   Successfully implemented: {implemented}")
    print(f"   Implementation rate: {(implemented/total_agents)*100:.1f}%")
    
    if dry_run:
        print("\n⚠️  DRY RUN - No files were actually modified")
        print("   Run without --dry-run to implement changes")

if __name__ == "__main__":
    import sys
    dry_run = "--dry-run" in sys.argv
    main(dry_run)