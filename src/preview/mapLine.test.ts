import { MapLine } from "./mapLine";

describe("MapLine should", () => {
	it("render a line with some spaces", () => {
		const sut = new MapLine();
		sut.writeSpaces(5);
		expect(sut.renderHtml()).toEqual(
			"<span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br/>"
		);
	});

	it("render a line with a literal operand", () => {
		const sut = new MapLine();

		sut.writeOperand({
			kind: "operand",
			length: 5,
			type: "literal",
			operand: "Hi",
			attributes: [],
			id: 1,
			sourceColumnEnd: 0,
			sourceColumnStart: 0,
			sourceLine: 0,
		});

		expect(sut.renderHtml()).toEqual(
			'<span id="element-1" class="operand-literal" title=>Hi&nbsp;&nbsp;&nbsp;</span><br/>'
		);
	});

	it("render a line with a reference operand", () => {
		const sut = new MapLine();

		sut.writeOperand({
			kind: "operand",
			length: 5,
			type: "reference",
			operand: "#VAR",
			attributes: [],
			id: 1,
			sourceColumnEnd: 0,
			sourceColumnStart: 0,
			sourceLine: 0,
		});

		expect(sut.renderHtml()).toEqual(
			'<span id="element-1" class="operand-reference" title=>#VAR&nbsp;</span><br/>'
		);
	});

	it("render an operand with attributes", () => {
		const sut = new MapLine();

		sut.writeOperand({
			kind: "operand",
			length: 5,
			type: "reference",
			operand: "#VAR",
			attributes: [{ id: 2, kind: "AD", value: "IO" }],
			id: 1,
			sourceColumnEnd: 0,
			sourceColumnStart: 0,
			sourceLine: 0,
		});

		expect(sut.renderHtml()).toEqual(
			'<span id="element-1" class="operand-reference ad-i ad-o" title=>#VAR&nbsp;</span><br/>'
		);
	});

	it("cut an operand if its length is shorter than its value", () => {
		const sut = new MapLine();

		sut.writeOperand({
			kind: "operand",
			length: 2,
			type: "reference",
			operand: "#VAR",
			attributes: [],
			id: 1,
			sourceColumnEnd: 0,
			sourceColumnStart: 0,
			sourceLine: 0,
		});

		expect(sut.renderHtml()).toEqual(
			'<span id="element-1" class="cutoff operand-reference" title=#VAR>#V</span><br/>'
		);
	});
});
