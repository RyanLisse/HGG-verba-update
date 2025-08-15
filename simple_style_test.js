const puppeteer = require('puppeteer');

async function simpleStyleTest() {
  console.log('Simple styling test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: { width: 1400, height: 900 }
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('Going to frontend...');
    await page.goto('http://localhost:2025', { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Wait longer for React to render and auto-connect
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Take screenshot
    const timestamp = Date.now();
    await page.screenshot({ 
      path: `current_ui_${timestamp}.png`,
      fullPage: false 
    });
    
    // Check for key styling elements
    const styleCheck = await page.evaluate(() => {
      return {
        bodyClass: document.body.className,
        hasContainer: !!document.querySelector('.verba-container'),
        hasHeader: !!document.querySelector('.verba-header'),
        hasLoginView: !!document.querySelector('div:has(input)') || !!document.querySelector('input'),
        buttonVerba: getComputedStyle(document.documentElement).getPropertyValue('--button-verba'),
        primaryVerba: getComputedStyle(document.documentElement).getPropertyValue('--primary-verba'),
        currentURL: window.location.href,
        visibleElements: Array.from(document.querySelectorAll('*')).filter(el => 
          el.offsetWidth > 0 && el.offsetHeight > 0
        ).slice(0, 10).map(el => el.tagName + (el.className ? '.' + el.className.split(' ').join('.') : ''))
      };
    });
    
    console.log('Style Check:', styleCheck);
    console.log(`Screenshot saved: current_ui_${timestamp}.png`);
    
    return styleCheck;
    
  } catch (error) {
    console.error('Error:', error);
    return { error: error.message };
  } finally {
    await browser.close();
  }
}

simpleStyleTest().then(console.log).catch(console.error);