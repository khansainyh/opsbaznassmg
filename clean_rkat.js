const fs = require('fs');
const file = 'frontend/src/data/pilarData.ts';
let content = fs.readFileSync(file, 'utf8');

// Remove rkat_details arrays
content = content.replace(/,\s*rkat_details:\s*\[.*?\]/g, '');
// Remove budget_rkat
content = content.replace(/,\s*budget_rkat:\s*\d+/g, '');
// Remove RKATDetail type export
content = content.replace(/export interface RKATDetail \{[\s\S]*?\}\n\n/g, '');
// Remove rkat_details and budget_rkat from Program interface
content = content.replace(/\s*budget_rkat\?:\s*number;\n/g, '\n');
content = content.replace(/\s*rkat_details\?:\s*RKATDetail\[\];\n/g, '\n');
// Remove ASNAF_OPTIONS export
content = content.replace(/export const ASNAF_OPTIONS = \[[\s\S]*?\] as const;\n\n/g, '');

fs.writeFileSync(file, content);
console.log('Cleaned ' + file);
