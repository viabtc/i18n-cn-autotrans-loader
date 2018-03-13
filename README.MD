# 多语言自动翻译组件(webpack loader)

## 环境

1. vue
2. i18n

## 用法

直接在源文件中写中文，组件会自动把中文部门替换成占位符，同时生成语言文件

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


## 不支持的语法

1. 中文中包含 <> {} 等符号

```html
//下面这种写法不支持
<span>{{"{coinType}充值".replace("coinType", coinType)}}</span>
//应改为
<span>{{"[coinType]充值".replace("coinType", coinType)}}</span>
```