import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import defaultWS from './defualt-ws.json';

const tab = i => _.repeat('    ', i + 2);
const tab1 = tab(1);
const templatePath = path.join(__dirname, 'source-gen-template.js');
const template = fs.readFileSync(templatePath, 'utf8').split('// auto-gen-code');
const emptyDefaultWS = {};

function join(arr, sep, indent) {
    // const indentLen = indent.lenght;
    const maxLen = 65;
    const str = arr.join(sep);
    let s = 0;
    let lastIndent = -1;
    const x = [];
    for (let i = 1; i <= Math.floor(str.length / maxLen); i++) {
        const p = str.lastIndexOf(sep, i * maxLen);
        if (lastIndent !== p) {
            x.push(str.substring(s, p));
            lastIndent = p;
        }
        s = p;
    }
    x.push(str.substring(s));
    return x.join('\n' + indent);
}


const stream = fs.createWriteStream(path.join(__dirname, '..', 'js', 'ballerina', 'model', 'source-gen.js'));
stream.once('open', () => {
    const gPath = path.join(__dirname, 'tree.g');
    const grammar = fs.readFileSync(gPath, 'utf8');
    const spited = grammar.split(/^\s*$/gm).map(rs => _.compact(rs.split(/\n^ +[;:|] */gm).map(s => s.trim())));

    const write = (line) => {
        console.log(line);
        stream.write(line + '\n');
    };

    write(template[0]);

    for (let i = 0; i < spited.length; i++) {
        const kind = spited[i].shift().trim();
        emptyDefaultWS[kind] = {};
        const rules = spited[i].map(s => s.split(/\s+/g));
        write(tab(0) + 'case \'' + kind + '\':');
        const nodeWS = defaultWS[kind] || {};
        for (let j = 0; j < rules.length; j++) {
            const rule = rules[j];
            const js = [];
            const condition = [];

            const wQuoted = g => {
                emptyDefaultWS[kind][g] = '';
                return (nodeWS[g] ? '\'' + nodeWS[g] + '\'' : '');
            };
            const wWrapped = g => 'w(' + wQuoted(g) + ') + ';
            for (let k = 0; k < rule.length; k++) {
                const p = rule[k];
                if (p.match(/^<.*>$/)) {
                    let getter = p.slice(1, -1);
                    if (getter.match(/\.value$/)) {
                        js.push(wWrapped(getter.slice(0, -6)) + 'node.' + getter);
                    } else if (getter.match(/\.source$/)) {
                        getter = getter.replace(/\.source$/, '');
                        js.push('getSourceOf(node.' + getter + ', pretty, l)');
                    } else if (getter.match(/^[^?]+\?[^?]*$/)) {
                        const parts = getter.split('?');
                        getter = parts[0];
                        if (parts[1]) {
                            js.push(wWrapped(parts[1]) + '\'' + parts[1] + '\'');
                        }
                    } else {
                        js.push(wWrapped(getter) + 'node.' + getter);
                    }
                    condition.push(getter);
                } else if (p.match(/^<.*>[*+]$/)) {
                    const getter = p.slice(1, -2).split('-')[0];
                    const params = ['node.' + getter, 'pretty', 'l', 'w', wQuoted(getter) || '\'\''];
                    const hasSuffix = p.indexOf('suffixed-by') >= 0;
                    if (p.indexOf('joined-by') >= 0 || hasSuffix) {
                        params.push('\'' + p.substr(-3, 1) + '\'');
                    }
                    if (hasSuffix) {
                        params.push('true');
                    }
                    js.push('join(' + params.join(', ') + ')');
                    condition.push(getter);
                    if (p.slice(-1) === '+') {
                        condition.push(getter + '.length');
                    }
                } else {
                    if (p === '}') {
                        js.push('outdent()');
                    }
                    js.push(wWrapped(p) + '\'' + p + '\'');
                    if (p === '{') {
                        if (kind === 'If') {
                            // We need to spacial case If to handle 'else if' case correctly.
                            js.unshift('(node.parent.kind === \'If\' ? \'\' : dent())');
                        } else {
                            js.unshift('dent()');
                        }
                        js.push('indent()');
                    } else if (p === ';') {
                        js.unshift('dent()');
                    }
                }
            }
            const conditionStr = join(condition.map(s => 'node.' + s), ' && ', tab(4));
            const retrunSt = 'return ' + join(js, ' + ', tab(2)) + ';';
            if (rules.length > 1) {
                if (j === 0) {
                    write(tab1 + 'if (' + conditionStr + ') {');
                } else if (j === rules.length - 1) {
                    write(tab1 + '} else {');
                } else {
                    write(tab1 + '} else if (' + conditionStr + ') {');
                }
                write(tab(2) + retrunSt);
            } else {
                write(tab(1) + retrunSt);
            }
        }
        if (rules.length === 0) {
            write(tab1 + 'return \'\';');
        } else if (rules.length > 1) {
            write(tab1 + '}');
        }
    }
    write(template[1]);
    console.log(JSON.stringify(emptyDefaultWS));
});