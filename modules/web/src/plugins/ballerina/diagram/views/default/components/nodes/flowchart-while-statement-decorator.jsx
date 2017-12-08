/**
 * Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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
import React from 'react';
import PropTypes from 'prop-types';
import breakpointHoc from 'src/plugins/debugger/views/BreakpointHoc';
import SimpleBBox from 'plugins/ballerina/model/view/simple-bounding-box';
import { flowChartBlockStatement, blockStatement, statement, actionBox } from '../../../../../configs/designer-defaults.js';
import Node from '../../../../../model/tree/node';
import DropZone from '../../../../../drag-drop/DropZone';
import './compound-statement-decorator.css';
import ExpressionEditor from 'plugins/ballerina/expression-editor/expression-editor-utils';
import ActionBox from '../decorators/action-box';
import ActiveArbiter from '../decorators/active-arbiter';
import Breakpoint from '../decorators/breakpoint';
import { getComponentForNodeArray } from './../../../../diagram-util';
import ArrowDecorator from '../decorators/arrow-decorator';

const CLASS_MAP = {
    hidden: 'hide-action',
    visible: 'show-action',
    fade: 'delayed-hide-action',
};

/**
 * Wraps other UI elements and provide box with a heading.
 * Enrich elements with a action box and expression editors.
 */
class FlowChartWhileStatementDecorator extends React.Component {

    /**
     * Initialize the block decorator.
     */
    constructor() {
        super();
        this.state = {
            active: 'hidden',
        };
        this.onDelete = this.onDelete.bind(this);
        this.onJumpToCodeLine = this.onJumpToCodeLine.bind(this);
        this.setActionVisibilityFalse = this.setActionVisibility.bind(this, false);
        this.setActionVisibilityTrue = this.setActionVisibility.bind(this, true);
        this.openExpressionEditor = e => this.openEditor(this.props.expression, this.props.editorOptions, e);
        this.openParameterEditor = e => this.openEditor(this.props.parameterEditorOptions.value,
            this.props.parameterEditorOptions, e);
    }
    /**
     * Handles click event of breakpoint, adds/remove breakpoint from the node when click event fired
     *
     */
    onBreakpointClick() {
        const { model } = this.props;
        const { isBreakpoint = false } = model;
        if (isBreakpoint) {
            model.removeBreakpoint();
        } else {
            model.addBreakpoint();
        }
    }

    /**
     * Removes self on delete button click. Note that model is retried form dropTarget for
     * backward compatibility with old components written when model was not required.
     * @returns {void}
     */
    onDelete() {
        const model = this.props.model || this.props.dropTarget;
        model.remove();
    }
    /**
     * Navigates to codeline in the source view from the design view node
     *
     */
    onJumpToCodeLine() {
        const { editor } = this.context;
        editor.goToSource(this.props.model);
    }

    /**
     * Call-back for when a new value is entered via expression editor.
     */
    onUpdate() {
        // TODO: implement validate logic.
    }

    /**
     * Shows the action box, depending on whether on child element, delays display.
     * @param {boolean} show - Display action box.
     * @param {MouseEvent} e - Mouse move event from moving on to or out of statement.
     */
    setActionVisibility(show, e) {
        e.stopPropagation();
        if (show) {
            const isInChildStatement = this.isInFocusableChild(e.target);
            const isFromChildStatement = this.isInFocusableChild(e.relatedTarget);

            if (!isInChildStatement) {
                if (isFromChildStatement) {
                    this.context.activeArbiter.readyToDelayedActivate(this);
                } else {
                    this.context.activeArbiter.readyToActivate(this);
                }
            }
        } else {
            let elm = e.relatedTarget;
            let isInMe = false;
            while (elm && elm.getAttribute) {
                if (elm === this.myRoot) {
                    isInMe = true;
                }
                elm = elm.parentNode;
            }
            if (!isInMe) {
                this.context.activeArbiter.readyToDeactivate(this);
            }
        }
    }

    /**
     * True if the given element is a child of this element that has it's own focus.
     * @private
     * @param {HTMLElement} elmToCheck - child to be checked.
     * @return {boolean} True if child is focusable.
     */
    isInFocusableChild(elmToCheck) {
        const regex = new RegExp('(^|\\s)((compound-)?statement|life-line-group)(\\s|$)');
        let isInStatement = false;
        let elm = elmToCheck;
        while (elm && elm !== this.myRoot && elm.getAttribute) {
            if (regex.test(elm.getAttribute('class'))) {
                isInStatement = true;
            }
            elm = elm.parentNode;
        }
        return isInStatement;
    }

    /**
     * renders an ExpressionEditor in the header space.
     * @param {string} value - Initial value.
     * @param {object} options - options to be sent to ExpressionEditor.
     */
    openEditor(value, options) {
        const packageScope = this.context.environment;
        if (value && options) {
            new ExpressionEditor(
                this.conditionBox,
                this.onUpdate.bind(this),
                options,
                packageScope).render(this.context.getOverlayContainer());
        }
    }

    /**
     * Render breakpoint element.
     * @private
     * @return {XML} React element of the breakpoint.
     */
    renderBreakpointIndicator() {
        const breakpointSize = 14;
        const { bBox } = this.props;
        const breakpointHalf = breakpointSize / 2;
        const pointX = bBox.getRight() - breakpointHalf;
        const { model: { viewState } } = this.props;
        const statementBBox = viewState.components['statement-box'];
        const { designer } = this.context;
        const headerHeight = viewState.components['block-header'].h;
        const pointY = statementBBox.y - breakpointHalf;
        return (
            <Breakpoint
                x={pointX}
                y={pointY}
                size={breakpointSize}
                isBreakpoint={this.props.isBreakpoint}
                onClick={() => this.props.onBreakpointClick()}
            />
        );
    }

    /**
     * Override the rendering logic.
     * @returns {XML} rendered component.
     */
    render() {
        const { bBox, title, dropTarget, expression, isBreakpoint, isDebugHit } = this.props;
        const model = this.props.model;
        const viewState = model.viewState;
        const titleH = flowChartBlockStatement.heading.height;
        const titleW = flowChartBlockStatement.heading.height;
        const defaultTitleH = blockStatement.heading.height;
        const statementBBox = viewState.components['statement-box'];
        const displayExpression = viewState.components.expression;

        const p1X = statementBBox.x + (statementBBox.w / 2);
        const p1Y = statementBBox.y + titleH;
        const p2X = p1X - (titleW / 2);
        const p2Y = p1Y - (titleH / 2);
        const p3X = p1X;
        const p3Y = p1Y - titleH;
        const p4X = p2X + titleW;
        const p4Y = p2Y;

        const titleX = statementBBox.x + (titleW / 2);
        const titleY = statementBBox.y + (titleH / 2);

        let expressionX = 0;
        if (expression) {
            expressionX = ((p2X + p1X) / 2) + statement.padding.left;
        }
        let paramSeparatorX = 0;
        let parameterText = null;
        if (this.props.parameterBbox && this.props.parameterEditorOptions) {
            paramSeparatorX = this.props.parameterBbox.x;
            parameterText = this.props.parameterEditorOptions.value;
        }

        this.conditionBox = new SimpleBBox(p1X, statementBBox.y, bBox.w, titleH);
        const { designer } = this.context;
        const actionBoxBbox = new SimpleBBox();
        actionBoxBbox.w = (3 * designer.config.actionBox.width) / 4;
        actionBoxBbox.h = designer.config.actionBox.height;
        actionBoxBbox.x = bBox.x + ((bBox.w - actionBoxBbox.w) / 2);
        actionBoxBbox.y = statementBBox.y + titleH + designer.config.actionBox.padding.top;
        const utilClassName = CLASS_MAP[this.state.active];

        let statementRectClass = 'statement-title-rect';
        if (isDebugHit) {
            statementRectClass = `${statementRectClass} debug-hit`;
        }
        const separatorGapV = titleH / 3;

        let body;
        if (this.props.body.kind === 'ForkJoin') {
            body = getComponentForNodeArray(this.props.body.workers);
        } else {
            body = getComponentForNodeArray(this.props.body);
        }

        let bodyBBox = {};

        if (this.props.model.kind === 'ForkJoin') {
            bodyBBox = this.props.model.viewState.components['statement-body'];
        } else if (this.props.body && !(this.props.body instanceof Array)) {
            bodyBBox = this.props.body.viewState.bBox;
        }
        return (
            <g
                onMouseOut={this.setActionVisibilityFalse}
                onMouseOver={this.setActionVisibilityTrue}
                ref={(group) => {
                    this.myRoot = group;
                }}
            >
                <polyline
                    points={`${statementBBox.x},${p2Y} ${statementBBox.x},${p3Y + statementBBox.h} ${statementBBox.x + (statementBBox.w / 2)},${p3Y + statementBBox.h}`}
                    className='background-empty-rect'
                />
                <ArrowDecorator
                    start={{ x: statementBBox.x, y: p2Y }}
                    end={{ x: p2X, y: p2Y }}
                />
                <polyline
                    points={`${p4X},${p4Y} ${statementBBox.x + statementBBox.w},${p2Y} ${statementBBox.x + statementBBox.w},${p3Y + statementBBox.h + defaultTitleH} ${statementBBox.x + (statementBBox.w / 2)},${p3Y + statementBBox.h + defaultTitleH}`}
                    className='background-empty-rect'
                />
                <DropZone
                    x={statementBBox.x}
                    y={statementBBox.y + (titleH / 2)}
                    width={statementBBox.w}
                    height={statementBBox.h}
                    baseComponent='rect'
                    dropTarget={this.props.body}
                    enableDragBg
                    enableCenterOverlayLine={!this.props.disableDropzoneMiddleLineOverlay}
                />
                <polyline
                    points={`${p1X},${p1Y} ${p2X},${p2Y} ${p3X},${p3Y} ${p4X},${p4Y} ${p1X},${p1Y}`}
                    className={statementRectClass}
                    onClick={!parameterText && this.openExpressionEditor}
                />
                {expression &&
                    <text
                        x={expressionX}
                        y={titleY}
                        className='condition-text'
                    >
                        {displayExpression.text}
                    </text>
                }
                <g>
                    <rect
                        x={p2X}
                        y={statementBBox.y}
                        width={titleW}
                        height={titleH}
                        onClick={this.openExpressionEditor}
                        className='invisible-rect'
                    />
                    {expression && <title> {expression.text} </title>}
                </g>
                {parameterText &&
                <g>
                    <line
                        x1={paramSeparatorX}
                        y1={titleY - separatorGapV}
                        y2={titleY + separatorGapV}
                        x2={paramSeparatorX}
                        className='parameter-separator'
                    />
                    <text
                        x={paramSeparatorX + flowChartBlockStatement.heading.paramPaddingX}
                        y={titleY}
                        className='condition-text'
                    >
                        ( {parameterText} )
                    </text>
                    <rect
                        x={paramSeparatorX}
                        y={statementBBox.y}
                        width={statementBBox.w - paramSeparatorX + statementBBox.x}
                        height={titleH}
                        onClick={this.openParameterEditor}
                        className='invisible-rect'
                    />
                </g>}

                <polyline
                    points={`${p1X},${p1Y} ${p2X},${p2Y} ${p3X},${p3Y} ${p4X},${p4Y} ${p1X},${p1Y}`}
                    className='statement-title-polyline'
                />

                {
                    <g className={utilClassName}>
                        {this.props.utilities}
                    </g>
                }
                { isBreakpoint && this.renderBreakpointIndicator() }
                {this.props.children}
                {body}
                <ActionBox
                    bBox={actionBoxBbox}
                    show={this.state.active}
                    isBreakpoint={isBreakpoint}
                    onDelete={() => this.onDelete()}
                    onJumptoCodeLine={() => this.onJumpToCodeLine()}
                    onBreakpointClick={() => this.props.onBreakpointClick()}
                    disableButtons={this.props.disableButtons}
                />
            </g>);
    }
}

FlowChartWhileStatementDecorator.defaultProps = {
    draggable: null,
    children: null,
    undeletable: false,
    titleHeight: flowChartBlockStatement.heading.height,
    editorOptions: null,
    parameterEditorOptions: null,
    utilities: null,
    parameterBbox: null,
    expression: null,
    disableButtons: {
        debug: false,
        delete: false,
        jump: false,
    },
    disableDropzoneMiddleLineOverlay: false,
};

FlowChartWhileStatementDecorator.propTypes = {
    draggable: PropTypes.func,
    title: PropTypes.string.isRequired,
    model: PropTypes.instanceOf(Node).isRequired,
    children: PropTypes.arrayOf(React.PropTypes.node),
    utilities: PropTypes.element,
    bBox: PropTypes.instanceOf(SimpleBBox).isRequired,
    parameterBbox: PropTypes.instanceOf(SimpleBBox),
    undeletable: PropTypes.bool,
    dropTarget: PropTypes.instanceOf(Node).isRequired,
    titleWidth: PropTypes.number,
    expression: PropTypes.shape({
        text: PropTypes.string,
    }),
    editorOptions: PropTypes.shape({
        propertyType: PropTypes.string,
        key: PropTypes.string,
        model: PropTypes.instanceOf(Node),
        getterMethod: PropTypes.func,
        setterMethod: PropTypes.func,
    }),
    parameterEditorOptions: PropTypes.shape({
        propertyType: PropTypes.string,
        key: PropTypes.string,
        value: PropTypes.string,
        model: PropTypes.instanceOf(Node),
        getterMethod: PropTypes.func,
        setterMethod: PropTypes.func,
    }),
    onBreakpointClick: PropTypes.func.isRequired,
    isBreakpoint: PropTypes.bool.isRequired,
    disableButtons: PropTypes.shape({
        debug: PropTypes.bool.isRequired,
        delete: PropTypes.bool.isRequired,
        jump: PropTypes.bool.isRequired,
    }),
    disableDropzoneMiddleLineOverlay: PropTypes.bool,
};

FlowChartWhileStatementDecorator.contextTypes = {
    getOverlayContainer: PropTypes.instanceOf(Object).isRequired,
    environment: PropTypes.instanceOf(Object).isRequired,
    editor: PropTypes.instanceOf(Object).isRequired,
    mode: PropTypes.string,
    activeArbiter: PropTypes.instanceOf(ActiveArbiter).isRequired,
    designer: PropTypes.instanceOf(Object),
};

export default breakpointHoc(FlowChartWhileStatementDecorator);