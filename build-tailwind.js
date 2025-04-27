// build-tailwind.js
const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Target CSS file
const targetCssFile = path.join(__dirname, 'dist/style.css');

// Read base style.css
const userCss = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');

try {
  // Read Tailwind CSS files
  const tailwindIndex = fs.readFileSync(path.join(__dirname, 'node_modules/tailwindcss/index.css'), 'utf8');
  const tailwindPreflight = fs.readFileSync(path.join(__dirname, 'node_modules/tailwindcss/preflight.css'), 'utf8');
  const tailwindUtilities = fs.readFileSync(path.join(__dirname, 'node_modules/tailwindcss/utilities.css'), 'utf8');
  
  // Create a simplified version by combining the Tailwind files
  const combinedCss = 
    tailwindPreflight + 
    '\n\n' + tailwindIndex + 
    '\n\n' + tailwindUtilities + 
    '\n\n/* Custom styles */\n\n' + 
    userCss.replace('@tailwind base;', '')
           .replace('@tailwind components;', '')
           .replace('@tailwind utilities;', '');
  
  // Write combined CSS to dist/style.css
  fs.writeFileSync(targetCssFile, combinedCss, 'utf8');
  
  console.log('CSS build completed. Output: dist/style.css');
} catch (error) {
  console.error('Error building CSS:', error);
  
  // Fallback option - just use Tailwind CDN in production with a warning
  const warningCss = `/* 
WARNING: This is a fallback CSS file. 
The Tailwind CSS build process failed. This file includes only your custom styles.
For production, you should properly configure Tailwind CSS.
See: https://tailwindcss.com/docs/installation
*/

${userCss.replace('@tailwind base;', '/* @tailwind base */')
         .replace('@tailwind components;', '/* @tailwind components */')
         .replace('@tailwind utilities;', '/* @tailwind utilities */')}`;
         
  fs.writeFileSync(targetCssFile, warningCss, 'utf8');
  console.log('Created fallback CSS file. Please check the build error and fix your Tailwind configuration.');
}