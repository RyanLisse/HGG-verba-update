const puppeteer = require('puppeteer');

async function connectToMainUI() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Set viewport to standard desktop size
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    console.log('Navigating to Verba...');
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Click Weaviate option
    console.log('Clicking Weaviate option...');
    const weaviateButtons = await page.$$('button');
    for (let button of weaviateButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.includes('Weaviate')) {
        await button.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        break;
      }
    }
    
    // Fill in Weaviate connection details
    console.log('Filling connection details...');
    
    // Try to find and fill the Weaviate URL field
    const urlInputs = await page.$$('input[type="text"], input[type="url"], input');
    if (urlInputs.length > 0) {
      await urlInputs[0].click();
      await urlInputs[0].type('http://localhost:8079');
      console.log('Filled Weaviate URL');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Click Connect to Weaviate button
    console.log('Clicking Connect to Weaviate...');
    const connectButtons = await page.$$('button');
    for (let button of connectButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.includes('Connect to Weaviate')) {
        await button.click();
        console.log('Clicked Connect button');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for connection
        break;
      }
    }
    
    // Take screenshot of the result
    await page.screenshot({ path: 'main_ui_connected.png', fullPage: true });
    console.log('Screenshot saved as main_ui_connected.png');
    
    // Check if we're now in the main interface
    const pageContent = await page.content();
    if (pageContent.includes('Chat') || pageContent.includes('Documents') || pageContent.includes('Import')) {
      console.log('SUCCESS: Reached main interface!');
      
      // Take screenshots of different sections
      const navButtons = await page.$$('button, [role="tab"], a');
      console.log(`Found ${navButtons.length} potential navigation elements`);
      
      for (let i = 0; i < Math.min(navButtons.length, 8); i++) {
        try {
          const button = navButtons[i];
          const text = await button.evaluate(el => el.textContent || el.getAttribute('aria-label') || '');
          if (text && (text.includes('Chat') || text.includes('Document') || text.includes('Settings') || text.includes('Import'))) {
            console.log(`Clicking: ${text}`);
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.screenshot({ path: `main_ui_${text.toLowerCase().replace(/\s+/g, '_')}.png`, fullPage: true });
          }
        } catch (e) {
          console.log(`Could not click navigation element ${i}:`, e.message);
        }
      }
    } else {
      console.log('Still not in main interface, checking current state...');
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('Keeping browser open for inspection...');
    // await browser.close();
  }
}

connectToMainUI().catch(console.error);