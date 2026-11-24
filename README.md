# 🍱 Chef Omoikane
> Cyberpunk AI Dietary & Bio-Culinary Assistant

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg)](https://vitejs.dev/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-2.5-4285F4.svg)](https://ai.google.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF.svg)](https://capacitorjs.com/)

Chef Omoikane is an AI-powered bio-culinary terminal engineered with a retro-cyberpunk aesthetic. It analyzes ingredients via computer vision, adapts recipes to user health and allergy profiles, scans nutritional labels for bio-hazards, and searches for safe local dining spots with dual-provider API failover.

---

## ⚡ Key Features

- **🍳 Let's Cook Something (Recipe Generator)**: Generates tailored, allergen-free recipes based on your dietary profile, available ingredients, and culinary preferences.
- **👁️ Bio-Scanner Vision**: Real-time camera feed and image upload to instantly recognize ingredients, food items, and nutritional labels using multimodal vision.
- **🛡️ Let's Check What We Got (Safety Checker)**: Cross-checks food labels and menu items against your personalized clinical health conditions and allergen restrictions.
- **📍 Bio-Locator (Maps Terminal)**: Uses GPS to scan nearby restaurants, cafes, and markets, categorizing each venue by safety level (Safe / Caution / Critical).
- **🤖 Omoi Bot Assistant**: Floating, voice-enabled assistant to assist and refine culinary decisions on the fly.
- **🔑 Dual API Failover System**: Supports a primary Gemini key and an optional backup key (xAI Grok, OpenRouter, or a secondary Gemini key) with automated failover in case of rate limits or service interruptions.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Google AI Studio API Key](https://aistudio.google.com/app/apikey)

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/HEdq-dev/chef-omoikane.git
cd chef-omoikane
npm install
