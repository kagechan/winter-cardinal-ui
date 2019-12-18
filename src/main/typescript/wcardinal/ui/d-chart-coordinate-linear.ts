/*
 * Copyright (C) 2019 Toshiba Corporation
 * SPDX-License-Identifier: Apache-2.0
 */

import { DChartCoordinate, DChartCoordinateDirection } from "./d-chart-coordinate";
import { DChartCoordinateContainerSub } from "./d-chart-coordinate-container-sub";
import { DChartCoordinateTransform, DThemeChartCoordinateTransform } from "./d-chart-coordinate-transform";
import { DChartCoordinateTransformImpl } from "./d-chart-coordinate-transform-impl";
import { DChartRegionImpl } from "./d-chart-region-impl";
import { DThemes } from "./theme/d-themes";
import { utilIsNaN } from "./util/util-is-nan";

export interface DThemeChartCoordinateLinear extends DThemeChartCoordinateTransform {
	toStepScale( scale: number ): number;
}

export interface DChartCoordinateLinearDomainOptions {
	from?: number;
	to?: number;
}

export interface DChartCoordinateLinearRangeOptions {
	from?: number;
	to?: number;
}

export interface DChartCoordinateLinearOptions {
	domain?: DChartCoordinateLinearDomainOptions;
	range?: DChartCoordinateLinearRangeOptions;
	theme?: DThemeChartCoordinateLinear;
}

export class DChartCoordinateLinear implements DChartCoordinate {
	protected _id: number;
	protected _transform: DChartCoordinateTransform;
	protected _container?: DChartCoordinateContainerSub;
	protected _direction: DChartCoordinateDirection;
	protected _theme: DThemeChartCoordinateLinear;
	protected _work: DChartRegionImpl;

	constructor( options?: DChartCoordinateLinearOptions ) {
		this._id = 0;

		// Direction
		this._direction = DChartCoordinateDirection.X;

		// Theme
		const theme = ( options && options.theme ) || this.getThemeDefault();
		this._theme = theme;

		// Transform
		this._transform = new DChartCoordinateTransformImpl( theme );

		this._work = new DChartRegionImpl( NaN, NaN );
	}

	protected getThemeDefault(): DThemeChartCoordinateLinear {
		return DThemes.getInstance().get( this.getType() );
	}

	protected getType(): string {
		return "DChartCoordinateLinear";
	}

	bind( container: DChartCoordinateContainerSub, direction: DChartCoordinateDirection ): void {
		this._container = container;
		if( this._direction !== direction ) {
			this._direction = direction;
			const transform = this._transform;
			transform.scale = -transform.scale;
		}
	}

	unbind(): void {
		this._container = undefined;
	}

	fit(): void {
		const container = this._container;
		if( container ) {
			switch( this._direction ) {
			case DChartCoordinateDirection.X:
				this.fitX( container );
				break;
			case DChartCoordinateDirection.Y:
				this.fitY( container );
				break;
			}
		}
	}

	protected fitX( container: DChartCoordinateContainerSub ): void {
		const plotArea = container.container.plotArea;
		const region = plotArea.series.getDomain( this, this._work );
		const regionFrom = region.from;
		const regionTo = region.to;
		if( ! (utilIsNaN( regionFrom ) || utilIsNaN( regionTo )) ) {
			const transform = this._transform;
			const theme = this._theme;
			const padding = plotArea.padding;
			const regionSize = Math.abs( regionTo - regionFrom );
			const paddingLeft = padding.getLeft();
			if( theme.isZero( regionSize ) ) {
				transform.set( paddingLeft - regionFrom, +1 );
			} else {
				const paddingRight = padding.getRight();
				const pixelSize = Math.max( 0, plotArea.width - paddingLeft - paddingRight );
				const newScale = +pixelSize / regionSize;
				const newTranslation = paddingLeft - regionFrom * newScale;
				transform.set( newTranslation, newScale );
			}
		}
	}

	protected fitY( container: DChartCoordinateContainerSub ): void {
		const plotArea = container.container.plotArea;
		const region = plotArea.series.getRange( this, this._work );
		const regionFrom = region.from;
		const regionTo = region.to;
		if( ! (utilIsNaN( regionFrom ) || utilIsNaN( regionTo )) ) {
			const padding = plotArea.padding;
			const theme = this._theme;
			const transform = this._transform;
			const rangeSize = Math.abs( regionTo - regionFrom );
			const paddingTop = padding.getTop();
			if( theme.isZero( rangeSize ) ) {
				transform.set( paddingTop + regionTo, -1 );
			} else {
				const paddingBottom = padding.getBottom();
				const pixelSize = Math.max( 0, plotArea.height - paddingTop - paddingBottom );
				const newScale = -pixelSize / rangeSize;
				const newTranslation = paddingTop - regionTo * newScale;
				transform.set( newTranslation, newScale );
			}
		}
	}

	get id(): number {
		return this._id;
	}

	get transform(): DChartCoordinateTransform {
		return this._transform;
	}

	map( value: number ): number {
		return value;
	}

	mapAll( values: number[], ifrom: number, iend: number, stride: number, offset: number ): void {
		// DO NOTHING
	}

	unmap( value: number ): number {
		return value;
	}

	unmapAll( values: number[], ifrom: number, iend: number, stride: number, offset: number ): void {
		// DO NOTHING
	}

	protected calcStepMajor( domainMin: number, domainMax: number, count: number ): number {
		if( 0 < count ) {
			const span = Math.abs( domainMax - domainMin ) / count;
			const power = Math.floor( Math.log( span ) / Math.LN10 );
			const base = Math.pow( 10, power );
			return this._theme.toStepScale( span / base ) * base;
		}
		return -1;
	}

	protected calcStepMinor( step: number, minorCount: number ): number {
		if( 0 <= step ) {
			return step / ( minorCount + 1 );
		} else {
			return -1;
		}
	}

	protected calcTickMinorPositions(
		step: number, count: number, majorPosition: number,
		rangeMin: number, rangeMax: number,
		iresult: number, result: Float64Array
	): void {
		for( let i = 0; i < count; i += 1 ) {
			const minorPosition = majorPosition + (i + 1) * step;
			if( rangeMin <= minorPosition && minorPosition <= rangeMax ) {
				result[ iresult++ ] = minorPosition;
			}
		}
	}

	protected getRangeMax(): number {
		const container = this._container;
		if( container ) {
			const plotArea = container.container.plotArea;
			switch( this._direction ) {
			case DChartCoordinateDirection.X:
				return plotArea.width;
			case DChartCoordinateDirection.Y:
				return plotArea.height;
			}
		}
		return 0;
	}

	ticks(
		domainFrom: number, domainTo: number,
		majorCount: number,
		minorCountPerMajor: number,
		minorCount: number,
		majorResult: Float64Array,
		minorResult: Float64Array
	): void {
		if( majorCount <= 0 ) {
			return;
		}

		const transform = this._transform;

		const domainMin = Math.min( domainFrom, domainTo );
		const domainMax = Math.max( domainFrom, domainTo );

		const majorStep = this.calcStepMajor( domainMin, domainMax, majorCount );
		if( majorStep <= 0 ) {
			majorResult[ 0 ] = domainMin;
			majorResult[ 1 ] = transform.map( this.map( domainMin ) );
			majorResult[ 2 ] = 0;
			for( let i = 1; i < majorCount; ++i ) {
				const imajorResult = i * 3;
				majorResult[ imajorResult + 0 ] = NaN;
				majorResult[ imajorResult + 1 ] = NaN;
				majorResult[ imajorResult + 2 ] = NaN;
			}
			for( let i = 0; i < minorCount; ++i ) {
				const iminorResult = i * 3;
				minorResult[ iminorResult + 0 ] = NaN;
				minorResult[ iminorResult + 1 ] = NaN;
				minorResult[ iminorResult + 2 ] = NaN;
			}
			return;
		}

		// Major tick start position
		const idomainStart = Math.floor( domainMin / majorStep ) - 1;
		const idomainEnd = Math.ceil( domainMax / majorStep ) + 1;

		// Major / minor tick positions
		const minorStep = this.calcStepMinor( majorStep, minorCountPerMajor );
		let imajor = 0;
		let iminor = 0;
		for( let i = idomainStart; i <= idomainEnd; ++i ) {
			const majorPosition = i * majorStep;
			if( imajor < majorCount ) {
				if( domainMin <= majorPosition && majorPosition <= domainMax ) {
					const majorProjectedPosition = transform.map( this.map( majorPosition ) );
					const imajorResult = imajor * 3;
					majorResult[ imajorResult + 0 ] = majorPosition;
					majorResult[ imajorResult + 1 ] = majorProjectedPosition;
					majorResult[ imajorResult + 2 ] = majorStep;
					imajor += 1;
				}
			}

			for( let j = 0; j < minorCountPerMajor; j += 1 ) {
				if( iminor < minorCount ) {
					const minorPosition = majorPosition + (j + 1) * minorStep;
					if( domainMin <= minorPosition && minorPosition <= domainMax ) {
						const minorProjectedPosition = transform.map( this.map( minorPosition ) );
						const iminorResult = iminor * 3;
						minorResult[ iminorResult + 0 ] = minorPosition;
						minorResult[ iminorResult + 1 ] = minorProjectedPosition;
						minorResult[ iminorResult + 2 ] = minorStep;
						iminor += 1;
					}
				}
			}
		}
		for( let i = imajor; i < majorCount; ++i ) {
			const imajorResult = i * 3;
			majorResult[ imajorResult + 0 ] = NaN;
			majorResult[ imajorResult + 1 ] = NaN;
			majorResult[ imajorResult + 2 ] = NaN;
		}
		for( let i = iminor; i < minorCount; ++i ) {
			const iminorResult = i * 3;
			minorResult[ iminorResult + 0 ] = NaN;
			minorResult[ iminorResult + 1 ] = NaN;
			minorResult[ iminorResult + 2 ] = NaN;
		}
	}
}
