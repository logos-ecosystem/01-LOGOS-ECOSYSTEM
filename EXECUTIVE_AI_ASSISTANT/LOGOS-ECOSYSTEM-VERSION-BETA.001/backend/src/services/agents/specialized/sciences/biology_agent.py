"""Biology Agent - Expert in life sciences and biological systems."""

from typing import Dict, Any, List, Optional
from datetime import datetime
import asyncio

from ....base_agent import BaseAgent, AgentCategory, PricingModel


class BiologyAgent(BaseAgent):
    """Specialized AI agent for biology and life sciences."""
    
    def __init__(self):
        """Initialize the Biology Agent."""
        super().__init__(
            name="Biology Expert",
            description="Expert in life sciences, cellular biology, genetics, ecology, evolution, and all biological systems",
            category="science",
            capabilities=[
                "cellular_biology_analysis",
                "genetics_consultation",
                "ecology_assessment",
                "evolution_analysis",
                "physiology_consultation",
                "microbiology_analysis",
                "botany_consultation",
                "zoology_analysis",
                "molecular_biology_consultation",
                "research_methodology"
            ],
            pricing_model=PricingModel.PER_USE,
            price_per_use=0.30,
            tags=["biology", "life sciences", "genetics", "ecology", "evolution", "physiology", "microbiology", "molecular biology"],
            author="LOGOS Biology Team",
            version="1.0.0"
        )
    
    async def _process_request(self, capability: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Process biology-related requests."""
        
        if capability == "cellular_biology_analysis":
            return await self._analyze_cellular_biology(params)
        elif capability == "genetics_consultation":
            return await self._provide_genetics_consultation(params)
        elif capability == "ecology_assessment":
            return await self._assess_ecology(params)
        elif capability == "evolution_analysis":
            return await self._analyze_evolution(params)
        elif capability == "physiology_consultation":
            return await self._consult_physiology(params)
        elif capability == "microbiology_analysis":
            return await self._analyze_microbiology(params)
        elif capability == "botany_consultation":
            return await self._consult_botany(params)
        elif capability == "zoology_analysis":
            return await self._analyze_zoology(params)
        elif capability == "molecular_biology_consultation":
            return await self._consult_molecular_biology(params)
        elif capability == "research_methodology":
            return await self._design_research_methodology(params)
        else:
            raise ValueError(f"Unknown capability: {capability}")
    
    async def _analyze_cellular_biology(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze cellular biology concepts."""
        cell_type = params.get("cell_type", "eukaryotic")
        process = params.get("process", "general cellular functions")
        context = params.get("context", "educational")
        
        prompt = f"""As a biology expert, analyze the following cellular biology topic:
        Cell Type: {cell_type}
        Process: {process}
        Context: {context}
        
        Provide a comprehensive analysis including:
        1. Cell structure and organelles relevant to this process
        2. Molecular mechanisms involved
        3. Energy requirements and metabolic aspects
        4. Regulation and control mechanisms
        5. Significance in the broader biological context
        6. Current research and applications"""
        
        response = await self.claude_completion(prompt)
        
        return {
            "cell_type": cell_type,
            "process": process,
            "analysis": response,
            "key_concepts": self._extract_cellular_concepts(response),
            "research_applications": self._identify_research_applications(response)
        }
    
    async def _provide_genetics_consultation(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Provide genetics expertise."""
        topic = params.get("topic", "general genetics")
        organism = params.get("organism", "human")
        complexity = params.get("complexity", "intermediate")
        
        prompt = f"""As a genetics expert, provide consultation on:
        Topic: {topic}
        Organism: {organism}
        Complexity Level: {complexity}
        
        Cover:
        1. Fundamental genetic principles involved
        2. Molecular mechanisms (DNA, RNA, proteins)
        3. Inheritance patterns if applicable
        4. Modern genomic approaches
        5. Clinical or research applications
        6. Ethical considerations if relevant"""
        
        response = await self.claude_completion(prompt)
        
        return {
            "topic": topic,
            "organism": organism,
            "consultation": response,
            "genetic_mechanisms": self._extract_genetic_mechanisms(response),
            "applications": self._identify_genetic_applications(response)
        }
    
    async def _assess_ecology(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Assess ecological systems and interactions."""
        ecosystem = params.get("ecosystem", "general ecosystem")
        species = params.get("species", "various")
        interaction_type = params.get("interaction_type", "general interactions")
        
        prompt = f"""As an ecology expert, assess the following:
        Ecosystem: {ecosystem}
        Species: {species}
        Interaction Type: {interaction_type}
        
        Analyze:
        1. Ecosystem structure and function
        2. Species interactions and relationships
        3. Energy flow and nutrient cycling
        4. Population dynamics
        5. Environmental factors and adaptations
        6. Conservation implications"""
        
        response = await self.claude_completion(prompt)
        
        return {
            "ecosystem": ecosystem,
            "species": species,
            "assessment": response,
            "ecological_principles": self._extract_ecological_principles(response),
            "conservation_recommendations": self._generate_conservation_recommendations(response)
        }
    
    async def _analyze_evolution(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze evolutionary concepts and processes."""
        concept = params.get("concept", "natural selection")
        species = params.get("species", "general")
        timeframe = params.get("timeframe", "varies")
        
        prompt = f"""As an evolution expert, analyze:
        Concept: {concept}
        Species/Group: {species}
        Timeframe: {timeframe}
        
        Explain:
        1. Evolutionary mechanisms at work
        2. Selection pressures and adaptations
        3. Genetic basis of evolutionary change
        4. Evidence from multiple sources
        5. Phylogenetic relationships
        6. Modern evolutionary synthesis perspectives"""
        
        response = await self.claude_completion(prompt)
        
        return {
            "concept": concept,
            "species": species,
            "analysis": response,
            "evolutionary_mechanisms": self._extract_evolutionary_mechanisms(response),
            "evidence_summary": self._summarize_evolutionary_evidence(response)
        }
    
    async def _consult_physiology(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Provide physiology consultation."""
        system = params.get("system", "general physiology")
        organism = params.get("organism", "human")
        function = params.get("function", "normal function")
        
        prompt = f"""As a physiology expert, explain:
        System: {system}
        Organism: {organism}
        Function: {function}
        
        Cover:
        1. Anatomical structures involved
        2. Normal physiological processes
        3. Regulatory mechanisms
        4. Integration with other systems
        5. Common dysfunctions or diseases
        6. Comparative physiology insights"""
        
        response = await self.claude_completion(prompt)
        
        return {
            "system": system,
            "organism": organism,
            "consultation": response,
            "physiological_processes": self._extract_physiological_processes(response),
            "clinical_relevance": self._identify_clinical_relevance(response)
        }
    
    async def _analyze_microbiology(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze microbiological topics."""
        microorganism = params.get("microorganism", "bacteria")
        context = params.get("context", "general")
        interaction = params.get("interaction", "environmental")
        
        prompt = f"""As a microbiology expert, analyze:
        Microorganism: {microorganism}
        Context: {context}
        Interaction: {interaction}
        
        Discuss:
        1. Microbial structure and classification
        2. Metabolic capabilities
        3. Growth and reproduction
        4. Ecological roles
        5. Pathogenic mechanisms if applicable
        6. Applications in biotechnology or medicine"""
        
        response = await self.claude_completion(prompt)
        
        return {
            "microorganism": microorganism,
            "analysis": response,
            "microbial_characteristics": self._extract_microbial_characteristics(response),
            "applications": self._identify_microbial_applications(response)
        }
    
    async def _consult_botany(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Provide botanical consultation."""
        plant_type = params.get("plant_type", "angiosperms")
        aspect = params.get("aspect", "general botany")
        application = params.get("application", "education")
        
        prompt = f"""As a botany expert, provide information on:
        Plant Type: {plant_type}
        Aspect: {aspect}
        Application: {application}
        
        Cover:
        1. Plant anatomy and morphology
        2. Physiological processes (photosynthesis, transpiration)
        3. Reproduction and life cycles
        4. Ecological adaptations
        5. Economic or medicinal importance
        6. Conservation status if relevant"""
        
        response = await self.claude_completion(prompt)
        
        return {
            "plant_type": plant_type,
            "consultation": response,
            "botanical_features": self._extract_botanical_features(response),
            "practical_applications": self._identify_plant_applications(response)
        }
    
    async def _analyze_zoology(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze zoological topics."""
        animal_group = params.get("animal_group", "vertebrates")
        focus = params.get("focus", "general zoology")
        habitat = params.get("habitat", "various")
        
        prompt = f"""As a zoology expert, analyze:
        Animal Group: {animal_group}
        Focus: {focus}
        Habitat: {habitat}
        
        Examine:
        1. Taxonomic classification
        2. Anatomical adaptations
        3. Behavioral patterns
        4. Ecological roles
        5. Conservation status
        6. Evolutionary relationships"""
        
        response = await self.claude_completion(prompt)
        
        return {
            "animal_group": animal_group,
            "analysis": response,
            "zoological_characteristics": self._extract_zoological_characteristics(response),
            "conservation_status": self._assess_conservation_status(response)
        }
    
    async def _consult_molecular_biology(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Provide molecular biology consultation."""
        process = params.get("process", "gene expression")
        molecules = params.get("molecules", "proteins and nucleic acids")
        pathway = params.get("pathway", "general cellular pathways")
        
        prompt = f"""As a molecular biology expert, explain:
        Process: {process}
        Molecules: {molecules}
        Pathway: {pathway}
        
        Detail:
        1. Molecular mechanisms and interactions
        2. Structural biology aspects
        3. Regulatory elements
        4. Experimental techniques for study
        5. Clinical or research significance
        6. Current understanding and open questions"""
        
        response = await self.claude_completion(prompt)
        
        return {
            "process": process,
            "consultation": response,
            "molecular_mechanisms": self._extract_molecular_mechanisms(response),
            "research_techniques": self._identify_research_techniques(response)
        }
    
    async def _design_research_methodology(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Design biological research methodology."""
        research_question = params.get("research_question", "general biological question")
        methodology = params.get("methodology", "experimental")
        resources = params.get("resources", "standard laboratory")
        
        prompt = f"""As a biology research expert, design a methodology for:
        Research Question: {research_question}
        Methodology Type: {methodology}
        Available Resources: {resources}
        
        Include:
        1. Hypothesis formulation
        2. Experimental design
        3. Controls and variables
        4. Data collection methods
        5. Statistical analysis plan
        6. Potential limitations and solutions"""
        
        response = await self.claude_completion(prompt)
        
        return {
            "research_question": research_question,
            "methodology_design": response,
            "experimental_steps": self._extract_experimental_steps(response),
            "analysis_plan": self._create_analysis_plan(response)
        }
    
    def _extract_cellular_concepts(self, text: str) -> List[str]:
        """Extract key cellular biology concepts."""
        concepts = []
        keywords = ["organelle", "membrane", "cytoplasm", "nucleus", "mitochondria", 
                   "endoplasmic reticulum", "Golgi", "ribosome", "cytoskeleton"]
        for keyword in keywords:
            if keyword.lower() in text.lower():
                concepts.append(keyword)
        return concepts
    
    def _identify_research_applications(self, text: str) -> List[str]:
        """Identify research applications."""
        applications = []
        if "drug discovery" in text.lower():
            applications.append("Pharmaceutical development")
        if "biotechnology" in text.lower():
            applications.append("Biotechnology applications")
        if "disease" in text.lower():
            applications.append("Disease research")
        return applications
    
    def _extract_genetic_mechanisms(self, text: str) -> List[str]:
        """Extract genetic mechanisms mentioned."""
        mechanisms = []
        genetic_terms = ["transcription", "translation", "replication", "mutation",
                        "recombination", "inheritance", "expression", "regulation"]
        for term in genetic_terms:
            if term in text.lower():
                mechanisms.append(term.capitalize())
        return mechanisms
    
    def _identify_genetic_applications(self, text: str) -> List[str]:
        """Identify genetic applications."""
        applications = []
        if "therapy" in text.lower():
            applications.append("Gene therapy")
        if "crispr" in text.lower():
            applications.append("Gene editing")
        if "diagnostic" in text.lower():
            applications.append("Genetic diagnostics")
        return applications
    
    def _extract_ecological_principles(self, text: str) -> List[str]:
        """Extract ecological principles."""
        principles = []
        eco_terms = ["niche", "competition", "predation", "symbiosis", "succession",
                    "biodiversity", "carrying capacity", "trophic levels"]
        for term in eco_terms:
            if term in text.lower():
                principles.append(term.capitalize())
        return principles
    
    def _generate_conservation_recommendations(self, text: str) -> List[str]:
        """Generate conservation recommendations."""
        recommendations = []
        if "habitat" in text.lower():
            recommendations.append("Habitat preservation")
        if "endangered" in text.lower():
            recommendations.append("Species protection programs")
        if "sustainable" in text.lower():
            recommendations.append("Sustainable resource management")
        return recommendations
    
    def _extract_evolutionary_mechanisms(self, text: str) -> List[str]:
        """Extract evolutionary mechanisms."""
        mechanisms = []
        evo_terms = ["selection", "drift", "mutation", "gene flow", "speciation",
                    "adaptation", "fitness", "variation"]
        for term in evo_terms:
            if term in text.lower():
                mechanisms.append(term.capitalize())
        return mechanisms
    
    def _summarize_evolutionary_evidence(self, text: str) -> Dict[str, bool]:
        """Summarize types of evolutionary evidence mentioned."""
        return {
            "fossil_evidence": "fossil" in text.lower(),
            "molecular_evidence": "dna" in text.lower() or "molecular" in text.lower(),
            "anatomical_evidence": "homolog" in text.lower() or "vestigial" in text.lower(),
            "biogeographical_evidence": "distribution" in text.lower() or "geographic" in text.lower()
        }
    
    def _extract_physiological_processes(self, text: str) -> List[str]:
        """Extract physiological processes."""
        processes = []
        phys_terms = ["homeostasis", "metabolism", "circulation", "respiration",
                     "digestion", "excretion", "reproduction", "regulation"]
        for term in phys_terms:
            if term in text.lower():
                processes.append(term.capitalize())
        return processes
    
    def _identify_clinical_relevance(self, text: str) -> List[str]:
        """Identify clinical relevance."""
        relevance = []
        if "disease" in text.lower():
            relevance.append("Disease understanding")
        if "treatment" in text.lower():
            relevance.append("Treatment development")
        if "diagnosis" in text.lower():
            relevance.append("Diagnostic applications")
        return relevance
    
    def _extract_microbial_characteristics(self, text: str) -> List[str]:
        """Extract microbial characteristics."""
        characteristics = []
        micro_terms = ["gram-positive", "gram-negative", "aerobic", "anaerobic",
                      "spore-forming", "motile", "pathogenic", "symbiotic"]
        for term in micro_terms:
            if term in text.lower():
                characteristics.append(term.capitalize())
        return characteristics
    
    def _identify_microbial_applications(self, text: str) -> List[str]:
        """Identify microbial applications."""
        applications = []
        if "antibiotic" in text.lower():
            applications.append("Antibiotic production")
        if "fermentation" in text.lower():
            applications.append("Industrial fermentation")
        if "bioremediation" in text.lower():
            applications.append("Environmental cleanup")
        return applications
    
    def _extract_botanical_features(self, text: str) -> List[str]:
        """Extract botanical features."""
        features = []
        bot_terms = ["flower", "leaf", "stem", "root", "seed", "fruit",
                    "vascular", "photosynthesis"]
        for term in bot_terms:
            if term in text.lower():
                features.append(term.capitalize())
        return features
    
    def _identify_plant_applications(self, text: str) -> List[str]:
        """Identify plant applications."""
        applications = []
        if "medicine" in text.lower() or "medicinal" in text.lower():
            applications.append("Medicinal uses")
        if "agriculture" in text.lower() or "crop" in text.lower():
            applications.append("Agricultural importance")
        if "ornamental" in text.lower():
            applications.append("Ornamental value")
        return applications
    
    def _extract_zoological_characteristics(self, text: str) -> List[str]:
        """Extract zoological characteristics."""
        characteristics = []
        zoo_terms = ["vertebrate", "invertebrate", "endotherm", "ectotherm",
                    "carnivore", "herbivore", "omnivore", "social"]
        for term in zoo_terms:
            if term in text.lower():
                characteristics.append(term.capitalize())
        return characteristics
    
    def _assess_conservation_status(self, text: str) -> str:
        """Assess conservation status mentioned."""
        if "extinct" in text.lower():
            return "Extinct or Critically Endangered"
        elif "endangered" in text.lower():
            return "Endangered"
        elif "vulnerable" in text.lower():
            return "Vulnerable"
        elif "threatened" in text.lower():
            return "Threatened"
        else:
            return "Status not specified"
    
    def _extract_molecular_mechanisms(self, text: str) -> List[str]:
        """Extract molecular mechanisms."""
        mechanisms = []
        mol_terms = ["binding", "catalysis", "phosphorylation", "methylation",
                    "ubiquitination", "signaling", "transport", "folding"]
        for term in mol_terms:
            if term in text.lower():
                mechanisms.append(term.capitalize())
        return mechanisms
    
    def _identify_research_techniques(self, text: str) -> List[str]:
        """Identify research techniques mentioned."""
        techniques = []
        tech_terms = ["pcr", "sequencing", "microscopy", "crystallography",
                     "spectroscopy", "chromatography", "electrophoresis", "cloning"]
        for term in tech_terms:
            if term in text.lower():
                techniques.append(term.upper() if len(term) <= 3 else term.capitalize())
        return techniques
    
    def _extract_experimental_steps(self, text: str) -> List[str]:
        """Extract experimental steps from methodology."""
        steps = []
        # Simple extraction based on numbered items or key phrases
        if "1." in text:
            import re
            numbered = re.findall(r'\d+\.\s*([^.]+)', text)
            steps.extend(numbered[:5])  # First 5 steps
        return steps
    
    def _create_analysis_plan(self, text: str) -> Dict[str, str]:
        """Create analysis plan from methodology."""
        plan = {
            "statistical_approach": "Not specified",
            "data_visualization": "Not specified",
            "validation_method": "Not specified"
        }
        
        if "statistics" in text.lower() or "statistical" in text.lower():
            plan["statistical_approach"] = "Statistical analysis mentioned"
        if "graph" in text.lower() or "plot" in text.lower():
            plan["data_visualization"] = "Data visualization planned"
        if "control" in text.lower() or "validation" in text.lower():
            plan["validation_method"] = "Controls and validation included"
        
        return plan