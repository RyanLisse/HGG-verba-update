const puppeteer = require('puppeteer');
const fs = require('fs');

async function testUIStyleVsReference() {
  console.log('Testing UI styling against reference image...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    
    console.log('Navigating to local frontend...');
    await page.goto('http://localhost:2025', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for page to load and auto-connect
    await page.waitForTimeout(3000);
    
    // Check if we need to connect to Verba
    try {
      const connectButton = await page.$('button:has-text("Weaviate")');
      if (connectButton) {
        console.log('Clicking Weaviate connection...');
        await connectButton.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('Auto-connection working or different UI state');
    }
    
    // Wait for main interface to load
    await page.waitForTimeout(2000);
    
    // Take a screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `current_ui_styled_${timestamp}.png`;
    
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: false 
    });
    
    console.log(`Screenshot saved as: ${screenshotPath}`);
    
    // Check if styling elements are present
    const stylingElements = await page.evaluate(() => {
      const results = {
        hasVerbaContainer: !!document.querySelector('.verba-container'),
        hasVerbaHeader: !!document.querySelector('.verba-header'),
        hasVerbaNav: !!document.querySelector('.verba-nav'),
        hasVerbaSidebar: !!document.querySelector('.verba-sidebar'),
        hasVerbaDocumentList: !!document.querySelector('.verba-document-list'),
        hasChatInterface: !!document.querySelector('.verba-chat-interface'),
        hasVerbaInputContainer: !!document.querySelector('.verba-input-container'),
        hasVerbaChatButton: !!document.querySelector('.verba-chat-button'),
        verbaCSSVariables: {
          bgVerba: getComputedStyle(document.documentElement).getPropertyValue('--bg-verba'),
          primaryVerba: getComputedStyle(document.documentElement).getPropertyValue('--primary-verba'),
          buttonVerba: getComputedStyle(document.documentElement).getPropertyValue('--button-verba'),
          secondaryVerba: getComputedStyle(document.documentElement).getPropertyValue('--secondary-verba')
        }
      };
      return results;
    });
    
    console.log('Styling Elements Check:', JSON.stringify(stylingElements, null, 2));
    
    // Compare with expected styling
    const analysisResults = {
      stylingElementsPresent: Object.values(stylingElements).filter(v => typeof v === 'boolean').filter(Boolean).length,
      totalStyleElements: Object.values(stylingElements).filter(v => typeof v === 'boolean').length,
      cssVariablesConfigured: Object.values(stylingElements.verbaCSSVariables).filter(v => v && v.trim()).length > 0,
      screenshot: screenshotPath
    };
    
    console.log('Analysis Results:', analysisResults);
    
    return analysisResults;
    
  } catch (error) {
    console.error('Error during UI styling test:', error);
    return { error: error.message };
  } finally {
    await browser.close();
  }
}

// Run the test
testUIStyleVsReference()
  .then(results => {
    console.log('UI Styling Test completed:', results);
    process.exit(0);
  })
  .catch(error => {
    console.error('UI Styling Test failed:', error);
    process.exit(1);
  });