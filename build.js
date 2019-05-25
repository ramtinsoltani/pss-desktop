const path = require('path');
const fs = require('fs-extra');
const builder = require('electron-builder');
const configName = process.argv[2].trim().toLowerCase();
const config = require(path.join(__dirname, `${configName}.config.js`));

fs.copy(path.join(__dirname, 'package.json'), path.join(__dirname, 'dist', 'package.json'))
.then(() => builder.build({ projectDir: 'dist', config: config }))
.then(() => console.log('BUILD DONE!'))
.catch(console.log);
