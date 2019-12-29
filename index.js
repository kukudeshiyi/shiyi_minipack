const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const {transformFromAst} = require('@babel/core');
const traverse = require('@babel/traverse').default;

// 加载入口文件
const config = require('./minipack.config.js')
const entry = config.entry;
const output = config.output;

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

/**
 * 构建依赖图
 */
function createGraph(entry){
    //初始化依赖图
    const mianAssert = parserCode(entry);
    const queue = {
        [entry]:mianAssert
    }
    //递归整理依赖
    function recursionDep(filename,asseret){
        asseret.mapping = {};
        const dirname = path.dirname(filename);
        asseret.dependencies.forEach(relativePath=>{
            //构建mapping的key：value[relativePath:absolutePath]
            const absolutePath = path.join(dirname,relativePath);
            asseret.mapping[relativePath] = absolutePath;
            
            //加入到依赖图中
            if(!queue[relativePath]){
                const child = parserCode(absolutePath);
                //避免重复添加
                queue[absolutePath] = child;
                if(child.dependencies.length>0){
                    recursionDep(absolutePath,child);
                }
            }
        })
    }
    for(let filename in queue){
        let assert = queue[filename];
        recursionDep(filename, assert);
    }
    return queue;
}

//构建自执行函数
function bundle(graph){
    console.log('graph',graph);
    let modules = '';
    for(let filename in graph){
        const mod = graph[filename];
        modules+=`'${filename}':[
            function(require,module,exports){
                ${mod.code}
            },
            ${JSON.stringify(mod.mapping)}
        ],`
    }
    console.log('modules',modules);
    const result = `(function(modules){
        function require(moduleId){
            const [fn,mapping] = modules[moduleId];
            function localeRequire(name){
                return require(mapping[name]);
            }
            const module = {exports:{}};
            fn(localeRequire,module,module.exports);
            return module.exports;
        }
        require('${entry}');    
    })({${modules}})`;

    return result;
}


const graph = createGraph(entry);
const result = bundle(graph);
fs.writeFile(`${output.path}/${output.filename}`,result,err=>{
    console.error('failed',err);
})

 
