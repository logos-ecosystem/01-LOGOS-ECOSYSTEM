import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { logger } from '../../../../../../../backend/src/utils/logger';
import { BaseAgent } from './base-agent';
import { AgentCapability } from './types';

interface PythonAgentMetadata {
  name?: string;
  description?: string;
  version?: string;
  author?: string;
  capabilities?: AgentCapability[];
  audio_enabled?: boolean;
  marketplace_enabled?: boolean;
  iot_enabled?: boolean;
  automotive_enabled?: boolean;
}

export class PythonAgentBridge {
  private pythonPath: string = 'python3';
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    // Check Python availability
    try {
      await this.executePython(['-V']);
      this.initialized = true;
      logger.info('✅ Python bridge initialized successfully');
    } catch (error) {
      logger.warn('⚠️ Python not available, Python agents will be simulated');
      this.initialized = false;
    }
  }

  async extractAgentMetadata(filePath: string): Promise<PythonAgentMetadata> {
    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const metadata: PythonAgentMetadata = {};

      // Extract docstring
      const docstringMatch = fileContent.match(/"""([\s\S]*?)"""/);
      if (docstringMatch) {
        metadata.description = docstringMatch[1].trim();
      }

      // Extract class name
      const classMatch = fileContent.match(/class\s+(\w+).*?:/);
      if (classMatch) {
        metadata.name = classMatch[1].replace(/Agent$/, ' Expert');
      }

      // Extract metadata from class attributes
      const versionMatch = fileContent.match(/version\s*=\s*["']([^"']+)["']/);
      if (versionMatch) metadata.version = versionMatch[1];

      const authorMatch = fileContent.match(/author\s*=\s*["']([^"']+)["']/);
      if (authorMatch) metadata.author = authorMatch[1];

      // Extract capabilities from methods
      metadata.capabilities = this.extractCapabilitiesFromPython(fileContent);

      // Extract feature flags
      metadata.audio_enabled = fileContent.includes('audio_enabled = True');
      metadata.marketplace_enabled = fileContent.includes('marketplace_enabled = True');
      metadata.iot_enabled = fileContent.includes('iot_enabled = True');
      metadata.automotive_enabled = fileContent.includes('automotive_enabled = True');

      return metadata;
    } catch (error) {
      logger.error(`Failed to extract metadata from ${filePath}:`, error);
      return {};
    }
  }

  private extractCapabilitiesFromPython(content: string): AgentCapability[] {
    const capabilities: AgentCapability[] = [];
    
    // Match async method definitions
    const methodMatches = content.matchAll(/async\s+def\s+(\w+)\s*\([^)]*\):\s*\n\s*"""([\s\S]*?)"""/g);
    
    for (const match of methodMatches) {
      const methodName = match[1];
      const docstring = match[2];
      
      // Skip private methods and common base methods
      if (methodName.startsWith('_') || ['__init__', 'process'].includes(methodName)) {
        continue;
      }
      
      // Extract parameters from method signature
      const paramMatch = content.match(new RegExp(`async\\s+def\\s+${methodName}\\s*\\(([^)]*)\\)`));
      const params = this.extractParameters(paramMatch ? paramMatch[1] : '');
      
      capabilities.push({
        name: methodName,
        description: docstring.trim().split('\n')[0], // First line of docstring
        parameters: params.parameters,
        required_parameters: params.required
      });
    }
    
    // If no async methods found, try regular methods
    if (capabilities.length === 0) {
      const syncMethodMatches = content.matchAll(/def\s+(\w+)\s*\([^)]*\):\s*\n\s*"""([\s\S]*?)"""/g);
      
      for (const match of syncMethodMatches) {
        const methodName = match[1];
        const docstring = match[2];
        
        if (methodName.startsWith('_') || ['__init__', 'process'].includes(methodName)) {
          continue;
        }
        
        capabilities.push({
          name: methodName,
          description: docstring.trim().split('\n')[0],
          parameters: {},
          required_parameters: []
        });
      }
    }
    
    // Add default capabilities if none found
    if (capabilities.length === 0) {
      capabilities.push(
        {
          name: 'analyze',
          description: 'Analyze data and provide insights',
          parameters: { data: 'Data to analyze' },
          required_parameters: ['data']
        },
        {
          name: 'consult',
          description: 'Provide expert consultation',
          parameters: { query: 'Consultation query' },
          required_parameters: ['query']
        }
      );
    }
    
    return capabilities;
  }

  private extractParameters(paramString: string): { parameters: Record<string, string>, required: string[] } {
    const parameters: Record<string, string> = {};
    const required: string[] = [];
    
    // Remove self parameter
    const params = paramString.replace(/self\s*,?\s*/, '').split(',');
    
    for (const param of params) {
      const trimmed = param.trim();
      if (!trimmed) continue;
      
      // Check if parameter has default value
      const hasDefault = trimmed.includes('=');
      const paramName = trimmed.split(/[:=]/)[0].trim();
      
      if (paramName && paramName !== 'kwargs' && paramName !== 'args') {
        parameters[paramName] = `Parameter: ${paramName}`;
        if (!hasDefault) {
          required.push(paramName);
        }
      }
    }
    
    return { parameters, required };
  }

  async createAgentWrapper(agentId: string, filePath: string, metadata: PythonAgentMetadata): Promise<BaseAgent> {
    const wrapper = {
      agent_id: agentId,
      name: metadata.name || 'Python Agent',
      description: metadata.description || 'Python-based specialized agent',
      capabilities: metadata.capabilities || [],
      audio_enabled: metadata.audio_enabled !== false,
      marketplace_enabled: metadata.marketplace_enabled !== false,
      iot_enabled: metadata.iot_enabled || false,
      automotive_enabled: metadata.automotive_enabled || false,
      version: metadata.version || '1.0.0',
      author: metadata.author || 'LOGOS Team',
      
      // Execute capability through Python bridge
      executeCapability: async (capability: string, params: any, context?: any) => {
        if (this.initialized) {
          return await this.executeCapability(filePath, capability, params);
        } else {
          return this.simulateCapability(capability, params, metadata);
        }
      }
    };
    
    return wrapper as any;
  }

  async executeCapability(filePath: string, capability: string, params: any): Promise<any> {
    try {
      const script = `
import sys
import json
import asyncio
sys.path.append('${filePath.substring(0, filePath.lastIndexOf('/'))}')

async def execute():
    # Import the agent module
    module_name = '${filePath.split('/').pop()?.replace('.py', '')}'
    module = __import__(module_name)
    
    # Find and instantiate the agent class
    agent_class = None
    for attr_name in dir(module):
        attr = getattr(module, attr_name)
        if isinstance(attr, type) and attr_name.endswith('Agent'):
            agent_class = attr
            break
    
    if not agent_class:
        return {"error": "No agent class found"}
    
    # Create agent instance
    agent = agent_class()
    
    # Execute capability
    if hasattr(agent, '${capability}'):
        method = getattr(agent, '${capability}')
        result = await method(**${JSON.stringify(params)})
        return {"success": True, "result": result}
    else:
        return {"error": f"Capability ${capability} not found"}

# Run the async function
result = asyncio.run(execute())
print(json.dumps(result))
`;

      const result = await this.executePython(['-c', script]);
      return JSON.parse(result);
    } catch (error) {
      logger.error(`Failed to execute Python capability ${capability}:`, error);
      throw error;
    }
  }

  private simulateCapability(capability: string, params: any, metadata: PythonAgentMetadata): any {
    // Simulate Python agent execution when Python is not available
    const agentName = metadata.name || 'Python Agent';
    
    switch (capability) {
      case 'analyze':
        return {
          success: true,
          result: {
            summary: `Analysis completed by ${agentName}`,
            findings: [
              'Data patterns identified',
              'Key insights extracted',
              'Recommendations generated'
            ],
            params_received: params
          }
        };
        
      case 'consult':
        return {
          success: true,
          result: {
            response: `Expert consultation from ${agentName}:
            
Based on your query: "${params.query || 'General consultation'}"
            
I can provide specialized insights in this domain. This is a simulated response 
demonstrating the agent's capability to provide expert consultation.`,
            confidence: 0.95,
            sources: ['Domain expertise', 'Best practices', 'Current research']
          }
        };
        
      case 'generate':
        return {
          success: true,
          result: {
            generated_content: `Generated by ${agentName}`,
            type: params.type || 'general',
            metadata: {
              timestamp: new Date().toISOString(),
              version: metadata.version
            }
          }
        };
        
      default:
        return {
          success: true,
          result: {
            message: `Capability ${capability} executed successfully`,
            agent: agentName,
            params: params,
            note: 'This is a simulated response. Python runtime not available.'
          }
        };
    }
  }

  private executePython(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.pythonPath, args);
      let output = '';
      let error = '';
      
      python.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${error}`));
        } else {
          resolve(output.trim());
        }
      });
    });
  }
}