
export type AppLanguage = 'Chinese' | 'English' | 'Español' | 'Français' | 'Italiano' | 'Japanese';
export type AppTheme = 'dark' | 'light';
export type AppView = 'synthesis' | 'questions' | 'maps';

export interface UserDiagnostics {
  healthProfile: string;
  preferences: string;
  ingredients: string;
  targetDish: string;
  additionalSpecs: string;
  language: AppLanguage;
}

export interface MacroNutrients {
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  fiber: string;
  glycemicIndex?: string;
  glycemicLoad?: string;
}

export interface Recipe {
  title: string;
  dietaryFit: string;
  ingredients: { name: string; amount: string; function: string }[];
  procedure: string[];
  scienceCheck: string;
  macros: MacroNutrients;
  cookingTime: string;
  allergenWarning?: string;
  allergenSeverity?: 'high' | 'low' | null;
}

export interface DetectedItem {
  name: string;
  status: 'SAFE' | 'WARNING' | 'FORBIDDEN';
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  reason: string;
  macros?: MacroNutrients;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string;
  detections?: DetectedItem[];
  sources?: { title: string, uri: string }[];
  status?: 'SAFE' | 'WARNING' | 'FORBIDDEN'; // Added for global message alert
  isAutoPrompt?: boolean;
  macros?: MacroNutrients;
  hasScannerAction?: boolean;
  hasLocatorAction?: boolean;
}

export interface Translations {
  headerSub: string;
  status: string;
  synthesisParams: string;
  targetDish: string;
  targetDishPlace: string;
  additionalSpecs: string;
  additionalSpecsPlace: string;
  healthProfile: string;
  healthProfilePlace: string;
  ingredients: string;
  ingredientsPlace: string;
  preferences: string;
  preferencesPlace: string;
  submitBtn: string;
  loading: string;
  error: string;
  chefProfile: string;
  gastronomicComponents: string;
  nutritionalSpecs: string;
  protocol: string;
  scienceLog: string;
  newSynthesis: string;
  intercom: string;
  chatPlaceholder: string;
  send: string;
  processing: string;
  themeToggle: string;
  shareBtn: string;
  copySuccess: string;
  cancelBtn: string;
  exportOptions: string;
  downloadTxt: string;
  downloadPdf: string;
  copyText: string;
  healthCenter: string;
  uploadMenu: string;
  menuAnalysisRequest: string;
  safetyProtocol: string;
  liveScan: string;
  captureData: string;
  activeClinicalProfile: string;
  goalsAndRegimes: string;
  selectGoal: string;
  goalWeightLoss: string;
  goalMuscleMass: string;
  goalGlycemicControl: string;
  goalVegan: string;
  goalPescatarian: string;
  goalMuslim: string;
  goalAntiInflammatory: string;
  goalOther: string;
  userLabel: string;
  chefOmoikaneLabel: string;
  criticalErrorChat: string;
  scanningTarget: string;
  analysisClinicalParams: string;
  syncDiagnosticMatrix: string;
  cameraAccessDenied: string;
  cookingTimeLabel: string;
  helpBtn: string;
  helpTitle: string;
  helpQ1: string;
  helpA1: string;
  helpQ2: string;
  helpA2: string;
  helpQ3: string;
  helpA3: string;
  helpQ4: string;
  helpA4: string;
  helpAssistantNote: string;
  helpSafetyTitle: string;
  noResultsFound: string;
  medicalDisclaimer: string;
  allergenConflictDetected: string;
  webSources: string;
  dataRequired: string;
  systemLocked: string;
  enterConditionsPrompt: string;
  healthyStatus: string;
  abortMessage: string;
  languageLabel: string;
  linkActive: string;
  unitStatus: string;
  pressToScan: string;
  actionAcknowledge: string;
  quickStartProtocol: string;
  step1: string;
  step2: string;
  step3: string;
  reanalyzeBtn: string;
  macroDisclaimer: string;
  mapsTitle: string;
  mapsSearchPlace: string;
  gpsBtn: string;
  rescanBtn: string;
  mapsExplainer: string;
  gpsError: string;
  systemInfo: string;
  safeZone: string;
  bioCaution: string;
  criticalRestriction: string;
  navigate: string;
  safe: string;
  warning: string;
  forbidden: string;
  howItWorks: string;
  howItWorksScan: string;
  howItWorksUpload: string;
  howItWorksQuery: string;
  queryTip: string;
  examples: string;
  exampleProduct: string;
  exampleDish: string;
  exampleMenu: string;
  assistantGreeting: string;
  apiKeyConfigTitle: string;
  apiKeyConfigDesc: string;
  apiKeyConfigPlaceholder: string;
  apiKeyConfigSave: string;
  apiKeyConfigSuccess: string;
  apiKeyConfigError: string;
  backupApiKeyTitle?: string;
  backupApiKeyDesc?: string;
  backupProviderLabel?: string;
  pasteClipboard?: string;
  getKeyHelp?: string;
}
