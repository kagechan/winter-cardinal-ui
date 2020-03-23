/*
 * Copyright (C) 2019 Toshiba Corporation
 * SPDX-License-Identifier: Apache-2.0
 */

import { interaction, Point } from "pixi.js";
import { DApplications } from "./d-applications";
import { DBase, DBaseOnOptions, DBaseOptions, DThemeBase } from "./d-base";
import { DBaseOverflowMask } from "./d-base-overflow-mask";
import { DCanvas } from "./d-canvas";
import { DView, DViewOptions } from "./d-view";
import { DViewImpl } from "./d-view-impl";
import { UtilWheelEventDeltas } from "./util/util-wheel-event";

export interface DCanvasContainerOnOptions<CANVAS> extends DBaseOnOptions {
	/**
	 * Triggered when a canvas is removed.
	 *
	 * @param canvas a removed canvas
	 * @param self a canvas container
	 */
	unset?: ( canvas: CANVAS, self: any ) => void;

	/**
	 * Triggered when a canvas is set.
	 *
	 * @param canvas a new canvas
	 * @param self a canvas container
	 */
	set?: ( canvas: CANVAS, self: any ) => void;
}

export interface DCanvasContainerOptions<
	CANVAS extends DBase = DCanvas,
	THEME extends DThemeCanvasContainer = DThemeCanvasContainer
> extends DBaseOptions<THEME> {
	mask?: boolean;
	view?: DViewOptions;
	canvas?: CANVAS;
	on?: DCanvasContainerOnOptions<CANVAS>;
}

export interface DThemeCanvasContainer extends DThemeBase {
	isOverflowMaskEnabled(): boolean;
}

const isOverflowMaskEnabled = <
	CANVAS extends DBase,
	THEME extends DThemeCanvasContainer
>( theme: THEME, options?: DCanvasContainerOptions<CANVAS, THEME> ): boolean => {
	if( options && options.mask != null ) {
		return options.mask;
	}
	return theme.isOverflowMaskEnabled();
};

export class DCanvasContainer<
	CANVAS extends DBase = DCanvas,
	THEME extends DThemeCanvasContainer = DThemeCanvasContainer,
	OPTIONS extends DCanvasContainerOptions<CANVAS, THEME> = DCanvasContainerOptions<CANVAS, THEME>
> extends DBase<THEME, OPTIONS> {
	protected _canvas!: CANVAS | null;
	protected _overflowMask!: DBaseOverflowMask | null;
	protected _view!: DViewImpl;

	protected init( options?: OPTIONS ) {
		super.init( options );

		this._canvas = null;
		const theme = this.theme;
		this._view = new DViewImpl( this, () => this._canvas, options && options.view );

		// Canvas
		this.canvas = ( options && options.canvas ? options.canvas : null );

		// Overflow mask
		this._overflowMask = null;
		if( isOverflowMaskEnabled( theme, options ) ) {
			this.mask = this.getOrCreateOverflowMask();
		}
	}

	protected getType(): string {
		return "DCanvasContainer";
	}

	onResize( newWidth: number, newHeight: number, oldWidth: number, oldHeight: number ): void {
		super.onResize( newWidth, newHeight, oldWidth, oldHeight );
		this.updateContentSize( newWidth, newHeight, oldWidth, oldHeight );
	}

	get canvas(): CANVAS | null {
		return this._canvas;
	}

	set canvas( canvas: CANVAS | null ) {
		const previous = this._canvas;
		if( previous != null ) {
			this._canvas = null;
			this.removeChild( previous );
			this.emit( "unset", previous, this );
			previous.destroy();
		}

		this._canvas = canvas;
		if( canvas != null ) {
			this.addChild( canvas );
			this._view.reset( 0 );
			this.emit( "set", canvas, this );
		} else {
			DApplications.update( this );
		}
	}

	protected getOrCreateOverflowMask(): DBaseOverflowMask {
		if( this._overflowMask == null ) {
			this._overflowMask = new DBaseOverflowMask( this );
			this.addReflowable( this._overflowMask );
			this.toDirty();
		}
		return this._overflowMask;
	}

	protected updateContentSize( newWidth: number, newHeight: number, oldWidth: number, oldHeight: number ): void {
		const canvas = this._canvas;
		if( canvas != null ) {
			const canvasX = canvas.x + (newWidth - oldWidth) * 0.5;
			const canvasY = canvas.y + (newHeight - oldHeight) * 0.5;
			canvas.position.set( canvasX, canvasY );
		}
	}

	get view(): DView {
		return this._view;
	}

	onWheel( e: WheelEvent, deltas: UtilWheelEventDeltas, global: Point ): boolean {
		const vresult = this._view.onWheel( e, deltas, global );
		const sresult = super.onWheel( e, deltas, global );
		return vresult || sresult;
	}

	onDblClick( e: MouseEvent | TouchEvent, interactionManager: interaction.InteractionManager ): boolean {
		const vresult = this._view.onDblClick( e, interactionManager );
		const sresult = super.onDblClick( e, interactionManager );
		return vresult || sresult;
	}

	protected onDown( e: interaction.InteractionEvent ): void {
		this._view.onDown( e );
		super.onDown( e );
	}

	destroy(): void {
		// Overflow mask
		const overflowMask = this._overflowMask;
		if( overflowMask != null ) {
			this._overflowMask = null;
			overflowMask.destroy();
		}
		(this as any).mask = null;

		super.destroy();
	}
}
