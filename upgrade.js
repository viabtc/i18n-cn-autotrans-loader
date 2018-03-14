// 在语言locales文件夹运行 'node upgrade.js en_US.json other_lang.json'
// zh_Hans_CN.json 将作为参考源，如果文件名不同请改下面代码测试
const fs = require('fs');
let refrenceCN = 'zh_Hans_CN.json', files = [''];
process.argv.forEach(function (val, index, array) {
  files = array.slice(2);
});
const originalCN = JSON.parse(fs.readFileSync(refrenceCN, 'utf8'));
const otherLangs = files.map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
otherLangs.forEach((lang, index) => {
  const upgraded = {};
  for (let page in originalCN) {
    upgraded[page] = {};
    for (let key in originalCN[page]) {
      const newKey = originalCN[page][key].replace(/\s|\r?\n|\r/g, '').slice(0, 8) + '_' + key.length;
      if (lang[page] && lang[page][key]) {
        upgraded[page][newKey] = lang[page][key];
      } else {
        upgraded[page][newKey] = originalCN[page][key];
      }
      for (let oldKey in lang[page]) {
        if (!originalCN[page][oldKey]) {
          upgraded[page]['****DEPRECATED**** ' + oldKey] = lang[page][oldKey];
        }
      }
    }
  }
  fs.writeFileSync(files[index], JSON.stringify(upgraded));
});
