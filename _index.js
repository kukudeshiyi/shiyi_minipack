const fs = require('fs');
const path = require('path');
//read entry file 
const config = require('./minipack.config.js');
const entryFile = config.entry;
const entryContent = fs.readFileSync(entryFile,'utf-8');

//code->parser->AST
const babelParser = require('@babel/parser');
/**
 * sourceType 解析模式
 * script,module,unambiguous(猜测)
 */
const ast = babelParser.parse(entryContent,{sourceType:'module'});

// console.log('ast',ast);

//编译入口文件内容为兼容浏览器可执行文件
const {transformFromAst} = require('@babel/core');
const {code} = transformFromAst(ast, null, {
    presets: ['@babel/preset-env'],
  })

// console.log('code',code);
/**
 * "use strict";
 * var _message = _interopRequireDefault(require("./message.js"));
 * var _name = require("./name.js");
 * function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
 * (0, _message["default"])();
 * console.log('----name-----: ', _name.name);
 */

 //获取所有依赖模块
const traverse = require('@babel/traverse').default;
const dependencies = [];
traverse(ast, {
// 遍历所有的 import 模块，并将依赖模块的相对路径放入 dependencies
  ImportDeclaration: ({node}) => {
    // console.log(node);
    dependencies.push(node.source.value)
  }
})

// console.log(dependencies);
console.log(path.dirname(entryFile));
console.log(__dirname);

/**
 * @param[file][文件地址]
 * @return[{code,dependencies}]
 */
function parserCode(file){
    //read file
    const _code = fs.readFileSync(file,'utf-8');
    //code->AST
    const ast = babelParser.parse(_code,{sourceType:'module'});
    //语法降级
    const {code} = transformFromAst(ast, null, {
        presets: ['@babel/preset-env'],
    });
    //获取依赖
    const dependencies = [];
    traverse(ast, {
        // 遍历所有的 import 模块，并将依赖模块的相对路径放入 dependencies
          ImportDeclaration: ({node}) => {
            dependencies.push(node.source.value)
          }
    });
    return {
        code,
        dependencies
    }
}

