/* Optional browser checks: npm install --no-save playwright && npx playwright install chromium */
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
let playwright;
try {playwright=require('playwright');}
catch(error) {
  if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error;
  playwright=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));
}
const output=process.env.BROWSER_TEST_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(),'vaccum-card-'));
fs.mkdirSync(output,{recursive:true});
const demoUrl=pathToFileURL(path.resolve(__dirname,'../demo.html')).href;
async function launch() {
  return playwright.chromium.launch({
    headless:true,
    ...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),
    args:process.env.CHROMIUM_ARGS?JSON.parse(process.env.CHROMIUM_ARGS):[]
  });
}
module.exports={launch,demoUrl,output};
