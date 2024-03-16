/*
 * MIT License
 * 
 * Copyright (c) 2022 Justin Kunimune
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import "../libraries/jspdf.umd.min.js";
// @ts-ignore
const jsPDF = window.jspdf;

/**
 * an editable representation of a PDF
 */
export class PortableDocument {
	private readonly pdf: Exclude<any, PortableDocument>;
	private pageParameters: { size: string, orientation: string, margin: Margins };
	private textTop: number; // top bound of text on page in mm
	private textLeft: number; // left bound of text on page in mm
	private textRite: number; // rite bound of text on page in mm
	private textBottom: number; // bottom bound of text on page in mm
	private lineHeight: number; // height of characters in mm
	private lineSpacing: number; // baseline-to-baseline spacing between adjacent lines in mm
	private position: number; // top of next line in mm

	constructor(title: string) {
		this.pdf = new jsPDF.jsPDF(); // instantiate the PDF document
		// this.pdf.addSvgAsImage = jsPDF.svg.addSvgAsImage; // and include the svg module

		this.pdf.setProperties({
			                  title: title,
			                  creator: 'dunier',
		                  });

		this.pdf.addFont("../../resources/fonts/NotoSans-Regular.ttf", "NotoSans", "normal");
		this.pdf.setFont("NotoSans"); // set font

		this.pdf.text("I have to add something to this page or delete it.", 20, 20, {baseline: 'top'});
		this.pdf.deletePage(0);

		this.pageParameters = null;
		this.textTop = null; // these will get set when the user adds the first page
		this.textLeft = null;
		this.textRite = null;
		this.textBottom = null;
		this.lineHeight = null; // these will get set when they add their first text
		this.lineSpacing = null;
		this.position = null;
	}

	public addPage(size: string, orientation: string, margin: Margins): void {
		this.pdf.addPage(size, orientation, margin);
		this.pageParameters = { size: size, orientation: orientation, margin: margin };

		this.textTop = margin.top;
		this.textLeft = margin.left;
		this.textRite = this.pdf.internal.pageSize.width - margin.rite;
		this.textBottom = this.pdf.internal.pageSize.height - margin.bottom;

		this.position = null;
	}

	public addParagraph(text: string, fontSize: number = null, indent: boolean = false) {
		if (this.textTop === null)
			throw new Error("you haff to add a page before you add a paragraph.");
		// set font size
		if (fontSize !== null) {
			this.pdf.setFontSize(fontSize);
			this.lineHeight = fontSize/72*25.4;
			this.lineSpacing = this.lineHeight*1.15;
		}
		if (fontSize === null)
			throw new Error("you haff to specify a font size the first time you add a paragraph.");

		// add before-paragraph space
		if (this.position !== null)
			this.position += this.lineSpacing*0.5;

		// split it into lines
		const lines: string[] = this.pdf.splitTextToSize(
			text, this.textRite - this.textLeft);
		let x = this.textLeft;
		if (indent)
			x += 2*this.lineHeight;
		for (const line of lines) {
			if (this.position !== null && this.position + this.lineHeight > this.textBottom)
				this.addPage(this.pageParameters.size,
				             this.pageParameters.orientation,
				             this.pageParameters.margin); // add a new page if needed
			if (this.position === null)
				this.position = this.textTop; // go to top of page
			this.pdf.text(
				line,
				x, this.position,
				{
					baseline: 'top'
				}
			);
			x = this.textLeft;
			this.position += this.lineSpacing;
		}
	}

	/**
	 * generate and return an object url that can be used to reference this in the html
	 */
	public getUrl(): string {
		const blob = this.pdf.output('blob');
		return URL.createObjectURL(blob);
	}
}


type Margins = { top: number, left: number, rite: number, bottom: number };
