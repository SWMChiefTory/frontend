// scripts/replaceLinearGradient.js
const fs = require('fs');
const path = require('path');

// eslint-disable-next-line no-undef
const dir = path.resolve(__dirname, '../node_modules/react-native-reanimated-skeleton');

function replaceInFile(filePath) {
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf-8');
    const replaced = content
        .replace(/import LinearGradient/g, 'import { LinearGradient }')
        .replace(/'react-native-linear-gradient'/g, "'expo-linear-gradient'");

    if (content !== replaced) {
        fs.writeFileSync(filePath, replaced, 'utf-8');
        console.log(`✅ Patched: ${filePath}`);
    }
}

function walk(dirPath) {
    fs.readdirSync(dirPath).forEach((file) => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
            replaceInFile(fullPath);
        }
    });
}

console.log('🚀 Running patch for expo-linear-gradient...');
walk(dir);
