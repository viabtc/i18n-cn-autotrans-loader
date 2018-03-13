const loaderUtils = require("loader-utils"),
  path = require("path"),
  crypto = require("crypto"),
  fs = require("fs");

var i18nFileContent = {},
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

module.exports = function(source, map) {
  this.cacheable && this.cacheable();

  let urlQuery = this.resourceQuery
    ? loaderUtils.parseQuery(this.resourceQuery)
    : null;
  const query = Object.assign({}, loaderUtils.getOptions(this), urlQuery);

  let relativePath = this.resourcePath.replace(path.resolve(".") + "/", ""),
    pathArray = relativePath.split("/"),
    pageKeyName = pathArray.join("_").replace(".", "_");

  //去重
  if (pageKeyNameArray.indexOf(pageKeyName) === -1) {
    pageKeyNameArray.push(pageKeyName);
  }

  if (!fs.existsSync(path.resolve(query.root))) {
    this.emitError(new Error("root path not exist"));
  } else {
    let count = 1,
      pageContent = {};

    const cnAttrReg = new RegExp(
        '\\b[\\w-]+?="[^">]*?[\\u4e00-\\u9fa5]+?[^">]*?"',
        "ig"
      ),
      cnAttrReplaceReg = new RegExp(
        '\\b([\\w-]+?=)"([^">]*?[\\u4e00-\\u9fa5]+?[^">]*?)"',
        "ig"
      ),
      cnTemplateReg = new RegExp(
        "(?:>|'|\"|})[^\"'>}]*?[\\u4e00-\\u9fa5]+?[^\"'<{]*?(?:<|'|\"|{)",
        "ig"
      ),
      cnTemplateReplaceReg = new RegExp(
        "(>|'|\"|})([^\"'>}]*?[\\u4e00-\\u9fa5]+?[^\"'<{]*?)(<|'|\"|{)",
        "ig"
      ),
      cnCodeReg = new RegExp(
        '("|\')(?:[^\'">/])*?/{0,1}(?:[^\'">/])*?[\\u4e00-\\u9fa5]+?(?:[^"\'>/])*?/{0,1}[^\'">/]*?("|\')',
        "ig"
      ),
      cnCodeReplaceReg = new RegExp(
        '(?:"|\')((?:[^\'">/])*?/{0,1}(?:[^\'">/])*?[\\u4e00-\\u9fa5]+?(?:[^">/])*?/{0,1}(?:[^\'">/])*?)(?:"|\')',
        "ig"
      );
    let sourceArr = source.split("<script>"),
      attrResults = sourceArr[0] ? sourceArr[0].match(cnAttrReg) : null,
      codeResults = sourceArr[1] ? sourceArr[1].match(cnCodeReg) : null;

    //先替换属性
    if (attrResults) {
      //替换属性文案
      attrResults.forEach((item, index) => {
        source = source.replace(
          item,
          item.replace(cnAttrReplaceReg, function($$, $attr, $text) {
            
            let originText = $text.substring(), reg = new RegExp(query.repeatFlag, "g")
            $text = $text.replace(reg, "").trim();
            let keyName = crypto.createHash("md5").update($text).digest("hex").slice(0, query.hashLength || 8);
            if(reg.test(originText)){
              while(pageContent[keyName]){
                keyName += "_"
              }
            }
            pageContent[keyName] = $text
            
            return (
              ":" +
              $attr +
              "\"$t('" +
              query.prefix +
              "." +
              pageKeyName +
              "." +
              keyName +
              "')\""
            );
          })
        );
      });
    }

    //根据新的内容替换文本
    sourceArr = source.split("<script>");
    let templateResults = sourceArr[0]
      ? sourceArr[0].match(cnTemplateReg)
      : null;

    if (templateResults) {
      //替换模板文案
      templateResults.forEach((item, index) => {
        source = source.replace(
          item,
          item.replace(cnTemplateReplaceReg, function(
            $$,
            $left,
            $text,
            $right
          ) {
            let originText = $text.substring(), reg = new RegExp(query.repeatFlag, "g")
            $text = $text.replace(reg, "").trim()
            let keyName = crypto.createHash("md5").update($text).digest("hex").slice(0, query.hashLength || 8);
            if(reg.test(originText)){
              while(pageContent[keyName]){
                keyName += "_"
              }
            }
            pageContent[keyName] = $text
            let res = "";

            if ($text) {
              if (/>|}/.test(item[0]) || /<|{/.test(item[item.length - 1])) {
                res =
                  $left +
                  '{{$t("' +
                  (query.prefix ? query.prefix + "." : "") +
                  pageKeyName +
                  "." +
                  keyName +
                  '")}}' +
                  $right;
              } else {
                res =
                  '$t("' +
                  (query.prefix ? query.prefix + "." : "") +
                  pageKeyName +
                  "." +
                  keyName +
                  '")';
              }
            }
            return res;
          })
        );
      });
    }

    if (codeResults) {
      //替换export, 加上 let $t = Vue.prototype.$t;
      source = source.replace(
        /(export\s*?default\s*?\{)/i,
        "let $t = Vue.prototype.$t;$1"
      ).replace(/(head\s*?\(\s*?\)\s*?{\s*?)/i,"$1let $t = this.$t;");
      //替换代码文案
      codeResults.forEach((item, index) => {
        source = source.replace(
          item,
          item.replace(cnCodeReplaceReg, function($$, $text) {
            
            let originText = $text.substring(), reg = new RegExp(query.repeatFlag, "g")
            $text = $text.replace(reg, "").trim();
            let keyName = crypto.createHash("md5").update($text).digest("hex").slice(0, query.hashLength || 8);
            if(reg.test(originText)){
              while(pageContent[keyName]){
                keyName += "_"
              }
            }
            pageContent[keyName] = $text
            return (
              '$t("' +
              (query.prefix ? query.prefix + "." : "") +
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

    i18nFileContent[pageKeyName] = pageContent;
    clearTimeout(fileWriteClock);
    fileWriteClock = 0;

    query.languages.forEach(item => {
      let filePath = path.resolve(query.root + path.sep + item + ".json");

      if (NODE_ENV === "dev" || NODE_ENV === "development") {
        let fileContent = JSON.stringify(i18nFileContent);
        fileWriteClock = setTimeout(function() {
          //写文件
          if (fileContent.length !== lastContentLength) {
            lastContentLength = fileContent.length;
            // var mutex = new Mutex("should_happen_one_at_a_time");
            // mutex.lock();
            // const file = fs.createWriteStream(filePath);
            // file.end(fileContent);
            fs.writeFile(filePath, fileContent, err => {
              if (err) throw err;
              console.log("The language has been saved!");
            });
            //console.log("The language has been saved!");
            //mutex.unlock();
          }
        }, query.cacheTime || 10000);
      } else {
        //console.log("pageKeyNameArray",pageKeyNameArray)
        //按顺序组织文件
        if(query.writeFile){
          var sortedArray = selectSort(pageKeyNameArray);

          let fileContent = {};
          sortedArray.forEach(key => {
            //按顺序写key
            fileContent[key] = i18nFileContent[key];
          });        
          fileContent = JSON.stringify(fileContent);
          //写文件
          if (fileContent.length !== lastContentLength) {
            lastContentLength = fileContent.length;
            //var mutex = new Mutex("should_happen_one_at_a_time");
            //mutex.lock();
            // const file = fs.createWriteStream(filePath);
            // file.end(fileContent);
            fs.writeFileSync(filePath, fileContent);
            //console.log("The language has been saved!");
            //mutex.unlock();
          }
        }
      }
    });

    //synchronized code block
    this.callback(null, source, map);
    return;
  }
};
