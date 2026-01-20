{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttling": {
          "cpuSlowdownMultiplier": 1
        }
      }
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.7 }],
        "categories:accessibility": ["warn", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.8 }],
        "categories:seo": ["warn", { "minScore": 0.8 }],
        
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 3000 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 500 }],
        "speed-index": ["warn", { "maxNumericValue": 4000 }],
        
        "interactive": ["warn", { "maxNumericValue": 5000 }],
        "max-potential-fid": ["warn", { "maxNumericValue": 250 }],
        
        "resource-summary:script:size": ["warn", { "maxNumericValue": 500000 }],
        "resource-summary:total:size": ["warn", { "maxNumericValue": 2000000 }],
        
        "uses-responsive-images": "warn",
        "offscreen-images": "warn",
        "render-blocking-resources": "warn"
      }
    }
  },
  
  "budgets": [
    {
      "path": "/Dashboard",
      "name": "Dashboard Page",
      "timings": [
        { "metric": "first-contentful-paint", "budget": 1500 },
        { "metric": "largest-contentful-paint", "budget": 2500 },
        { "metric": "cumulative-layout-shift", "budget": 0.1 },
        { "metric": "total-blocking-time", "budget": 400 }
      ],
      "resourceSizes": [
        { "resourceType": "script", "budget": 400 },
        { "resourceType": "total", "budget": 1500 }
      ]
    },
    {
      "path": "/Pipeline",
      "name": "Pipeline Page",
      "timings": [
        { "metric": "first-contentful-paint", "budget": 1500 },
        { "metric": "largest-contentful-paint", "budget": 2500 },
        { "metric": "cumulative-layout-shift", "budget": 0.1 },
        { "metric": "total-blocking-time", "budget": 400 }
      ],
      "resourceSizes": [
        { "resourceType": "script", "budget": 400 },
        { "resourceType": "total", "budget": 1500 }
      ]
    },
    {
      "path": "/Leads",
      "name": "Leads List Page",
      "timings": [
        { "metric": "first-contentful-paint", "budget": 1800 },
        { "metric": "largest-contentful-paint", "budget": 3000 },
        { "metric": "cumulative-layout-shift", "budget": 0.1 },
        { "metric": "total-blocking-time", "budget": 500 }
      ],
      "resourceSizes": [
        { "resourceType": "script", "budget": 450 },
        { "resourceType": "total", "budget": 1800 }
      ]
    },
    {
      "path": "/DealDetail",
      "name": "Deal Detail Page",
      "timings": [
        { "metric": "first-contentful-paint", "budget": 2000 },
        { "metric": "largest-contentful-paint", "budget": 3500 },
        { "metric": "cumulative-layout-shift", "budget": 0.15 },
        { "metric": "total-blocking-time", "budget": 600 }
      ],
      "resourceSizes": [
        { "resourceType": "script", "budget": 500 },
        { "resourceType": "total", "budget": 2000 }
      ]
    },
    {
      "path": "/LoanApplicationWizard",
      "name": "Loan Application Wizard",
      "timings": [
        { "metric": "first-contentful-paint", "budget": 2000 },
        { "metric": "largest-contentful-paint", "budget": 3000 },
        { "metric": "cumulative-layout-shift", "budget": 0.1 },
        { "metric": "total-blocking-time", "budget": 500 }
      ],
      "resourceSizes": [
        { "resourceType": "script", "budget": 450 },
        { "resourceType": "total", "budget": 1800 }
      ]
    },
    {
      "path": "/BorrowerPortal",
      "name": "Borrower Portal",
      "timings": [
        { "metric": "first-contentful-paint", "budget": 1500 },
        { "metric": "largest-contentful-paint", "budget": 2500 },
        { "metric": "cumulative-layout-shift", "budget": 0.1 },
        { "metric": "total-blocking-time", "budget": 400 }
      ],
      "resourceSizes": [
        { "resourceType": "script", "budget": 350 },
        { "resourceType": "total", "budget": 1200 }
      ]
    }
  ],
  
  "thresholds": {
    "performance": {
      "error": 70,
      "warn": 80
    },
    "accessibility": {
      "error": 85,
      "warn": 95
    },
    "bestPractices": {
      "error": 75,
      "warn": 85
    },
    "seo": {
      "error": 75,
      "warn": 85
    }
  },
  
  "notes": {
    "budgetUnits": "Timing budgets in milliseconds, size budgets in KB",
    "enforcement": "Error thresholds block deploy, warn thresholds create alerts",
    "baseline": "Based on initial measurements 2026-01-20",
    "reviewCadence": "Review and adjust budgets quarterly"
  }
}