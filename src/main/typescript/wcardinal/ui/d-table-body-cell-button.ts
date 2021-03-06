/*
 * Copyright (C) 2019 Toshiba Corporation
 * SPDX-License-Identifier: Apache-2.0
 */

import { interaction } from "pixi.js";
import { DButtonBaseWhen } from "./d-button-base-when";
import { DTableBodyCellOnChange } from "./d-table-body-cell";
import {
	DTableBodyCellText,
	DTableBodyCellTextOptions,
	DThemeTableBodyCellText
} from "./d-table-body-cell-text";
import { DTableColumn } from "./d-table-column";
import { toEnum } from "./util/to-enum";
import { UtilKeyboardEvent } from "./util/util-keyboard-event";
import { UtilPointerEvent } from "./util/util-pointer-event";

export interface DTableBodyCellButtonOptions<
	ROW,
	VALUE = unknown,
	THEME extends DThemeTableBodyCellButton<VALUE> = DThemeTableBodyCellButton<VALUE>
> extends DTableBodyCellTextOptions<ROW, VALUE | null, THEME> {
	when?: DButtonBaseWhen | keyof typeof DButtonBaseWhen;
}

export interface DThemeTableBodyCellButton<VALUE = unknown>
	extends DThemeTableBodyCellText<VALUE | null> {}

export class DTableBodyCellButton<
	ROW,
	VALUE = unknown,
	THEME extends DThemeTableBodyCellButton<VALUE> = DThemeTableBodyCellButton<VALUE>,
	OPTIONS extends DTableBodyCellButtonOptions<ROW, VALUE, THEME> = DTableBodyCellButtonOptions<
		ROW,
		VALUE,
		THEME
	>
> extends DTableBodyCellText<ROW, VALUE | null, THEME, OPTIONS> {
	protected _when: DButtonBaseWhen;

	constructor(
		columnIndex: number,
		column: DTableColumn<ROW, VALUE | null>,
		onChange: DTableBodyCellOnChange<ROW, VALUE | null>,
		options?: OPTIONS
	) {
		super(columnIndex, column, onChange, options);

		const when = toEnum(options?.when ?? DButtonBaseWhen.CLICKED, DButtonBaseWhen);
		this._when = when;
		this.initOnClick(when, this.theme, options);
	}

	protected initOnClick(when: DButtonBaseWhen, theme: THEME, options?: OPTIONS): void {
		UtilPointerEvent.onClick(this, (e: interaction.InteractionEvent): void => {
			if (when === DButtonBaseWhen.CLICKED) {
				this.onClick(e);
			}
		});
	}

	onClick(e?: interaction.InteractionEvent | KeyboardEvent | MouseEvent | TouchEvent): void {
		if (this.state.isActionable) {
			this.onActivate(e);
		}
	}

	onDblClick(
		e: MouseEvent | TouchEvent,
		interactionManager: interaction.InteractionManager
	): boolean {
		if (this._when === DButtonBaseWhen.DOUBLE_CLICKED) {
			this.onClick(e);
		}
		return super.onDblClick(e, interactionManager);
	}

	protected onActivate(
		e?: interaction.InteractionEvent | KeyboardEvent | MouseEvent | TouchEvent
	): void {
		this.emit("active", this);
		const row = this._row;
		if (row !== undefined) {
			const rowIndex = this._rowIndex;
			const columnIndex = this._columnIndex;
			this.emit("change", null, null, this);
			this._onChange(null, null, row, rowIndex, columnIndex, this);
		}
	}

	protected onActivateKeyDown(e: KeyboardEvent): void {
		if (this.state.isActionable) {
			this.state.isPressed = true;
		}
	}

	protected onActivateKeyUp(e: KeyboardEvent): void {
		if (this.state.isActionable) {
			if (this.state.isPressed) {
				this.onActivate(e);
			}
			this.state.isPressed = false;
		}
	}

	onKeyDown(e: KeyboardEvent): boolean {
		if (UtilKeyboardEvent.isActivateKey(e)) {
			this.onActivateKeyDown(e);
		}

		return super.onKeyDown(e);
	}

	onKeyUp(e: KeyboardEvent): boolean {
		if (UtilKeyboardEvent.isActivateKey(e)) {
			this.onActivateKeyUp(e);
		}

		return super.onKeyUp(e);
	}

	protected getType(): string {
		return "DTableBodyCellButton";
	}
}
