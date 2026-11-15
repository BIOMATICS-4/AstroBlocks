// Build a standalone development candidate without overwriting the submitted release.
// Usage: node build-integrated.cjs [baseline.html] [output.html]
const fs=require('node:fs'),path=require('node:path');
const input=path.resolve(process.argv[2]||path.join(__dirname,'index.html'));
const output=path.resolve(process.argv[3]||path.join(__dirname,'AstroBlocks_Integrated_Missions.html'));
if(input===output)throw Error('Choose a new output file.');
let html=fs.readFileSync(input,'utf8'),code=fs.readFileSync(path.join(__dirname,'mission-integrated.js'),'utf8');
const hook='animateCrew();animateFieldRover();showHazardProps();renderer.render(stage,camera);';
if(html.split(hook).length!==2||html.includes('window.__astroIntegratedRender'))throw Error('Source differs from the reviewed baseline or was already patched; no output written.');
new Function(code);
html=html.replace(hook,'animateCrew();animateFieldRover();showHazardProps();if(window.__astroIntegratedRender)window.__astroIntegratedRender();renderer.render(stage,camera);');
const end=html.lastIndexOf('</script>');
if(end<0)throw Error('No inline script boundary.');
html=html.slice(0,end)+'\n'+code+'\n'+html.slice(end);
const start=html.lastIndexOf('<script',end);
new Function(html.slice(html.indexOf('>',start)+1,html.lastIndexOf('</script>')));
fs.writeFileSync(output,html);
console.log('Standalone candidate: '+output+' ('+fs.statSync(output).size+' bytes)');
