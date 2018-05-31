const loaderUtils = require("loader-utils"),
  path = require("path"),
  fs = require("fs"),
  chineseS2T = require("chinese-s2t"),
  md5 = require("blueimp-md5");
const cnAttrReg = new RegExp(
  /(?:\s)([^:\s][\w-]+?=)(?:")([^."]*[\u4e00-\u9fa5\u3002\uff1b\uff0c\uff1a\u2018\u2019\u201c\u201d\uff08\uff09\u3001\uff1f\uff01\ufe15\u300a\u300b]+[^"]*)(?:")/,
  "igm"
  ),
  cnCodeReg = new RegExp(
    /(?:[^=])(?:['"])([^"'<>{}\.]*?[\u4e00-\u9fa5\u3002\uff1b\uff0c\uff1a\u2018\u2019\u201c\u201d\uff08\uff09\u3001\uff1f\uff01\ufe15\u300a\u300b]+(?:\s*)[^\'`"</]*)(?:[\'"/])/,
    "igm"
  ),
  cnTemplateReg = new RegExp(
    /(?:>|'|"|})([^"'>}\.-]*?[\u4e00-\u9fa5\u3002\uff1b\uff0c\uff1a\u2018\u2019\u201c\u201d\uff08\uff09\u3001\uff1f\uff01\ufe15\u300a\u300b]+?[^"'<{]*?)(?:<|'|"|{)/, // 忽略 <!--形式的html注释
    "igm"
  );

var i18nFileContent = {},
  i18nFileContentTraditional = {},
  lastContentLength = 0,
  fileWriteClock = 0,
  pageKeyNameArray = [],
  NODE_ENV = process.env.NODE_ENV;

function selectSort(array) {
  var len = array.length;
  for (var i = 0; i < len - 1; i++) {
    //这里之所以是len-1，是因为到最后两个元素，交换位置，整个数组就已经排好序了。
    var minnum = array[i];
    for (var j = i + 1; j < len; j++) {
      // j=i+1是把与自己比较的情况给省略掉
      if (array[j] < minnum) {
        var c;
        c = minnum;
        minnum = array[j]; //交换两个值
        array[j] = c;
      }
    }
    array[i] = minnum;
  }
  return array;
}


function getTextKey($text, repeatReg, hashLength) {
  let originText = $text.substring();
  $text = originText.slice(0).replace(repeatReg, "").trim();
  const keyName = $text.replace(/\s|\r?\n|\r/g, '').slice(0, 8) + ($text.length > 8 ? ('_' + md5($text).slice(0, hashLength)) : ''); //  八个首字符+hash
  return keyName;
}

function getOldTextKey($text, repeatReg) {
  let originText = $text.substring();
  $text = $text.slice(0).replace(repeatReg, "").trim();
  const keyName = $textkeyName = $text.replace(/\s|\r?\n|\r/g, '').slice(0, 8) + '_' + $text.length;//  旧的key
  return keyName;
}

function createIfNotExist(root, filename) {
  const filePath = path.resolve(root + path.sep + filename + ".json");
  fs.writeFile(filePath, "{}", {flag: 'wx'}, function (err) {
    // error 说明文件已经存在不需要处理
  });
}

function getSortedObjectString(unordered) {
  const ordered = {};
  Object.keys(unordered).sort().forEach(function (key) {
    ordered[key] = unordered[key];
  });
  return JSON.stringify(ordered, null, 4);
}

let repeatReg;

function extractAndReplaceChinese(pageKeyName, source, repeatReg, prefix, hashLength) {
  // 去掉comments
  const withoutComment = source
    .replace(/([^:]\/\/\s.*)|(\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/)/g, '')
    .replace(/\/\/\s*disable-autoi18n[\s\S]*\/\/\s*disable-autoi18n-end/, ''); // prevent plugin replacing code outside vue instance
  const script = withoutComment.match(/\<script\>([\s\S]*?)\<\/script\>/igm);
  const template = withoutComment.match(/\<template\>([\s\S]*)\<\/template\>/igm);
  const pageContent = {};
  if (script && script[0] && script[0].length) {
    const importVue = script[0].match(/import\s+Vue\s+from/)
    if (!importVue || importVue.length === 0) {
      source = source.replace(/\<script\>/igm, '<script> \n import Vue from "vue"');
    }
    const codeResults = script[0].match(cnCodeReg);
    if (codeResults) {
      //替换代码文案
      codeResults.forEach((item, index) => {
        source = source.replace(
          item,
          item.replace(cnCodeReg, function (_matched, $text) {
            // $text is the first captrued group
            let keyName = getTextKey($text, repeatReg, hashLength);
            if (repeatReg.test($text)) {
              while (pageContent[keyName]) {
                keyName += "_"
              }
            }
            pageContent[keyName] = $text;
            return (
              item[0] + 'Vue.prototype.$t("' +
              (prefix ? prefix + "." : "") +
              "." +
              pageKeyName +
              "." +
              keyName +
              '")'
            );
          })
        );
      });
    }
  }
  if (template && template[0] && template[0].length) {
    const attrResults = template[0].match(cnAttrReg);
    if (attrResults) {
      attrResults.forEach((item, index) => {
        source = source.replace(
          item,
          item.replace(cnAttrReg, function ($$, $attr, $text) {
            let keyName = getTextKey($text, repeatReg, hashLength);
            if (repeatReg.test($text)) {
              while (pageContent[keyName]) {
                keyName += "_"
              }
            }
            pageContent[keyName] = $text;
            return (
              ' :' +
              $attr +
              '\"$t(\'' +
              prefix +
              '.' +
              pageKeyName +
              '.' +
              keyName +
              '\')\"'
            );
          })
        );

      })
    }
    const textResults = template[0].match(cnTemplateReg);
    if (textResults) {
      textResults.forEach((item, index) => {
        source = source.replace(
          item,
          item.replace(cnTemplateReg, function ($$, $text) {
            const keyName = getTextKey($text, repeatReg, hashLength);
            if (repeatReg.test($text)) {
              while (pageContent[keyName]) {
                keyName += "_"
              }
            }
            pageContent[keyName] = $text;
            let res = "";
            if ($text) {
              if (/>|}/.test(item[0]) || /<|{/.test(item[item.length - 1])) {
                res =
                  item[0] +
                  '{{$t("' +
                  (prefix ? prefix + "." : "") +
                  pageKeyName +
                  "." +
                  keyName +
                  '")}}' + item[item.length - 1];
              } else {

                res =
                  '$t("' +
                  (prefix ? prefix + "." : "") +
                  pageKeyName +
                  "." +
                  keyName +
                  '")';
              }
            }
            return res;
          })
        );

      })
    }
  }
  return {source, pageContent};
}

module.exports = function (source, map) {
  this.cacheable && this.cacheable(); // disable cache

  // handle query options
  const urlQuery = this.resourceQuery
    ? loaderUtils.parseQuery(this.resourceQuery)
    : null;
  const query = Object.assign({}, loaderUtils.getOptions(this), urlQuery);

  // file path
  const relativePath = this.resourcePath.replace(path.resolve(".") + "/", "");
  const pathArray = relativePath.split("/");
  const pageKeyName = pathArray.join("_").replace(".", "_");
  if (query.showLog) {
    console.log(pageKeyName, '********************************');
  }
  if (!fs.existsSync(path.resolve(query.root))) {
    this.emitError(new Error("root path not exist"));
    return;
  }
  repeatReg = new RegExp(query.repeatFlag, "g");
  if (query.upgradeLangs) {
    upgradeOldLangs(query.root, query.originalLang, query.targetLangs, repeatReg, query.deprecatedMark, query.hashLength)
  }
  // create all necessary files
  createIfNotExist(query.root, query.originalLang);
  for (let name of query.targetLangs) {
    createIfNotExist(query.root, name);
  }

  const result = extractAndReplaceChinese(pageKeyName, source, repeatReg, query.prefix, query.hashLength);
  source = result.source;
  const pageContent = result.pageContent;
  if (query.showLog) {
    console.log('updating zh_Hans_CN.json')
  }
  NODE_ENV = process.env.NODE_ENV
  if (NODE_ENV === 'dev' || NODE_ENV === 'development' || query.writeFile) {
    writeContentToFile(query.root, query.originalLang, pageKeyName, pageContent, query.deprecatedMark, true); // 简中直接替换就好了

    if (query.targetLangs && query.targetLangs.length) {
      query.targetLangs.forEach(lang => {
        if (query.showLog) {
          console.log('updating ' + lang + '.json')
        }
        if (lang === 'zh_Hant_HK') {
          const traditionalContent = s2tTranslation(pageContent);
          writeContentToFile(query.root, 'zh_Hant_HK', pageKeyName, traditionalContent, query.deprecatedMark, true); // 繁中也是直接替换就好了
        } else {
          writeContentToFile(query.root, lang, pageKeyName, pageContent, query.deprecatedMark, false);
        }
      })
    }
  }


  this.callback(null, source, map);
  return;
};

function writeContentToFile(root, filename, pageKeyName, pageContent, deprecatedMark = '****DEPRECATED****', replaceDirectly) {
  setTimeout(() => {
    const filePath = path.resolve(root + path.sep + filename + ".json");
    const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (sameKeys(content[pageKeyName], pageContent)) {
      // key 没有变就不需要写文件了
      return
    }
    if (replaceDirectly || !content[pageKeyName]) {
      content[pageKeyName] = pageContent;
    } else {
      const merged = {}
      const lang = content[pageKeyName]
      for (let langKey in lang) {
        if (!langKey || !lang.hasOwnProperty(langKey)) {
          continue;
        }
        if (pageContent[langKey] || (langKey.indexOf(deprecatedMark) >= 0)) {
          merged[langKey] = lang[langKey]
        } else {
          merged[langKey] = lang[langKey] // 不改变原来的，避免误标记
          merged[langKey + deprecatedMark] = lang[langKey]
        }
      }
      for (let key in pageContent) {
        if (!lang[key]) {
          merged[key] = pageContent[key]
        }
      }
      content[pageKeyName] = merged;
    }
    content.autoi18n_version = 3;
    const sorted = getSortedObjectString(content);

    console.log('write file ' + filename)
    fs.writeFileSync(filePath, sorted);
  }, 1000)

}

function sameKeys(oldPage, newPage) {
  if (!oldPage || !newPage) {
    return false;
  }
  const oldkeys = Object.keys(oldPage).filter(k => k.indexOf('DEPRECATED') < 0).sort();
  const newkeys = Object.keys(newPage).sort();
  if (oldkeys.length !== newkeys.length) {
    return false;
  }
  for (let index in oldkeys) {
    if (oldkeys[index] !== newkeys[index]) {
      console.log('keyChanged: ', oldkeys[index], newkeys[index])
      return false;
    }
  }
  return true;
}

function s2tTranslation(simplified) {
  const traditional = {}
  for (let prop in simplified) {
    traditional[prop] = chineseS2T.s2t(simplified[prop])
  }
  return traditional
}

function upgradeOldLangs(root, original, targetLangs, repeatReg, deprecatedMark = '****DEPRECATED****', hashLength) {
  const originalPath = path.resolve(root + path.sep + original + ".json");
  const originalContent = JSON.parse(fs.readFileSync(originalPath, "utf8"));
  const upgradeKeys = {}
  for (let page in originalContent) {
    upgradeKeys[page] = {}
    for (let key in originalContent[page]) {
      const oldKey = getOldTextKey(originalContent[page][key])
      if (key.indexOf(deprecatedMark) >= 0 || oldKey === undefined) {
        upgradeKeys[page][key] = key
      } else {
        upgradeKeys[page][oldKey] = getTextKey(originalContent[page][key], repeatReg, hashLength)
      }
    }
  }
  for (let lang of targetLangs) {
    const filePath = path.resolve(root + path.sep + lang + ".json")
    const langContent = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (langContent.autoi18n_version === 3) {
      return;
    }
    console.log('upgrade ' + lang);
    const newContent = {autoi18n_version: 3}
    for (let page in langContent) {
      if (page.indexOf('version') >= 0) {
        continue
      }
      if (!newContent[page]) {
        newContent[page] = {}
      }
      if (!upgradeKeys[page]) {
        console.log(page, '!!!!!! page not in cn, maybe deprecated, please check json files!!!!!!')
        newContent[page] = langContent[page]
      } else {
        for (let key in langContent[page]) {
          newContent[page][upgradeKeys[page][key] || key] = langContent[page][key]
        }
      }
    }
    const sorted = getSortedObjectString(newContent);
    fs.writeFileSync(filePath, sorted);
  }
}
