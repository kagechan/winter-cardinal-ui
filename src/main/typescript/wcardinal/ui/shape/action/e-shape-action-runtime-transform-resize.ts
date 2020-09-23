/*
 * Copyright (C) 2019 Toshiba Corporation
 * SPDX-License-Identifier: Apache-2.0
 */

import { EShape } from "../e-shape";
import { EShapeRuntime, EShapeRuntimeReset } from "../e-shape-runtime";
import { EShapeActionExpression } from "./e-shape-action-expression";
import { EShapeActionExpressions } from "./e-shape-action-expressions";
import { EShapeActionRuntimeConditional } from "./e-shape-action-runtime-conditional";
import { EShapeActionValueTransformResize } from "./e-shape-action-value-transform-resize";
import { EShapeActionValueTransformResizeType } from "./e-shape-action-value-transform-resize-type";

export class EShapeActionRuntimeTransformResize extends EShapeActionRuntimeConditional {
	protected readonly size: EShapeActionExpression<number>;

	constructor( value: EShapeActionValueTransformResize, reset: EShapeRuntimeReset ) {
		super( value, reset );
		switch( value.opetype ) {
		case EShapeActionValueTransformResizeType.RELATIVE_SIZE:
			this.size = EShapeActionExpressions.from( value.amount, "Number", EShapeActionExpressions.ONE, "1" );
			break;
		case EShapeActionValueTransformResizeType.ABSOLUTE_SIZE:
			this.size = EShapeActionExpressions.from( value.amount, "Number", EShapeActionExpressions.ONE_HUNDRED, "100" );
			break;
		case EShapeActionValueTransformResizeType.RELATIVE_HEIGHT:
			this.size = EShapeActionExpressions.from( value.amount, "Number", EShapeActionExpressions.ONE, "1" );
			break;
		case EShapeActionValueTransformResizeType.ABSOLUTE_HEIGHT:
			this.size = EShapeActionExpressions.from( value.amount, "Number", EShapeActionExpressions.ONE_HUNDRED, "100" );
			break;
		case EShapeActionValueTransformResizeType.RELATIVE_WIDTH:
			this.size = EShapeActionExpressions.from( value.amount, "Number", EShapeActionExpressions.ONE, "1" );
			break;
		case EShapeActionValueTransformResizeType.ABSOLUTE_WIDTH:
			this.size = EShapeActionExpressions.from( value.amount, "Number", EShapeActionExpressions.ONE_HUNDRED, "100" );
			break;
		default:
			this.size = EShapeActionExpressions.ONE;
		}
	}

	protected adjustPosition(
		shape: EShape, runtime: EShapeRuntime,
		dsx: number, dsy: number,
		originX: number, originY: number
	): void {
		const dx = ( -0.5 + originX ) * dsx;
		const dy = ( -0.5 + originY ) * dsy;
		shape.updateTransform();
		const transform = shape.transform;
		const position = transform.position;
		const localTransform = transform.localTransform;
		const writtenPositionX = ( (runtime.written & EShapeRuntimeReset.POSITION_X) !== 0 );
		const writtenPositionY = ( (runtime.written & EShapeRuntimeReset.POSITION_Y) !== 0 );
		const oldPositionX = ( writtenPositionX ? position.x : runtime.x );
		const oldPositionY = ( writtenPositionY ? position.y : runtime.y );
		runtime.written |= EShapeRuntimeReset.POSITION;
		position.set(
			oldPositionX + dx * localTransform.a + dy * localTransform.c,
			oldPositionY + dx * localTransform.b + dy * localTransform.d
		);
	}
}
