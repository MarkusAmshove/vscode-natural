export type InputStructure = {
    elements: InputElement[];
};

export type InputElement = InputOperand | InputNewLine | InputColumn | InputSpaces;

export type InputOperand = {
    kind: "operand";
    type: "reference" | "literal" | "unknown";
    id: number;
    operand: string;
    length: number;
    sourceLine: number;
    sourceColumnStart: number;
    sourceColumnEnd: number;
    attributes: InputAttribute[];
};

export type InputNewLine = {
    kind: "newline";
    id: number;
};

export type InputColumn = {
    kind: "column_position";
    id: number;
    column: number;
};

export type InputSpaces = {
    kind: "spaces";
    id: number;
    spaces: number;
};

export type InputAttribute = {
    kind: string;
    id: number;
    value: string;
};