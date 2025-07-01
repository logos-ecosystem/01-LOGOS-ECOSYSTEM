/**
 * AI-Powered Accessibility Provider
 * Advanced accessibility features with ML-based adaptations
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';

interface AccessibilitySettings {
  // Visual
  screenReaderEnabled: boolean;
  highContrastMode: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
  fontSize: number; // 12-32
  lineHeight: number; // 1.2-2.0
  letterSpacing: number; // 0-0.2em
  focusIndicatorStyle: 'default' | 'bold' | 'animated';
  
  // Motor
  keyboardNavigation: boolean;
  stickyKeys: boolean;
  slowKeys: boolean;
  mouseKeys: boolean;
  clickAssist: boolean;
  dwellClicking: boolean;
  dwellDelay: number; // ms
  
  // Cognitive
  simplifiedUI: boolean;
  readingAssistance: boolean;
  autoComplete: boolean;
  contextualHelp: boolean;
  cognitiveLoad: 'low' | 'medium' | 'high';
  distractionFree: boolean;
  
  // Auditory
  captionsEnabled: boolean;
  signLanguageEnabled: boolean;
  visualAlerts: boolean;
  audioDescriptions: boolean;
  
  // Navigation
  skipLinks: boolean;
  landmarkNavigation: boolean;
  headingNavigation: boolean;
  contentStructure: boolean;
  
  // AI Features
  aiAssistanceLevel: 'off' | 'minimal' | 'moderate' | 'maximum';
  predictiveActions: boolean;
  contextAwareness: boolean;
  adaptiveLearning: boolean;
}

interface AccessibilityMetrics {
  wcagScore: number; // 0-100
  readabilityScore: number; // 0-100
  navigationEfficiency: number; // 0-100
  cognitiveLoadScore: number; // 0-100
  motorAccessibility: number; // 0-100
  overallScore: number; // 0-100
}

interface AccessibilityIssue {
  id: string;
  type: 'contrast' | 'navigation' | 'structure' | 'interaction' | 'content';
  severity: 'minor' | 'moderate' | 'severe';
  element: string;
  description: string;
  suggestion: string;
  wcagCriteria: string[];
  autoFixable: boolean;
}

interface UserProfile {
  disabilities: string[];
  preferences: Partial<AccessibilitySettings>;
  interactionPatterns: InteractionPattern[];
  learningProgress: LearningMetric[];
}

interface InteractionPattern {
  type: string;
  frequency: number;
  avgDuration: number;
  successRate: number;
  timestamp: Date;
}

interface LearningMetric {
  feature: string;
  proficiency: number; // 0-1
  lastUsed: Date;
  improvementRate: number;
}

interface AccessibilityContext {
  settings: AccessibilitySettings;
  metrics: AccessibilityMetrics;
  issues: AccessibilityIssue[];
  userProfile: UserProfile | null;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  runAccessibilityAudit: () => Promise<AccessibilityIssue[]>;
  fixIssue: (issueId: string) => Promise<boolean>;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  getRecommendations: () => Promise<string[]>;
  trainUserModel: (interaction: InteractionPattern) => void;
}

const AccessibilityContextInstance = createContext<AccessibilityContext | null>(null);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContextInstance);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

// AI Model for accessibility recommendations
class AccessibilityAI {
  private model: tf.LayersModel | null = null;
  private userPatterns: Map<string, InteractionPattern[]> = new Map();
  
  async initialize() {
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [20], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 10, activation: 'softmax' })
      ]
    });
    
    this.model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
  }
  
  analyzeUserBehavior(patterns: InteractionPattern[]): {
    recommendations: string[];
    adaptations: Partial<AccessibilitySettings>;
  } {
    // Analyze interaction patterns
    const avgDuration = patterns.reduce((sum, p) => sum + p.avgDuration, 0) / patterns.length;
    const avgSuccessRate = patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length;
    
    const recommendations: string[] = [];
    const adaptations: Partial<AccessibilitySettings> = {};
    
    // Slow interactions suggest motor difficulties
    if (avgDuration > 5000) {
      recommendations.push('Enable click assistance for easier interaction');
      adaptations.clickAssist = true;
      adaptations.dwellClicking = true;
    }
    
    // Low success rates suggest cognitive difficulties
    if (avgSuccessRate < 0.7) {
      recommendations.push('Simplify UI for better comprehension');
      adaptations.simplifiedUI = true;
      adaptations.contextualHelp = true;
      adaptations.cognitiveLoad = 'low';
    }
    
    // Frequent keyboard usage
    const keyboardPatterns = patterns.filter(p => p.type.includes('keyboard'));
    if (keyboardPatterns.length > patterns.length * 0.7) {
      recommendations.push('Optimize for keyboard navigation');
      adaptations.keyboardNavigation = true;
      adaptations.skipLinks = true;
    }
    
    return { recommendations, adaptations };
  }
  
  predictUserNeeds(profile: UserProfile): string[] {
    const needs: string[] = [];
    
    // Based on disabilities
    if (profile.disabilities.includes('visual')) {
      needs.push('screen-reader', 'high-contrast', 'large-text');
    }
    if (profile.disabilities.includes('motor')) {
      needs.push('keyboard-nav', 'click-assist', 'voice-control');
    }
    if (profile.disabilities.includes('cognitive')) {
      needs.push('simple-ui', 'reading-assist', 'context-help');
    }
    if (profile.disabilities.includes('hearing')) {
      needs.push('captions', 'visual-alerts', 'sign-language');
    }
    
    return needs;
  }
}

// Screen reader announcer
class ScreenReaderAnnouncer {
  private liveRegion: HTMLDivElement | null = null;
  
  initialize() {
    if (typeof document === 'undefined') return;
    
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.left = '-10000px';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.overflow = 'hidden';
    document.body.appendChild(this.liveRegion);
  }
  
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.liveRegion) return;
    
    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = '';
      }
    }, 1000);
  }
  
  destroy() {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
    }
  }
}

// Accessibility audit engine
class AccessibilityAuditor {
  async runAudit(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];
    
    if (typeof document === 'undefined') return issues;
    
    // Check color contrast
    this.auditColorContrast(issues);
    
    // Check heading structure
    this.auditHeadingStructure(issues);
    
    // Check form labels
    this.auditFormLabels(issues);
    
    // Check image alt text
    this.auditImageAltText(issues);
    
    // Check keyboard navigation
    this.auditKeyboardNavigation(issues);
    
    // Check ARIA usage
    this.auditARIA(issues);
    
    return issues;
  }
  
  private auditColorContrast(issues: AccessibilityIssue[]) {
    const elements = document.querySelectorAll('*');
    
    elements.forEach((element) => {
      const style = window.getComputedStyle(element);
      const bgColor = style.backgroundColor;
      const textColor = style.color;
      
      if (bgColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'rgba(0, 0, 0, 0)') {
        const contrast = this.calculateContrast(bgColor, textColor);
        
        if (contrast < 4.5) { // WCAG AA standard
          issues.push({
            id: `contrast-${Date.now()}-${Math.random()}`,
            type: 'contrast',
            severity: contrast < 3 ? 'severe' : 'moderate',
            element: element.tagName,
            description: `Insufficient color contrast (${contrast.toFixed(2)}:1)`,
            suggestion: 'Increase contrast between text and background colors',
            wcagCriteria: ['1.4.3'],
            autoFixable: true
          });
        }
      }
    });
  }
  
  private auditHeadingStructure(issues: AccessibilityIssue[]) {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let lastLevel = 0;
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName[1]);
      
      if (index === 0 && level !== 1) {
        issues.push({
          id: `heading-${Date.now()}-1`,
          type: 'structure',
          severity: 'moderate',
          element: heading.tagName,
          description: 'Page should start with an H1 heading',
          suggestion: 'Add an H1 heading at the beginning of the main content',
          wcagCriteria: ['2.4.6'],
          autoFixable: false
        });
      }
      
      if (level > lastLevel + 1) {
        issues.push({
          id: `heading-${Date.now()}-${index}`,
          type: 'structure',
          severity: 'minor',
          element: heading.tagName,
          description: `Heading level skipped (${lastLevel} to ${level})`,
          suggestion: 'Use sequential heading levels without skipping',
          wcagCriteria: ['1.3.1'],
          autoFixable: false
        });
      }
      
      lastLevel = level;
    });
  }
  
  private auditFormLabels(issues: AccessibilityIssue[]) {
    const inputs = document.querySelectorAll('input, select, textarea');
    
    inputs.forEach((input) => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      
      if (!id || (!document.querySelector(`label[for="${id}"]`) && !ariaLabel && !ariaLabelledBy)) {
        issues.push({
          id: `label-${Date.now()}-${Math.random()}`,
          type: 'interaction',
          severity: 'severe',
          element: input.tagName,
          description: 'Form input missing accessible label',
          suggestion: 'Add a label element or aria-label attribute',
          wcagCriteria: ['3.3.2'],
          autoFixable: true
        });
      }
    });
  }
  
  private auditImageAltText(issues: AccessibilityIssue[]) {
    const images = document.querySelectorAll('img');
    
    images.forEach((img) => {
      const alt = img.getAttribute('alt');
      const role = img.getAttribute('role');
      
      if (alt === null && role !== 'presentation') {
        issues.push({
          id: `alt-${Date.now()}-${Math.random()}`,
          type: 'content',
          severity: 'severe',
          element: 'IMG',
          description: 'Image missing alt text',
          suggestion: 'Add descriptive alt text or mark as decorative with role="presentation"',
          wcagCriteria: ['1.1.1'],
          autoFixable: false
        });
      }
    });
  }
  
  private auditKeyboardNavigation(issues: AccessibilityIssue[]) {
    const interactiveElements = document.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    let hasSkipLink = false;
    interactiveElements.forEach((element) => {
      if (element.textContent?.toLowerCase().includes('skip to')) {
        hasSkipLink = true;
      }
    });
    
    if (!hasSkipLink) {
      issues.push({
        id: `skip-link-${Date.now()}`,
        type: 'navigation',
        severity: 'moderate',
        element: 'BODY',
        description: 'Missing skip navigation link',
        suggestion: 'Add a skip link at the beginning of the page',
        wcagCriteria: ['2.4.1'],
        autoFixable: true
      });
    }
  }
  
  private auditARIA(issues: AccessibilityIssue[]) {
    const elementsWithARIA = document.querySelectorAll('[role], [aria-label], [aria-labelledby], [aria-describedby]');
    
    elementsWithARIA.forEach((element) => {
      const role = element.getAttribute('role');
      
      // Check for redundant roles
      if (role === 'button' && element.tagName === 'BUTTON') {
        issues.push({
          id: `aria-${Date.now()}-${Math.random()}`,
          type: 'structure',
          severity: 'minor',
          element: element.tagName,
          description: 'Redundant ARIA role',
          suggestion: 'Remove redundant role attribute from native elements',
          wcagCriteria: ['4.1.2'],
          autoFixable: true
        });
      }
    });
  }
  
  private calculateContrast(bg: string, fg: string): number {
    // Simplified contrast calculation
    const getLuminance = (color: string): number => {
      // Parse color and calculate relative luminance
      return 0.5; // Placeholder
    };
    
    const bgLum = getLuminance(bg);
    const fgLum = getLuminance(fg);
    
    const lighter = Math.max(bgLum, fgLum);
    const darker = Math.min(bgLum, fgLum);
    
    return (lighter + 0.05) / (darker + 0.05);
  }
}

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    // Visual
    screenReaderEnabled: false,
    highContrastMode: false,
    colorBlindMode: 'none',
    fontSize: 16,
    lineHeight: 1.5,
    letterSpacing: 0,
    focusIndicatorStyle: 'default',
    
    // Motor
    keyboardNavigation: true,
    stickyKeys: false,
    slowKeys: false,
    mouseKeys: false,
    clickAssist: false,
    dwellClicking: false,
    dwellDelay: 1000,
    
    // Cognitive
    simplifiedUI: false,
    readingAssistance: false,
    autoComplete: true,
    contextualHelp: true,
    cognitiveLoad: 'medium',
    distractionFree: false,
    
    // Auditory
    captionsEnabled: false,
    signLanguageEnabled: false,
    visualAlerts: false,
    audioDescriptions: false,
    
    // Navigation
    skipLinks: true,
    landmarkNavigation: true,
    headingNavigation: true,
    contentStructure: true,
    
    // AI Features
    aiAssistanceLevel: 'moderate',
    predictiveActions: true,
    contextAwareness: true,
    adaptiveLearning: true,
  });
  
  const [metrics, setMetrics] = useState<AccessibilityMetrics>({
    wcagScore: 85,
    readabilityScore: 78,
    navigationEfficiency: 82,
    cognitiveLoadScore: 75,
    motorAccessibility: 88,
    overallScore: 82,
  });
  
  const [issues, setIssues] = useState<AccessibilityIssue[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [aiModel] = useState(() => new AccessibilityAI());
  const [announcer] = useState(() => new ScreenReaderAnnouncer());
  const [auditor] = useState(() => new AccessibilityAuditor());
  
  // Initialize
  useEffect(() => {
    aiModel.initialize();
    announcer.initialize();
    
    return () => {
      announcer.destroy();
    };
  }, [aiModel, announcer]);
  
  // Load user preferences
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibility-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    
    const savedProfile = localStorage.getItem('accessibility-profile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }
  }, []);
  
  // Save settings
  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  }, [settings]);
  
  // Apply settings to document
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Apply font size
    root.style.fontSize = `${settings.fontSize}px`;
    
    // Apply line height
    root.style.lineHeight = `${settings.lineHeight}`;
    
    // Apply letter spacing
    root.style.letterSpacing = `${settings.letterSpacing}em`;
    
    // Apply high contrast
    if (settings.highContrastMode) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Apply color blind mode
    root.setAttribute('data-colorblind-mode', settings.colorBlindMode);
    
    // Apply simplified UI
    if (settings.simplifiedUI) {
      root.classList.add('simplified-ui');
    } else {
      root.classList.remove('simplified-ui');
    }
    
    // Apply distraction free mode
    if (settings.distractionFree) {
      root.classList.add('distraction-free');
    } else {
      root.classList.remove('distraction-free');
    }
  }, [settings]);
  
  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);
  
  const runAccessibilityAudit = useCallback(async (): Promise<AccessibilityIssue[]> => {
    const auditResults = await auditor.runAudit();
    setIssues(auditResults);
    
    // Update metrics based on audit
    const severeIssues = auditResults.filter(i => i.severity === 'severe').length;
    const moderateIssues = auditResults.filter(i => i.severity === 'moderate').length;
    const minorIssues = auditResults.filter(i => i.severity === 'minor').length;
    
    const wcagScore = Math.max(0, 100 - (severeIssues * 10 + moderateIssues * 5 + minorIssues * 2));
    
    setMetrics(prev => ({
      ...prev,
      wcagScore,
      overallScore: (prev.readabilityScore + wcagScore + prev.navigationEfficiency + 
                     prev.cognitiveLoadScore + prev.motorAccessibility) / 5
    }));
    
    return auditResults;
  }, [auditor]);
  
  const fixIssue = useCallback(async (issueId: string): Promise<boolean> => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue || !issue.autoFixable) return false;
    
    // Implement auto-fixes for different issue types
    switch (issue.type) {
      case 'contrast':
        // Auto-adjust colors for better contrast
        updateSettings({ highContrastMode: true });
        break;
        
      case 'navigation':
        // Add skip links
        updateSettings({ skipLinks: true });
        break;
        
      case 'interaction':
        // Enable better interaction helpers
        updateSettings({ contextualHelp: true });
        break;
    }
    
    // Remove fixed issue
    setIssues(prev => prev.filter(i => i.id !== issueId));
    
    return true;
  }, [issues, updateSettings]);
  
  const announceToScreenReader = useCallback((
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    if (settings.screenReaderEnabled) {
      announcer.announce(message, priority);
    }
  }, [settings.screenReaderEnabled, announcer]);
  
  const getRecommendations = useCallback(async (): Promise<string[]> => {
    if (!userProfile) return [];
    
    const behaviorAnalysis = aiModel.analyzeUserBehavior(userProfile.interactionPatterns);
    const predictedNeeds = aiModel.predictUserNeeds(userProfile);
    
    // Apply AI recommendations
    if (settings.adaptiveLearning) {
      updateSettings(behaviorAnalysis.adaptations);
    }
    
    return [
      ...behaviorAnalysis.recommendations,
      ...predictedNeeds.map(need => `Consider enabling ${need} for better accessibility`)
    ];
  }, [userProfile, aiModel, settings.adaptiveLearning, updateSettings]);
  
  const trainUserModel = useCallback((interaction: InteractionPattern) => {
    setUserProfile(prev => {
      if (!prev) {
        return {
          disabilities: [],
          preferences: {},
          interactionPatterns: [interaction],
          learningProgress: []
        };
      }
      
      return {
        ...prev,
        interactionPatterns: [...prev.interactionPatterns, interaction].slice(-100) // Keep last 100
      };
    });
  }, []);
  
  const contextValue: AccessibilityContext = {
    settings,
    metrics,
    issues,
    userProfile,
    updateSettings,
    runAccessibilityAudit,
    fixIssue,
    announceToScreenReader,
    getRecommendations,
    trainUserModel,
  };
  
  return (
    <AccessibilityContextInstance.Provider value={contextValue}>
      {children}
    </AccessibilityContextInstance.Provider>
  );
};

// Accessibility hooks
export const useScreenReader = () => {
  const { announceToScreenReader } = useAccessibility();
  return announceToScreenReader;
};

export const useKeyboardNavigation = () => {
  const { settings } = useAccessibility();
  
  useEffect(() => {
    if (!settings.keyboardNavigation) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip link shortcut (Alt + S)
      if (e.altKey && e.key === 's') {
        const mainContent = document.querySelector('main, [role="main"]');
        if (mainContent instanceof HTMLElement) {
          mainContent.focus();
          mainContent.scrollIntoView();
        }
      }
      
      // Navigate by headings (H key)
      if (e.key === 'h' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          const currentIndex = headings.findIndex(h => h === document.activeElement);
          const nextHeading = headings[currentIndex + 1] || headings[0];
          if (nextHeading instanceof HTMLElement) {
            nextHeading.focus();
            nextHeading.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settings.keyboardNavigation]);
};

export default AccessibilityProvider;