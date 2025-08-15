const puppeteer = require('puppeteer');

async function verifyUIMatch() {
  console.log('Comprehensive UI verification against reference image...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    
    console.log('Loading frontend...');
    await page.goto('http://localhost:2025', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Wait for auto-connection and full UI load
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Take detailed screenshots
    const timestamp = Date.now();
    await page.screenshot({ 
      path: `ui_verification_full_${timestamp}.png`,
      fullPage: true 
    });
    
    await page.screenshot({ 
      path: `ui_verification_viewport_${timestamp}.png`,
      fullPage: false 
    });
    
    // Comprehensive UI analysis
    const uiAnalysis = await page.evaluate(() => {
      const analysis = {
        pageTitle: document.title,
        bodyClasses: document.body.className,
        
        // Check for key Verba components
        components: {
          header: !!document.querySelector('.verba-header'),
          logo: !!document.querySelector('.verba-logo'),
          nav: !!document.querySelector('.verba-nav'),
          sidebar: !!document.querySelector('.verba-sidebar'),
          chatInterface: !!document.querySelector('.verba-chat-interface'),
          documentList: !!document.querySelector('.verba-document-list'),
          chatButton: !!document.querySelector('.verba-chat-button'),
          inputContainer: !!document.querySelector('.verba-input-container')
        },
        
        // Check CSS variables
        cssVariables: {
          bgVerba: getComputedStyle(document.documentElement).getPropertyValue('--bg-verba'),
          buttonVerba: getComputedStyle(document.documentElement).getPropertyValue('--button-verba'),
          primaryVerba: getComputedStyle(document.documentElement).getPropertyValue('--primary-verba'),
          secondaryVerba: getComputedStyle(document.documentElement).getPropertyValue('--secondary-verba')
        },
        
        // Check actual styling application
        actualStyling: {
          headerVisible: false,
          chatButtonColor: null,
          sidebarVisible: false,
          layoutStructure: null
        },
        
        // Get visible text content
        visibleText: Array.from(document.querySelectorAll('*'))
          .filter(el => el.innerText && el.innerText.trim())
          .map(el => el.innerText.trim())
          .filter(text => text.length < 50)
          .slice(0, 10),
          
        // Check what's actually rendering
        renderingState: {
          hasLogin: !!document.querySelector('input[type="text"], input[type="password"], button:contains("Connect")'),
          hasMainInterface: !!document.querySelector('.verba-header, .verba-nav'),
          hasDocuments: !!document.querySelector('.verba-document-list, .verba-sidebar'),
          currentView: 'unknown'
        }
      };
      
      // Check actual header styling
      const header = document.querySelector('.verba-header');
      if (header) {
        const headerStyle = getComputedStyle(header);
        analysis.actualStyling.headerVisible = headerStyle.display !== 'none' && headerStyle.visibility !== 'hidden';
      }
      
      // Check chat button styling
      const chatButton = document.querySelector('.verba-chat-button, button:contains("Chat")');
      if (chatButton) {
        const buttonStyle = getComputedStyle(chatButton);
        analysis.actualStyling.chatButtonColor = buttonStyle.backgroundColor;
      }
      
      // Check sidebar
      const sidebar = document.querySelector('.verba-sidebar');
      if (sidebar) {
        const sidebarStyle = getComputedStyle(sidebar);
        analysis.actualStyling.sidebarVisible = sidebarStyle.display !== 'none';
      }
      
      // Determine current view
      if (document.querySelector('input, .login')) {
        analysis.renderingState.currentView = 'login';
      } else if (document.querySelector('.verba-header')) {
        analysis.renderingState.currentView = 'main-interface';
      } else {
        analysis.renderingState.currentView = 'loading';
      }
      
      return analysis;
    });
    
    console.log('UI Analysis Results:');
    console.log(JSON.stringify(uiAnalysis, null, 2));
    
    // Reference image comparison
    const referenceExpectations = {
      shouldHave: {
        yellowChatButton: true,
        documentSidebar: true,
        professionalHeader: true,
        greenAccents: true,
        cleanLayout: true
      }
    };
    
    const matchScore = {
      components: Object.values(uiAnalysis.components).filter(Boolean).length,
      totalComponents: Object.keys(uiAnalysis.components).length,
      cssVariablesWorking: Object.values(uiAnalysis.cssVariables).filter(v => v && v.trim()).length > 0,
      actualStylingWorking: Object.values(uiAnalysis.actualStyling).filter(v => v !== null && v !== false).length,
      currentView: uiAnalysis.renderingState.currentView
    };
    
    console.log('\nMatch Score:', matchScore);
    console.log(`Screenshots saved: ui_verification_full_${timestamp}.png, ui_verification_viewport_${timestamp}.png`);
    
    return {
      analysis: uiAnalysis,
      matchScore: matchScore,
      screenshots: [`ui_verification_full_${timestamp}.png`, `ui_verification_viewport_${timestamp}.png`]
    };
    
  } catch (error) {
    console.error('Error during verification:', error);
    return { error: error.message };
  } finally {
    // Keep browser open to see the result
    console.log('Browser kept open for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

verifyUIMatch()
  .then(results => {
    console.log('\nVerification Complete');
    if (results.error) {
      console.log('Error:', results.error);
    } else {
      console.log('Final Assessment: UI elements detected but manual verification needed');
    }
  })
  .catch(console.error);