const fs = require('fs');
const path = require('path');

const pixelMap = {
    '10px': 'text-xs',
    '11px': 'text-xs',
    '12px': 'text-xs',
    '13px': 'text-sm',
    '14px': 'text-sm',
    '14.5px': 'text-sm',
    '15px': 'text-base',
    '16px': 'text-base',
    '17px': 'text-lg',
    '18px': 'text-lg',
    '19px': 'text-xl',
    '20px': 'text-xl',
    '22px': 'text-xl',
    '24px': 'text-2xl',
    '26px': 'text-2xl',
    '28px': 'text-3xl',
    '30px': 'text-3xl',
    '32px': 'text-4xl'
};

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.next' || file === '.git') continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            // Replace text-[Xpx] with the corresponding tailwind class
            content = content.replace(/text-\[([\d.]+px)\]/g, (match, px) => {
                return pixelMap[px] || match;
            });

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Fixed text sizes in:', fullPath);
            }
        }
    }
}

console.log('Starting text size cleanup...');
processDir(path.join(__dirname, 'src'));
console.log('Done!');
