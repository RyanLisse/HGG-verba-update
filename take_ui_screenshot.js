const puppeteer = require('puppeteer');
const fs = require('fs');

async function takeUIScreenshot() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Navigating to localhost:2025...');
    await page.goto('http://localhost:2025', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for page to load completely
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot
    console.log('Taking screenshot...');
    await page.screenshot({ 
      path: 'current_ui.png', 
      fullPage: true 
    });
    
    console.log('✅ Screenshot saved as current_ui.png');
    
    // Check if we're on the login/deployment screen
    const pageTitle = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    console.log('Page title:', pageTitle);
    console.log('Page contains "Choose your deployment":', bodyText.includes('Choose your deployment'));
    console.log('Page contains "Welcome to Verba":', bodyText.includes('Welcome to Verba'));
    console.log('Page contains main interface elements:', bodyText.includes('Chat') && bodyText.includes('Documents'));
    
    return {
      isMainInterface: bodyText.includes('Chat') && bodyText.includes('Documents'),
      isLoginScreen: bodyText.includes('Welcome to Verba')
    };
    
  } catch (error) {
    console.error('Error taking screenshot:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

takeUIScreenshot().catch(console.error);