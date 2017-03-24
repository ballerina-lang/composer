/**
 * Copyright (c) 2016, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
define(['lodash', 'log', 'event_channel', '../ast-visitor'], function(_, log, EventChannel, ASTVisitor) {

    /**
     * Constructor for the Abstract Source Generation Visitor
     * @param parent
     * @constructor
     */
    var AbstractSourceGenVisitor = function(parent) {
        this._generatedSource = '';
        this._indentation = 0;
        this.parent = parent;
        ASTVisitor.call(this);
    };

    AbstractSourceGenVisitor.prototype = Object.create(ASTVisitor.prototype);
    AbstractSourceGenVisitor.prototype.constructor = AbstractSourceGenVisitor;

    AbstractSourceGenVisitor.prototype.getGeneratedSource = function () {
        return this._generatedSource;
    };

    AbstractSourceGenVisitor.prototype.setGeneratedSource = function (generatedSource) {
        this._generatedSource = generatedSource;
    };

    AbstractSourceGenVisitor.prototype.appendSource = function (source) {
        this._generatedSource += this._indent(source);
    };

    AbstractSourceGenVisitor.prototype.getParent = function () {
        return this.parent;
    };

    AbstractSourceGenVisitor.prototype._indent = function (source) {
        var lines = source.split('\n');
        var self = this;
        var indentedLines = _.map(lines, function(line) {
            if(line.length === 0) {
                // Don't add indentations to empty lines
                return "";
            }

            return _.repeat('\t', self._indentation) + line;
        });
        var indentedSource = _.join(indentedLines, '\n');

        return indentedSource;
    };

    AbstractSourceGenVisitor.prototype.incIndentation = function () {
        this._indentation++;
    };

    AbstractSourceGenVisitor.prototype.decIndentation = function () {
        this._indentation--;
    };

    return AbstractSourceGenVisitor;
});
