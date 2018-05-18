# 多语言自动翻译组件(webpack loader)

## 环境

1. vue
2. nuxt
3. i18n

## 用法

直接在源文件中写中文，组件会自动把中文部分替换成占位符，同时生成语言文件。
targetLangs包含zh_Hant_HK则自动生成繁体中文版本翻译
配置说明：
```
config.module.rules.push({
        test: /\.vue$/,
        exclude: [
          /node_modules/,
          /\.nuxt/,
          /examples\//
        ],
        loader: "i18n-cn-autotrans-loader",
        enforce: "pre",
        options: {
          hashLength: 4,
          writeFile: true,  //是否写语言文件，如果在webpack打包的时候写语言文件可能会导致文件写到一半被打包进production的代码中
          repeatFlag: "\\[R\\]",
          root: "locales",
          upgradeLangs:false, // 第一次升级用true
          prefix: "",
          originalLang: "zh_Hans_CN", // 原语言名
          targetLangs: ["zh_Hant_HK", "en_US"], // 目标语言，如有zh_Hant_HK则会自动生成繁体翻译
          deprecatedMark:'****DEPRECATED****', // 对一些旧的翻译进行标记
          cacheTime: 5000
        }
      });
```
第一次升级的时候注意先停掉正在运行的服务，不然容易因为热加载导致文件出错 
## 支持的语法

1. 属性

```html
<b-modal v-model="alertPriceVisible" title="价格警告" :hide-footer="true">
```

2. 模板引擎

```html
<template v-if="(!isBuy)&&!limited">
  <p class="market-price">以当前买盘挂单价格依次卖出</p>
  <div class="input-box total">
    <span class="label">卖出量{{this.dest}}</span>
    <input type="text" min="0" step="any" v-model="amount" @focus="focusElem='amount';amountErrorText='';" @change="amountErrorText=''"
      @blur="focusElem='';validateAmount()">
  </div>
</template>
```

3. 代码中的中文

```javascript
this.alertMsg = "您的卖出价（" + this.inputPrice + "）低于最新成交价（" + this.marketItem.price + "）的  " + this.alertPercent +
              "，请确认是否以该价格卖出。"
```
## 注意事项

1. 部分文案会被标记为deprecated，请检查是否标记错误
2. 目标语言中如果出现中文value请检查是否漏翻译或者被误标记为deprecated
3. 使用nuxt等编译的时候注意检查config option和脚本运行顺序：
    * 需要有一个 nuxt.lang.config.js 用于提取文案更新翻译json，此文件需要设置writeFile:true
    * 其他配置文件例如 nuxt.config.js 用于改写vue文件，此文件需要设置writeFile:false, 否则可能在插件写json文件的时候被打包，引起错误
    * 两个config里面的hashLength必须保持一致！！！！！
    * 执行打包代码应该分两步，先提取语言，后改写vue，例如：npm run build-lang && cross-env NODE_ENV=production MODE=production nuxt build
## 不支持的语法

1. 中文中包含 <> {} - 等符号，请使用&lt;形式转义
2. 用`包裹拼接的字符串模板
3. template 里面绑定的中文字符串，例如 :placeholder="show?'内容':'测试'"，这种情况请放在script部分处理
4. jsx形式的模板内容

```html
//下面这种写法不支持
<span>{{"{coinType}充值".replace("coinType", coinType)}}</span>
//应改为
<span>{{"[coinType]充值".replace("coinType", coinType)}}</span>
```