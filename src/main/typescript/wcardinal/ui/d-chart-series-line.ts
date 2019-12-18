/*
 * Copyright (C) 2019 Toshiba Corporation
 * SPDX-License-Identifier: Apache-2.0
 */

import { IPoint, Point } from "pixi.js";
import { DApplications } from "./d-applications";
import { DBaseStates } from "./d-base-states";
import { DChartCoordinate } from "./d-chart-coordinate";
import { DChartSeriesHitResult } from "./d-chart-series";
import { DChartSeriesBase, DChartSeriesBaseOptions } from "./d-chart-series-base";
import { DChartSeriesContainer } from "./d-chart-series-container";
import { DChartSeriesStrokeComputed, DChartSeriesStrokeComputedOptions } from "./d-chart-series-stroke-computed";
import { DChartSeriesStrokeComputedImpl } from "./d-chart-series-stroke-computed-impl";
import { EShape } from "./shape/e-shape";
import { EShapeLine } from "./shape/variant/e-shape-line";
import { EShapeLineHitThreshold } from "./shape/variant/e-shape-line-base";
import { utilCeilingIndex } from "./util/util-ceiling-index";

/**
 * {@link DChartSeriesLine} options.
 */
export interface DChartSeriesLineOptions extends DChartSeriesBaseOptions {
	points?: Array<number | null>;
	stroke?: DChartSeriesStrokeComputedOptions;
}

/**
 * A series represents a polyline.
 * Data points must be sorted in ascending order on the X axis.
 */
export class DChartSeriesLine extends DChartSeriesBase {
	protected static WORK: Point = new Point();
	protected _line: EShapeLine | null;
	protected _lineStrokeOptions?: DChartSeriesStrokeComputedOptions;
	protected _points: Array<number | null>;
	protected _pointId: number;
	protected _pointIdUpdated: number;
	protected _stroke?: DChartSeriesStrokeComputed;

	constructor( options?: DChartSeriesLineOptions ) {
		super( options );
		this._line = null;
		this._lineStrokeOptions = options && options.stroke;
		this._points = (options && options.points) || [];
		this._pointId = 0;
		this._pointIdUpdated = NaN;
	}

	bind( container: DChartSeriesContainer, index: number ): void {
		let line = this._line;
		if( ! line ) {
			const stroke = this._stroke = DChartSeriesStrokeComputedImpl.from( container, index, this._lineStrokeOptions );
			line = this._line = new EShapeLine([], [], stroke.width, stroke.style);
			line.stroke.color = stroke.color;
			line.stroke.alpha = stroke.alpha;
		}
		line.attach( container.plotArea.container, index );
		this._pointIdUpdated = NaN;
		super.bind( container, index );
	}

	unbind(): void {
		const line = this._line;
		if( line ) {
			line.detach();
		}
		super.unbind();
	}

	get shape(): EShapeLine | null {
		return this._line;
	}

	get points(): Array<number | null> {
		return this._points;
	}

	set points( points: Array<number | null> ) {
		this._points = points;
		this._pointId += 1;
	}

	toDirty(): void {
		this._pointId += 1;
	}

	update(): void {
		const line = this._line;
		if( line ) {
			const coordinate = this._coordinate;
			const coordinateX = coordinate.x;
			const coordinateY = coordinate.y;
			if( coordinateX && coordinateY ) {
				const pointId = this._pointId;
				const isPointChanged = ( pointId !== this._pointIdUpdated );
				const isCoordinateChanged = coordinate.isDirty( coordinateX, coordinateY );
				if( isPointChanged || isCoordinateChanged ) {
					this._pointIdUpdated = pointId;
					this.updateLine( line, coordinateX, coordinateY );
				}
			}
		}
	}

	protected updateLine(
		line: EShapeLine,
		xcoordinate: DChartCoordinate,
		ycoordinate: DChartCoordinate
	): void {
		const values = line.points.values;
		const segments = line.points.segments;
		const valuesLength = values.length;
		const segmentsLength = segments.length;
		let ivalues = 0;
		let isegments = 0;
		const points = this._points;
		let xmin = NaN;
		let xmax = NaN;
		let ymin = NaN;
		let ymax = NaN;
		for( let i = 0, imax = points.length; i < imax; i += 2 ) {
			const x = points[ i ];
			const y = points[ i + 1 ];
			if( x != null && y != null ) {
				if( ivalues < valuesLength ) {
					values[ ivalues ] = x;
					values[ ivalues + 1 ] = y;
				} else {
					values.push( x, y );
				}
				ivalues += 2;
				if( xmin !== xmin ) {
					xmin = x;
					xmax = x;
					ymin = y;
					ymax = y;
				} else {
					xmin = Math.min( xmin, x );
					xmax = Math.max( xmax, x );
					ymin = Math.min( ymin, y );
					ymax = Math.max( ymax, y );
				}
			} else {
				const segment = (i >> 1) - isegments;
				if( isegments < segmentsLength ) {
					segments[ isegments ] = segment;
				} else {
					segments.push( segment );
				}
				isegments += 1;
			}
		}
		if( values.length !== ivalues ) {
			values.length = ivalues;
		}
		if( segments.length !== isegments ) {
			segments.length = isegments;
		}

		xcoordinate.mapAll( values, 0, ivalues, 2, 0 );
		ycoordinate.mapAll( values, 0, ivalues, 2, 1 );
		xcoordinate.transform.mapAll( values, 0, ivalues, 2, 0 );
		ycoordinate.transform.mapAll( values, 0, ivalues, 2, 1 );

		if( xmin !== xmin ) {
			xmin = 0;
			xmax = 0;
			ymin = 0;
			ymax = 0;
		}

		xmin = xcoordinate.transform.map( xcoordinate.map( xmin ) );
		xmax = xcoordinate.transform.map( xcoordinate.map( xmax ) );
		ymin = ycoordinate.transform.map( ycoordinate.map( ymin ) );
		ymax = ycoordinate.transform.map( ycoordinate.map( ymax ) );

		const sx = Math.abs( xmax - xmin );
		const sy = Math.abs( ymax - ymin );
		const cx = ( xmin + xmax ) * 0.5;
		const cy = ( ymin + ymax ) * 0.5;
		for( let i = 0, imax = values.length; i < imax; i += 2 ) {
			values[ i + 0 ] -= cx;
			values[ i + 1 ] -= cy;
		}
		line.points.set( values, segments );
		line.size.set( sx, sy );
		line.transform.position.set( cx, cy );
		DApplications.update( line );
	}

	protected updateRegion(): void {
		const pointId = this._pointId;
		if( this._regionPointId !== pointId ) {
			this._regionPointId = pointId;

			const points = this._points;
			const domain = this._domain;
			const range = this._range;
			domain.clear();
			range.clear();
			if( points != null ) {
				for( let i = 0, imax = points.length; i < imax; i += 2 ) {
					const xraw = points[ i ];
					if( xraw != null ) {
						domain.add( xraw, xraw );
					}
					const yraw = points[ i + 1 ];
					if( yraw != null ) {
						range.add( yraw, yraw );
					}
				}
			}
		}
	}

	destroy(): void {
		const line = this._line;
		if( line ) {
			this._line = null;
			line.detach();
			line.destroy();
		}

		this._points.length = 0;
		this._pointId = 0;
		this._pointIdUpdated = NaN;
		super.destroy();
	}

	hitTest( global: IPoint ): boolean {
		const line = this._line;
		if( line ) {
			const work = DChartSeriesLine.WORK;
			const local = line.toLocal( global, undefined, work );
			return line.contains( local ) != null;
		}
		return false;
	}

	calcHitPoint( global: IPoint, threshold: EShapeLineHitThreshold, result: DChartSeriesHitResult ): boolean {
		const line = this._line;
		if( line ) {
			const work = DChartSeriesLine.WORK;
			const local = line.toLocal( global, undefined, work );
			if( line.calcHitPoint( local, threshold, this.calcHitPointTestRange, this.calcHitPointHitTester, result ) ) {
				return true;
			}
		}
		return false;
	}

	calcHitPointTestRange(
		this: unknown,
		shape: unknown,
		x: number, y: number,
		threshold: number,
		values: number[],
		result: [ number, number ]
	): [ number, number ] {
		const index = utilCeilingIndex( values, x, 2, 0 );
		result[ 0 ] = Math.max( 0, index - 1 );
		result[ 1 ] = index;
		return result;
	}

	calcHitPointHitTester(
		this: unknown,
		shape: EShape,
		x: number, y: number,
		p0x: number, p0y: number,
		p1x: number, p1y: number,
		index: number,
		threshold: number,
		result: DChartSeriesHitResult
	): boolean {
		if( p0x <= x && x < p1x ) {
			const l = p1x - p0x;
			if( 0.0001 < Math.abs( l ) ) {
				const t = (x - p0x) / l;
				const p2x = x;
				const p2y = p0y + t * (p1y - p0y);
				const distance = Math.abs(p2y - y);
				if( distance < threshold ) {
					const position = shape.transform.position;
					const px = position.x;
					const py = position.y;
					result.x = px + p2x;
					result.y = py + p2y;
					result.p0x = px + p0x;
					result.p0y = py + p0y;
					result.p1x = px + p1x;
					result.p1y = py + p1y;
					result.t = t;
					result.index = index;
					result.distance = distance;
					return true;
				}
			}
		}
		return false;
	}

	protected onStateChange( newState: number, oldState: number ) {
		const isActive = DBaseStates.isActive( newState );
		const wasActive = DBaseStates.isActive( oldState );
		if( isActive !== wasActive ) {
			const line = this._line;
			const stroke = this._stroke;
			if( line && stroke ) {
				line.stroke.width = stroke.width * ( isActive ? 2 : 1 );
			}
		}
		super.onStateChange( newState, oldState );
	}
}
